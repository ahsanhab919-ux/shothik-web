# Launch Gate Governance Refresh

Date: `2026-07-18`
Phase: `Phase 2 - Delivery Governance Hardening`
Status: `Completed`

## Formal Approver Roster

The repository currently validates one named contributor in
`docs/delivery/contributor-directory.md`. Until additional contributors are
validated in-repo, the formal launch-gate approver roster is recorded as:

- Security approver: `Ahsan Habib (@ahsanhab919-ux)`
- Release approver: `Ahsan Habib (@ahsanhab919-ux)`
- QA approver: `Ahsan Habib (@ahsanhab919-ux)`
- Product / stakeholder approver: `Ahsan Habib (@ahsanhab919-ux)`

This replaces prior tracker language that used unnamed or acting placeholders.

## Governance Rules Applied

- Every tracked workstream must reference a dedicated GitHub issue from
  `docs/delivery/issue-registry.json`.
- Every workstream must point to at least one evidence source for launch-gate
  review.
- Every unresolved dependency must be represented as a checklist item tied to
  an owner and target date.
- Production rollout workstreams must record their release-window approval in
  the governance source of truth.

## Workstream Records

### LWT-01

- Issue: `#41`
- Formal approvers: security, release, QA, and stakeholder approval are all
  assigned to `Ahsan Habib (@ahsanhab919-ux)`.
- Evidence:
  - CI workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/ci.yml`
  - Security workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/security.yml`
- Open checklist:
  - [ ] Confirm `LLM provider credentials` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-07-18`
  - [ ] Complete `Usage enforcement / credit policy alignment` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-08-01`

### LWT-02

- Issue: `#42`
- Formal approvers: security, release, QA, and stakeholder approval are all
  assigned to `Ahsan Habib (@ahsanhab919-ux)`.
- Evidence:
  - CI workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/ci.yml`
  - Security workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/security.yml`
- Open checklist:
  - [ ] Confirm `LLM provider credentials` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-07-18`
  - [ ] Complete `Localization/content QA baseline` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-08-08`

### LWT-03

- Issue: `#43`
- Formal approvers: security, release, QA, and stakeholder approval are all
  assigned to `Ahsan Habib (@ahsanhab919-ux)`.
- Evidence:
  - CI workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/ci.yml`
  - Security workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/security.yml`
- Open checklist:
  - [ ] Complete `Plagiarism modernization rollout` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-08-22`
  - [ ] Complete `Critical tool coverage milestone` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-08-22`

### AGT-01

- Issue: `#44`
- Formal approvers:
  - Security approver: `Ahsan Habib (@ahsanhab919-ux)`
  - Release approver: `Ahsan Habib (@ahsanhab919-ux)`
  - QA approver: `Ahsan Habib (@ahsanhab919-ux)`
  - Reviewer / code owner: `Ahsan Habib (@ahsanhab919-ux)`
- Evidence:
  - Rollout record: `docs/insforge-chat-auth-rollout.md`
  - Delivery progress log: `docs/delivery/current-progress-log.md`
  - Production deployment: `https://shothik-9rw3ebjso-shothik.vercel.app`
  - Production alias: `https://www.shothikgpt.com`
- Release-window approval:
  - [x] Approved and executed for the deploy-first production rollout on `2026-07-18`
  - [x] Post-promotion smoke evidence recorded with `16 passed`
  - [x] Post-promotion SQL ownership verification recorded with `0` mismatched rows
- Open checklist:
  - [ ] Confirm durable production smoke-account cleanup decision owner `Ahsan Habib (@ahsanhab919-ux)` by next production hygiene review
  - [ ] Investigate residual non-blocking Convex console noise owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-07-22`

### AGT-02

- Issue: `#45`
- Formal approvers: security, release, QA, and stakeholder approval are all
  assigned to `Ahsan Habib (@ahsanhab919-ux)`.
- Evidence:
  - CI workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/ci.yml`
  - Security workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/security.yml`
- Open checklist:
  - [ ] Complete `Second Me vault secret provisioning` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-08-08`
  - [ ] Complete `Convex-to-InsForge migration plan for twin data` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-09-01`

### AGT-03

- Issue: `#46`
- Formal approvers: security, release, QA, and stakeholder approval are all
  assigned to `Ahsan Habib (@ahsanhab919-ux)`.
- Evidence:
  - CI workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/ci.yml`
  - Security workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/security.yml`
- Open checklist:
  - [ ] Complete `Moderation policy owner assignment` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-08-15`
  - [ ] Complete `Community data source-of-truth decision` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-09-05`

### RSH-01

- Issue: `#47`
- Formal approvers: security, release, QA, and stakeholder approval are all
  assigned to `Ahsan Habib (@ahsanhab919-ux)`.
- Evidence:
  - CI workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/ci.yml`
  - Security workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/security.yml`
- Open checklist:
  - [ ] Confirm `LLM provider credentials` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-07-18`
  - [ ] Complete `Source provenance / citation policy` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-08-29`

### RSH-02

- Issue: `#48`
- Formal approvers: security, release, QA, and stakeholder approval are all
  assigned to `Ahsan Habib (@ahsanhab919-ux)`.
- Evidence:
  - CI workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/ci.yml`
  - Security workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/security.yml`
- Open checklist:
  - [ ] Complete `Spreadsheet session persistence model` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-09-05`
  - [ ] Complete `Load/performance test baseline for large sheets` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-09-05`

### RSH-03

- Issue: `#49`
- Formal approvers: security, release, QA, and stakeholder approval are all
  assigned to `Ahsan Habib (@ahsanhab919-ux)`.
- Evidence:
  - CI workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/ci.yml`
  - Security workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/security.yml`
- Open checklist:
  - [ ] Complete `External slide generation microservice` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-09-12`
  - [ ] Complete `Presentation storage/export reliability` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-09-12`

### PRD-01

- Issue: `#50`
- Formal approvers: security, release, QA, and stakeholder approval are all
  assigned to `Ahsan Habib (@ahsanhab919-ux)`.
- Evidence:
  - Plan: `docs/shothik-books-phase1-implementation-plan.md`
  - Progress log: `docs/delivery/current-progress-log.md`
- Open checklist:
  - [ ] Complete `InsForge target schema for books` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-07-30`
  - [ ] Complete `Book authoring MVP ticket decomposition` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-07-22`

### PRD-02

- Issue: `#51`
- Formal approvers: security, release, QA, and stakeholder approval are all
  assigned to `Ahsan Habib (@ahsanhab919-ux)`.
- Evidence:
  - Plan: `docs/shothik-books-phase1-implementation-plan.md`
  - Progress log: `docs/delivery/current-progress-log.md`
- Open checklist:
  - [ ] Complete `InsForge ownership model for books and purchases` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-08-06`
  - [ ] Complete `Marketplace moderation rules` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-08-13`

### PRD-03

- Issue: `#52`
- Formal approvers: security, release, QA, and stakeholder approval are all
  assigned to `Ahsan Habib (@ahsanhab919-ux)`.
- Evidence:
  - CI workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/ci.yml`
  - Security workflow: `https://github.com/ahsanhab919-ux/shothik-web/actions/workflows/security.yml`
- Open checklist:
  - [ ] Complete `Stripe credential set` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-07-25`
  - [ ] Complete `Razorpay / bKash credential verification` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-08-08`
  - [ ] Complete `Payment route coverage milestone` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-08-29`

### PRD-04

- Issue: `#53`
- Formal approvers: security, release, QA, and stakeholder approval are all
  assigned to `Ahsan Habib (@ahsanhab919-ux)`.
- Evidence:
  - Publish routes: `app/api/publish/submit/route.ts`
  - Webhook route: `app/api/webhooks/publishdrive/route.ts`
- Open checklist:
  - [ ] Complete `PublishDrive contract and API enablement` owner `Ahsan Habib (@ahsanhab919-ux)` by pending external confirmation
  - [ ] Complete `Phase 1 internal books launch completion` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-09-10`
  - [ ] Complete `Google Play / channel compliance operations` owner `Ahsan Habib (@ahsanhab919-ux)` after Phase 1

### PRD-05

- Issue: `#54`
- Formal approvers:
  - Security approver: `Ahsan Habib (@ahsanhab919-ux)`
  - Release approver: `Ahsan Habib (@ahsanhab919-ux)`
  - QA approver: `Ahsan Habib (@ahsanhab919-ux)`
  - Reviewer / code owner: `Ahsan Habib (@ahsanhab919-ux)`
- Evidence:
  - Rollout record: `docs/insforge-chat-auth-rollout.md`
  - Progress log: `docs/delivery/current-progress-log.md`
  - Smoke suite: `e2e/smoke.spec.ts`
- Open checklist:
  - [ ] Complete `Production Vercel environment confirmation` owner `Ahsan Habib (@ahsanhab919-ux)` during the next release-automation review
  - [ ] Complete `GitHub CLI / release automation readiness` owner `Ahsan Habib (@ahsanhab919-ux)` by `2026-07-22`

## Completion Statement

This governance refresh closes the tracked Phase 2 objectives by:

- replacing acting gate-owner labels with named formal approvers already
  validated in-repo
- attaching an evidence source and unresolved dependency checklist to every
  dedicated delivery workstream
- recording the executed `2026-07-18` release-window approval for `AGT-01`
- creating a stable governance source that the delivery matrix can link to on
  subsequent refreshes
