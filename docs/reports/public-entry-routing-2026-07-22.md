# Public Entry Routing Report

## Objective

Align public navigation with the product rule that discovery pages stay public and authentication is required only when the user starts a protected workflow.

## Scope

- Books
- Community
- Chat home
- Native and agent tool entry points

## Route Model

- Public landing pages:
  - `/`
  - `/marketplace`
  - `/community`
  - `/agents`
  - native tool pages such as `/paraphrase`, `/grammar-checker`, `/ai-detector`, `/humanize-gpt`, `/summarize`, and `/translator`
- Protected workspaces:
  - `/agents/chat`
  - `/agents/research`
  - `/writing-studio`
  - `/twin`
  - account and dashboard routes

## Implemented Changes

1. Replaced the `/agents` redirect with the public `AgentLandingPage` wrapped in `AgentContextProvider`.
2. Updated public chat and agent entry links to point to `/agents` or `/agents?tab=...` instead of protected workspace routes.
3. Updated sitemap discovery from `/agents/chat` to `/agents`.
4. Left protected workspace routes unchanged so authenticated use still happens inside the existing guarded surfaces.

## Files Changed

- `app/(primary-layout)/agents/page.jsx`
- `components/partials/icon-nav-sidebar/index.tsx`
- `components/partials/mobile-bottom-nav/index.tsx`
- `config/navigation/index.tsx`
- `app/sitemap.ts`
- `app/(primary-layout)/agents/page.test.jsx`
- `app/sitemap.test.ts`

## Validation

- Unit tests verify that `/agents` renders the public landing page and that sitemap discovery points to `/agents`.
- Existing auth-route coverage continues to assert that `/agents` is public while `/agents/chat` and `/agents/research` remain protected.
- Manual browser validation should confirm:
  - `/agents` loads without login
  - starting an agent workflow from the landing page prompts for authentication when needed
  - books, community, and native tool overview pages remain publicly accessible
