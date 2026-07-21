# Test Report - 2026-07-18

## Scope

Validation of the refreshed coverage and release automation workflow, current delivery-tracker consistency, and the latest MCP-complete execution baseline.

## Results

1. Type-check
   - Status: Pass
   - Benchmark: real 2.41s

2. Unit and integration suite
   - Status: Pass
   - Files: 150
   - Tests: 1040
   - Benchmark: real 11.34s

3. Coverage
   - Status: Pass
   - Files: 150
   - Tests: 1040
   - Benchmark: real 13.17s
   - Statements: 64.19%
   - Branches: 56.52%
   - Functions: 64.53%
   - Lines: 64.85%

4. Browser smoke
   - Status: Pass
   - Passed: 12
   - Skipped: 4
   - Benchmark: real 29.22s

5. Production env audit
   - Status: Pass
   - Environment: production
   - Blocking findings:
     - None

6. Production-style build
   - Status: Pass
   - Benchmark: real 33.41s
   - Note: Validated with linked real InsForge env from .env.local plus compatibility placeholders for Stripe, Convex, Clerk, and API salt values.
