import { classifyValue } from "./credential-audit.mjs";

export const systemPrefixes = ["VERCEL_", "TURBO_"];
export const systemKeys = new Set(["NX_DAEMON", "VERCEL"]);
export const aiProviderKeys = [
  "KIMI_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "OPENROUTER_API_KEY",
];
export const requiredKeys = [
  "DATABASE_URL",
  "NEXT_PUBLIC_INSFORGE_URL",
  "NEXT_PUBLIC_INSFORGE_ANON_KEY",
];
export const compatibilityKeys = ["NEXT_PUBLIC_CONVEX_URL", "STRIPE_SECRET_KEY", "API_KEY_SALT"];

export function isSystemKey(key) {
  return systemKeys.has(key) || systemPrefixes.some((prefix) => key.startsWith(prefix));
}

function resolveEntryState(key, envEntries, listedKeys) {
  const rawValue = envEntries.get(key);
  const rawState = classifyValue(rawValue);

  if (rawState === "configured") {
    return {
      state: "configured",
      value: rawValue ?? null,
    };
  }

  if (listedKeys?.has(key)) {
    // `vercel env pull` can redact encrypted team/project values as empty strings
    // while `vercel env ls` still confirms the variable exists.
    return {
      state: "configured",
      value: rawValue ?? null,
    };
  }

  return {
    state: rawState,
    value: rawValue ?? null,
  };
}

export function buildVercelEnvAudit({
  environment = "production",
  envEntries,
  listedKeys = null,
  expectedInsforgeUrl = null,
  pulledAt = new Date().toISOString(),
}) {
  const userDefinedKeys = [...new Set([...(listedKeys ?? []), ...envEntries.keys()])]
    .filter((key) => !isSystemKey(key))
    .sort();

  const required = requiredKeys.map((key) => {
    const entry = resolveEntryState(key, envEntries, listedKeys);
    return {
      key,
      state: entry.state,
      value: entry.value,
    };
  });

  const aiProviders = aiProviderKeys.map((key) => {
    const entry = resolveEntryState(key, envEntries, listedKeys);
    return {
      key,
      state: entry.state,
    };
  });

  const compatibility = compatibilityKeys.map((key) => {
    const entry = resolveEntryState(key, envEntries, listedKeys);
    return {
      key,
      state: entry.state,
    };
  });

  const configuredAiProviders = aiProviders.filter((entry) => entry.state === "configured");
  const blockingIssues = [
    ...required.filter((entry) => entry.state !== "configured").map((entry) => ({
      key: entry.key,
      reason: entry.state,
    })),
  ];

  if (configuredAiProviders.length === 0) {
    blockingIssues.push({
      key: "AI_PROVIDER",
      reason: "missing",
    });
  }

  const insforgeUrl = required.find((entry) => entry.key === "NEXT_PUBLIC_INSFORGE_URL")?.value;
  const mismatchedInsforgeUrl =
    Boolean(expectedInsforgeUrl) &&
    Boolean(insforgeUrl) &&
    classifyValue(insforgeUrl) === "configured" &&
    insforgeUrl !== expectedInsforgeUrl;

  const warnings = [
    ...(mismatchedInsforgeUrl
      ? [
          `NEXT_PUBLIC_INSFORGE_URL is configured as ${insforgeUrl}, but the linked production backend host is ${expectedInsforgeUrl}.`,
        ]
      : []),
    ...compatibility
      .filter((entry) => entry.state !== "configured")
      .map(
        (entry) =>
          `${entry.key} is ${entry.state}; current legacy compatibility slices may still require it during build or runtime.`,
      ),
  ];

  return {
    environment,
    pulled_at: pulledAt,
    user_defined_variable_count: userDefinedKeys.length,
    user_defined_keys: userDefinedKeys,
    expected_production_insforge_url: expectedInsforgeUrl,
    required,
    ai_providers: aiProviders,
    compatibility,
    blocking_issues: blockingIssues,
    warnings,
    pass: blockingIssues.length === 0 && !mismatchedInsforgeUrl,
  };
}

export function formatVercelEnvAudit(audit) {
  const configuredAiProviders = audit.ai_providers.filter((entry) => entry.state === "configured");
  const lines = [
    `Vercel environment audit: ${audit.environment}`,
    `User-defined variables found: ${audit.user_defined_variable_count}`,
    "",
    "Blocking requirements:",
    ...audit.required.map((entry) => `- ${entry.key}: ${entry.state}`),
    `- AI provider requirement: ${
      configuredAiProviders.length > 0
        ? `configured via ${configuredAiProviders.map((entry) => entry.key).join(", ")}`
        : "missing"
    }`,
    "",
    "Compatibility warnings:",
    ...audit.compatibility.map((entry) => `- ${entry.key}: ${entry.state}`),
  ];

  if (audit.expected_production_insforge_url) {
    lines.push("");
    lines.push(`Expected production InsForge URL: ${audit.expected_production_insforge_url}`);
  }

  if (audit.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    lines.push(...audit.warnings.map((warning) => `- ${warning}`));
  }

  lines.push("");
  lines.push(`Result: ${audit.pass ? "PASS" : "FAIL"}`);

  return lines.join("\n");
}
