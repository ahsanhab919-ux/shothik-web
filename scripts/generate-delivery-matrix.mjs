#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import XLSX from "xlsx";
import {
  makeAuthChatUnitCoverageText,
  makeAuthSecurityUnitCoverageText,
  makeCoveragePublicationNote,
  makeRepoUnitCoverageText,
} from "./lib/release-readiness-report.mjs";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, "docs", "delivery");
const workbookPath = path.join(outputDir, "shothik-delivery-matrix.xlsx");
const matrixCsvPath = path.join(outputDir, "shothik-delivery-matrix.csv");
const summaryCsvPath = path.join(outputDir, "shothik-delivery-summary.csv");
const issueRegistryPath = path.join(outputDir, "issue-registry.json");
const governanceDocPath = path.join(outputDir, "launch-gate-governance-2026-07-18.md");
const governanceDocUrl = pathToFileURL(governanceDocPath).toString();

const repoUrl = "https://github.com/ahsanhab919-ux/shothik-web";
const repoIssuesUrl = `${repoUrl}/issues`;
const ciWorkflowUrl = `${repoUrl}/actions/workflows/ci.yml`;
const securityWorkflowUrl = `${repoUrl}/actions/workflows/security.yml`;
const dastWorkflowUrl = `${repoUrl}/actions/workflows/dast.yml`;
const prodBaseUrl = "https://www.shothik.ai";
const stagingBaseUrl = "https://shothik-4y0ad3qm7-shothik.vercel.app";
const prodSwaggerUrl = `${prodBaseUrl}/api/docs/swagger.json`;
const stagingSwaggerUrl = `${stagingBaseUrl}/api/docs/swagger.json`;
const primaryOwnerLabel = "Ahsan Habib (@ahsanhab919-ux)";
const primaryOwnerContact =
  "GitHub https://github.com/ahsanhab919-ux; contributor registry documented in docs/delivery/contributor-directory.md";
const codeOwner = primaryOwnerLabel;
const codeOwnerContact = primaryOwnerContact;
const releaseApprover = `Release approver ${primaryOwnerLabel}`;
const qaApprover = `QA approver ${primaryOwnerLabel}`;
const securityApprover = `Security approver ${primaryOwnerLabel}`;
const stakeholderApprover = `Product / stakeholder approver ${primaryOwnerLabel}`;
const opsContact = `${primaryOwnerLabel}, operations contact`;
const paymentsReviewerContact = `${primaryOwnerLabel}, payments reviewer`;
const qaContact = `${primaryOwnerLabel}, QA owner`;
const platformContact = `${primaryOwnerLabel}, platform owner`;
const securityContact = `${primaryOwnerLabel}, security owner`;
const trustSafetyContact = `${primaryOwnerLabel}, trust and safety reviewer`;
const productContact = `${primaryOwnerLabel}, product owner`;
const moderationContact = `${primaryOwnerLabel}, moderation owner`;
const marketplaceContact = `${primaryOwnerLabel}, marketplace owner`;
const financeOpsContact = `${primaryOwnerLabel}, finance operations reviewer`;
const releaseContact = `${primaryOwnerLabel}, release owner`;
const engineeringManagerContact = `${primaryOwnerLabel}, engineering manager`;
const booksContact = `${primaryOwnerLabel}, books owner`;
const legalOpsContact = `${primaryOwnerLabel}, legal and operations reviewer`;
const today = "2026-07-16";

const fallbackTicketRegistry = {
  "LWT-01": {
    issueId: "#4",
    recordType: "Issue",
    title: "extractBannedPhrases: robustness gaps in Do/Don't parsing (voice-gate follow-up)",
    status: "In Progress",
    created: "2026-07-12T11:57:51Z",
    updated: "2026-07-12T11:57:51Z",
    link: `${repoUrl}/issues/4`,
    note: "Historical fallback mapping retained for bootstrap safety; the dedicated issue registry supersedes this entry when available.",
  },
  "LWT-02": {
    issueId: "#23",
    recordType: "Pull request",
    title: "trae(agent): Automated Test Gap Analyzer [d8OLPi]",
    status: "Review",
    created: "2026-07-13T08:13:51Z",
    updated: "2026-07-13T08:13:51Z",
    link: `${repoUrl}/pull/23`,
    note: "Historical fallback mapping retained for bootstrap safety; the dedicated issue registry supersedes this entry when available.",
  },
  "LWT-03": {
    issueId: "#22",
    recordType: "Pull request",
    title: "trae(solo-agent): Automated Test Gap Analyzer [6cXUYf]",
    status: "Review",
    created: "2026-07-13T08:12:54Z",
    updated: "2026-07-13T08:12:54Z",
    link: `${repoUrl}/pull/22`,
    note: "Historical fallback mapping retained for bootstrap safety; the dedicated issue registry supersedes this entry when available.",
  },
  "AGT-01": {
    issueId: "#40",
    recordType: "Pull request",
    title: "feat: adopt native InsForge chat auth",
    status: "Done",
    created: "2026-07-14T02:10:19Z",
    updated: "2026-07-14T02:24:21Z",
    link: `${repoUrl}/pull/40`,
    note: "Verified repository ticket directly aligned to the InsForge chat auth rollout.",
  },
  "AGT-02": {
    issueId: "#2",
    recordType: "Pull request",
    title: "Un-stub key-custody + writingProfile onto Convex satellite tables",
    status: "Done",
    created: "2026-07-12T05:01:54Z",
    updated: "2026-07-12T11:15:55Z",
    link: `${repoUrl}/pull/2`,
    note: "Historical fallback mapping retained for bootstrap safety; the dedicated issue registry supersedes this entry when available.",
  },
  "AGT-03": {
    issueId: "#7",
    recordType: "Pull request",
    title: "feat(chat): shared chat/history substrate + flagship /agents/chat wiring",
    status: "Review",
    created: "2026-07-12T18:12:59Z",
    updated: "2026-07-13T09:31:58Z",
    link: `${repoUrl}/pull/7`,
    note: "Historical fallback mapping retained for bootstrap safety; the dedicated issue registry supersedes this entry when available.",
  },
  "RSH-01": {
    issueId: "#21",
    recordType: "Pull request",
    title: "trae(solo-agent): Automated Test Gap Analyzer [8YAaEm]",
    status: "Review",
    created: "2026-07-13T08:11:07Z",
    updated: "2026-07-13T08:11:07Z",
    link: `${repoUrl}/pull/21`,
    note: "Historical fallback mapping retained for bootstrap safety; the dedicated issue registry supersedes this entry when available.",
  },
  "RSH-02": {
    issueId: "#20",
    recordType: "Pull request",
    title: "trae(solo-agent): Automated Test Gap Analyzer [HpahDU] ⚠️ needs conflict resolution",
    status: "Review",
    created: "2026-07-13T08:09:55Z",
    updated: "2026-07-13T08:09:55Z",
    link: `${repoUrl}/pull/20`,
    note: "Historical fallback mapping retained for bootstrap safety; the dedicated issue registry supersedes this entry when available.",
  },
  "RSH-03": {
    issueId: "#18",
    recordType: "Pull request",
    title: "trae(solo-agent): Automated Test Gap Analyzer [MDjJKe]",
    status: "Review",
    created: "2026-07-13T08:07:28Z",
    updated: "2026-07-13T08:07:28Z",
    link: `${repoUrl}/pull/18`,
    note: "Historical fallback mapping retained for bootstrap safety; the dedicated issue registry supersedes this entry when available.",
  },
  "PRD-01": {
    issueId: "#3",
    recordType: "Pull request",
    title: "Port engine book-service onto Convex (Step 1)",
    status: "Done",
    created: "2026-07-12T10:38:14Z",
    updated: "2026-07-12T10:38:50Z",
    link: `${repoUrl}/pull/3`,
    note: "Verified repository ticket aligned to core book-service foundation work for the Shothik Books authoring MVP.",
  },
  "PRD-02": {
    issueId: "#1",
    recordType: "Pull request",
    title: "Port engine book callers + storage-agnostic logic (stacked on Step-1)",
    status: "Done",
    created: "2026-07-12T04:19:14Z",
    updated: "2026-07-12T11:09:14Z",
    link: `${repoUrl}/pull/1`,
    note: "Verified repository ticket aligned to books/marketplace caller and storage logic; used as the closest existing marketplace/library ticket.",
  },
  "PRD-03": {
    issueId: "#24",
    recordType: "Pull request",
    title: "trae(agent): Automated Test Gap Analyzer [bcwvdM]",
    status: "Done",
    created: "2026-07-13T08:14:55Z",
    updated: "2026-07-13T08:51:06Z",
    link: `${repoUrl}/pull/24`,
    note: "Historical fallback mapping retained for bootstrap safety; the dedicated issue registry supersedes this entry when available.",
  },
  "PRD-04": {
    issueId: "#3",
    recordType: "Pull request",
    title: "Port engine book-service onto Convex (Step 1)",
    status: "Done",
    created: "2026-07-12T10:38:14Z",
    updated: "2026-07-12T10:38:50Z",
    link: `${repoUrl}/pull/3`,
    note: "Historical fallback mapping retained for bootstrap safety; the dedicated issue registry supersedes this entry when available.",
  },
  "PRD-05": {
    issueId: "#36",
    recordType: "Pull request",
    title: "chore(deps): bump github/codeql-action from 3 to 4",
    status: "Review",
    created: "2026-07-13T08:25:44Z",
    updated: "2026-07-13T08:25:44Z",
    link: `${repoUrl}/pull/36`,
    note: "Verified repository ticket for platform security workflow hardening; paired in practice with the InsForge auth rollout evidence.",
  },
};

function loadTicketRegistry() {
  if (!fs.existsSync(issueRegistryPath)) {
    return fallbackTicketRegistry;
  }

  const registryText = fs.readFileSync(issueRegistryPath, "utf8");
  const parsedRegistry = JSON.parse(registryText);

  return {
    ...fallbackTicketRegistry,
    ...parsedRegistry,
  };
}

const ticketRegistry = loadTicketRegistry();

function lines(...items) {
  return items.flat().filter(Boolean).join("\n");
}

function makeTicketBlock(workstreamId) {
  const ticket = ticketRegistry[workstreamId];
  if (!ticket) {
    throw new Error(`Missing ticket registry entry for ${workstreamId}`);
  }

  return {
    text: lines(
      "Jira ticket ID: Not used - GitHub-only delivery tracking is the active source of truth",
      "Jira status: To Do",
      `Jira assignee: ${primaryOwnerLabel}`,
      "Jira created: Not applicable",
      `Jira updated: ${today}`,
      `Jira link: ${repoIssuesUrl}`,
      "",
      `GitHub issue ID: ${ticket.issueId}`,
      `GitHub record type: ${ticket.recordType}`,
      `GitHub title: ${ticket.title}`,
      `GitHub status: ${ticket.status}`,
      `GitHub assignee: ${primaryOwnerLabel} (delivery-matrix owner assignment)`,
      `GitHub created: ${ticket.created}`,
      `GitHub updated: ${ticket.updated}`,
      `GitHub link: ${ticket.link}`,
      `Mapping note: ${ticket.note}`,
    ),
    link: ticket.link,
  };
}

function buildIssueChecklist(dependencyBlockText) {
  return dependencyBlockText
    .split("\n\n")
    .map((chunk) => ({
      name: chunk.match(/System: ([^\n]+)/)?.[1] ?? "Unspecified dependency",
      owner: chunk.match(/Primary contact: ([^\n]+)/)?.[1] ?? primaryOwnerLabel,
      status: chunk.match(/Status: ([^\n]+)/)?.[1] ?? "Not Started",
      targetDate: chunk.match(/Target resolution: ([^\n]+)/)?.[1] ?? "Pending",
    }))
    .filter((dependency) => dependency.status !== "Complete")
    .map(
      (dependency) =>
        `- [ ] ${dependency.name} | owner: ${dependency.owner} | target: ${dependency.targetDate}`,
    );
}

function makeTicketBlockWithContext(workstream) {
  const ticket = makeTicketBlock(workstream.id);
  const checklist = buildIssueChecklist(workstream.dependencies.text);

  return {
    text: lines(
      ticket.text,
      "",
      "Formal approvers:",
      `- Security: ${primaryOwnerLabel}`,
      `- Release: ${primaryOwnerLabel}`,
      `- QA: ${primaryOwnerLabel}`,
      `- Stakeholder: ${primaryOwnerLabel}`,
      checklist.length ? "" : null,
      checklist.length ? "Issue checklist:" : null,
      checklist,
      workstream.id === "AGT-01"
        ? ""
        : null,
      workstream.id === "AGT-01"
        ? "Release-window approval: Approved for the deploy-first production rollout executed on 2026-07-18."
        : null,
    ),
    link: ticket.link,
  };
}

function makeCoverageBlock({
  unit = makeRepoUnitCoverageText(),
  integration = "45.76% repo baseline functions; module-level metric not yet published",
  e2e = "0% line-instrumented coverage; smoke-only Playwright coverage",
  reports = [ciWorkflowUrl, securityWorkflowUrl],
  untestedPaths,
  suites,
}) {
  return {
    text: lines(
      `Unit coverage: ${unit}`,
      `Integration coverage: ${integration}`,
      `End-to-end coverage: ${e2e}`,
      `CI/CD reports: ${reports.join(" | ")}`,
      `Coverage publication note: ${makeCoveragePublicationNote()}`,
      `Untested critical paths: ${untestedPaths}`,
      `Mandatory suites: ${suites}`,
    ),
    link: reports[0],
  };
}

function makeLaunchGateBlock(gates) {
  const text = gates
    .map((gate) =>
      lines(
        `${gate.name}: ${gate.outcome}`,
        `Completed: ${gate.completed}`,
        `Sign-off owner: ${gate.owner}`,
        `Evidence: ${gate.link ?? governanceDocUrl}`,
        `Remediation: ${gate.remediation}`,
      ),
    )
    .join("\n\n");

  return {
    text,
    link: gates.find((gate) => gate.link)?.link ?? governanceDocUrl,
  };
}

function summarizeDependencies(dependencies) {
  return {
    resolved: dependencies.filter((dep) => dep.status === "Complete").length,
    unresolved: dependencies.filter((dep) => dep.status !== "Complete").length,
  };
}

function buildDependencyBlock(dependencies) {
  const firstLink = dependencies.find((dep) => dep.link)?.link ?? null;
  return {
    text: dependencies
      .map((dep) =>
        lines(
          `System: ${dep.name}`,
          `Primary contact: ${dep.primaryContact}`,
          `Secondary contact: ${dep.secondaryContact}`,
          `Status: ${dep.status}`,
          `Impact: ${dep.impact}`,
          `Target resolution: ${dep.targetDate}`,
        ),
      )
      .join("\n\n"),
    link: firstLink,
  };
}

function buildApiBlock(items) {
  const firstLink = items.find((item) => item.link)?.link ?? prodSwaggerUrl;
  return {
    text: items
      .map((item) =>
        lines(
          `Schema/API: ${item.name}`,
          `Semantic version: ${item.version}`,
          `Production URL: ${item.prod}`,
          `Staging URL: ${item.staging}`,
          `OpenAPI / doc reference: ${item.openapi}`,
          `Engineering owner: ${item.owner}`,
        ),
      )
      .join("\n\n"),
    link: firstLink,
  };
}

function buildWorkstreamBlock(workstream) {
  return {
    text: lines(
      `ID: ${workstream.id}`,
      `Lead owner: ${workstream.owner}`,
      `Contact: ${workstream.contact}`,
      `Baseline start: ${workstream.baselineStart}`,
      `Baseline end: ${workstream.baselineEnd}`,
      `Current progress: ${workstream.progress}`,
      `Revised target: ${workstream.revisedTarget}`,
    ),
    link: workstream.link ?? null,
  };
}

function createRiskText(risk) {
  return lines(
    `Impact: ${risk.impact}`,
    `Likelihood: ${risk.likelihood}`,
    `Mitigation: ${risk.mitigation}`,
  );
}

const sharedGateFailures = [
  {
    name: "Security scan",
    outcome: "Fail",
    completed: "Not formally signed off",
    owner: securityApprover,
    remediation: "Map workstream to CI security workflows and capture explicit security sign-off before launch.",
    link: securityWorkflowUrl,
  },
  {
    name: "Compliance check",
    outcome: "Fail",
    completed: "Not formally signed off",
    owner: releaseApprover,
    remediation: "Create content/commercial/compliance review checklist and assign reviewer.",
  },
  {
    name: "Performance test",
    outcome: "Fail",
    completed: "Not formally executed",
    owner: qaApprover,
    remediation: "Run workstream-specific load/perf verification and record result.",
  },
  {
    name: "Cross-functional stakeholder approval",
    outcome: "Fail",
    completed: "Not recorded",
    owner: stakeholderApprover,
    remediation: "Obtain product, design, engineering, and operations sign-off before release.",
  },
];

const workstreams = [
  {
    category: "Legacy Writing Tool",
    health: "🟢 On Track",
    id: "LWT-01",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: "Not documented in repository history",
    baselineEnd: "Not documented in repository history",
    progress:
      "Paraphrase and humanizer UI/API surfaces are live; modernization and tracker normalization remain open.",
    revisedTarget: "2026-08-15 proposed stabilization checkpoint",
    link: `${prodBaseUrl}/paraphrase`,
    tickets: makeTicketBlock("LWT-01"),
    apis: buildApiBlock([
      {
        name: "Tool request contract - paraphrase",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/tools/paraphrase`,
        staging: `${stagingBaseUrl}/api/tools/paraphrase`,
        openapi: `${prodSwaggerUrl}#paths/~1api~1tools~1paraphrase`,
        owner: `Platform code owner ${codeOwner}`,
        link: prodSwaggerUrl,
      },
      {
        name: "Tool request contract - humanizer",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/humanizerV5`,
        staging: `${stagingBaseUrl}/api/humanizerV5`,
        openapi: "Route handler reference: app/api/humanizerV5/* (OpenAPI section pending)",
        owner: `Platform code owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "LLM provider credentials",
        primaryContact: `Platform owner ${codeOwner}`,
        secondaryContact: opsContact,
        status: "In Progress",
        impact: "Critical",
        targetDate: "2026-07-18",
      },
      {
        name: "Usage enforcement / credit policy alignment",
        primaryContact: `Product owner ${codeOwner}`,
        secondaryContact: paymentsReviewerContact,
        status: "In Progress",
        impact: "High",
        targetDate: "2026-08-01",
      },
    ]),
    coverage: makeCoverageBlock({
      untestedPaths:
        "provider timeout fallback, abusive long-input throttling, and premium usage-limit edge cases",
      suites:
        "Vitest: Pass | Type-check: Pass | Playwright: Fail (no dedicated paraphrase/humanizer smoke journey)",
    }),
    launchGate: makeLaunchGateBlock(sharedGateFailures),
    risk: {
      impact: "Medium",
      likelihood: "Low",
      mitigation:
        "Keep provider credentials current, add dedicated smoke coverage, and publish explicit premium-limit acceptance tests.",
    },
  },
  {
    category: "Legacy Writing Tool",
    health: "🟢 On Track",
    id: "LWT-02",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: "Not documented in repository history",
    baselineEnd: "Not documented in repository history",
    progress:
      "Summarize and translator surfaces are present in UI/API; tracker and test granularity are still not normalized.",
    revisedTarget: "2026-08-15 proposed stabilization checkpoint",
    link: `${prodBaseUrl}/summarize`,
    tickets: makeTicketBlock("LWT-02"),
    apis: buildApiBlock([
      {
        name: "Tool request contract - summarize",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/tools/summarize`,
        staging: `${stagingBaseUrl}/api/tools/summarize`,
        openapi: `${prodSwaggerUrl}#paths/~1api~1tools~1summarize`,
        owner: `Platform code owner ${codeOwner}`,
        link: prodSwaggerUrl,
      },
      {
        name: "Tool request contract - translator",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/tools/translator`,
        staging: `${stagingBaseUrl}/api/tools/translator`,
        openapi: `${prodSwaggerUrl}#paths/~1api~1tools~1translator`,
        owner: `Platform code owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "LLM provider credentials",
        primaryContact: `Platform owner ${codeOwner}`,
        secondaryContact: opsContact,
        status: "In Progress",
        impact: "Critical",
        targetDate: "2026-07-18",
      },
      {
        name: "Localization/content QA baseline",
        primaryContact: `Product owner ${codeOwner}`,
        secondaryContact: qaContact,
        status: "Not Started",
        impact: "Medium",
        targetDate: "2026-08-08",
      },
    ]),
    coverage: makeCoverageBlock({
      untestedPaths:
        "long-document summarization bounds, translation safety filters, and multi-language regression checks",
      suites:
        "Vitest: Pass | Type-check: Pass | Playwright: Fail (no dedicated summarize/translator smoke journey)",
    }),
    launchGate: makeLaunchGateBlock(sharedGateFailures),
    risk: {
      impact: "Medium",
      likelihood: "Low",
      mitigation:
        "Add regression samples for key languages and publish owner-approved quality thresholds for summarization and translation output.",
    },
  },
  {
    category: "Legacy Writing Tool",
    health: "🟡 Needs Monitoring",
    id: "LWT-03",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: "Not documented in repository history",
    baselineEnd: "Not documented in repository history",
    progress:
      "AI detector, plagiarism, and grammar flows exist, but coverage and policy validation are explicitly called out as high-priority gaps.",
    revisedTarget: "2026-08-22 proposed reliability checkpoint",
    link: `${prodBaseUrl}/ai-detector`,
    tickets: makeTicketBlock("LWT-03"),
    apis: buildApiBlock([
      {
        name: "Tool request contract - AI detector",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/tools/ai-detector`,
        staging: `${stagingBaseUrl}/api/tools/ai-detector`,
        openapi: `${prodSwaggerUrl}#paths/~1api~1tools~1ai-detector`,
        owner: `Platform code owner ${codeOwner}`,
        link: prodSwaggerUrl,
      },
      {
        name: "Tool request contract - plagiarism",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/tools/plagiarism`,
        staging: `${stagingBaseUrl}/api/tools/plagiarism`,
        openapi: "Route family reference: app/api/tools/plagiarism/* (OpenAPI section pending)",
        owner: `Platform code owner ${codeOwner}`,
      },
      {
        name: "Tool request contract - grammar",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/tools/grammar`,
        staging: `${stagingBaseUrl}/api/tools/grammar`,
        openapi: "Route family reference: app/api/tools/grammar/* (OpenAPI section pending)",
        owner: `Platform code owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "Plagiarism modernization rollout",
        primaryContact: `Platform owner ${codeOwner}`,
        secondaryContact: qaContact,
        status: "In Progress",
        impact: "High",
        targetDate: "2026-08-22",
      },
      {
        name: "Critical tool coverage milestone",
        primaryContact: `Release owner ${codeOwner}`,
        secondaryContact: qaContact,
        status: "In Progress",
        impact: "High",
        targetDate: "2026-08-22",
      },
    ]),
    coverage: makeCoverageBlock({
      untestedPaths:
        "false-positive handling, detector drift calibration, plagiarism provider failure fallback, and grammar issue application edge cases",
      suites:
        "Vitest: Pass | Type-check: Pass | Playwright: Fail (no dedicated detector/plagiarism/grammar smoke journey)",
    }),
    launchGate: makeLaunchGateBlock(sharedGateFailures),
    risk: {
      impact: "High",
      likelihood: "Medium",
      mitigation:
        "Prioritize this workstream in the coverage improvement plan and add route-contract tests before any quality or policy claims are expanded.",
    },
  },
  {
    category: "Agent",
    health: "🟡 Needs Monitoring",
    id: "AGT-01",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: "2026-07-14",
    baselineEnd: "Pending production cutover",
    progress:
      "Agent chat and auth hardening are actively in progress; staging verification is complete but production ownership promotion remains pending.",
    revisedTarget: "Pending production environment confirmation; next review 2026-07-22",
    link: `${prodBaseUrl}/agents/chat`,
    tickets: makeTicketBlock("AGT-01"),
    apis: buildApiBlock([
      {
        name: "Chat ownership API",
        version: "1.1.0-target",
        prod: `${prodBaseUrl}/api/chat`,
        staging: `${stagingBaseUrl}/api/chat`,
        openapi: `${prodSwaggerUrl}#paths/~1api~1chat`,
        owner: `Frontend/auth owner ${codeOwner}`,
        link: prodSwaggerUrl,
      },
      {
        name: "Conversation and message APIs",
        version: "1.1.0-target",
        prod: `${prodBaseUrl}/api/chat/conversations`,
        staging: `${stagingBaseUrl}/api/chat/conversations`,
        openapi: `${prodSwaggerUrl}#paths/~1api~1chat~1conversations`,
        owner: `Backend/schema owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "InsForge production environment confirmation",
        primaryContact: `Release owner ${codeOwner}`,
        secondaryContact: platformContact,
        status: "Blocked",
        impact: "Critical",
        targetDate: "Pending external confirmation; next review 2026-07-22",
      },
      {
        name: "Production migration sequencing",
        primaryContact: `Backend owner ${codeOwner}`,
        secondaryContact: qaContact,
        status: "In Progress",
        impact: "Critical",
        targetDate: "Pending deploy-first release sequence completion",
      },
    ]),
    coverage: makeCoverageBlock({
      unit: makeAuthChatUnitCoverageText(),
      integration: "Auth/chat ownership tests present; module-level percentage not published",
      e2e: "25% critical smoke coverage; preview login-to-chat smoke exists with protected-preview caveats",
      reports: [ciWorkflowUrl, `${repoUrl}/blob/main/docs/insforge-chat-auth-rollout.md`],
      untestedPaths:
        "production promotion path, release rollback drills, and authenticated remote smoke without supplied preview bypass secrets",
      suites:
        "Vitest: Pass | Type-check: Pass | Playwright smoke: Pass on validated preview path, but protected-preview auth coverage still credential-gated",
    }),
    launchGate: makeLaunchGateBlock([
      {
        name: "Security scan",
        outcome: "Pass",
        completed: "2026-07-15 staging verification",
        owner: securityApprover,
        remediation: "Carry the same evidence into production sign-off and record the sign-off owner.",
        link: `${repoUrl}/blob/main/docs/insforge-chat-auth-rollout.md`,
      },
      {
        name: "Compliance check",
        outcome: "Fail",
        completed: "Not formally signed off",
        owner: releaseApprover,
        remediation: "Document release/compliance reviewer before production promotion.",
      },
      {
        name: "Performance test",
        outcome: "Fail",
        completed: "Not formally executed for production",
        owner: qaApprover,
        remediation: "Run authenticated production smoke and latency spot-check after deployment.",
      },
      {
        name: "Cross-functional stakeholder approval",
        outcome: "Fail",
        completed: "Not recorded",
        owner: stakeholderApprover,
        remediation: "Obtain release owner, reviewer/code owner, and QA sign-off per rollout doc.",
      },
    ]),
    risk: {
      impact: "High",
      likelihood: "Medium",
      mitigation:
        "Keep deploy-before-migration sequencing, preserve SQL ownership verification as an exit criterion, and obtain the remaining production approvals.",
    },
  },
  {
    category: "Agent",
    health: "🟡 Needs Monitoring",
    id: "AGT-02",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: "Not documented in repository history",
    baselineEnd: "Not documented in repository history",
    progress:
      "Twin, Second Me, and Hermes surfaces are broad and permissioned, but backend ownership, vault, and approval flows still rely on mixed legacy patterns.",
    revisedTarget: "2026-09-01 proposed hardening checkpoint",
    link: `${prodBaseUrl}/second-me`,
    tickets: makeTicketBlock("AGT-02"),
    apis: buildApiBlock([
      {
        name: "Twin identity/task API family",
        version: "0.9.0-target",
        prod: `${prodBaseUrl}/api/twin/tasks`,
        staging: `${stagingBaseUrl}/api/twin/tasks`,
        openapi: "Route family reference: app/api/twin/* (OpenAPI coverage partial)",
        owner: `Agent platform owner ${codeOwner}`,
        link: prodSwaggerUrl,
      },
      {
        name: "Twin book/workflow approval API family",
        version: "0.9.0-target",
        prod: `${prodBaseUrl}/api/twin/approvals`,
        staging: `${stagingBaseUrl}/api/twin/approvals`,
        openapi: "Route family reference: app/api/twin/approvals and app/api/twin/book/*",
        owner: `Agent platform owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "Second Me vault secret provisioning",
        primaryContact: `Platform owner ${codeOwner}`,
        secondaryContact: securityContact,
        status: "Not Started",
        impact: "High",
        targetDate: "2026-08-08",
      },
      {
        name: "Convex-to-InsForge migration plan for twin data",
        primaryContact: `Platform owner ${codeOwner}`,
        secondaryContact: platformContact,
        status: "In Progress",
        impact: "High",
        targetDate: "2026-09-01",
      },
    ]),
    coverage: makeCoverageBlock({
      untestedPaths:
        "approval-required task escalation, secret/vault flows, transfer/unlink abuse controls, and long-running agent recovery paths",
      suites:
        "Vitest: Pass | Type-check: Pass | Playwright: Fail (no dedicated Twin/Second Me smoke journey)",
    }),
    launchGate: makeLaunchGateBlock(sharedGateFailures),
    risk: {
      impact: "High",
      likelihood: "Medium",
      mitigation:
        "Assign a named agent-platform owner, provision vault secrets, and separate MVP-safe task flows from future autonomous capabilities.",
    },
  },
  {
    category: "Agent",
    health: "🟡 Needs Monitoring",
    id: "AGT-03",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: "Not documented in repository history",
    baselineEnd: "Not documented in repository history",
    progress:
      "Community, channels, and forum flows are present, but governance, moderation ownership, and platform data migration are not yet normalized.",
    revisedTarget: "2026-09-05 proposed governance checkpoint",
    link: `${prodBaseUrl}/community`,
    tickets: makeTicketBlock("AGT-03"),
    apis: buildApiBlock([
      {
        name: "Forum and channel interaction APIs",
        version: "0.9.0-target",
        prod: `${prodBaseUrl}/api/forum`,
        staging: `${stagingBaseUrl}/api/forum`,
        openapi: "Route family reference: app/api/forum/* and app/api/twin/forum/*",
        owner: `Community platform owner ${codeOwner}`,
        link: prodSwaggerUrl,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "Moderation policy owner assignment",
        primaryContact: `Product owner ${codeOwner}`,
        secondaryContact: trustSafetyContact,
        status: "Not Started",
        impact: "High",
        targetDate: "2026-08-15",
      },
      {
        name: "Community data source-of-truth decision",
        primaryContact: `Backend owner ${codeOwner}`,
        secondaryContact: platformContact,
        status: "In Progress",
        impact: "High",
        targetDate: "2026-09-05",
      },
    ]),
    coverage: makeCoverageBlock({
      untestedPaths:
        "forum abuse reporting, channel-level moderation escalation, and agent-posting permission boundaries",
      suites:
        "Vitest: Pass | Type-check: Pass | Playwright: Fail (no dedicated community/channel smoke suite)",
    }),
    launchGate: makeLaunchGateBlock(sharedGateFailures),
    risk: {
      impact: "High",
      likelihood: "Medium",
      mitigation:
        "Name a moderation owner, document escalation policy, and add permission-based API tests before promoting community-led growth features.",
    },
  },
  {
    category: "Research",
    health: "🟡 Needs Monitoring",
    id: "RSH-01",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: "Not documented in repository history",
    baselineEnd: "Not documented in repository history",
    progress:
      "Research workspace and research chat surfaces are present; workstream lacks explicit ticketing, owner assignment, and documented launch gates.",
    revisedTarget: "2026-08-29 proposed workflow checkpoint",
    link: `${prodBaseUrl}/research`,
    tickets: makeTicketBlock("RSH-01"),
    apis: buildApiBlock([
      {
        name: "Research workspace API",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/research`,
        staging: `${stagingBaseUrl}/api/research`,
        openapi: "Route family reference: app/api/research/*",
        owner: `Research owner ${codeOwner}`,
        link: prodSwaggerUrl,
      },
      {
        name: "Research chat API",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/research/chat`,
        staging: `${stagingBaseUrl}/api/research/chat`,
        openapi: "Route family reference: app/api/research/chat/*",
        owner: `Research owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "LLM provider credentials",
        primaryContact: `Platform owner ${codeOwner}`,
        secondaryContact: opsContact,
        status: "In Progress",
        impact: "Critical",
        targetDate: "2026-07-18",
      },
      {
        name: "Source provenance / citation policy",
        primaryContact: `Research owner ${codeOwner}`,
        secondaryContact: qaContact,
        status: "Not Started",
        impact: "Medium",
        targetDate: "2026-08-29",
      },
    ]),
    coverage: makeCoverageBlock({
      untestedPaths:
        "citation accuracy, long-session persistence, and recovery behavior under provider or network interruptions",
      suites:
        "Vitest: Pass | Type-check: Pass | Playwright: Fail (no dedicated research workspace smoke journey)",
    }),
    launchGate: makeLaunchGateBlock(sharedGateFailures),
    risk: {
      impact: "Medium",
      likelihood: "Medium",
      mitigation:
        "Add provenance acceptance criteria and a named research owner before attaching product-level SLAs to research answers.",
    },
  },
  {
    category: "Research",
    health: "🟡 Needs Monitoring",
    id: "RSH-02",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: "Not documented in repository history",
    baselineEnd: "Not documented in repository history",
    progress:
      "Sheet workspace UI/API is present, but tracker, owner, and performance verification are not yet formalized.",
    revisedTarget: "2026-09-05 proposed operational checkpoint",
    link: `${prodBaseUrl}/agents/shared-sheet`,
    tickets: makeTicketBlock("RSH-02"),
    apis: buildApiBlock([
      {
        name: "Sheet session API",
        version: "0.9.0-target",
        prod: `${prodBaseUrl}/api/sheet/session`,
        staging: `${stagingBaseUrl}/api/sheet/session`,
        openapi: "Route family reference: app/api/sheet/*",
        owner: `Research tools owner ${codeOwner}`,
        link: prodSwaggerUrl,
      },
      {
        name: "Sheet chat API",
        version: "0.9.0-target",
        prod: `${prodBaseUrl}/api/sheet/chat`,
        staging: `${stagingBaseUrl}/api/sheet/chat`,
        openapi: "Route family reference: app/api/sheet/chat/*",
        owner: `Research tools owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "Spreadsheet session persistence model",
        primaryContact: `Backend owner ${codeOwner}`,
        secondaryContact: productContact,
        status: "In Progress",
        impact: "High",
        targetDate: "2026-09-05",
      },
      {
        name: "Load/performance test baseline for large sheets",
        primaryContact: `${primaryOwnerLabel}, QA owner`,
        secondaryContact: platformContact,
        status: "Not Started",
        impact: "Medium",
        targetDate: "2026-09-05",
      },
    ]),
    coverage: makeCoverageBlock({
      untestedPaths:
        "large-sheet performance, multi-user concurrency, and persisted session restoration after reconnect",
      suites:
        "Vitest: Pass | Type-check: Pass | Playwright: Fail (no dedicated sheet smoke journey)",
    }),
    launchGate: makeLaunchGateBlock(sharedGateFailures),
    risk: {
      impact: "Medium",
      likelihood: "Medium",
      mitigation:
        "Add performance guardrails and persist/restore tests before marketing sheet collaboration as production-ready.",
    },
  },
  {
    category: "Research",
    health: "🟡 Needs Monitoring",
    id: "RSH-03",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: "Not documented in repository history",
    baselineEnd: "Not documented in repository history",
    progress:
      "Slide and presentation generation depends on a separate slide service and has strong UI/service scaffolding, but dependency and launch governance remain open.",
    revisedTarget: "2026-09-12 proposed service-integration checkpoint",
    link: `${prodBaseUrl}/slide`,
    tickets: makeTicketBlock("RSH-03"),
    apis: buildApiBlock([
      {
        name: "Slide generation service API",
        version: "0.9.0-target",
        prod: "Configured via NEXT_PUBLIC_SLIDE_API_URL (/slides, /slides/{jobId}, /stream)",
        staging: "Configured via NEXT_PUBLIC_SLIDE_API_URL on preview",
        openapi: "Service adapter reference: services/slide-generation.ts and services/presentation/*",
        owner: `Presentation owner ${codeOwner}`,
        link: `${repoUrl}/blob/main/services/slide-generation.ts`,
      },
      {
        name: "Presentation save API",
        version: "0.9.0-target",
        prod: "Configured via NEXT_PUBLIC_API_URL/slide/slides/save",
        staging: "Configured via NEXT_PUBLIC_API_URL/slide/slides/save on preview",
        openapi: "Service adapter reference: services/presentation/slideEditService.ts",
        owner: `Presentation owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "External slide generation microservice",
        primaryContact: `Presentation owner ${codeOwner}`,
        secondaryContact: platformContact,
        status: "In Progress",
        impact: "Critical",
        targetDate: "2026-09-12",
      },
      {
        name: "Presentation storage/export reliability",
        primaryContact: `Platform owner ${codeOwner}`,
        secondaryContact: qaContact,
        status: "Not Started",
        impact: "High",
        targetDate: "2026-09-12",
      },
    ]),
    coverage: makeCoverageBlock({
      untestedPaths:
        "external slide service outages, export fidelity regression, and cross-tab edit conflict handling",
      suites:
        "Vitest: Pass | Type-check: Pass | Playwright: Fail (no dedicated slide end-to-end smoke journey)",
    }),
    launchGate: makeLaunchGateBlock(sharedGateFailures),
    risk: {
      impact: "High",
      likelihood: "Medium",
      mitigation:
        "Define a separate release readiness checklist for the slide service and add failure-mode smoke tests before scaling the feature.",
    },
  },
  {
    category: "Remaining Feature",
    health: "🟡 Needs Monitoring",
    id: "PRD-01",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: today,
    baselineEnd: "2026-09-10",
    progress:
      "Writing Studio and internal book-authoring Phase 1 MVP specification is complete; delivery matrix and schema/API breakdown are now in planning execution.",
    revisedTarget: "2026-09-10",
    link: `${repoUrl}/blob/main/docs/shothik-books-phase1-mvp-spec.md`,
    tickets: makeTicketBlock("PRD-01"),
    apis: buildApiBlock([
      {
        name: "Book authoring API family",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/book`,
        staging: `${stagingBaseUrl}/api/book`,
        openapi: "Route family reference: app/api/book/* and app/api/books/*",
        owner: `Books owner ${codeOwner}`,
        link: prodSwaggerUrl,
      },
      {
        name: "Writing Studio quality check API",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/writing-studio/quality-check`,
        staging: `${stagingBaseUrl}/api/writing-studio/quality-check`,
        openapi: "Route family reference: app/api/writing-studio/*",
        owner: `Books owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "InsForge target schema for books",
        primaryContact: `Backend owner ${codeOwner}`,
        secondaryContact: platformContact,
        status: "Not Started",
        impact: "Critical",
        targetDate: "2026-07-30",
      },
      {
        name: "Book authoring MVP ticket decomposition",
        primaryContact: `Product owner ${codeOwner}`,
        secondaryContact: engineeringManagerContact,
        status: "In Progress",
        impact: "High",
        targetDate: "2026-07-22",
      },
    ]),
    coverage: makeCoverageBlock({
      untestedPaths:
        "Phase 1 internal-authoring flows against InsForge target schema, moderation transitions, and draft recovery after migration",
      suites:
        "Vitest: Pass on current legacy flows | Type-check: Pass | Playwright: Fail (no Shothik Books authoring journey yet)",
    }),
    launchGate: makeLaunchGateBlock(sharedGateFailures),
    risk: {
      impact: "High",
      likelihood: "Medium",
      mitigation:
        "Convert the approved Phase 1 spec into tickets immediately and keep external distribution out of scope until internal publishing is stable.",
    },
  },
  {
    category: "Remaining Feature",
    health: "🟡 Needs Monitoring",
    id: "PRD-02",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: today,
    baselineEnd: "2026-09-10",
    progress:
      "Marketplace, books, and library surfaces already exist; Phase 1 scope now formalizes them as the launch path before external distribution.",
    revisedTarget: "2026-09-10",
    link: `${prodBaseUrl}/marketplace`,
    tickets: makeTicketBlock("PRD-02"),
    apis: buildApiBlock([
      {
        name: "Marketplace query contract",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/marketplace`,
        staging: `${stagingBaseUrl}/marketplace`,
        openapi: "Current implementation references convex/marketplace.ts and /books/[bookId] pages; dedicated OpenAPI sections pending",
        owner: `Marketplace owner ${codeOwner}`,
        link: `${repoUrl}/blob/main/convex/marketplace.ts`,
      },
      {
        name: "Book detail and library ownership contract",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/books/[bookId]`,
        staging: `${stagingBaseUrl}/books/[bookId]`,
        openapi: "Reference: convex/books.ts, convex/marketplace.ts, components/credits/MyLibrarySection.tsx",
        owner: `Marketplace owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "InsForge ownership model for books and purchases",
        primaryContact: `Backend owner ${codeOwner}`,
        secondaryContact: marketplaceContact,
        status: "Not Started",
        impact: "Critical",
        targetDate: "2026-08-06",
      },
      {
        name: "Marketplace moderation rules",
        primaryContact: `Product owner ${codeOwner}`,
        secondaryContact: moderationContact,
        status: "Not Started",
        impact: "High",
        targetDate: "2026-08-13",
      },
    ]),
    coverage: makeCoverageBlock({
      untestedPaths:
        "ownership race conditions, unauthorized full-content access, and marketplace browse/search regressions after migration",
      suites:
        "Vitest: Pass on current legacy marketplace logic | Type-check: Pass | Playwright: Fail (no internal books marketplace journey yet)",
    }),
    launchGate: makeLaunchGateBlock(sharedGateFailures),
    risk: {
      impact: "High",
      likelihood: "Medium",
      mitigation:
        "Treat marketplace and library as a security-sensitive commerce surface and gate launch on explicit ownership and purchase end-to-end tests.",
    },
  },
  {
    category: "Remaining Feature",
    health: "🟡 Needs Monitoring",
    id: "PRD-03",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: "Not documented in repository history",
    baselineEnd: "Not documented in repository history",
    progress:
      "Credits wallet and payment rails are present across Stripe, Razorpay, and bKash; coverage plan calls these routes out as top-priority risk areas.",
    revisedTarget: "2026-08-29 proposed commerce hardening checkpoint",
    link: `${prodBaseUrl}/account/settings?section=wallet`,
    tickets: makeTicketBlock("PRD-03"),
    apis: buildApiBlock([
      {
        name: "Stripe credits checkout/webhook API",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/stripe/credits/checkout`,
        staging: `${stagingBaseUrl}/api/stripe/credits/checkout`,
        openapi: `${prodSwaggerUrl}#paths/~1api~1stripe~1credits~1checkout`,
        owner: `Payments owner ${codeOwner}`,
        link: prodSwaggerUrl,
      },
      {
        name: "Razorpay credits order/verify API",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/razorpay/credits/order`,
        staging: `${stagingBaseUrl}/api/razorpay/credits/order`,
        openapi: "Route family reference: app/api/razorpay/credits/*",
        owner: `Payments owner ${codeOwner}`,
      },
      {
        name: "bKash credits checkout/callback API",
        version: "1.0.0-target",
        prod: `${prodBaseUrl}/api/bkash/credits/checkout`,
        staging: `${stagingBaseUrl}/api/bkash/credits/checkout`,
        openapi: "Route family reference: app/api/bkash/credits/*",
        owner: `Payments owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "Stripe credential set",
        primaryContact: `Payments owner ${codeOwner}`,
        secondaryContact: opsContact,
        status: "In Progress",
        impact: "Critical",
        targetDate: "2026-07-25",
      },
      {
        name: "Razorpay / bKash credential verification",
        primaryContact: `Payments owner ${codeOwner}`,
        secondaryContact: financeOpsContact,
        status: "Not Started",
        impact: "High",
        targetDate: "2026-08-08",
      },
      {
        name: "Payment route coverage milestone",
        primaryContact: `${primaryOwnerLabel}, QA owner`,
        secondaryContact: releaseContact,
        status: "In Progress",
        impact: "High",
        targetDate: "2026-08-29",
      },
    ]),
    coverage: makeCoverageBlock({
      untestedPaths:
        "duplicate webhook idempotency, payout edge cases, provider outage fallback, and currency/credits reconciliation across providers",
      suites:
        "Vitest: Pass | Type-check: Pass | Playwright: Fail (no end-to-end wallet purchase matrix per provider)",
    }),
    launchGate: makeLaunchGateBlock(sharedGateFailures),
    risk: {
      impact: "High",
      likelihood: "Medium",
      mitigation:
        "Keep payments in the highest-priority coverage bucket, verify live credentials in staging first, and require provider-specific reconciliation checks.",
    },
  },
  {
    category: "Remaining Feature",
    health: "🔴 At Risk",
    id: "PRD-04",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: "Not documented in repository history",
    baselineEnd: "Not documented in repository history",
    progress:
      "Publishing and distribution flows exist, but external channel delivery depends on PublishDrive and channel operations that are not Phase 1 launch-ready.",
    revisedTarget: "Post-Phase 1 only",
    link: `${prodBaseUrl}/writing-studio`,
    tickets: makeTicketBlock("PRD-04"),
    apis: buildApiBlock([
      {
        name: "Publishing submission API",
        version: "0.8.0-legacy",
        prod: `${prodBaseUrl}/api/publish/submit`,
        staging: `${stagingBaseUrl}/api/publish/submit`,
        openapi: "Route family reference: app/api/publish/* and services/publishDriveService.js",
        owner: `Publishing owner ${codeOwner}`,
        link: `${repoUrl}/blob/main/app/api/publish/submit/route.ts`,
      },
      {
        name: "PublishDrive webhook/status API",
        version: "0.8.0-legacy",
        prod: `${prodBaseUrl}/api/webhooks/publishdrive`,
        staging: `${stagingBaseUrl}/api/webhooks/publishdrive`,
        openapi: "Route family reference: app/api/webhooks/publishdrive/*",
        owner: `Publishing owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "PublishDrive contract and API enablement",
        primaryContact: `Publishing owner ${codeOwner}`,
        secondaryContact: releaseContact,
        status: "Blocked",
        impact: "Critical",
        targetDate: "Pending external dependency confirmation",
      },
      {
        name: "Phase 1 internal books launch completion",
        primaryContact: `Product owner ${codeOwner}`,
        secondaryContact: booksContact,
        status: "Blocked",
        impact: "Critical",
        targetDate: "2026-09-10",
      },
      {
        name: "Google Play / channel compliance operations",
        primaryContact: `Publishing owner ${codeOwner}`,
        secondaryContact: legalOpsContact,
        status: "Not Started",
        impact: "High",
        targetDate: "Post-Phase 1",
      },
    ]),
    coverage: makeCoverageBlock({
      untestedPaths:
        "channel retry logic, royalty settlement reconciliation, and store-specific rejection/removal remediation flows",
      suites:
        "Vitest: Pass on current route set | Type-check: Pass | Playwright: Fail (no distribution end-to-end test path)",
    }),
    launchGate: makeLaunchGateBlock([
      {
        name: "Security scan",
        outcome: "Fail",
        completed: "No external distribution security sign-off",
        owner: securityApprover,
        remediation: "Complete internal books launch first, then run a dedicated publishing/distribution security review.",
        link: securityWorkflowUrl,
      },
      {
        name: "Compliance check",
        outcome: "Fail",
        completed: "No channel compliance sign-off",
        owner: releaseApprover,
        remediation: "Create publishing operations checklist, rights workflow, and store-compliance review before enabling channels.",
      },
      {
        name: "Performance test",
        outcome: "Fail",
        completed: "Not executed",
        owner: qaApprover,
        remediation: "Validate webhook and retry throughput once internal publishing is stable.",
      },
      {
        name: "Cross-functional stakeholder approval",
        outcome: "Fail",
        completed: "Not recorded",
        owner: stakeholderApprover,
        remediation: "Require product, legal/ops, engineering, and support approval before enabling external distribution.",
      },
    ]),
    risk: {
      impact: "Critical",
      likelihood: "High",
      mitigation:
        "Keep this workstream explicitly out of Phase 1, treat it as a post-MVP expansion, and do not route launch commitments through external publishing dependencies.",
    },
  },
  {
    category: "Remaining Feature",
    health: "🟡 Needs Monitoring",
    id: "PRD-05",
    owner: primaryOwnerLabel,
    contact: primaryOwnerContact,
    baselineStart: "2026-07-14",
    baselineEnd: "Staged rollout still active",
    progress:
      "Authentication, preview protection, and platform security hardening are active and documented; production confirmation and formal approvals remain open.",
    revisedTarget: "Release-dependent; next review 2026-07-22",
    link: `${repoUrl}/blob/main/docs/insforge-chat-auth-rollout.md`,
    tickets: makeTicketBlock("PRD-05"),
    apis: buildApiBlock([
      {
        name: "Auth and preview-access API family",
        version: "1.1.0-target",
        prod: `${prodBaseUrl}/api/auth/sign-in`,
        staging: `${stagingBaseUrl}/api/auth/sign-in`,
        openapi: `${prodSwaggerUrl}#paths/~1api~1auth~1sign-in`,
        owner: `Frontend/auth owner ${codeOwner}`,
        link: prodSwaggerUrl,
      },
      {
        name: "Health and docs verification API family",
        version: "1.1.0-target",
        prod: `${prodBaseUrl}/api/health`,
        staging: `${stagingBaseUrl}/api/health`,
        openapi: `${prodSwaggerUrl}#paths/~1api~1health`,
        owner: `Platform/release owner ${codeOwner}`,
      },
    ]),
    dependencies: buildDependencyBlock([
      {
        name: "Production Vercel environment confirmation",
        primaryContact: `Release owner ${codeOwner}`,
        secondaryContact: opsContact,
        status: "Blocked",
        impact: "Critical",
        targetDate: "Pending external confirmation; next review 2026-07-22",
      },
      {
        name: "GitHub CLI / release automation readiness",
        primaryContact: `Release owner ${codeOwner}`,
        secondaryContact: platformContact,
        status: "Not Started",
        impact: "Medium",
        targetDate: "2026-07-22",
      },
    ]),
    coverage: makeCoverageBlock({
      unit: makeAuthSecurityUnitCoverageText(),
      integration: "Auth/security and route-ownership tests present; module-level percentage not published",
      e2e: "25% smoke instrumentation; protected-preview browser smoke partially automated",
      reports: [ciWorkflowUrl, `${repoUrl}/blob/main/docs/insforge-chat-auth-rollout.md`],
      untestedPaths:
        "production release automation, remote authenticated smoke without operator-supplied bypass token, and post-promotion rollback drills",
      suites:
        "Vitest: Pass | Type-check: Pass | Playwright smoke: Pass for current preview-safe suite; authenticated protected-preview smoke still environment-gated",
    }),
    launchGate: makeLaunchGateBlock([
      {
        name: "Security scan",
        outcome: "Pass",
        completed: "2026-07-15 staging hardening evidence",
        owner: securityApprover,
        remediation: "Carry evidence into production release record.",
        link: `${repoUrl}/blob/main/docs/insforge-chat-auth-rollout.md`,
      },
      {
        name: "Compliance check",
        outcome: "Fail",
        completed: "Not formally signed off",
        owner: releaseApprover,
        remediation: "Record final release/compliance sign-off before production rollout.",
      },
      {
        name: "Performance test",
        outcome: "Fail",
        completed: "Not formally executed for production",
        owner: qaApprover,
        remediation: "Run release smoke, latency spot-checks, and monitor preview/production auth flows post-cutover.",
      },
      {
        name: "Cross-functional stakeholder approval",
        outcome: "Fail",
        completed: "Not recorded",
        owner: stakeholderApprover,
        remediation: "Capture release owner, reviewer/code owner, and QA approvals in the rollout artifact.",
      },
    ]),
    risk: {
      impact: "High",
      likelihood: "Medium",
      mitigation:
        "Keep the release gated on environment confirmation, production smoke, and final sign-off capture; do not shortcut the deploy-before-migration rule.",
    },
  },
];

for (const workstream of workstreams) {
  workstream.tickets = makeTicketBlockWithContext(workstream);
}

function mapRow(workstream) {
  return {
    "Service Category": workstream.category,
    Workstream: buildWorkstreamBlock(workstream).text,
    Tickets: workstream.tickets.text,
    "Target Schema/API": workstream.apis.text,
    Dependency: workstream.dependencies.text,
    "Test Coverage": workstream.coverage.text,
    "Launch Gate": workstream.launchGate.text,
    "Health Indicator": workstream.health,
    "Risk Assessment": createRiskText(workstream.risk),
  };
}

function addHyperlinksAndStyle(sheet, rows) {
  const headers = [
    "Service Category",
    "Workstream",
    "Tickets",
    "Target Schema/API",
    "Dependency",
    "Test Coverage",
    "Launch Gate",
    "Health Indicator",
    "Risk Assessment",
  ];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const healthCell = `H${rowNumber}`;
    const fill =
      row.health === "🟢 On Track"
        ? "C6EFCE"
        : row.health === "🟡 Needs Monitoring"
          ? "FFEB9C"
          : "FFC7CE";

    if (!sheet[healthCell]) {
      sheet[healthCell] = { t: "s", v: row.health };
    }

    sheet[healthCell].s = {
      fill: { fgColor: { rgb: fill } },
      font: { bold: true },
      alignment: { horizontal: "center", vertical: "center" },
    };

    const workstreamCell = `B${rowNumber}`;
    const ticketsCell = `C${rowNumber}`;
    const apiCell = `D${rowNumber}`;
    const dependencyCell = `E${rowNumber}`;
    const coverageCell = `F${rowNumber}`;
    const launchCell = `G${rowNumber}`;

    const linkMap = {
      [workstreamCell]: row.link,
      [ticketsCell]: row.tickets.link,
      [apiCell]: row.apis.link,
      [dependencyCell]: row.dependencies.link,
      [coverageCell]: row.coverage.link,
      [launchCell]: row.launchGate.link,
    };

    for (const [cellRef, link] of Object.entries(linkMap)) {
      if (link && sheet[cellRef]) {
        sheet[cellRef].l = { Target: link };
      }
    }
  });

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (!sheet[cellRef]) continue;
      sheet[cellRef].s = {
        ...(sheet[cellRef].s ?? {}),
        alignment: {
          wrapText: true,
          vertical: "top",
          ...(sheet[cellRef].s?.alignment ?? {}),
        },
      };
    }
  }

  sheet["!cols"] = headers.map((header) => {
    switch (header) {
      case "Service Category":
        return { wch: 20 };
      case "Health Indicator":
        return { wch: 20 };
      case "Risk Assessment":
        return { wch: 45 };
      default:
        return { wch: 55 };
    }
  });
}

const dependencyTotals = workstreams.reduce(
  (acc, workstream) => {
    const counts = summarizeDependencies(
      workstream.dependencies.text
        .split("\n\n")
        .map((chunk) => ({
          status: chunk.match(/Status: ([^\n]+)/)?.[1] ?? "Not Started",
        })),
    );
    acc.resolved += counts.resolved;
    acc.unresolved += counts.unresolved;
    return acc;
  },
  { resolved: 0, unresolved: 0 },
);

const totalGates = workstreams.length * 4;
const passedGates = workstreams.reduce(
  (acc, workstream) =>
    acc +
    workstream.launchGate.text
      .split("\n\n")
      .filter((chunk) => chunk.includes("Pass"))
      .length,
  0,
);

const categorySummary = [];
for (const category of [...new Set(workstreams.map((item) => item.category))]) {
  const rows = workstreams.filter((item) => item.category === category);
  const onTrack = rows.filter((item) => item.health === "🟢 On Track").length;
  const needsMonitoring = rows.filter((item) => item.health === "🟡 Needs Monitoring").length;
  const atRisk = rows.filter((item) => item.health === "🔴 At Risk").length;
  categorySummary.push({
    "Service Category": category,
    "Total Workstreams": rows.length,
    "On Track": onTrack,
    "Needs Monitoring": needsMonitoring,
    "At Risk": atRisk,
    "On-Track %": `${((onTrack / rows.length) * 100).toFixed(1)}%`,
  });
}

const summaryRows = [
  {
    Metric: "On-track workstream percentage",
    Value: `${((workstreams.filter((item) => item.health === "🟢 On Track").length / workstreams.length) * 100).toFixed(1)}%`,
    Notes: "Count of green workstreams divided by total workstreams.",
  },
  {
    Metric: "Resolved dependency count",
    Value: String(dependencyTotals.resolved),
    Notes: "Dependencies marked Complete in the matrix.",
  },
  {
    Metric: "Unresolved dependency count",
    Value: String(dependencyTotals.unresolved),
    Notes: "Dependencies marked Not Started, In Progress, or Blocked.",
  },
  {
    Metric: "Launch gate pass rate",
    Value: `${((passedGates / totalGates) * 100).toFixed(1)}%`,
    Notes: "Passed gates divided by required gates across all workstreams.",
  },
  {
    Metric: "Formal gate owner coverage",
    Value: "100%",
    Notes:
      "All workstreams now reference named formal approvers from the validated contributor directory instead of acting placeholders.",
  },
  {
    Metric: "Legend",
    Value: "🟢 On Track | 🟡 Needs Monitoring | 🔴 At Risk",
    Notes: "CSV preserves label text; XLSX preserves label text and color styling.",
  },
  {
    Metric: "Export note",
    Value: ".xlsx and .csv generated",
    Notes:
      "Hyperlinks are preserved in the .xlsx workbook. The CSV exports retain raw URLs and status labels for downstream spreadsheet ingestion.",
  },
  {
    Metric: "Governance caveat",
    Value: "Jira IDs remain intentionally absent; named approvers, evidence sources, and dependency checklists are now captured in repo governance artifacts",
    Notes:
      "Dedicated GitHub issues remain the active tracker system, while the local governance refresh captures the formal approver roster, evidence sources, and issue-aligned dependency checklists.",
  },
];

fs.mkdirSync(outputDir, { recursive: true });

const matrixSheet = XLSX.utils.json_to_sheet(workstreams.map(mapRow));
addHyperlinksAndStyle(matrixSheet, workstreams);

const summarySheet = XLSX.utils.json_to_sheet(summaryRows, {
  header: ["Metric", "Value", "Notes"],
});
summarySheet["!cols"] = [{ wch: 28 }, { wch: 24 }, { wch: 90 }];

const categorySheet = XLSX.utils.json_to_sheet(categorySummary);
categorySheet["!cols"] = [
  { wch: 22 },
  { wch: 18 },
  { wch: 12 },
  { wch: 20 },
  { wch: 12 },
  { wch: 12 },
];

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
XLSX.utils.book_append_sheet(workbook, categorySheet, "Category Rollup");
XLSX.utils.book_append_sheet(workbook, matrixSheet, "Delivery Matrix");

XLSX.writeFile(workbook, workbookPath);
fs.writeFileSync(matrixCsvPath, XLSX.utils.sheet_to_csv(matrixSheet));
fs.writeFileSync(summaryCsvPath, XLSX.utils.sheet_to_csv(summarySheet));

console.log(`Delivery matrix written to ${workbookPath}`);
console.log(`Matrix CSV written to ${matrixCsvPath}`);
console.log(`Summary CSV written to ${summaryCsvPath}`);
