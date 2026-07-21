import { describe, expect, it } from "vitest";

import {
  buildCompletedWorkstreams,
  buildPendingTasks,
  buildTestSpriteAudit,
  formatTestSpriteAuditMarkdown,
  hasPlaceholderAnalysis,
  summarizeTestResults,
} from "../scripts/lib/testsprite-readiness-report.mjs";

describe("testsprite readiness report", () => {
  it("summarizes test results with pass rate and status counts", () => {
    const summary = summarizeTestResults([
      { testStatus: "PASSED" },
      { testStatus: "FAILED" },
      { testStatus: "PASSED" },
    ]);

    expect(summary).toEqual({
      total: 3,
      passed: 2,
      failed: 1,
      statusCounts: {
        PASSED: 2,
        FAILED: 1,
      },
      passRate: 66.67,
    });
  });

  it("detects placeholder fragments in raw reports", () => {
    expect(hasPlaceholderAnalysis("{{TODO:AI_ANALYSIS}}")).toBe(true);
    expect(hasPlaceholderAnalysis("{AI_GNERATED_KET_GAPS_AND_RISKS}")).toBe(true);
    expect(hasPlaceholderAnalysis("All sections complete")).toBe(false);
  });

  it("builds completed workstreams from current readiness state", () => {
    const completed = buildCompletedWorkstreams({
      apiKeyConfigured: true,
      apiKeySource: ".env.testsprite.local",
      workspaceArtifactsReady: true,
      runnerScriptsReady: true,
      cliAuthenticated: true,
      accountEmail: "ahsanhab919@gmail.com",
      curatedReportPresent: true,
      lastRunSummary: {
        total: 6,
        passed: 6,
        failed: 0,
      },
    });

    expect(completed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          workstream: "Secure API key configuration",
        }),
        expect.objectContaining({
          workstream: "Workspace bootstrap and artifact generation",
        }),
        expect.objectContaining({
          workstream: "Cloud CLI authentication",
        }),
        expect.objectContaining({
          workstream: "Public smoke batch validation",
        }),
      ]),
    );
  });

  it("builds pending tasks with priority, owner, and dependency mapping", () => {
    const pending = buildPendingTasks({
      defaultOwner: "Ahsan Habib (@ahsanhab919-ux)",
      apiKeyConfigured: false,
      projectConfigured: false,
      authJourneyCredentialsReady: false,
      rawReportHasPlaceholders: true,
      curatedReportPresent: false,
      agentSkillInstalled: false,
    });

    expect(pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          priority: "critical",
          status: "blocked",
          task: "Configure TESTSPRITE_API_KEY through Trae MCP env, shell env, or an ignored local env file",
        }),
        expect.objectContaining({
          priority: "high",
          owner: "Ahsan Habib (@ahsanhab919-ux)",
          status: "ready",
          task: "Create a persistent TestSprite cloud project for staging or preview execution",
        }),
        expect.objectContaining({
          priority: "high",
          status: "blocked",
          task: "Provision authenticated smoke credentials for login/chat/signup journeys",
        }),
        expect.objectContaining({
          priority: "low",
          task: "Install the optional TestSprite agent skill into the coding-agent configuration",
        }),
      ]),
    );
  });

  it("produces an audit model and markdown report for the latest run", () => {
    const audit = buildTestSpriteAudit({
      validatedOn: "2026-07-16",
      defaultOwner: "Ahsan Habib (@ahsanhab919-ux)",
      cliInstalled: true,
      cliVersion: "0.3.0",
      cliAuthenticated: true,
      apiKeyConfigured: true,
      apiKeySource: ".env.testsprite.local",
      accountEmail: "ahsanhab919@gmail.com",
      credits: 520,
      subPlan: "Starter",
      localAppReachable: true,
      runnerScriptsReady: true,
      workspaceArtifactsReady: true,
      projectConfigured: false,
      agentSkillInstalled: false,
      runtimeLockPresent: false,
      authJourneyCredentialsReady: false,
      rawReportHasPlaceholders: true,
      curatedReportPresent: true,
      testResults: [
        { testStatus: "PASSED" },
        { testStatus: "PASSED" },
        { testStatus: "PASSED" },
        { testStatus: "PASSED" },
        { testStatus: "PASSED" },
        { testStatus: "PASSED" },
      ],
    });

    expect(audit.lastRunSummary.passRate).toBe(100);
    expect(audit.completedWorkstreams.length).toBeGreaterThan(0);
    expect(audit.pendingTasks.length).toBe(3);

    const markdown = formatTestSpriteAuditMarkdown(audit);
    expect(markdown).toContain("# TestSprite Readiness Audit - 2026-07-16");
    expect(markdown).toContain("API key configured: yes (.env.testsprite.local)");
    expect(markdown).toContain("Passed: 6");
    expect(markdown).toContain("Priority: high");
    expect(markdown).toContain("Owner: Ahsan Habib (@ahsanhab919-ux)");
  });

  it("renders an empty-pending report when no outstanding tasks remain", () => {
    const audit = buildTestSpriteAudit({
      validatedOn: "2026-07-16",
      defaultOwner: "Ahsan Habib (@ahsanhab919-ux)",
      cliInstalled: true,
      cliVersion: "0.3.0",
      cliAuthenticated: true,
      apiKeyConfigured: true,
      apiKeySource: "process.env.TESTSPRITE_API_KEY",
      accountEmail: "ahsanhab919@gmail.com",
      credits: 520,
      subPlan: "Starter",
      localAppReachable: true,
      runnerScriptsReady: true,
      workspaceArtifactsReady: true,
      projectConfigured: true,
      agentSkillInstalled: true,
      runtimeLockPresent: false,
      authJourneyCredentialsReady: true,
      rawReportHasPlaceholders: false,
      curatedReportPresent: true,
      testResults: [],
    });

    expect(audit.pendingTasks).toHaveLength(0);
    expect(formatTestSpriteAuditMarkdown(audit)).toContain("No pending TestSprite tasks remain.");
  });

  it("covers default and negative branches for incomplete states", () => {
    const completed = buildCompletedWorkstreams({
      workspaceArtifactsReady: false,
      runnerScriptsReady: false,
      cliAuthenticated: false,
      curatedReportPresent: false,
      lastRunSummary: {
        total: 0,
        passed: 0,
        failed: 0,
      },
    });

    expect(completed).toEqual([]);

    const pending = buildPendingTasks({
      apiKeyConfigured: false,
      projectConfigured: false,
      authJourneyCredentialsReady: true,
      rawReportHasPlaceholders: false,
      curatedReportPresent: false,
      agentSkillInstalled: true,
    });

    expect(pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          owner: "Ahsan Habib (@ahsanhab919-ux)",
          task: "Configure TESTSPRITE_API_KEY through Trae MCP env, shell env, or an ignored local env file",
        }),
        expect.objectContaining({
          owner: "Ahsan Habib (@ahsanhab919-ux)",
          task: "Create a persistent TestSprite cloud project for staging or preview execution",
        }),
      ]),
    );

    const audit = buildTestSpriteAudit({
      validatedOn: "2026-07-16",
      cliInstalled: false,
      cliAuthenticated: false,
      apiKeyConfigured: false,
      localAppReachable: false,
      runnerScriptsReady: false,
      workspaceArtifactsReady: false,
      projectConfigured: false,
      agentSkillInstalled: false,
      runtimeLockPresent: true,
      authJourneyCredentialsReady: false,
      rawReportHasPlaceholders: false,
      curatedReportPresent: false,
      testResults: [],
    });

    const markdown = formatTestSpriteAuditMarkdown(audit);
    expect(markdown).toContain("CLI installed: no (unknown)");
    expect(markdown).toContain("CLI authenticated: no");
    expect(markdown).toContain("API key configured: no (unknown)");
    expect(markdown).toContain("Local app reachable: no");
    expect(markdown).toContain("Runtime lock present: yes");
    expect(markdown).toContain("No completed TestSprite workstreams detected.");
  });
});
