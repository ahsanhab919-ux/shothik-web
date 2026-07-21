import type {
  MCPPackageHostTarget,
  ShothikMcpPackageManifest,
  ShothikSunpeakHostReadinessFixture,
  ShothikSunpeakInspectorFixture,
  ShothikSunpeakWorkflowFixture,
} from "./package-scaffold";

export interface CreativeStudioHostRuntimeScenarioObservation {
  scenarioId: string;
  observedStatusCode: number;
  observedResponseShape: string[];
}

export interface CreativeStudioHostRuntimeEvidence {
  hostTarget: MCPPackageHostTarget;
  authenticatedAccessEnforced: boolean;
  explicitConfirmationForRemoteWrites: boolean;
  exposesClientSecrets: boolean;
  nativeToolCatalogAvailable: boolean;
  scenarioObservations: CreativeStudioHostRuntimeScenarioObservation[];
  notes?: string[];
}

export interface CreativeStudioHostRuntimeAssertionResult {
  assertionId: string;
  description: string;
  severity: "required" | "recommended";
  ok: boolean;
  message: string;
}

export interface CreativeStudioHostRuntimeScenarioResult {
  fixtureId: string;
  scenarioId: string;
  title: string;
  ok: boolean;
  message: string;
}

export interface CreativeStudioHostRuntimeValidationHostResult {
  hostTarget: MCPPackageHostTarget;
  ok: boolean;
  assertionResults: CreativeStudioHostRuntimeAssertionResult[];
  scenarioResults: CreativeStudioHostRuntimeScenarioResult[];
  errors: string[];
  notes: string[];
}

export interface CreativeStudioHostRuntimeValidationResult {
  ok: boolean;
  hosts: CreativeStudioHostRuntimeValidationHostResult[];
  errors: string[];
}

export function validateCreativeStudioHostRuntime(args: {
  manifest: ShothikMcpPackageManifest;
  fixtures: ShothikSunpeakInspectorFixture[];
  evidence: CreativeStudioHostRuntimeEvidence[];
}): CreativeStudioHostRuntimeValidationResult {
  const hostFixtures = args.fixtures.filter(
    (fixture): fixture is ShothikSunpeakHostReadinessFixture =>
      fixture.fixtureType === "host_readiness",
  );
  const workflowFixtures = args.fixtures.filter(
    (fixture): fixture is ShothikSunpeakWorkflowFixture =>
      fixture.fixtureType === "workflow",
  );

  const supportedHosts = new Set(args.manifest.distribution.hostTargets);
  const unsupportedEvidenceErrors = args.evidence
    .filter((entry) => !supportedHosts.has(entry.hostTarget))
    .map(
      (entry) =>
        `Unsupported host-runtime evidence target ${entry.hostTarget}.`,
    );

  const hosts = args.manifest.distribution.hostTargets.map((hostTarget) =>
    validateHostTarget({
      hostTarget,
      hostFixture:
        hostFixtures.find((fixture) => fixture.hostTarget === hostTarget) ?? null,
      workflowFixtures,
      evidence: args.evidence.filter((entry) => entry.hostTarget === hostTarget),
    }),
  );

  const errors = [...unsupportedEvidenceErrors, ...hosts.flatMap((host) => host.errors)];

  return {
    ok: errors.length === 0,
    hosts,
    errors,
  };
}

function validateHostTarget(args: {
  hostTarget: MCPPackageHostTarget;
  hostFixture: ShothikSunpeakHostReadinessFixture | null;
  workflowFixtures: ShothikSunpeakWorkflowFixture[];
  evidence: CreativeStudioHostRuntimeEvidence[];
}): CreativeStudioHostRuntimeValidationHostResult {
  const errors: string[] = [];
  const primaryEvidence = args.evidence[0] ?? null;
  const notes = primaryEvidence?.notes ?? [];

  if (!args.hostFixture) {
    const message = `Missing host readiness fixture for ${args.hostTarget}.`;
    return {
      hostTarget: args.hostTarget,
      ok: false,
      assertionResults: [],
      scenarioResults: [],
      errors: [message],
      notes,
    };
  }

  if (args.evidence.length === 0) {
    const message = `Missing host-runtime evidence for ${args.hostTarget}.`;
    return {
      hostTarget: args.hostTarget,
      ok: false,
      assertionResults: [],
      scenarioResults: [],
      errors: [message],
      notes,
    };
  }

  if (args.evidence.length > 1) {
    const message = `Duplicate host-runtime evidence for ${args.hostTarget}.`;
    return {
      hostTarget: args.hostTarget,
      ok: false,
      assertionResults: [],
      scenarioResults: [],
      errors: [message],
      notes,
    };
  }

  const assertionResults = args.hostFixture.assertions.map((assertion) =>
    validateAssertion(args.hostTarget, assertion, primaryEvidence as CreativeStudioHostRuntimeEvidence),
  );
  const scenarioResults = flattenWorkflowScenarios(args.workflowFixtures).map(
    ({ fixtureId, scenarioId, title, expectedStatusCode, expectedResponseShape }) =>
      validateScenario({
        hostTarget: args.hostTarget,
        fixtureId,
        scenarioId,
        title,
        expectedStatusCode,
        expectedResponseShape,
        evidence: primaryEvidence as CreativeStudioHostRuntimeEvidence,
      }),
  );

  for (const result of assertionResults) {
    if (!result.ok && result.severity === "required") {
      errors.push(result.message);
    }
  }

  for (const result of scenarioResults) {
    if (!result.ok) {
      errors.push(result.message);
    }
  }

  return {
    hostTarget: args.hostTarget,
    ok: errors.length === 0,
    assertionResults,
    scenarioResults,
    errors,
    notes,
  };
}

function validateAssertion(
  hostTarget: MCPPackageHostTarget,
  assertion: ShothikSunpeakHostReadinessFixture["assertions"][number],
  evidence: CreativeStudioHostRuntimeEvidence,
): CreativeStudioHostRuntimeAssertionResult {
  const expectedPrefix = `${hostTarget}-`;
  let ok = true;
  let detail = "Assertion satisfied.";

  switch (assertion.id.replace(expectedPrefix, "")) {
    case "auth-required":
      ok = evidence.authenticatedAccessEnforced;
      detail = ok
        ? "Authenticated access remains enforced."
        : "Authenticated access is not enforced at runtime.";
      break;
    case "confirmation-gate":
      ok = evidence.explicitConfirmationForRemoteWrites;
      detail = ok
        ? "Remote writes still require explicit confirmation."
        : "Remote writes bypass the explicit confirmation gate.";
      break;
    case "no-client-secrets":
      ok = !evidence.exposesClientSecrets;
      detail = ok
        ? "No client-accessible secrets were exposed."
        : "Client-accessible secrets or raw connector credentials were exposed.";
      break;
    case "native-tool-catalog":
      ok = evidence.nativeToolCatalogAvailable;
      detail = ok
        ? "Approved native support tools are available to the host package."
        : "Approved native support tools are not available to the host package.";
      break;
    default:
      ok = false;
      detail = `Unsupported host-runtime assertion ${assertion.id}.`;
      break;
  }

  return {
    assertionId: assertion.id,
    description: assertion.description,
    severity: assertion.severity,
    ok,
    message: `${hostTarget}: ${detail}`,
  };
}

function validateScenario(args: {
  hostTarget: MCPPackageHostTarget;
  fixtureId: string;
  scenarioId: string;
  title: string;
  expectedStatusCode: number;
  expectedResponseShape: string[];
  evidence: CreativeStudioHostRuntimeEvidence;
}): CreativeStudioHostRuntimeScenarioResult {
  const observation = args.evidence.scenarioObservations.find(
    (entry) => entry.scenarioId === args.scenarioId,
  );

  if (!observation) {
    return {
      fixtureId: args.fixtureId,
      scenarioId: args.scenarioId,
      title: args.title,
      ok: false,
      message: `${args.hostTarget}: Missing runtime observation for scenario ${args.scenarioId}.`,
    };
  }

  const missingResponseKeys = args.expectedResponseShape.filter(
    (key) => !observation.observedResponseShape.includes(key),
  );

  if (observation.observedStatusCode !== args.expectedStatusCode) {
    return {
      fixtureId: args.fixtureId,
      scenarioId: args.scenarioId,
      title: args.title,
      ok: false,
      message:
        `${args.hostTarget}: Scenario ${args.scenarioId} returned ${observation.observedStatusCode}, ` +
        `expected ${args.expectedStatusCode}.`,
    };
  }

  if (missingResponseKeys.length > 0) {
    return {
      fixtureId: args.fixtureId,
      scenarioId: args.scenarioId,
      title: args.title,
      ok: false,
      message:
        `${args.hostTarget}: Scenario ${args.scenarioId} is missing response keys ` +
        `${missingResponseKeys.join(", ")}.`,
    };
  }

  return {
    fixtureId: args.fixtureId,
    scenarioId: args.scenarioId,
    title: args.title,
    ok: true,
    message: `${args.hostTarget}: Scenario ${args.scenarioId} matches the expected response contract.`,
  };
}

function flattenWorkflowScenarios(workflowFixtures: ShothikSunpeakWorkflowFixture[]) {
  return workflowFixtures.flatMap((fixture) =>
    fixture.scenarios.map((scenario) => ({
      fixtureId: fixture.fixtureId,
      scenarioId: scenario.id,
      title: scenario.title,
      expectedStatusCode: scenario.expect.statusCode,
      expectedResponseShape: scenario.expect.responseShape,
    })),
  );
}
