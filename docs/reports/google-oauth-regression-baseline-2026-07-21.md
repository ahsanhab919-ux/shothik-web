# Google OAuth Regression Baseline Update

Date: `2026-07-21`

## Scope

Convert the manually re-certified Google OAuth fix into repeatable automated
coverage after the Batch 1 end-to-end recertification completed successfully.

## Coverage Added

### Unit coverage

- `components/auth/AuthWithSocial.test.jsx`
  - replaces stale PKCE verifier before a fresh OAuth attempt
  - clears stale verifier when OAuth startup fails
- `providers/AuthProvider.test.tsx`
  - sends `code + codeVerifier` when the verifier exists
  - supports code-only callback exchange when no verifier is stored
  - stays anonymous when callback exchange fails
- `app/api/auth/oauth/exchange/route.test.ts`
  - retains success/failure/pass-through coverage for the exchange route

### Browser regression

- `e2e/login-validation.spec.ts`
  - adds a stable callback-path regression:
    - seeds the PKCE verifier in `sessionStorage`
    - loads `/auth/post-login?insforge_code=...`
    - asserts `/api/auth/oauth/exchange` receives both `code` and
      `codeVerifier`
    - asserts the verifier is cleared after success
    - asserts the callback URL is cleaned of `insforge_code`

## Validation

### Focused unit tests

```bash
pnpm exec vitest run \
  components/auth/AuthWithSocial.test.jsx \
  providers/AuthProvider.test.tsx \
  app/api/auth/oauth/exchange/route.test.ts
```

Result:

- `11 passed`

### Focused Playwright regression

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
pnpm exec playwright test e2e/login-validation.spec.ts \
  --grep "google oauth callback forwards the PKCE verifier through the local exchange route" \
  --project=chrome-stable
```

Result:

- `1 passed`

## Outcome

- The Google OAuth PKCE repair is now protected by repeatable automated
  coverage at both the unit and browser layers.
- The remaining broader auth E2E baseline can now build on this regression
  instead of relying on manual-only verification.
