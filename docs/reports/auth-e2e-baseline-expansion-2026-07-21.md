# Auth E2E Baseline Expansion (Batch 1)

Date: `2026-07-21`

## Objective

Expand the authenticated E2E baseline so the project has repeatable coverage for:

- Session refresh (token renewal path)
- Authorization controls (privilege boundaries)
- Logout invalidation (post-logout protected route enforcement)

This complements the Google OAuth recertification by ensuring the authenticated
runtime contract remains stable after the environment and OAuth fixes.

## Success Criteria

1. **Refresh**: An authenticated session can successfully call `POST /api/auth/refresh` and receive a refreshed access token.
2. **Authorization**: A non-admin authenticated user is denied access to admin resources (`GET /api/admin/books`) with a `403`.
3. **Logout invalidation**: After `POST /api/auth/sign-out`, protected APIs (`GET /api/projects`) return `401/403`, and protected pages (e.g. `/agents/chat`) redirect back to `/auth/login`.
4. **No regressions**: Existing browser smoke suite continues to pass under the corrected environment.

## Implementation

### Updated baseline suite

- [authenticated-core-smoke.spec.ts](file:///Users/user/Pictures/shothik.2/shothik-web/e2e/authenticated-core-smoke.spec.ts)
  - Stabilized login synchronization by waiting on the `/api/auth/sign-in` POST response.
  - Added refresh validation via `POST /api/auth/refresh`.
  - Added authorization validation via `GET /api/admin/books` (expects `403`).
  - Added logout invalidation validation via:
    - `POST /api/auth/sign-out` (expects `200`)
    - `GET /api/projects` (expects `401` or `403`)
    - navigation to `/agents/chat` redirects to `/auth/login` and shows the compliance notice.

## Verification

### Playwright (browser integration)

Local server: `pnpm dev`

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
pnpm exec playwright test \
  e2e/authenticated-core-smoke.spec.ts \
  e2e/smoke.spec.ts \
  --project=chrome-stable
```

Result:

- `3 passed`
- `2 skipped` (credential-gated skips)

### Unit sanity (OAuth chain remains stable)

```bash
pnpm exec vitest run \
  components/auth/AuthWithSocial.test.jsx \
  providers/AuthProvider.test.tsx \
  app/api/auth/oauth/exchange/route.test.ts
```

Result:

- `11 passed`

## Outcome

- Authenticated E2E baseline now covers refresh, privilege denial, and logout
  invalidation under the corrected staging-aligned environment.
- Provides a repeatable guardrail for future Batch 2+ work that depends on
  stable authentication and protected-route enforcement.
