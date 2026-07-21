export const releaseReadinessBaseline = {
  validatedOn: "2026-07-21",
  coverage: {
    statements: "64.19%",
    branches: "56.52%",
    functions: "64.53%",
    lines: "64.85%",
  },
  validation: {
    typeCheck: {
      status: "Pass",
      benchmark: "latest local pass",
    },
    tests: {
      status: "Pass",
      files: 8,
      tests: 20,
      benchmark:
        "focused publish/moderation/payout certification pass from Batch 5 closeout",
    },
    coverage: {
      status: "Published",
      files: 150,
      tests: 1040,
      benchmark: "last published repo-wide baseline from 2026-07-18",
    },
    envAudit: {
      status: "Blocked",
      environment: "local Batch 6 precheck",
      blockingFindings: [
        "Populate PLAYWRIGHT_SMOKE_EMAIL and PLAYWRIGHT_SMOKE_PASSWORD for authenticated browser certification.",
        "Provision PublishDrive environment secrets in the target certification environment.",
        "Provision STRIPE_SECRET_KEY in the target certification environment.",
      ],
    },
    browserSmoke: {
      status: "Partial",
      passed: 4,
      skipped: 2,
      benchmark:
        "latest local auth/browser certification pass with credential-gated skips",
    },
    build: {
      status: "Pending",
      benchmark: "not rerun for Batch 6 yet",
      note: "Production-style build must be rerun in the target certification environment after provider secrets and smoke credentials are provisioned.",
    },
  },
};

export function makeCoveragePublicationNote() {
  const { coverage } = releaseReadinessBaseline;
  return `local \`pnpm test:coverage\` now passes; latest repo baseline is ${coverage.statements} statements, ${coverage.branches} branches, ${coverage.functions} functions, and ${coverage.lines} lines.`;
}

export function makeRepoUnitCoverageText() {
  return `${releaseReadinessBaseline.coverage.statements} repo baseline statements; module-level metric not yet published`;
}

export function makeAuthChatUnitCoverageText() {
  return `Auth/chat targeted suites passing; repo baseline is ${releaseReadinessBaseline.coverage.statements} statements`;
}

export function makeAuthSecurityUnitCoverageText() {
  return `Auth/security targeted suites present; global baseline is ${releaseReadinessBaseline.coverage.statements} statements with restored coverage publishing`;
}

export function buildMilestoneBreakdown() {
  return {
    completed: [
      {
        milestone: "Auth and runtime foundation recertified",
        priority: "P0",
        dependency:
          "Corrected environment alignment, Google OAuth regression coverage, and authenticated baseline expansion",
        status: "Completed",
      },
      {
        milestone: "Native MCP tools runtime and governance",
        priority: "P1",
        dependency:
          "Governed MCP runtime, discovery parity, and internal-tool exposure controls",
        status: "Completed",
      },
      {
        milestone: "Agent-system unification through governed MCP execution",
        priority: "P1",
        dependency:
          "Completed governed execution for task, forum, and book twin actions",
        status: "Completed",
      },
      {
        milestone: "Books and projects writing workflow migration",
        priority: "P1",
        dependency: "Linked staging InsForge project, approved MVP scope, and schema/RLS implementation plan",
        status: "Completed",
      },
      {
        milestone: "Batch 4 writing workflow consolidation",
        priority: "P1",
        dependency:
          "Project-linked draft bootstrap and persisted publish workflow convergence",
        status: "Completed",
      },
      {
        milestone: "Batch 5 publishing workflow completion",
        priority: "P1",
        dependency:
          "Distribution consent continuity, shared payout execution, and ONIX migration off Convex",
        status: "Completed",
      },
    ],
    pending: [
      {
        milestone: "Batch 6 full-loop certification and go/no-go package",
        priority: "P0",
        dependency:
          "One evidence-backed end-to-end pass across auth, native tools, agents, and writing-to-publishing.",
        status: "Ready",
      },
      {
        milestone: "Authenticated smoke credentials and browser certification",
        priority: "P1",
        dependency:
          "Populate PLAYWRIGHT_SMOKE_EMAIL and PLAYWRIGHT_SMOKE_PASSWORD for staging-safe test accounts.",
        status: "Blocked",
      },
      {
        milestone: "GitHub live tracker sync permission repair",
        priority: "P1",
        dependency:
          "Restore write-capable GitHub token permissions so issue-comment sync can resume from the current environment.",
        status: "Blocked",
      },
    ],
  };
}

function formatBulletList(items) {
  if (items.length === 0) {
    return "- None";
  }

  return items.map((item) => `- ${item}`).join("\n");
}

export function formatMilestoneMarkdown() {
  const milestones = buildMilestoneBreakdown();

  const renderItems = (items) =>
    items
      .map(
        (item, index) =>
          `${index + 1}. ${item.milestone}\n   - Priority: ${item.priority}\n   - Status: ${item.status}\n   - Dependency: ${item.dependency}`,
      )
      .join("\n");

  return `# Release-Readiness Milestones - ${releaseReadinessBaseline.validatedOn}\n\n## Completed\n\n${renderItems(
    milestones.completed,
  )}\n\n## Pending\n\n${renderItems(milestones.pending)}\n`;
}

export function formatTestReportMarkdown() {
  const { validatedOn, coverage, validation } = releaseReadinessBaseline;

  return `# Test Report - ${validatedOn}

## Scope

Validation of the current Batch 6 release-readiness control state, including the latest focused certification suites, the published repo coverage baseline, and the remaining environment blockers for live provider execution.

## Results

1. Type-check
   - Status: ${validation.typeCheck.status}
   - Benchmark: ${validation.typeCheck.benchmark}

2. Unit and integration suite
   - Status: ${validation.tests.status}
   - Files: ${validation.tests.files}
   - Tests: ${validation.tests.tests}
   - Benchmark: ${validation.tests.benchmark}

3. Coverage
   - Status: ${validation.coverage.status}
   - Files: ${validation.coverage.files}
   - Tests: ${validation.coverage.tests}
   - Benchmark: ${validation.coverage.benchmark}
   - Statements: ${coverage.statements}
   - Branches: ${coverage.branches}
   - Functions: ${coverage.functions}
   - Lines: ${coverage.lines}

4. Browser smoke
   - Status: ${validation.browserSmoke.status}
   - Passed: ${validation.browserSmoke.passed}
   - Skipped: ${validation.browserSmoke.skipped}
   - Benchmark: ${validation.browserSmoke.benchmark}

5. Production env audit
   - Status: ${validation.envAudit.status}
   - Environment: ${validation.envAudit.environment}
   - Blocking findings:
${validation.envAudit.blockingFindings.length === 0 ? "     - None" : validation.envAudit.blockingFindings.map((finding) => `     - ${finding}`).join("\n")}

6. Production-style build
   - Status: ${validation.build.status}
   - Benchmark: ${validation.build.benchmark}
   - Note: ${validation.build.note}
`;
}

export function formatFunctionalAcceptanceMarkdown() {
  const milestones = buildMilestoneBreakdown();
  const { envAudit } = releaseReadinessBaseline.validation;

  return `# Functional Acceptance - ${releaseReadinessBaseline.validatedOn}

## Accepted

- Batches 1 through 5 are implemented, documented, and reflected in the active delivery trackers.
- Coverage publishing remains available and the latest published repo baseline is still captured in the readiness artifacts.
- Focused auth and publishing certification suites have recent passing evidence from the July 21 batch closeout work.

## Conditionally Accepted

- Batch 6 reporting and control artifacts are accepted as the source of truth for the next release-certification pass.

## Open Blocking Items

${formatBulletList(envAudit.blockingFindings)}

## Remaining Priority Work

${milestones.pending
  .map((item) => `- ${item.priority}: ${item.milestone} (${item.status})`)
  .join("\n")}

## Acceptance Decision

Batch 6 is not yet a release go. The codebase is accepted for the next certification pass, but final release readiness remains blocked on authenticated smoke credentials, live PublishDrive and Stripe provider secrets, and the outstanding GitHub tracker token repair.
`;
}
