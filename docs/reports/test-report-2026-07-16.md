# Test Report - 2026-07-16

## Scope

Validation of the current rollout-readiness tooling, delivery-tracker consistency updates, and auth/chat release baseline.

## Results

1. Type-check
   - Status: Pass
   - Benchmark: real 3.21s

2. Unit and integration suite
   - Status: Pass
   - Files: 108
   - Tests: 893
   - Benchmark: real 9.90s

3. Coverage
   - Status: Pass
   - Files: 108
   - Tests: 893
   - Benchmark: real 9.98s
   - Statements: 62.59%
   - Branches: 56.03%
   - Functions: 60.45%
   - Lines: 63.27%

4. Browser smoke
   - Status: Pass
   - Passed: 3
   - Skipped: 1
   - Benchmark: real 2.48s

5. Production env audit
   - Status: Fail
   - Environment: production
   - Blocking findings:
     - DATABASE_URL missing
     - NEXT_PUBLIC_INSFORGE_URL missing
     - NEXT_PUBLIC_INSFORGE_ANON_KEY missing
     - No production AI provider key configured

6. Production-style build
   - Status: Pass
   - Benchmark: real 26.52s
   - Note: Validated with placeholder production-like env values.
