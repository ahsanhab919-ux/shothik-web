# Vercel Parity Audit - production

- Generated at: 2026-07-21T07:25:00.782Z
- Vercel audit pass: yes

## Local Credential Summary
- Core platform: ready (configured=3, placeholder=0, missing=0)
- AI providers: partial (configured=1, placeholder=0, missing=4)
- Payments - Stripe: partial (configured=0, placeholder=0, missing=6)
- Payments - Razorpay / bKash: partial (configured=0, placeholder=0, missing=8)
- Publishing and content distribution: partial (configured=0, placeholder=0, missing=9)
- Caching and rate limiting: partial (configured=0, placeholder=0, missing=4)
- Security and operations: partial (configured=0, placeholder=0, missing=6)
- Preview access controls: partial (configured=0, placeholder=0, missing=2)
- Legacy Convex compatibility: partial (configured=3, placeholder=0, missing=1)

## Parity Findings
- Core platform:
  missing on local -> none
  missing on vercel -> none
  mismatched values -> none
- AI providers:
  missing on local -> OPENROUTER_API_KEY
  missing on vercel -> none
  mismatched values -> none
- Compatibility and payments:
  missing on local -> API_KEY_SALT, STRIPE_SECRET_KEY
  missing on vercel -> none
  mismatched values -> none

## Blockers
- Local parity gap: OPENROUTER_API_KEY is configured on Vercel but missing locally.
- Local parity gap: API_KEY_SALT is configured on Vercel but missing locally.
- Local parity gap: STRIPE_SECRET_KEY is configured on Vercel but missing locally.

## Warnings
- none

## Remediation
- Mirror OPENROUTER_API_KEY into local secure env files or document why local parity is intentionally not required.
- Mirror API_KEY_SALT into local secure env files or document why local parity is intentionally not required.
- Mirror STRIPE_SECRET_KEY into local secure env files or document why local parity is intentionally not required.
