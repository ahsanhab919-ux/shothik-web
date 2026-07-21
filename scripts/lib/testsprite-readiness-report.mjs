function formatDependencyList(items) {
  if (!items.length) return "None";
  return items.join("; ");
}

function normalizeOwner(owner) {
  return owner ?? "Ahsan Habib (@ahsanhab919-ux)";
}

export function summarizeTestResults(testResults = []) {
  const statusCounts = {};

  for (const result of testResults) {
    const status = result?.testStatus ?? "UNKNOWN";
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  }

  const total = testResults.length;
  const passed = statusCounts.PASSED ?? 0;
  const failed = total - passed;

  return {
    total,
    passed,
    failed,
    statusCounts,
    passRate: total === 0 ? 0 : Number(((passed / total) * 100).toFixed(2)),
  };
}

export function hasPlaceholderAnalysis(rawReport = "") {
  return rawReport.includes("{{TODO:AI_ANALYSIS}}") || rawReport.includes("{AI_GNERATED_KET_GAPS_AND_RISKS}");
}

export function buildCompletedWorkstreams(state) {
  const items = [];

  if (state.apiKeyConfigured) {
    items.push({
      workstream: "Secure API key configuration",
      evidence: `TestSprite API key is configured through ${state.apiKeySource ?? "a resolved secure source"}.`,
    });
  }

  if (state.workspaceArtifactsReady) {
    items.push({
      workstream: "Workspace bootstrap and artifact generation",
      evidence:
        "PRD, code summary, frontend plan, and curated report exist under testsprite_tests/.",
    });
  }

  if (state.runnerScriptsReady) {
    items.push({
      workstream: "Sandbox-safe local runner",
      evidence:
        "Workspace-local HOME override and lock-management scripts are available through package.json.",
    });
  }

  if (state.cliAuthenticated) {
    items.push({
      workstream: "Cloud CLI authentication",
      evidence: `Authenticated CLI profile for ${state.accountEmail ?? "the current account"} is available.`,
    });
  }

  if (state.lastRunSummary.total > 0 && state.lastRunSummary.failed === 0) {
    items.push({
      workstream: "Public smoke batch validation",
      evidence: `${state.lastRunSummary.passed}/${state.lastRunSummary.total} latest TestSprite cases passed.`,
    });
  }

  if (state.curatedReportPresent) {
    items.push({
      workstream: "Human-readable verification report",
      evidence: "Curated markdown report exists and captures the latest verified execution state.",
    });
  }

  return items;
}

export function buildPendingTasks(state) {
  const tasks = [];

  if (!state.apiKeyConfigured) {
    tasks.push({
      task: "Configure TESTSPRITE_API_KEY through Trae MCP env, shell env, or an ignored local env file",
      priority: "critical",
      owner: normalizeOwner(state.defaultOwner),
      status: "blocked",
      upstreamDependencies: ["Access to a valid TestSprite API key"],
      downstreamDependencies: ["Local runtime execution", "Cloud project bootstrap", "CLI authentication recovery"],
    });
  }

  if (!state.projectConfigured) {
    tasks.push({
      task: "Create a persistent TestSprite cloud project for staging or preview execution",
      priority: "high",
      owner: normalizeOwner(state.defaultOwner),
      status: "ready",
      upstreamDependencies: ["Validated staging or preview URL"],
      downstreamDependencies: [
        "CLI-managed cloud test inventory",
        "Repeatable remote runs without regenerating MCP workspace state",
      ],
    });
  }

  if (!state.authJourneyCredentialsReady) {
    tasks.push({
      task: "Provision authenticated smoke credentials for login/chat/signup journeys",
      priority: "high",
      owner: normalizeOwner(state.defaultOwner),
      status: "blocked",
      upstreamDependencies: ["Dedicated test account", "Local or preview secret distribution"],
      downstreamDependencies: ["Authenticated TestSprite coverage", "Higher-value regression confidence"],
    });
  }

  if (state.rawReportHasPlaceholders && !state.curatedReportPresent) {
    tasks.push({
      task: "Eliminate placeholder sections from generated raw TestSprite report or document the curated-report fallback",
      priority: "medium",
      owner: normalizeOwner(state.defaultOwner),
      status: "in_progress",
      upstreamDependencies: ["TestSprite raw report template behavior"],
      downstreamDependencies: ["Cleaner handoff artifacts for review and audit"],
    });
  }

  if (!state.agentSkillInstalled) {
    tasks.push({
      task: "Install the optional TestSprite agent skill into the coding-agent configuration",
      priority: "low",
      owner: normalizeOwner(state.defaultOwner),
      status: "ready",
      upstreamDependencies: ["Decision to persist TestSprite agent guidance in this workspace"],
      downstreamDependencies: ["In-tool onboarding convenience only"],
    });
  }

  return tasks;
}

export function buildTestSpriteAudit(state) {
  const lastRunSummary = summarizeTestResults(state.testResults);
  const derivedState = {
    ...state,
    lastRunSummary,
  };

  return {
    validatedOn: state.validatedOn,
    account: {
      email: state.accountEmail ?? "unknown",
      credits: state.credits ?? null,
      subPlan: state.subPlan ?? null,
    },
    environment: {
      cliInstalled: state.cliInstalled,
      cliVersion: state.cliVersion ?? "unknown",
      cliAuthenticated: state.cliAuthenticated,
      apiKeyConfigured: state.apiKeyConfigured,
      apiKeySource: state.apiKeySource ?? "unknown",
      localAppReachable: state.localAppReachable,
      runnerScriptsReady: state.runnerScriptsReady,
      workspaceArtifactsReady: state.workspaceArtifactsReady,
      projectConfigured: state.projectConfigured,
      agentSkillInstalled: state.agentSkillInstalled,
      runtimeLockPresent: state.runtimeLockPresent,
      authJourneyCredentialsReady: state.authJourneyCredentialsReady,
    },
    lastRunSummary,
    completedWorkstreams: buildCompletedWorkstreams(derivedState),
    pendingTasks: buildPendingTasks({
      ...derivedState,
      rawReportHasPlaceholders: state.rawReportHasPlaceholders,
      curatedReportPresent: state.curatedReportPresent,
    }),
  };
}

export function formatTestSpriteAuditMarkdown(audit) {
  const completed = audit.completedWorkstreams.length
    ? audit.completedWorkstreams
        .map(
          (item, index) =>
            `${index + 1}. ${item.workstream}\n   - Evidence: ${item.evidence}`,
        )
        .join("\n")
    : "1. No completed TestSprite workstreams detected.";

  const pending = audit.pendingTasks.length
    ? audit.pendingTasks
        .map(
          (item, index) =>
            `${index + 1}. ${item.task}\n   - Priority: ${item.priority}\n   - Owner: ${item.owner}\n   - Status: ${item.status}\n   - Upstream dependencies: ${formatDependencyList(item.upstreamDependencies)}\n   - Downstream dependencies: ${formatDependencyList(item.downstreamDependencies)}`,
        )
        .join("\n")
    : "1. No pending TestSprite tasks remain.";

  return `# TestSprite Readiness Audit - ${audit.validatedOn}

## Environment Summary

- CLI installed: ${audit.environment.cliInstalled ? "yes" : "no"} (${audit.environment.cliVersion})
- CLI authenticated: ${audit.environment.cliAuthenticated ? "yes" : "no"}
- API key configured: ${audit.environment.apiKeyConfigured ? "yes" : "no"} (${audit.environment.apiKeySource})
- Account email: ${audit.account.email}
- Available credits: ${audit.account.credits ?? "unknown"}
- Subscription: ${audit.account.subPlan ?? "unknown"}
- Local app reachable: ${audit.environment.localAppReachable ? "yes" : "no"}
- Runner scripts ready: ${audit.environment.runnerScriptsReady ? "yes" : "no"}
- Workspace artifacts ready: ${audit.environment.workspaceArtifactsReady ? "yes" : "no"}
- Cloud project configured: ${audit.environment.projectConfigured ? "yes" : "no"}
- Agent skill installed: ${audit.environment.agentSkillInstalled ? "yes" : "no"}
- Runtime lock present: ${audit.environment.runtimeLockPresent ? "yes" : "no"}
- Auth journey credentials ready: ${audit.environment.authJourneyCredentialsReady ? "yes" : "no"}

## Latest Test Execution

- Total cases: ${audit.lastRunSummary.total}
- Passed: ${audit.lastRunSummary.passed}
- Failed: ${audit.lastRunSummary.failed}
- Pass rate: ${audit.lastRunSummary.passRate}%

## Completed Workstreams

${completed}

## Remaining Tasks

${pending}
`;
}
