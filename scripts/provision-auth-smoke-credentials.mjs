import { randomBytes } from "node:crypto";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const MAIL_TM_BASE_URL = "https://api.mail.tm";

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

async function createMailbox() {
  const domains = await mailTmFetch("/domains?page=1");
  const domain = domains?.["hydra:member"]?.[0]?.domain;
  assert(domain, "No disposable mail domain available from mail.tm.");

  const localPart = `shothik-smoke-${Date.now()}`;
  const address = `${localPart}@${domain}`;
  const mailboxPassword = `Mailbox-${randomBytes(8).toString("hex")}!`;

  const account = await mailTmFetch("/accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address,
      password: mailboxPassword,
    }),
  });

  const token = await mailTmFetch("/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address,
      password: mailboxPassword,
    }),
  });

  return {
    address: account.address,
    mailboxPassword,
    token: token.token,
  };
}

async function listMessages(mailboxToken) {
  const payload = await mailTmFetch("/messages", {
    headers: {
      Authorization: `Bearer ${mailboxToken}`,
    },
  });

  return payload?.["hydra:member"] ?? [];
}

async function readMessage(mailboxToken, messageId) {
  return mailTmFetch(`/messages/${messageId}`, {
    headers: {
      Authorization: `Bearer ${mailboxToken}`,
    },
  });
}

async function waitForVerificationCode(mailboxToken, email) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 180_000) {
    const messages = await listMessages(mailboxToken);

    for (const message of messages) {
      const detail = await readMessage(mailboxToken, message.id);
      const haystack = [detail.subject, detail.intro, detail.text, ...(detail.html ?? [])]
        .filter(Boolean)
        .join("\n");
      const codeMatch = haystack.match(/\b(\d{6})\b/);
      if (codeMatch) {
        return codeMatch[1];
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  throw new Error(`Timed out waiting for verification email for ${email}.`);
}

async function postJson(path, body, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.cookieHeader ? { Cookie: options.cookieHeader } : {}),
      ...(options.forwardedFor ? { "x-forwarded-for": options.forwardedFor } : {}),
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { raw };
    }
  }

  return { response, payload };
}

async function main() {
  const mailbox = await createMailbox();
  const appPassword = `Smoke-${randomBytes(12).toString("hex")}!`;
  const ipSeed = (Date.now() % 200) + 20;

  const signUp = await postJson("/api/auth/sign-up", {
    name: "Shothik Smoke QA",
    email: mailbox.address,
    password: appPassword,
    country: "Bangladesh",
  }, { forwardedFor: `198.51.100.${ipSeed}` });
  assert(signUp.response.ok, `Smoke account sign-up failed: ${JSON.stringify(signUp.payload)}`);

  const verificationCode = await waitForVerificationCode(mailbox.token, mailbox.address);
  const verify = await postJson("/api/auth/verify-email", {
    email: mailbox.address,
    code: verificationCode,
  }, { forwardedFor: `198.51.100.${ipSeed + 1}` });
  assert(verify.response.ok, `Smoke account verification failed: ${JSON.stringify(verify.payload)}`);

  const signIn = await postJson("/api/auth/sign-in", {
    email: mailbox.address,
    password: appPassword,
  }, { forwardedFor: `198.51.100.${ipSeed + 2}` });
  assert(signIn.response.ok, `Smoke account sign-in failed: ${JSON.stringify(signIn.payload)}`);

  console.log(
    JSON.stringify(
      {
        smokeEmail: mailbox.address,
        smokePassword: appPassword,
        mailboxPassword: mailbox.mailboxPassword,
        verified: true,
        signIn: "ok",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
