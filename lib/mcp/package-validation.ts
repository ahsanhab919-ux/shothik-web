import type {
  ShothikMcpPackageManifest,
  ShothikSunpeakInspectorFixture,
  ShothikSunpeakWorkflowFixture,
} from "./package-scaffold";

export interface CreativeStudioPackageFixtureFile {
  path: string;
  fixture: ShothikSunpeakInspectorFixture;
}

export interface CreativeStudioPackageValidationResult {
  ok: boolean;
  errors: string[];
}

function validateWorkflowFixtures(
  workflowFixtures: ShothikSunpeakWorkflowFixture[],
  errors: string[],
) {
  const hasDryRun = workflowFixtures.some((fixture) =>
    fixture.scenarios.some(
      (scenario) =>
        scenario.request.body.dryRun === true && scenario.expect.statusCode === 200,
    ),
  );
  const hasConfirmationGate = workflowFixtures.some((fixture) =>
    fixture.scenarios.some(
      (scenario) =>
        scenario.request.body.dryRun !== true &&
        scenario.request.body.confirmed !== true &&
        scenario.expect.statusCode === 409,
    ),
  );
  const hasConfirmedExecution = workflowFixtures.some((fixture) =>
    fixture.scenarios.some(
      (scenario) =>
        scenario.request.body.dryRun !== true &&
        scenario.request.body.confirmed === true &&
        scenario.expect.statusCode === 200,
    ),
  );

  if (!hasDryRun) {
    errors.push("Package fixtures must include at least one dry-run planning scenario.");
  }

  if (!hasConfirmationGate) {
    errors.push(
      "Package fixtures must include at least one confirmation-gate scenario for remote writes.",
    );
  }

  if (!hasConfirmedExecution) {
    errors.push(
      "Package fixtures must include at least one confirmed execution scenario.",
    );
  }
}

export function validateCreativeStudioPackageArtifacts(
  manifest: ShothikMcpPackageManifest,
  fixtureFiles: CreativeStudioPackageFixtureFile[],
): CreativeStudioPackageValidationResult {
  const errors: string[] = [];
  const fixturePaths = fixtureFiles.map((entry) => entry.path);
  const availableNativeTools = new Set(manifest.connectorCatalog.availableNativeTools);
  const workflowFixtures = fixtureFiles
    .map((entry) => entry.fixture)
    .filter(
      (fixture): fixture is ShothikSunpeakWorkflowFixture =>
        fixture.fixtureType === "workflow",
    );
  const hostFixtures = fixtureFiles
    .map((entry) => entry.fixture)
    .filter((fixture) => fixture.fixtureType === "host_readiness");

  if (new Set(fixturePaths).size !== fixturePaths.length) {
    errors.push("Inspector fixture paths must be unique.");
  }

  if (
    manifest.distribution.inspectorFixturePaths.length !== fixtureFiles.length ||
    !manifest.distribution.inspectorFixturePaths.every((path) =>
      fixturePaths.includes(path),
    )
  ) {
    errors.push(
      "Manifest inspectorFixturePaths must exactly match the checked-in fixture files.",
    );
  }

  const fixtureIds = fixtureFiles.map((entry) => entry.fixture.fixtureId);
  if (new Set(fixtureIds).size !== fixtureIds.length) {
    errors.push("Inspector fixture ids must be unique.");
  }

  for (const { fixture } of fixtureFiles) {
    if (fixture.packageId !== manifest.packageId) {
      errors.push(`Fixture ${fixture.fixtureId} must match manifest packageId.`);
    }

    if (fixture.uiPath !== manifest.workflowSurface.uiPath) {
      errors.push(`Fixture ${fixture.fixtureId} must match manifest uiPath.`);
    }

    if (fixture.apiPath !== manifest.workflowSurface.apiPath) {
      errors.push(`Fixture ${fixture.fixtureId} must match manifest apiPath.`);
    }

    if (
      fixture.expectedRemoteConnectorSlug !==
      manifest.connectorCatalog.remoteConnectorSlug
    ) {
      errors.push(
        `Fixture ${fixture.fixtureId} must match manifest remote connector slug.`,
      );
    }

    for (const toolName of fixture.requiredNativeTools) {
      if (!availableNativeTools.has(toolName)) {
        errors.push(
          `Fixture ${fixture.fixtureId} references unknown native tool ${toolName}.`,
        );
      }
    }

    if (fixture.fixtureType === "workflow") {
      if (fixture.scenarios.length === 0) {
        errors.push(`Workflow fixture ${fixture.fixtureId} must include scenarios.`);
      }

      const scenarioIds = fixture.scenarios.map((scenario) => scenario.id);
      if (new Set(scenarioIds).size !== scenarioIds.length) {
        errors.push(
          `Workflow fixture ${fixture.fixtureId} must use unique scenario ids.`,
        );
      }

      for (const scenario of fixture.scenarios) {
        if (scenario.request.path !== manifest.workflowSurface.apiPath) {
          errors.push(
            `Scenario ${scenario.id} in ${fixture.fixtureId} must target the package apiPath.`,
          );
        }

        if (scenario.expect.responseShape.length === 0) {
          errors.push(
            `Scenario ${scenario.id} in ${fixture.fixtureId} must declare responseShape assertions.`,
          );
        }
      }
    }

    if (fixture.fixtureType === "host_readiness") {
      if (!manifest.distribution.hostTargets.includes(fixture.hostTarget)) {
        errors.push(
          `Host readiness fixture ${fixture.fixtureId} targets unsupported host ${fixture.hostTarget}.`,
        );
      }

      if (fixture.assertions.length === 0) {
        errors.push(
          `Host readiness fixture ${fixture.fixtureId} must include assertions.`,
        );
      }
    }
  }

  validateWorkflowFixtures(workflowFixtures, errors);

  for (const hostTarget of manifest.distribution.hostTargets) {
    if (!hostFixtures.some((fixture) => fixture.hostTarget === hostTarget)) {
      errors.push(`Missing host readiness fixture for ${hostTarget}.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
