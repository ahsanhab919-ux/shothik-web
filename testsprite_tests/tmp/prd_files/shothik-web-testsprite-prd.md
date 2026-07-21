# Shothik Web TestSprite PRD Seed

## Product

Shothik Web

## Summary

Shothik is an asset-centric creator platform that combines legacy writing
tools, authenticated agent chat, research and writing workspaces, community and
channels, marketplace flows, and books publishing surfaces in a single Next.js
application.

## Current Testing Goal

Use TestSprite to strengthen browser-based automation around the existing
Playwright-compatible flows, starting with the highest-risk user journeys:

1. authentication
2. post-login redirect stability
3. authenticated `/agents/chat` access
4. health and API docs smoke verification
5. progressive expansion into writing tools, marketplace, and books workflows

## Primary Users

- guest visitors
- authenticated end users
- creators/authors
- readers/buyers
- admins/reviewers

## Core Journeys

### 1. Authentication and post-login routing

- user opens `/auth/login`
- user signs in with valid credentials
- app lands on `/auth/post-login`
- app resolves to a valid destination such as `/agents/chat`

### 2. Agent chat

- authenticated user opens `/agents/chat`
- chat interface loads within the expected response window
- message input, conversation area, and core controls render correctly

### 3. Health and documentation smoke

- `/api/health` responds successfully
- `/api/docs/swagger.json` responds with the current protected-route contract

### 4. Legacy writing tools

- user opens tool routes such as `/paraphrase`, `/humanize-gpt`, `/summarize`,
  `/translator`, `/ai-detector`, and `/grammar-checker`
- tool UI loads and can submit valid input to the corresponding API route

### 5. Marketplace and books

- user browses `/marketplace`
- user opens `/books/[bookId]`
- ownership and publishing states are visible and stable

## Existing Technical Context

- framework: Next.js App Router
- test foundation: Vitest and Playwright already exist in the repo
- auth direction: InsForge-first migration with protected preview support
- environment constraint: production Vercel environment variables are still
  missing, so production rollout automation is not ready yet

## Current Known Constraints

- protected preview browser automation requires
  `PLAYWRIGHT_VERCEL_PROTECTION_BYPASS`
- authenticated smoke requires `PLAYWRIGHT_SMOKE_EMAIL` and
  `PLAYWRIGHT_SMOKE_PASSWORD`
- production rollout is blocked until Vercel production env values are present

## Success Criteria For TestSprite Setup

1. TestSprite project bootstrap completes without corrupting the repo
2. frontend test plan is generated against the local Next.js app on port `3000`
3. browser automation can target login and chat smoke flows
4. generated outputs are reviewable and align with the repo's existing testing
   and rollout documentation
