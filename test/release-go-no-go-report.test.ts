import { describe, expect, it } from "vitest";

import {
  buildReleaseGoNoGoAudit,
  formatReleaseGoNoGoMarkdown,
} from "../scripts/lib/release-go-no-go-report.mjs";

describe("release go/no-go report", () => {
  it("returns NO_GO when certification blockers remain", () => {
    const audit = buildReleaseGoNoGoAudit({
      validatedOn: "2026-07-21",
      smokeCredentialsReady: false,
      publishDriveSecretsReady: false,
      stripeSecretReady: false,
      githubTrackerSyncReady: false,
      readinessArtifactsGenerated: true,
      readinessValidationPassed: true,
    });

    expect(audit.decision).toBe("NO_GO");
    expect(audit.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Authenticated browser smoke credentials"),
        expect.stringContaining("PublishDrive environment secrets"),
        expect.stringContaining("STRIPE_SECRET_KEY"),
      ]),
    );
    expect(audit.trackerBlockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Authenticated smoke credentials and browser certification"),
      ]),
    );
  });

  it("returns GO when all certification prerequisites are satisfied", () => {
    const audit = buildReleaseGoNoGoAudit({
      validatedOn: "2026-07-21",
      smokeCredentialsReady: true,
      publishDriveSecretsReady: true,
      stripeSecretReady: true,
      githubTrackerSyncReady: true,
      readinessArtifactsGenerated: true,
      readinessValidationPassed: true,
    });

    expect(audit.decision).toBe("GO");
    expect(audit.blockers).toHaveLength(0);
    expect(audit.trackerBlockers.length).toBeGreaterThan(0);
    expect(audit.summary).toContain("approved");
  });

  it("formats the markdown report with decision, blockers, and next actions", () => {
    const markdown = formatReleaseGoNoGoMarkdown(
      buildReleaseGoNoGoAudit({
        validatedOn: "2026-07-21",
        smokeCredentialsReady: false,
        publishDriveSecretsReady: true,
        stripeSecretReady: false,
        githubTrackerSyncReady: false,
        readinessArtifactsGenerated: true,
        readinessValidationPassed: true,
      }),
    );

    expect(markdown).toContain("# Batch 6 Release Go/No-Go - 2026-07-21");
    expect(markdown).toContain("Status: `NO_GO`");
    expect(markdown).toContain("PublishDrive secrets ready: yes");
    expect(markdown).toContain("Stripe secret ready: no");
    expect(markdown).toContain("Tracker Blockers");
    expect(markdown).toContain("Next Actions");
  });
});
