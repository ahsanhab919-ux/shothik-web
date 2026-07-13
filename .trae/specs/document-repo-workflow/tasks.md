# Tasks
- [x] Task 1: Produce an accurate repo map (architecture + boundaries).
  - [x] SubTask 1.1: Summarize runtime entry points (Next.js `app/`, `server.ts`, `proxy.ts`) and describe request/data flow.
  - [x] SubTask 1.2: Summarize the data layer (Convex schema/functions and any planned DB usage like Prisma).
  - [x] SubTask 1.3: Identify the main domain feature areas (tools, agent/twin, payments, publishing) and where they live in the repo.

- [x] Task 2: Define branch strategy aligned with CI + protection policy.
  - [x] SubTask 2.1: Confirm existing branches and reconcile with documented policy (`main`, optional `develop`).
  - [x] SubTask 2.2: Document naming conventions and how CI is triggered for each prefix.
  - [x] SubTask 2.3: Document hotfix procedure and post-incident follow-up expectations.

- [x] Task 3: Define the local execution runbook.
  - [x] SubTask 3.1: Document prerequisites (Node, pnpm, external services).
  - [x] SubTask 3.2: Document minimal environment variables needed for common local flows.
  - [x] SubTask 3.3: Document the standard local validation sequence and expected artifacts.

- [x] Task 4: Define CI execution and quality gates.
  - [x] SubTask 4.1: Map CI jobs to scripts (`type-check`, `test:coverage`, `build`) and required env placeholders.
  - [x] SubTask 4.2: Document optional manual E2E smoke suite (workflow dispatch only) and when to use it.
  - [x] SubTask 4.3: Document security/maintenance checks (license compliance, dependency audit) and when they must run.

- [x] Task 5: Validate the spec is actionable and safe.
  - [x] SubTask 5.1: Ensure the spec does not include credentials, tokens, or secret values.
  - [x] SubTask 5.2: Ensure the spec references the source-of-truth files in-repo for future updates.
  - [x] SubTask 5.3: Ensure the spec clearly separates current state vs planned/target state (e.g., Clerk vs Better Auth).

# Task Dependencies
- Task 2 depends on Task 1 (branch workflow should reference actual repo structure and CI triggers).
- Task 3 depends on Task 1 (runbook must reflect real entry points and integrations).
- Task 4 depends on Task 2 (CI gates tie into branch policy and merge rules).
