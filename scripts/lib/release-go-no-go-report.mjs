import {
  buildMilestoneBreakdown,
  releaseReadinessBaseline,
} from "./release-readiness-report.mjs";

function makeEvidenceItems(state) {
  const items = [];

  if (state.readinessArtifactsGenerated) {
    items.push(
      "Current readiness artifacts were generated successfully for the active validation date.",
    );
  }

  if (state.readinessValidationPassed) {
    items.push(
      "Release-readiness reporting tests passed for the current Batch 6 control model.",
    );
  }

  if (releaseReadinessBaseline.validation.typeCheck.status === "Pass") {
    items.push("Workspace type-check is currently passing.");
  }

  if (releaseReadinessBaseline.validation.tests.status === "Pass") {
    items.push(
      `Focused certification suites are passing (${releaseReadinessBaseline.validation.tests.files} files, ${releaseReadinessBaseline.validation.tests.tests} tests).`,
    );
  }

  items.push("Batches 1 through 5 are complete in the delivery trackers.");

  return items;
}

function makeHardBlockers(state) {
  const blockers = [];

  if (!state.smokeCredentialsReady) {
    blockers.push(
      "Authenticated browser smoke credentials are not configured for the target certification environment.",
    );
  }

  if (!state.publishDriveSecretsReady) {
    blockers.push(
      "PublishDrive environment secrets are not configured for live provider certification.",
    );
  }

  if (!state.stripeSecretReady) {
    blockers.push(
      "STRIPE_SECRET_KEY is not configured for live payout and provider certification.",
    );
  }

  if (!state.githubTrackerSyncReady) {
    blockers.push(
      "GitHub live tracker sync is not confirmed write-ready in the current environment.",
    );
  }

  if (!state.readinessArtifactsGenerated) {
    blockers.push(
      "Current release-readiness artifacts have not been generated for the active validation date.",
    );
  }

  if (!state.readinessValidationPassed) {
    blockers.push(
      "Release-readiness reporting tests have not been validated for the active control state.",
    );
  }

  return Array.from(new Set(blockers));
}

function makeTrackerBlockers(milestones) {
  return milestones.pending
    .filter((item) => item.status === "Blocked")
    .map((item) => `${item.milestone}: ${item.dependency}`);
}

function makeNextActions(state) {
  const actions = [];

  if (!state.smokeCredentialsReady) {
    actions.push(
      "Provision PLAYWRIGHT_SMOKE_EMAIL and PLAYWRIGHT_SMOKE_PASSWORD for the authenticated browser certification run.",
    );
  }

  if (!state.publishDriveSecretsReady) {
    actions.push(
      "Provision PublishDrive environment secrets in the target certification environment.",
    );
  }

  if (!state.stripeSecretReady) {
    actions.push(
      "Provision STRIPE_SECRET_KEY in the target certification environment.",
    );
  }

  if (!state.githubTrackerSyncReady) {
    actions.push(
      "Restore or confirm write-capable GitHub tracker credentials before final tracker synchronization.",
    );
  }

  actions.push(
    "Run the full Batch 6 credentialed certification pass across auth, native tools, agents, and the writing-to-publishing workflow.",
  );

  return actions;
}

export function buildReleaseGoNoGoAudit(state) {
  const milestones = buildMilestoneBreakdown();
  const blockers = makeHardBlockers(state);
  const trackerBlockers = makeTrackerBlockers(milestones);
  const decision = blockers.length === 0 ? "GO" : "NO_GO";

  return {
    validatedOn: state.validatedOn ?? releaseReadinessBaseline.validatedOn,
    decision,
    summary:
      decision === "GO"
        ? "Release readiness is approved based on the current certification evidence."
        : "Release readiness is not yet approved because one or more certification blockers remain active.",
    environment: {
      smokeCredentialsReady: Boolean(state.smokeCredentialsReady),
      publishDriveSecretsReady: Boolean(state.publishDriveSecretsReady),
      stripeSecretReady: Boolean(state.stripeSecretReady),
      githubTrackerSyncReady: Boolean(state.githubTrackerSyncReady),
      readinessArtifactsGenerated: Boolean(state.readinessArtifactsGenerated),
      readinessValidationPassed: Boolean(state.readinessValidationPassed),
    },
    evidence: makeEvidenceItems(state),
    blockers,
    trackerBlockers,
    nextActions: makeNextActions(state),
    milestones,
  };
}

function renderBullets(items) {
  if (!items.length) return "- None";
  return items.map((item) => `- ${item}`).join("\n");
}

export function formatReleaseGoNoGoMarkdown(audit) {
  return `# Batch 6 Release Go/No-Go - ${audit.validatedOn}

## Decision

- Status: \`${audit.decision}\`
- Summary: ${audit.summary}

## Environment Readiness

- Authenticated smoke credentials ready: ${
    audit.environment.smokeCredentialsReady ? "yes" : "no"
  }
- PublishDrive secrets ready: ${
    audit.environment.publishDriveSecretsReady ? "yes" : "no"
  }
- Stripe secret ready: ${audit.environment.stripeSecretReady ? "yes" : "no"}
- GitHub tracker sync ready: ${
    audit.environment.githubTrackerSyncReady ? "yes" : "no"
  }
- Readiness artifacts generated: ${
    audit.environment.readinessArtifactsGenerated ? "yes" : "no"
  }
- Readiness validation passed: ${
    audit.environment.readinessValidationPassed ? "yes" : "no"
  }

## Certification Evidence

${renderBullets(audit.evidence)}

## Blocking Issues

${renderBullets(audit.blockers)}

## Tracker Blockers

${renderBullets(audit.trackerBlockers ?? [])}

## Next Actions

${renderBullets(audit.nextActions)}
`;
}
