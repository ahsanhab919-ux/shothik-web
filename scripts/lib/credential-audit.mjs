import fs from "node:fs";

export const credentialSections = [
  {
    category: "Core platform",
    required: true,
    manager: "Vercel env + local .env.local",
    items: [
      {
        key: "DATABASE_URL",
        type: "database credential",
        note: "InsForge Postgres connection for server-side queries and migrations.",
      },
      {
        key: "NEXT_PUBLIC_INSFORGE_URL",
        type: "public runtime config",
        note: "Public InsForge base URL for browser and SSR auth clients.",
      },
      {
        key: "NEXT_PUBLIC_INSFORGE_ANON_KEY",
        type: "public runtime credential",
        note: "Public anon key for browser and SSR auth clients.",
      },
    ],
  },
  {
    category: "AI providers",
    required: true,
    manager: "Vercel env",
    oneOf: ["KIMI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY"],
    items: [
      { key: "KIMI_API_KEY", type: "API key", note: "Moonshot / Kimi provider." },
      { key: "OPENAI_API_KEY", type: "API key", note: "OpenAI provider." },
      { key: "ANTHROPIC_API_KEY", type: "API key", note: "Anthropic provider." },
      { key: "GEMINI_API_KEY", type: "API key", note: "Google Gemini provider." },
      { key: "OPENROUTER_API_KEY", type: "API key", note: "OpenRouter model gateway." },
    ],
  },
  {
    category: "Payments - Stripe",
    required: false,
    manager: "Vercel env",
    items: [
      {
        key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        type: "public runtime credential",
        note: "Client key for checkout UI.",
      },
      { key: "STRIPE_SECRET_KEY", type: "API key", note: "Server key for Stripe API calls." },
      {
        key: "STRIPE_WEBHOOK_SECRET",
        type: "webhook secret",
        note: "Primary Stripe webhook verification.",
      },
      {
        key: "STRIPE_CREDITS_WEBHOOK_SECRET",
        type: "webhook secret",
        note: "Credits webhook verification.",
      },
      {
        key: "STRIPE_SUBSCRIPTION_WEBHOOK_SECRET",
        type: "webhook secret",
        note: "Subscription webhook verification.",
      },
      {
        key: "CREDIT_PURCHASE_SECRET",
        type: "application secret",
        note: "Shared secret for credit-purchase fulfillment.",
      },
    ],
  },
  {
    category: "Payments - Razorpay / bKash",
    required: false,
    manager: "Vercel env",
    items: [
      { key: "NEXT_PUBLIC_RAZORPAY_KEY_ID", type: "public runtime credential", note: "Client Razorpay key ID." },
      { key: "RAZORPAY_KEY_ID", type: "API key", note: "Server Razorpay key ID." },
      { key: "RAZORPAY_KEY_SECRET", type: "API key secret", note: "Server Razorpay secret." },
      { key: "BKASH_BASE_URL", type: "service endpoint", note: "bKash API base URL." },
      { key: "BKASH_APP_KEY", type: "API key", note: "bKash app key." },
      { key: "BKASH_APP_SECRET", type: "API key secret", note: "bKash app secret." },
      { key: "BKASH_USERNAME", type: "account credential", note: "bKash username." },
      { key: "BKASH_PASSWORD", type: "account credential", note: "bKash password." },
    ],
  },
  {
    category: "Publishing and content distribution",
    required: false,
    manager: "Vercel env",
    items: [
      { key: "PUBLISHDRIVE_API_KEY", type: "API key", note: "PublishDrive API authentication." },
      {
        key: "PUBLISHDRIVE_WEBHOOK_SECRET",
        type: "webhook secret",
        note: "PublishDrive webhook signature verification.",
      },
      {
        key: "NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY",
        type: "restricted public API key",
        note: "Restricted Google Books API key for public metadata search from the browser.",
      },
      {
        key: "GOOGLE_BOOKS_API_KEY",
        type: "API key",
        note: "Server-side Google Books API key for backend metadata fetches if browser exposure is undesired.",
      },
      {
        key: "GOOGLE_DRIVE_CLIENT_ID",
        type: "OAuth client credential",
        note: "Google Drive OAuth client ID for user-authorized manuscript access.",
      },
      {
        key: "GOOGLE_DRIVE_CLIENT_SECRET",
        type: "OAuth client secret",
        note: "Google Drive OAuth client secret for backend token exchange.",
      },
      {
        key: "GOOGLE_DRIVE_REDIRECT_URI",
        type: "OAuth redirect config",
        note: "Redirect URI registered for Google Drive OAuth callbacks.",
      },
      {
        key: "GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL",
        type: "service account identity",
        note: "Service account identity for automated backend Drive workflows.",
      },
      {
        key: "GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY",
        type: "service account secret",
        note: "Private key for automated backend Drive workflows; keep server-only.",
      },
    ],
  },
  {
    category: "Caching and rate limiting",
    required: false,
    manager: "Vercel env / managed Redis",
    oneOf: ["UPSTASH_REDIS_REST_URL", "REDIS_URL"],
    items: [
      { key: "UPSTASH_REDIS_REST_URL", type: "service endpoint", note: "Upstash Redis REST endpoint." },
      { key: "UPSTASH_REDIS_REST_TOKEN", type: "access token", note: "Upstash Redis REST token." },
      { key: "REDIS_URL", type: "database credential", note: "Generic Redis URL." },
      { key: "REDIS_TOKEN", type: "access token", note: "Generic Redis auth token when required." },
    ],
  },
  {
    category: "Security and operations",
    required: false,
    manager: "Vercel env / secret manager",
    items: [
      { key: "API_KEY_SALT", type: "application secret", note: "Application HMAC salt used by API key helpers." },
      { key: "METRICS_ADMIN_KEY", type: "admin credential", note: "Admin key for metrics endpoints outside development." },
      { key: "GEO_COOKIE_SECRET", type: "application secret", note: "Dedicated cookie-signing secret for geolocation route." },
      { key: "SESSION_SECRET", type: "application secret", note: "Fallback signing secret where dedicated secrets are absent." },
      { key: "GOOGLE_GEOLOCATION_KEY", type: "API key", note: "Google geolocation API access." },
      { key: "SECOND_ME_VAULT_SECRET", type: "encryption secret", note: "Encryption root secret for Second Me vault storage." },
    ],
  },
  {
    category: "Preview access controls",
    required: false,
    manager: "Vercel Preview env",
    items: [
      { key: "PREVIEW_ACCESS_ALLOWED_EMAILS", type: "environment policy", note: "Allowlist for protected preview access." },
      { key: "PREVIEW_ACCESS_REQUIRED_SCOPES", type: "environment policy", note: "Required scopes for preview access." },
    ],
  },
  {
    category: "Legacy Convex compatibility",
    required: false,
    manager: "Legacy only; remove after migration",
    items: [
      { key: "NEXT_PUBLIC_CONVEX_URL", type: "legacy runtime config", note: "Still referenced by unmigrated Convex-backed features." },
      { key: "CONVEX_DEPLOY_KEY", type: "legacy admin credential", note: "Required by server-side Convex admin helpers." },
      { key: "CONVEX_SITE_URL", type: "legacy runtime config", note: "Used by the legacy convex-token auth bridge." },
      { key: "JWT_PRIVATE_KEY", type: "legacy signing secret", note: "Used by the legacy convex-token route and health env check history." },
    ],
  },
];

const placeholderFragments = [
  "placeholder",
  "replace-me",
  "replace_me",
  "changeme",
  "change-me",
  "your-",
  "your_",
  "example.insforge.app",
  "example.convex.cloud",
  "example.com",
  "your-deployment",
  "your-appkey",
  "dev:your-deployment-name",
];

export function parseEnvContent(contents) {
  const values = new Map();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = normalized.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
  }

  return values;
}

export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return new Map();
  }

  return parseEnvContent(fs.readFileSync(filePath, "utf8"));
}

export function classifyValue(value) {
  if (value === undefined || value === null) {
    return "missing";
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return "missing";
  }

  const lowered = normalized.toLowerCase();
  if (placeholderFragments.some((fragment) => lowered.includes(fragment))) {
    return "placeholder";
  }

  return "configured";
}

function getEffectiveEntry(key, fileEnv, processEnv) {
  const processValue = processEnv[key];
  if (processValue !== undefined) {
    return {
      value: processValue,
      source: "process.env",
      state: classifyValue(processValue),
    };
  }

  if (fileEnv.has(key)) {
    const fileValue = fileEnv.get(key);
    return {
      value: fileValue,
      source: ".env.local",
      state: classifyValue(fileValue),
    };
  }

  return {
    value: undefined,
    source: null,
    state: "missing",
  };
}

export function buildCredentialAudit({
  fileEnv = new Map(),
  processEnv = process.env,
} = {}) {
  const summary = [];
  const blockingGaps = [];
  const migrationWarnings = [];

  for (const section of credentialSections) {
    let configuredCount = 0;
    let placeholderCount = 0;
    let missingCount = 0;

    const rows = section.items.map((item) => {
      const entry = getEffectiveEntry(item.key, fileEnv, processEnv);

      if (entry.state === "configured") configuredCount += 1;
      if (entry.state === "placeholder") placeholderCount += 1;
      if (entry.state === "missing") missingCount += 1;

      return {
        key: item.key,
        type: item.type,
        note: item.note,
        source: entry.source,
        status: entry.state,
      };
    });

    const oneOfSatisfied = section.oneOf
      ? section.oneOf.some((key) => getEffectiveEntry(key, fileEnv, processEnv).state === "configured")
      : null;

    const requiredGapRows = section.required
      ? rows.filter((row) => {
          if (section.oneOf?.includes(row.key)) {
            return oneOfSatisfied === false;
          }

          return row.status !== "configured";
        })
      : [];

    const status =
      section.required && requiredGapRows.length > 0
        ? "blocking"
        : placeholderCount > 0 || missingCount > 0
          ? "partial"
          : "ready";

    if (status === "blocking") {
      if (oneOfSatisfied === false && section.oneOf) {
        blockingGaps.push({
          category: section.category,
          key: section.oneOf.join(" | "),
          reason: "At least one credential in this group must be configured.",
        });
      }

      for (const row of requiredGapRows) {
        if (section.oneOf?.includes(row.key)) {
          continue;
        }

        blockingGaps.push({
          category: section.category,
          key: row.key,
          reason:
            row.status === "placeholder"
              ? "Replace placeholder value with a real credential."
              : "Credential is missing.",
        });
      }
    }

    if (section.category === "Legacy Convex compatibility") {
      for (const row of rows) {
        if (row.status === "configured") {
          migrationWarnings.push({
            category: section.category,
            key: row.key,
            reason: "Legacy Convex compatibility credential is still configured.",
          });
        }
      }
    }

    summary.push({
      category: section.category,
      required: section.required,
      manager: section.manager,
      oneOfSatisfied,
      configuredCount,
      placeholderCount,
      missingCount,
      total: section.items.length,
      status,
      rows,
    });
  }

  return {
    summary,
    blockingGaps,
    migrationWarnings,
  };
}
