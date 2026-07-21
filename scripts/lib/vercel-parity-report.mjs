import { classifyValue } from "./credential-audit.mjs";

function collectConfiguredKeys(entries, allowListed = null, listedKeys = null) {
  const keys = new Set();

  const candidateKeys = allowListed ? [...allowListed] : [...entries.keys()];

  for (const key of candidateKeys) {
    const value = entries.get(key);
    if (classifyValue(value) === "configured" || listedKeys?.has(key)) {
      keys.add(key);
    }
  }

  return keys;
}

function summarizeSection(name, missingOnLocal, missingOnVercel, mismatchedValues) {
  return {
    name,
    missing_on_local: missingOnLocal.sort(),
    missing_on_vercel: missingOnVercel.sort(),
    mismatched_values: mismatchedValues.sort(),
  };
}

export function buildVercelParityReport({
  localEnvEntries,
  vercelAudit,
  vercelEnvEntries,
  vercelListedKeys = null,
  localAudit,
}) {
  const relevantKeys = new Set([
    ...vercelAudit.required.map((entry) => entry.key),
    ...vercelAudit.ai_providers.map((entry) => entry.key),
    ...vercelAudit.compatibility.map((entry) => entry.key),
  ]);

  const localConfigured = collectConfiguredKeys(localEnvEntries, relevantKeys);
  const vercelConfigured = collectConfiguredKeys(
    vercelEnvEntries,
    relevantKeys,
    vercelListedKeys,
  );

  const missingOnLocal = [...vercelConfigured].filter((key) => !localConfigured.has(key));
  const missingOnVercel = [...localConfigured].filter((key) => !vercelConfigured.has(key));
  const mismatchedValues = [...relevantKeys].filter((key) => {
    if (!localConfigured.has(key) || !vercelConfigured.has(key)) return false;
    const localValue = localEnvEntries.get(key) ?? "";
    const vercelValue = vercelEnvEntries.get(key) ?? "";
    if (vercelListedKeys?.has(key) && classifyValue(vercelValue) !== "configured") {
      return false;
    }
    return (
      classifyValue(localValue) === "configured" &&
      classifyValue(vercelValue) === "configured" &&
      localValue !== vercelValue
    );
  });

  const criticalSections = [
    summarizeSection(
      "Core platform",
      missingOnLocal.filter((key) => vercelAudit.required.some((entry) => entry.key === key)),
      missingOnVercel.filter((key) => vercelAudit.required.some((entry) => entry.key === key)),
      mismatchedValues.filter((key) => vercelAudit.required.some((entry) => entry.key === key)),
    ),
    summarizeSection(
      "AI providers",
      missingOnLocal.filter((key) => vercelAudit.ai_providers.some((entry) => entry.key === key)),
      missingOnVercel.filter((key) => vercelAudit.ai_providers.some((entry) => entry.key === key)),
      mismatchedValues.filter((key) => vercelAudit.ai_providers.some((entry) => entry.key === key)),
    ),
    summarizeSection(
      "Compatibility and payments",
      missingOnLocal.filter((key) => vercelAudit.compatibility.some((entry) => entry.key === key)),
      missingOnVercel.filter((key) => vercelAudit.compatibility.some((entry) => entry.key === key)),
      mismatchedValues.filter((key) => vercelAudit.compatibility.some((entry) => entry.key === key)),
    ),
  ];

  const blockers = [
    ...vercelAudit.blocking_issues.map(
      (issue) => `Vercel ${vercelAudit.environment}: ${issue.key} is ${issue.reason}.`,
    ),
    ...criticalSections.flatMap((section) =>
      section.missing_on_local.map(
        (key) => `Local parity gap: ${key} is configured on Vercel but missing locally.`,
      ),
    ),
  ];

  const remediation = [
    ...criticalSections.flatMap((section) =>
      section.missing_on_local.map(
        (key) => `Mirror ${key} into local secure env files or document why local parity is intentionally not required.`,
      ),
    ),
    ...criticalSections.flatMap((section) =>
      section.missing_on_vercel.map(
        (key) => `Provision ${key} in Vercel ${vercelAudit.environment} if the feature is expected to run in deployed environments.`,
      ),
    ),
    ...criticalSections.flatMap((section) =>
      section.mismatched_values.map(
        (key) => `Review ${key} for environment drift between local and Vercel ${vercelAudit.environment}.`,
      ),
    ),
  ];

  return {
    environment: vercelAudit.environment,
    generated_at: new Date().toISOString(),
    local_credential_status: localAudit.summary.map((section) => ({
      category: section.category,
      status: section.status,
      configuredCount: section.configuredCount,
      placeholderCount: section.placeholderCount,
      missingCount: section.missingCount,
    })),
    vercel_pass: vercelAudit.pass,
    sections: criticalSections,
    blockers,
    warnings: vercelAudit.warnings,
    remediation,
  };
}

export function formatVercelParityReport(report) {
  const lines = [
    `# Vercel Parity Audit - ${report.environment}`,
    "",
    `- Generated at: ${report.generated_at}`,
    `- Vercel audit pass: ${report.vercel_pass ? "yes" : "no"}`,
    "",
    "## Local Credential Summary",
    ...report.local_credential_status.map(
      (section) =>
        `- ${section.category}: ${section.status} (configured=${section.configuredCount}, placeholder=${section.placeholderCount}, missing=${section.missingCount})`,
    ),
    "",
    "## Parity Findings",
    ...report.sections.flatMap((section) => [
      `- ${section.name}:`,
      `  missing on local -> ${section.missing_on_local.length > 0 ? section.missing_on_local.join(", ") : "none"}`,
      `  missing on vercel -> ${section.missing_on_vercel.length > 0 ? section.missing_on_vercel.join(", ") : "none"}`,
      `  mismatched values -> ${section.mismatched_values.length > 0 ? section.mismatched_values.join(", ") : "none"}`,
    ]),
    "",
    "## Blockers",
    ...(report.blockers.length > 0 ? report.blockers.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Warnings",
    ...(report.warnings.length > 0 ? report.warnings.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Remediation",
    ...(report.remediation.length > 0 ? report.remediation.map((item) => `- ${item}`) : ["- none"]),
  ];

  return lines.join("\n");
}
