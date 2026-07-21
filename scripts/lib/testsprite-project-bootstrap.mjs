import path from "node:path";

export const testspriteProjectMetadataRelativePath = path.join("testsprite_tests", "tmp", "project.json");
const acceptedProjectTargetStatusCodes = new Set([200, 204, 301, 302, 307, 308, 401, 403, 405]);
const protectedProjectTargetMarkers = [
  "https://vercel.com/sso-api",
  "x-vercel-protection-bypass",
];

export function parseBootstrapArgs(argv) {
  const options = {
    name: null,
    url: null,
    type: "frontend",
    instruction: null,
    json: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--name" && argv[index + 1]) {
      options.name = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--url" && argv[index + 1]) {
      options.url = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--type" && argv[index + 1]) {
      options.type = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--instruction" && argv[index + 1]) {
      options.instruction = argv[index + 1];
      index += 1;
    }
  }

  return options;
}

export function resolveProjectBootstrapConfig({
  cliArgs,
  processEnv = {},
  localEnv = new Map(),
  packageName = "testsprite-project",
}) {
  const projectName =
    cliArgs.name ||
    processEnv.TESTSPRITE_PROJECT_NAME ||
    localEnv.get("TESTSPRITE_PROJECT_NAME") ||
    packageName;

  const targetUrl =
    cliArgs.url ||
    processEnv.TESTSPRITE_PROJECT_URL ||
    processEnv.PLAYWRIGHT_BASE_URL ||
    localEnv.get("TESTSPRITE_PROJECT_URL") ||
    localEnv.get("PLAYWRIGHT_BASE_URL") ||
    localEnv.get("NEXT_PUBLIC_APP_URL") ||
    null;

  const instruction =
    cliArgs.instruction ||
    processEnv.TESTSPRITE_PROJECT_INSTRUCTION ||
    localEnv.get("TESTSPRITE_PROJECT_INSTRUCTION") ||
    null;

  return {
    projectName,
    targetUrl,
    type: cliArgs.type || "frontend",
    instruction,
    json: cliArgs.json,
    dryRun: cliArgs.dryRun,
  };
}

export function selectManagedProject({
  projectItems = [],
  cachedProject = null,
  projectName,
  targetUrl,
}) {
  if (cachedProject?.id) {
    const cachedMatch = projectItems.find((item) => item.id === cachedProject.id);
    if (cachedMatch) return cachedMatch;
  }

  const exactUrlMatch = projectItems.find((item) => item.targetUrl === targetUrl);
  if (exactUrlMatch) return exactUrlMatch;

  const exactNameMatch = projectItems.find((item) => item.name === projectName);
  if (exactNameMatch) return exactNameMatch;

  return null;
}

export function buildProjectMutationPlan({
  existingProject = null,
  projectName,
  targetUrl,
  type = "frontend",
  instruction = null,
}) {
  if (!targetUrl) {
    throw new Error(
      "Missing TestSprite project URL. Provide --url, TESTSPRITE_PROJECT_URL, PLAYWRIGHT_BASE_URL, or set NEXT_PUBLIC_APP_URL in .env.local.",
    );
  }

  if (!existingProject) {
    return {
      action: "create",
      reason: "No matching TestSprite cloud project exists yet.",
      args: buildCreateArgs({ projectName, targetUrl, type, instruction }),
    };
  }

  const requiresUpdate =
    existingProject.name !== projectName ||
    existingProject.targetUrl !== targetUrl;

  if (!requiresUpdate) {
    return {
      action: "noop",
      reason: "Existing TestSprite cloud project already matches the requested configuration.",
      args: [],
    };
  }

  return {
    action: "update",
    reason: "Existing TestSprite cloud project needs metadata alignment.",
    args: buildUpdateArgs({
      projectId: existingProject.id,
      projectName,
      targetUrl,
      instruction,
    }),
  };
}

function buildCreateArgs({ projectName, targetUrl, type, instruction }) {
  const args = [
    "project",
    "create",
    "--output",
    "json",
    "--type",
    type,
    "--name",
    projectName,
    "--url",
    targetUrl,
  ];

  if (instruction) {
    args.push("--instruction", instruction);
  }

  return args;
}

function buildUpdateArgs({ projectId, projectName, targetUrl, instruction }) {
  const args = [
    "project",
    "update",
    projectId,
    "--output",
    "json",
    "--name",
    projectName,
    "--url",
    targetUrl,
  ];

  if (instruction) {
    args.push("--instruction", instruction);
  }

  return args;
}

export function buildProjectMetadata({
  project,
  projectName,
  targetUrl,
  type,
  source = "testsprite-cli",
}) {
  const normalizedProject = normalizeProjectRecord(project);

  return {
    id: normalizedProject.id,
    name: normalizedProject.name ?? projectName,
    type: normalizedProject.type ?? type,
    targetUrl: normalizedProject.targetUrl ?? targetUrl,
    createdFrom: normalizedProject.createdFrom ?? source,
    createdAt: normalizedProject.createdAt ?? null,
    updatedAt: normalizedProject.updatedAt ?? null,
    syncedAt: new Date().toISOString(),
  };
}

export function normalizeProjectRecord(project = {}) {
  return {
    ...project,
    id: project.id ?? project.projectId ?? null,
    targetUrl: project.targetUrl ?? project.url ?? null,
  };
}

export function isAcceptedProjectTargetStatus(statusCode) {
  return acceptedProjectTargetStatusCodes.has(Number(statusCode));
}

export function formatProjectTargetValidationError(targetUrl, statusCode) {
  return `TestSprite project target URL is not currently usable: ${targetUrl} returned HTTP ${statusCode}. Provide a live staging or preview URL before bootstrapping the cloud project.`;
}

export function isProtectedProjectTarget({ effectiveUrl = "", responseHeaders = "" } = {}) {
  const normalizedEffectiveUrl = String(effectiveUrl).trim().toLowerCase();
  const normalizedHeaders = String(responseHeaders).toLowerCase();

  return protectedProjectTargetMarkers.some(
    (marker) =>
      normalizedEffectiveUrl.includes(marker) ||
      normalizedHeaders.includes(marker),
  );
}

export function formatProtectedProjectTargetError(targetUrl, effectiveUrl = null) {
  const redirectedSuffix = effectiveUrl
    ? ` The target currently redirects to ${effectiveUrl}.`
    : "";

  return [
    `TestSprite project target URL is protected by interactive access controls: ${targetUrl}.`,
    "Use a publicly reachable staging or custom-domain URL instead of a Vercel SSO-protected preview.",
    redirectedSuffix,
  ]
    .join(" ")
    .trim();
}

export function isLoopbackProjectTarget(targetUrl) {
  try {
    const { hostname } = new URL(targetUrl);
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}

export function formatLoopbackProjectTargetError(targetUrl) {
  return `TestSprite cloud projects do not accept loopback targets: ${targetUrl}. Use a live staging or preview URL for cloud project bootstrap, and keep localhost flows on the MCP local tunnel runner.`;
}
