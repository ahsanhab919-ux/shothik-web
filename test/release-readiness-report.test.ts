import { describe, expect, it } from "vitest";

import {
  buildMilestoneBreakdown,
  formatFunctionalAcceptanceMarkdown,
  formatMilestoneMarkdown,
  formatTestReportMarkdown,
  makeAuthChatUnitCoverageText,
  makeAuthSecurityUnitCoverageText,
  makeCoveragePublicationNote,
  makeRepoUnitCoverageText,
  releaseReadinessBaseline,
} from "../scripts/lib/release-readiness-report.mjs";

describe("release readiness report", () => {
  it("publishes the current coverage baseline consistently", () => {
    expect(makeRepoUnitCoverageText()).toContain(releaseReadinessBaseline.coverage.statements);
    expect(makeAuthChatUnitCoverageText()).toContain(releaseReadinessBaseline.coverage.statements);
    expect(makeAuthSecurityUnitCoverageText()).toContain(releaseReadinessBaseline.coverage.statements);
    expect(makeCoveragePublicationNote()).toContain(releaseReadinessBaseline.coverage.branches);
  });

  it("returns milestone breakdowns with completed and pending work", () => {
    const milestones = buildMilestoneBreakdown();

    expect(milestones.completed.length).toBeGreaterThan(0);
    expect(milestones.pending).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          milestone: "Authenticated smoke credentials and browser certification",
          priority: "P1",
          status: "Blocked",
        }),
      ]),
    );
    expect(milestones.completed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          milestone: "Batch 5 publishing workflow completion",
          status: "Completed",
        }),
      ]),
    );
  });

  it("formats a milestone summary with priority and dependency fields", () => {
    const output = formatMilestoneMarkdown();

    expect(output).toContain("# Release-Readiness Milestones - 2026-07-21");
    expect(output).toContain("Priority: P0");
    expect(output).toContain("Dependency:");
  });

  it("formats the test report with current validation numbers", () => {
    const output = formatTestReportMarkdown();

    expect(output).toContain("Files: 8");
    expect(output).toContain("Tests: 20");
    expect(output).toContain("Statements: 64.19%");
    expect(output).toContain("PLAYWRIGHT_SMOKE_EMAIL");
    expect(output).toContain("Provision STRIPE_SECRET_KEY");
  });

  it("formats a functional acceptance decision with the current support-lane blockers", () => {
    const output = formatFunctionalAcceptanceMarkdown();

    expect(output).toContain("Batch 6 is not yet a release go.");
    expect(output).toContain("authenticated smoke credentials");
    expect(output).toContain("Authenticated smoke credentials and browser certification (Blocked)");
  });
});
