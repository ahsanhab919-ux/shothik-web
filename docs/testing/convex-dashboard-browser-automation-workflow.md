# Convex Dashboard Browser Automation Workflow

## Status

Approval draft. No browser-agent execution should start until this workflow is confirmed or amended.

## Objective

Use a dedicated browser agent to perform a controlled Convex dashboard setup/review workflow for the
deployment endpoint:

- `https://dashing-mandrill-233.convex.cloud/`

## Execution Boundary

The browser agent may navigate, inspect, fill forms, and capture evidence inside the Convex dashboard.
It must not create, delete, rotate, or expose secrets unless that exact step is explicitly approved.

## Proposed Workflow

1. Open the Convex dashboard sign-in page.
2. Authenticate with the approved account that has access to the target workspace.
3. Select the organization or personal workspace that contains the `dashing-mandrill-233` deployment.
4. Open the target project or deployment whose URL matches `https://dashing-mandrill-233.convex.cloud/`.
5. Capture the project summary page and confirm:
   - project/deployment name,
   - deployment status,
   - displayed Convex URL,
   - environment classification if shown.
6. Open the deployment settings or environment configuration area.
7. Record the visible environment-variable names only.
8. Compare the dashboard-visible configuration surface against the app-side Convex integration needs.
9. Open the authentication or identity configuration area if present.
10. Record the enabled auth providers and any email/password configuration state that is visible.
11. Open the deployment keys, client configuration, or project details area if present.
12. Confirm whether any browser-based action is still required after inspection:
    - add missing configuration,
    - enable a provider,
    - confirm auth settings,
    - verify deployment metadata,
    - capture evidence for handoff.
13. Produce a step-by-step evidence report with screenshots and any blocking issues.

## Required Output From The Browser Agent

The automation run should return:

- whether the target deployment was found,
- whether the displayed Convex URL matches the requested URL,
- visible environment-variable names only,
- visible auth-provider state,
- exact dashboard pages visited,
- screenshots for each major step,
- any permission or access blockers,
- any action that still requires explicit user approval.

## Explicit Non-Goals

The browser agent should not do any of the following without a separate approval message:

- create a new Convex project,
- rotate deployment keys,
- paste secrets,
- enable or disable providers,
- invite users,
- delete environments or deployments,
- modify billing or workspace ownership settings.

## Approval Checkpoint

After you confirm this workflow, the next step is to execute it with a dedicated browser agent and
follow the same approval-first pattern for all later Convex dashboard tasks.
