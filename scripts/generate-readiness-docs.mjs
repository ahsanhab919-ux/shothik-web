#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import {
  formatFunctionalAcceptanceMarkdown,
  formatMilestoneMarkdown,
  formatTestReportMarkdown,
  releaseReadinessBaseline,
} from "./lib/release-readiness-report.mjs";

const repoRoot = process.cwd();
const reportsDir = path.join(repoRoot, "docs", "reports");
const dateStamp = releaseReadinessBaseline.validatedOn;

const outputs = [
  {
    path: path.join(reportsDir, `release-readiness-milestones-${dateStamp}.md`),
    content: formatMilestoneMarkdown(),
  },
  {
    path: path.join(reportsDir, `test-report-${dateStamp}.md`),
    content: formatTestReportMarkdown(),
  },
  {
    path: path.join(reportsDir, `functional-acceptance-${dateStamp}.md`),
    content: formatFunctionalAcceptanceMarkdown(),
  },
];

for (const output of outputs) {
  fs.mkdirSync(path.dirname(output.path), { recursive: true });
  fs.writeFileSync(output.path, `${output.content.trim()}\n`);
  console.log(`Wrote ${path.relative(repoRoot, output.path)}`);
}
