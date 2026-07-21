# Auth/Login Privacy Alignment Report

Date: `2026-07-19`

Scope: `Registration`, `Login`, `Password Recovery`, `Email Verification`, `Remembered Email Disclosure`, `Third-Party Sign-In Disclosure`

Standards baseline:

- `OWASP ASVS 5.0.0`
- `OWASP Top 10`
- `NIST SP 800-63B`
- `W3C WCAG 2.2 AA`
- `WAI-ARIA`
- `RFC 9110`
- `ISO/IEC 27001:2022`
- `ISO/IEC 27701:2019`
- `IEEE 29148:2018`
- `GDPR Articles 5, 12, 13, 25, 32`

## Compliance Audit Checklist

| Disclosure Requirement | Status | Implementation |
| --- | --- | --- |
| Service provider identity present on auth UI | Pass | `components/auth/AuthComplianceNotice.tsx` |
| Privacy rights contact path present on auth UI | Pass | `components/auth/AuthComplianceNotice.tsx` |
| Data collection purpose explained on auth UI | Pass | `components/auth/AuthComplianceNotice.tsx` |
| Optional local storage behavior disclosed | Pass | `components/auth/AuthComplianceNotice.tsx` |
| Third-party sign-in disclosure present | Pass | `components/auth/AuthComplianceNotice.tsx` |
| Legal-policy links present before consent/sign-in | Pass | `components/auth/AuthComplianceNotice.tsx`, `app/auth/register/page.tsx` |
| Registration consent text linked to legal pages | Pass | `app/auth/register/page.tsx` |
| Privacy policy updated to match auth UI text | Pass | `app/(secondary-layout)/privacy/page.jsx` |
| Rights and deletion path documented in policy | Pass | `app/(secondary-layout)/privacy/page.jsx` |

## UI-To-Policy Alignment

| UI Disclosure | Auth Surface | Matching Privacy Policy Clause |
| --- | --- | --- |
| `Service provider: Shothik AI. Contact support@shothik.ai ...` | Login and register notice | `privacy/page.jsx` section `1. Who We Are` and `12. Contact` |
| `We collect only the account data needed ...` | Login and register notice | `privacy/page.jsx` section `2. Information We Collect` |
| `We use this information to authenticate you ... send verification or password-reset messages ... route you to the right workspace ...` | Login and register notice | `privacy/page.jsx` sections `3. Auth and Login Disclosures` and `4. How We Use Data` |
| `Remember email on this device ... stored locally in this browser ...` | Login notice | `privacy/page.jsx` sections `2. Information We Collect`, `3. Auth and Login Disclosures`, and `5. Cookies, Local Storage, and Analytics` |
| `If you choose a third-party sign-in option such as Google ...` | Login and register notice | `privacy/page.jsx` sections `3. Auth and Login Disclosures` and `6. Sharing and Service Providers` |
| `Privacy Policy`, `Terms & Conditions`, and `Data Deletion Policy` links | Login and register notice | `privacy/page.jsx` plus linked legal pages |
| Register consent text acknowledging `Terms & Conditions` and `Privacy Policy` | Register form | `app/auth/register/page.tsx` and `privacy/page.jsx` sections `1`, `10`, and `12` |

## Mandatory Content Review Outcome

- Service provider information is now disclosed directly on the auth UI.
- The disclosure language uses short, plain sentences suitable for first-run account decisions.
- The policy now reflects the actual auth/login data collected by the product instead of legacy, unrelated categories.
- User rights are communicated through both a direct support contact and a deletion-policy path.
- The auth UI no longer relies on implied or hidden privacy notice placement.

## Remaining Follow-Up

- Perform a broader full-site privacy-policy review outside the auth/login scope to confirm non-auth product areas and payment pages remain equally current.
- Add a dedicated accessibility review for screen-reader wording and focus order across all legal-policy pages.
