# Convex Recovery Runbook

Date: `2026-07-20`
Status: `Active`

## Purpose

Restore the remaining Convex-backed feature slices from the current codebase
without introducing new dependencies or rebuilding the backend by hand.

This recovery flow reuses:

- the checked-in `convex/` functions and schema
- the existing Convex CLI dependency already installed in the repo
- the existing JWT compatibility bridge now backed by the current InsForge user
  session
- the existing environment file convention (`.env.local`, `.env`)

## Recovery Scope

The recovery implementation restores two layers that were blocking Convex-backed
runtime behavior:

1. **Runtime compatibility**
   - `providers/ConvexClientProvider.jsx` now mounts a real
     `ConvexProviderWithAuth` when `NEXT_PUBLIC_CONVEX_URL` is configured
   - `/api/auth/convex-token` now mints a Convex JWT from the authenticated
     InsForge user session instead of returning `410`
   - `lib/convex-auth.ts` is the single source of truth for Convex token
     minting, site URL derivation, and authenticated server clients

2. **Operational recovery**
   - `scripts/recover-convex.ts` loads the repo env files
   - `lib/convex-recovery.ts` syncs the required Convex deployment env values,
     deploys the checked-in Convex backend, and verifies the deployment after
     recovery

## Required Inputs

Set these in `.env.local` or `.env` before running recovery:

- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL` (preferred)
- `JWT_PRIVATE_KEY`

Optional but supported:

- `CONVEX_EXPECTED_CLOUD_URL` (fallback if you are already using the dashboard workflow runner)
- `CONVEX_URL` (legacy fallback)
- `CONVEX_DEPLOY_KEY`
- `CONVEX_JWT_PUBLIC_KEY_N`

Notes:

- `CONVEX_SITE_URL` is a Convex reserved runtime variable and should not be set
  via the environment variables UI. Recovery derives the site URL from the
  configured cloud URL (`NEXT_PUBLIC_CONVEX_URL` / `CONVEX_URL` /
  `CONVEX_EXPECTED_CLOUD_URL`) and uses it only for verification and token
  issuer construction.
- if `CONVEX_JWT_PUBLIC_KEY_N` is missing, recovery derives it from
  `JWT_PRIVATE_KEY`
- `CONVEX_JWT_PUBLIC_KEY_N` is the RSA public key modulus (`n`) in base64url form (as seen in JWKS), not a PEM block

## Commands

Dry-run the recovery flow:

```bash
pnpm recover:convex --dry-run
```

Run the full recovery:

```bash
pnpm recover:convex
```

Force overwrite of existing Convex deployment env values if the deployment
contains drift:

```bash
pnpm recover:convex --force-env-sync
```

Run only env sync and verification without deploying code:

```bash
pnpm recover:convex --skip-deploy
```

Skip CLI env sync when the required deployment env values have already been
applied in the Convex dashboard and only the code deploy + verification steps
are needed:

```bash
pnpm recover:convex --skip-env-sync
```

## Verification Procedure

Run the targeted recovery validation suite:

```bash
pnpm test:convex:recovery
```

Then run the repo type-check:

```bash
pnpm type-check
```

For a live deployment check after recovery:

1. Verify the cloud endpoint responds:
   - `https://<deployment>.convex.cloud`
2. Verify OpenID configuration responds:
   - `https://<deployment>.convex.site/.well-known/openid-configuration`
3. Verify JWKS responds with a non-empty `n` modulus:
   - `https://<deployment>.convex.site/.well-known/jwks.json`
4. Verify a Convex-backed UI surface renders inside the app without
   `ConvexProvider` runtime errors.

## What Recovery Does Not Replace

- This flow does not replace the InsForge platform as the source of truth for
  the migrated auth and backend slices.
- This flow only restores the remaining legacy Convex-backed feature areas that
  still exist in the current codebase.
