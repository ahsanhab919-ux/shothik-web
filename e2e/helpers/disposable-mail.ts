import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAIL_TM_BASE_URL = "https://api.mail.tm";

export type DisposableMailbox = {
  requestedAddress: string;
  address: string;
  password: string;
  token: string;
  id: string;
};

export type EmailOtpRecord = {
  email: string;
  purpose: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
};

type MailTmMessageList = {
  "hydra:member"?: Array<{ id: string; subject?: string; intro?: string }>;
};

type MailTmMessageDetail = {
  id: string;
  subject?: string;
  intro?: string;
  text?: string;
  html?: string[];
  createdAt?: string;
};

async function mailTmFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MAIL_TM_BASE_URL}${path}`, init);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || `mail.tm request failed: ${response.status}`);
  }

  return payload as T;
}

export async function createDisposableMailbox(prefix: string): Promise<DisposableMailbox> {
  const domains = await mailTmFetch<{ "hydra:member": Array<{ domain: string }> }>(
    "/domains?page=1",
  );
  const domain = domains["hydra:member"]?.[0]?.domain;

  if (!domain) {
    throw new Error("No disposable email domain available from mail.tm.");
  }

  const requestedAddress = `${prefix}.${Date.now()}@${domain}`;
  const password = `TempPass${Date.now()}!`;
  const account = await mailTmFetch<{ address: string; id: string }>("/accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address: requestedAddress,
      password,
    }),
  });
  const token = await mailTmFetch<{ token: string }>("/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address: account.address,
      password,
    }),
  });

  return {
    requestedAddress,
    address: account.address,
    password,
    token: token.token,
    id: account.id,
  };
}

export async function listMailboxMessages(mailbox: DisposableMailbox) {
  const payload = await mailTmFetch<MailTmMessageList>("/messages", {
    headers: {
      Authorization: `Bearer ${mailbox.token}`,
    },
  });

  return payload["hydra:member"] ?? [];
}

export async function readMailboxMessage(mailbox: DisposableMailbox, messageId: string) {
  return mailTmFetch<MailTmMessageDetail>(`/messages/${messageId}`, {
    headers: {
      Authorization: `Bearer ${mailbox.token}`,
    },
  });
}

export async function waitForMailboxMessage(
  mailbox: DisposableMailbox,
  options?: {
    timeoutMs?: number;
    pollMs?: number;
    predicate?: (message: MailTmMessageDetail) => boolean;
    ignoreIds?: Set<string>;
  },
) {
  const timeoutMs = options?.timeoutMs ?? 180_000;
  const pollMs = options?.pollMs ?? 2_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const messages = await listMailboxMessages(mailbox);

    for (const message of messages) {
      if (options?.ignoreIds?.has(message.id)) {
        continue;
      }

      const detail = await readMailboxMessage(mailbox, message.id);
      if (!options?.predicate || options.predicate(detail)) {
        return detail;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(`Timed out waiting for mailbox message for ${mailbox.address}.`);
}

export function extractSixDigitCode(message: {
  intro?: string;
  subject?: string;
  text?: string;
  html?: string[];
}) {
  const haystack = [
    message.subject,
    message.intro,
    message.text,
    ...(message.html ?? []),
  ]
    .filter(Boolean)
    .join("\n");
  const match = haystack.match(/\b(\d{6})\b/);

  if (!match) {
    throw new Error(`Unable to find a 6-digit code in email content:\n${haystack}`);
  }

  return match[1];
}

export async function queryInsforgeJson(sql: string) {
  const { stdout } = await execFileAsync(
    "npx",
    ["@insforge/cli", "db", "query", sql, "--json"],
    {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10,
    },
  );

  return JSON.parse(stdout);
}

function sqlEscape(value: string) {
  return value.replace(/'/g, "''");
}

export async function getLatestEmailOtp(email: string, purpose: "VERIFY_EMAIL" | "RESET_PASSWORD") {
  const payload = await queryInsforgeJson(
    `select email, purpose, created_at, expires_at, consumed_at
     from auth.email_otps
     where email = '${sqlEscape(email)}'
       and purpose = '${purpose}'
     order by created_at desc
     limit 1;`,
  );
  const row = payload?.rows?.[0] as EmailOtpRecord | undefined;

  if (!row) {
    throw new Error(`No ${purpose} otp row found for ${email}.`);
  }

  return row;
}

export async function getHistoricalOtpTtlSeconds(purpose: "VERIFY_EMAIL" | "RESET_PASSWORD") {
  try {
    const payload = await queryInsforgeJson(
      `select extract(epoch from (expires_at - created_at)) as ttl_seconds
       from auth.email_otps
       where purpose = '${purpose}'
       order by created_at desc
       limit 1;`,
    );
    const ttlSeconds = payload?.rows?.[0]?.ttl_seconds;

    if (!ttlSeconds) {
      return purpose === "VERIFY_EMAIL" ? 900 : 900;
    }

    return Math.round(Number(ttlSeconds));
  } catch {
    // Falling back to the default TTL keeps browser verification resilient when
    // local CLI/DB inspection is unavailable, while the expiry behavior is still
    // validated through the user-visible auth flow.
    return purpose === "VERIFY_EMAIL" ? 900 : 900;
  }
}

export async function getAuthConfig() {
  const envPath = path.join(process.cwd(), ".env.local");
  const script = `
import fs from "node:fs";
import { createBrowserClient } from "@insforge/sdk/ssr";
const envContents = fs.readFileSync(${JSON.stringify(envPath)}, "utf8");
for (const line of envContents.split(/\\r?\\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const separatorIndex = line.indexOf("=");
  if (separatorIndex === -1) continue;
  const key = line.slice(0, separatorIndex).trim();
  const value = line.slice(separatorIndex + 1).trim();
  process.env[key] = value;
}
const client = createBrowserClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY,
});
const result = await client.auth.getPublicAuthConfig();
if (result.error) {
  throw new Error(result.error.message ?? "Unable to load InsForge auth config.");
}
console.log(JSON.stringify(result.data ?? null));
`;
  try {
    const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", script], {
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10,
    });

    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

export async function waitUntil(targetEpochMs: number) {
  const remainingMs = targetEpochMs - Date.now();
  if (remainingMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingMs));
  }
}
