const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const MAIL_TM_BASE_URL = "https://api.mail.tm";
const VERIFY_TTL_SECONDS = 900;
const VERIFY_RESEND_MIN_INTERVAL_SECONDS = 60;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function mailTmFetch(path, init = {}) {
  const response = await fetch(`${MAIL_TM_BASE_URL}${path}`, init);
  const raw = await response.text();
  let payload = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error(`mail.tm returned a non-JSON response (${response.status}): ${raw}`);
    }
  }

  if (!response.ok) {
    throw new Error(payload?.message || `mail.tm request failed: ${response.status}`);
  }

  return payload;
}

async function createMailbox(prefix) {
  const domains = await mailTmFetch("/domains?page=1");
  const domain = domains["hydra:member"]?.[0]?.domain;
  assert(domain, "No disposable email domain available.");

  const requestedAddress = `${prefix}.${Date.now()}@${domain}`;
  const password = `TempPass${Date.now()}!`;
  const account = await mailTmFetch("/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: requestedAddress, password }),
  });
  const token = await mailTmFetch("/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: account.address, password }),
  });

  return {
    address: account.address,
    password,
    token: token.token,
    requestedAddress,
  };
}

async function listMessages(mailbox) {
  const payload = await mailTmFetch("/messages", {
    headers: { Authorization: `Bearer ${mailbox.token}` },
  });
  return payload["hydra:member"] ?? [];
}

async function readMessage(mailbox, messageId) {
  return mailTmFetch(`/messages/${messageId}`, {
    headers: { Authorization: `Bearer ${mailbox.token}` },
  });
}

async function waitForMessage(mailbox, { ignoreIds = new Set(), predicate, timeoutMs = 180_000 } = {}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const messages = await listMessages(mailbox);

    for (const message of messages) {
      if (ignoreIds.has(message.id)) {
        continue;
      }

      const detail = await readMessage(mailbox, message.id);
      if (!predicate || predicate(detail)) {
        return detail;
      }
    }

    await sleep(2_000);
  }

  throw new Error(`Timed out waiting for email for ${mailbox.address}.`);
}

function extractSixDigitCode(message) {
  const haystack = [message.subject, message.intro, message.text, ...(message.html ?? [])]
    .filter(Boolean)
    .join("\n");
  const match = haystack.match(/\b(\d{6})\b/);
  assert(match, `Unable to find a 6-digit code in email:\n${haystack}`);
  return match[1];
}

async function postJson(path, body, forwardedFor) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }
  return { response, payload };
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }

  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

async function verifyResendAndRateLimit() {
  const mailbox = await createMailbox("auth-resend");
  const register = await postJson(
    "/api/auth/sign-up",
    {
      name: "Auth Resend",
      email: mailbox.address,
      password: "MailboxPass123!",
      country: "Bangladesh",
    },
    "198.51.100.51",
  );
  assert(register.response.ok, `Sign-up failed: ${JSON.stringify(register.payload)}`);
  assert(register.payload?.requiresEmailVerification === true, "Expected email verification requirement.");

  const initialMessage = await waitForMessage(mailbox, {
    predicate: (message) => /verification code/i.test(`${message.subject ?? ""}\n${message.intro ?? ""}`),
  });
  const initialCode = extractSixDigitCode(initialMessage);

  // InsForge applies the resend interval to verification delivery. Wait for the
  // configured cooldown before expecting a second message to be emitted.
  const initialCreatedAt = initialMessage.createdAt ? new Date(initialMessage.createdAt).getTime() : Date.now();
  await waitUntil(initialCreatedAt + VERIFY_RESEND_MIN_INTERVAL_SECONDS * 1000 + 1_000);

  const resend = await postJson(
    "/api/auth/send-verify-email",
    { email: mailbox.address },
    "198.51.100.51",
  );
  assert(resend.response.ok, `Resend failed unexpectedly: ${JSON.stringify(resend.payload)}`);
  const resentMessage = await waitForMessage(mailbox, {
    ignoreIds: new Set([initialMessage.id]),
    predicate: (message) => /verification code/i.test(`${message.subject ?? ""}\n${message.intro ?? ""}`),
  });
  const resentCode = extractSixDigitCode(resentMessage);
  assert(resentCode !== initialCode, "Resent verification code should differ from the initial code.");

  const throttledResend = await postJson(
    "/api/auth/send-verify-email",
    { email: mailbox.address },
    "198.51.100.51",
  );
  assert(!throttledResend.response.ok, "Immediate resend should be blocked.");
  assert(throttledResend.payload?.error, "Blocked resend should return a standardized error code.");
  assert(
    /wait|later|limit|too many/i.test(throttledResend.payload?.message ?? ""),
    `Unexpected resend-throttle message: ${JSON.stringify(throttledResend.payload)}`,
  );

  let limiterResult = null;
  for (let index = 0; index < 11; index += 1) {
    limiterResult = await postJson(
      "/api/auth/sign-in",
      {
        email: `invalid-${index}@example.com`,
        password: "invalid-password",
      },
      "198.51.100.52",
    );
  }

  assert(limiterResult, "Expected an auth-limiter result.");
  assert(limiterResult.response.status === 429, `Expected auth limiter 429, got ${limiterResult.response.status}.`);
  assert(
    limiterResult.payload?.error === "Too many authentication attempts",
    `Unexpected auth limiter payload: ${JSON.stringify(limiterResult.payload)}`,
  );

  return {
    mailbox: mailbox.address,
    initialCode,
    resentCode,
  };
}

async function verifyCodeLifecycle() {
  const almostExpiredMailbox = await createMailbox("auth-verify-valid");
  const expiredMailbox = await createMailbox("auth-verify-expired");

  const firstSignup = await postJson(
    "/api/auth/sign-up",
    {
      name: "Valid Edge",
      email: almostExpiredMailbox.address,
      password: "MailboxPass123!",
      country: "Bangladesh",
    },
    "198.51.100.53",
  );
  assert(firstSignup.response.ok, `First sign-up failed: ${JSON.stringify(firstSignup.payload)}`);

  const secondSignup = await postJson(
    "/api/auth/sign-up",
    {
      name: "Expired Edge",
      email: expiredMailbox.address,
      password: "MailboxPass123!",
      country: "Bangladesh",
    },
    "198.51.100.54",
  );
  assert(secondSignup.response.ok, `Second sign-up failed: ${JSON.stringify(secondSignup.payload)}`);

  const validMessage = await waitForMessage(almostExpiredMailbox, {
    predicate: (message) => /verification code/i.test(`${message.subject ?? ""}\n${message.intro ?? ""}`),
  });
  const expiredMessage = await waitForMessage(expiredMailbox, {
    predicate: (message) => /verification code/i.test(`${message.subject ?? ""}\n${message.intro ?? ""}`),
  });

  const validCode = extractSixDigitCode(validMessage);
  const expiredCode = extractSixDigitCode(expiredMessage);
  const edgeDeadline = Math.min(
    new Date(validMessage.createdAt).getTime() + VERIFY_TTL_SECONDS * 1000,
    new Date(expiredMessage.createdAt).getTime() + VERIFY_TTL_SECONDS * 1000,
  );

  await waitUntil(edgeDeadline - 1_000);

  const validVerify = await postJson(
    "/api/auth/verify-email",
    { email: almostExpiredMailbox.address, code: validCode },
    "198.51.100.53",
  );
  assert(validVerify.response.ok, `Code should be valid 1 second before expiry: ${JSON.stringify(validVerify.payload)}`);

  const reusedVerify = await postJson(
    "/api/auth/verify-email",
    { email: almostExpiredMailbox.address, code: validCode },
    "198.51.100.53",
  );
  assert(!reusedVerify.response.ok, "Reused verification code should be rejected.");
  assert(
    /used|invalid|expired|verified/i.test(reusedVerify.payload?.message ?? ""),
    `Unexpected reused-code payload: ${JSON.stringify(reusedVerify.payload)}`,
  );

  await waitUntil(edgeDeadline + 1_000);

  const expiredVerify = await postJson(
    "/api/auth/verify-email",
    { email: expiredMailbox.address, code: expiredCode },
    "198.51.100.54",
  );
  assert(!expiredVerify.response.ok, "Expired verification code should be rejected.");
  assert(
    /expired|invalid/i.test(expiredVerify.payload?.message ?? ""),
    `Unexpected expired-code payload: ${JSON.stringify(expiredVerify.payload)}`,
  );

  return {
    validMailbox: almostExpiredMailbox.address,
    expiredMailbox: expiredMailbox.address,
    waitedUntil: new Date(edgeDeadline).toISOString(),
  };
}

async function verifyForgotResetLoop() {
  const mailbox = await createMailbox("auth-reset");
  const register = await postJson(
    "/api/auth/sign-up",
    {
      name: "Reset User",
      email: mailbox.address,
      password: "MailboxPass123!",
      country: "Bangladesh",
    },
    "198.51.100.55",
  );
  assert(register.response.ok, `Reset-flow sign-up failed: ${JSON.stringify(register.payload)}`);

  const verificationMessage = await waitForMessage(mailbox, {
    predicate: (message) => /verification code/i.test(`${message.subject ?? ""}\n${message.intro ?? ""}`),
  });
  const verificationCode = extractSixDigitCode(verificationMessage);
  const verified = await postJson(
    "/api/auth/verify-email",
    { email: mailbox.address, code: verificationCode },
    "198.51.100.55",
  );
  assert(verified.response.ok, `Email verification failed: ${JSON.stringify(verified.payload)}`);

  const forgot = await postJson(
    "/api/auth/forgot-password",
    { email: mailbox.address },
    "198.51.100.56",
  );
  assert(forgot.response.ok, `Forgot-password failed: ${JSON.stringify(forgot.payload)}`);

  const resetMessage = await waitForMessage(mailbox, {
    ignoreIds: new Set([verificationMessage.id]),
    predicate: (message) => /reset password code|reset password|verification code/i.test(
      `${message.subject ?? ""}\n${message.intro ?? ""}`,
    ),
  });
  const resetCode = extractSixDigitCode(resetMessage);

  const weakShort = await postJson(
    "/api/auth/reset-password",
    { code: resetCode, password: "short" },
    "198.51.100.56",
  );
  assert(weakShort.response.status === 400, `Short password should be rejected: ${JSON.stringify(weakShort.payload)}`);
  assert(
    /at least 8 characters/i.test(weakShort.payload?.message ?? ""),
    `Unexpected short-password message: ${JSON.stringify(weakShort.payload)}`,
  );

  const weakCommon = await postJson(
    "/api/auth/reset-password",
    { code: resetCode, password: "password" },
    "198.51.100.56",
  );
  assert(weakCommon.response.status === 400, `Common password should be rejected: ${JSON.stringify(weakCommon.payload)}`);
  assert(
    /too common|stronger/i.test(weakCommon.payload?.message ?? ""),
    `Unexpected common-password message: ${JSON.stringify(weakCommon.payload)}`,
  );

  const reset = await postJson(
    "/api/auth/reset-password",
    { code: resetCode, password: "MailboxReset123!" },
    "198.51.100.56",
  );
  assert(reset.response.ok, `Password reset failed: ${JSON.stringify(reset.payload)}`);

  const oldPasswordLogin = await postJson(
    "/api/auth/sign-in",
    { email: mailbox.address, password: "MailboxPass123!" },
    "198.51.100.57",
  );
  assert(oldPasswordLogin.response.status === 401, "Old password should be invalid after reset.");

  const newPasswordLogin = await postJson(
    "/api/auth/sign-in",
    { email: mailbox.address, password: "MailboxReset123!" },
    "198.51.100.58",
  );
  assert(newPasswordLogin.response.ok, `New password login failed: ${JSON.stringify(newPasswordLogin.payload)}`);
  const setCookies = getSetCookieHeaders(newPasswordLogin.response);
  assert(
    setCookies.some((value) => value.includes("insforge_access_token")),
    `Expected secure session initialization cookie, got: ${setCookies.join("\n")}`,
  );

  return {
    mailbox: mailbox.address,
    resetCode,
    setCookieCount: setCookies.length,
  };
}

async function waitUntil(targetEpochMs) {
  const remainingMs = targetEpochMs - Date.now();
  if (remainingMs > 0) {
    await sleep(remainingMs);
  }
}

async function main() {
  console.log(`Running auth email E2E against ${BASE_URL}`);

  const results = {};
  results.resend = await verifyResendAndRateLimit();
  console.log("PASS resend verification delivery + throttling");

  results.verificationLifecycle = await verifyCodeLifecycle();
  console.log("PASS verification code lifecycle + expiry boundary");

  results.reset = await verifyForgotResetLoop();
  console.log("PASS forgot/reset password closed loop");

  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});
