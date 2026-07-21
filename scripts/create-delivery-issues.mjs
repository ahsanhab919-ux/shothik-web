#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, "docs", "delivery");
const seedPath = path.join(outputDir, "dedicated-issue-seed.json");
const registryPath = path.join(outputDir, "issue-registry.json");

const owner = "ahsanhab919-ux";
const repo = "shothik-web";
const dryRun = process.argv.includes("--dry-run");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function getAuthToken() {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }

  if (process.env.GH_TOKEN) {
    return process.env.GH_TOKEN;
  }

  try {
    return execFileSync("gh", ["auth", "token"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function buildIssueBody(seed) {
  return [
    `Dedicated delivery-tracker issue for ${seed.workstreamId}.`,
    "",
    `- Category: ${seed.category}`,
    `- Owner: ${seed.owner}`,
    `- Summary: ${seed.summary}`,
    `- Previous fallback mapping: ${seed.currentMapping}`,
    "",
    "This issue replaces the temporary nearest-ticket mapping used by the delivery matrix.",
  ].join("\n");
}

function normalizeStatus(state) {
  return state === "closed" ? "Done" : "To Do";
}

async function githubRequest(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "shothik-delivery-issue-bootstrap",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });

  const payload = await response.json();

  return { response, payload };
}

async function findExistingIssueByTitle(token, title) {
  const query = encodeURIComponent(`repo:${owner}/${repo} in:title type:issue "${title}"`);
  const { response, payload } = await githubRequest(
    token,
    `https://api.github.com/search/issues?q=${query}&per_page=10`,
    {
      method: "GET",
      headers: {
        "Content-Type": undefined,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Issue search failed: ${payload?.message ?? response.status}`);
  }

  return (payload.items ?? []).find((item) => item.title === title) ?? null;
}

async function createIssue(token, seed, includeAssignee = true) {
  const assignees = includeAssignee && seed.assignee ? [seed.assignee] : undefined;
  const { response, payload } = await githubRequest(
    token,
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: "POST",
      body: JSON.stringify({
        title: seed.title,
        body: buildIssueBody(seed),
        assignees,
      }),
    },
  );

  if (response.ok) {
    return payload;
  }

  if (
    includeAssignee &&
    assignees?.length &&
    response.status === 422 &&
    payload?.message === "Validation Failed"
  ) {
    return createIssue(token, seed, false);
  }

  const error = payload?.message ?? `GitHub API returned ${response.status}`;
  throw new Error(`${seed.workstreamId}: ${error}`);
}

function mapIssueToRegistryEntry(issue, note) {
  return {
    issueId: `#${issue.number}`,
    recordType: "Issue",
    title: issue.title,
    status: normalizeStatus(issue.state),
    created: issue.created_at,
    updated: issue.updated_at,
    link: issue.html_url,
    note,
    provenance: "dedicated",
  };
}

async function updateIssue(token, issueNumber, seed, includeAssignee = true) {
  const assignees = includeAssignee && seed.assignee ? [seed.assignee] : [];
  const { response, payload } = await githubRequest(
    token,
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        title: seed.title,
        body: buildIssueBody(seed),
        assignees,
      }),
    },
  );

  if (response.ok) {
    return payload;
  }

  if (
    includeAssignee &&
    assignees.length &&
    response.status === 422 &&
    payload?.message === "Validation Failed"
  ) {
    return updateIssue(token, issueNumber, seed, false);
  }

  const error = payload?.message ?? `GitHub API returned ${response.status}`;
  throw new Error(`${seed.workstreamId}: ${error}`);
}

async function resolveIssue(token, seed) {
  const existingIssue = await findExistingIssueByTitle(token, seed.title);
  if (existingIssue) {
    const syncedIssue = await updateIssue(token, existingIssue.number, seed);
    return {
      issue: syncedIssue,
      note: "Dedicated delivery-tracker issue synchronized from the current delivery seed.",
    };
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "shothik-delivery-issue-bootstrap",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      title: seed.title,
      body: buildIssueBody(seed),
      assignees: seed.assignee ? [seed.assignee] : undefined,
    }),
  });

  const payload = await response.json();
  if (response.ok) {
    return {
      issue: payload,
      note: "Dedicated delivery-tracker issue created by scripts/create-delivery-issues.mjs.",
    };
  }

  if (
    response.status === 422 &&
    payload?.message === "Validation Failed"
  ) {
    const createdWithoutAssignee = await createIssue(token, seed, false);
    return {
      issue: createdWithoutAssignee,
      note: "Dedicated delivery-tracker issue created by scripts/create-delivery-issues.mjs without a GitHub assignee because the named owner is not assignable on this repository.",
    };
  }

  const error = payload?.message ?? `GitHub API returned ${response.status}`;
  throw new Error(`${seed.workstreamId}: ${error}`);
}

async function main() {
  const token = getAuthToken();
  if (!token && !dryRun) {
    throw new Error(
      "No write-capable GitHub credential found. Set GITHUB_TOKEN or GH_TOKEN, or run `gh auth login` first.",
    );
  }

  const seeds = readJson(seedPath);
  const existingRegistry = fs.existsSync(registryPath) ? readJson(registryPath) : {};
  const nextRegistry = { ...existingRegistry };

  for (const seed of seeds) {
    if (dryRun) {
      console.log(`dry-run ${seed.workstreamId}: ${seed.title}`);
      continue;
    }

    const { issue, note } = await resolveIssue(token, seed);
    nextRegistry[seed.workstreamId] = mapIssueToRegistryEntry(issue, note);
    writeJson(registryPath, nextRegistry);
    console.log(`resolved ${seed.workstreamId}: #${issue.number}`);
  }

  if (!dryRun) {
    console.log(`registry written to ${registryPath}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
