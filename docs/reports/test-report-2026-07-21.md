# Test Report - 2026-07-21

## Scope

Validation of the current Batch 6 release-readiness control state, including the latest focused certification suites, the published repo coverage baseline, and the remaining environment blockers for live provider execution.

## Results

1. Type-check
   - Status: Pass
   - Benchmark: latest local pass

2. Unit and integration suite
   - Status: Pass
   - Files: 8
   - Tests: 20
   - Benchmark: focused publish/moderation/payout certification pass from Batch 5 closeout

3. Coverage
   - Status: Published
   - Files: 150
   - Tests: 1040
   - Benchmark: last published repo-wide baseline from 2026-07-18
   - Statements: 64.19%
   - Branches: 56.52%
   - Functions: 64.53%
   - Lines: 64.85%

4. Browser smoke
   - Status: Partial
   - Passed: 4
   - Skipped: 2
   - Benchmark: latest local auth/browser certification pass with credential-gated skips

5. Production env audit
   - Status: Blocked
   - Environment: local Batch 6 precheck
   - Blocking findings:
     - Populate PLAYWRIGHT_SMOKE_EMAIL and PLAYWRIGHT_SMOKE_PASSWORD for authenticated browser certification.
     - Provision PublishDrive environment secrets in the target certification environment.
     - Provision STRIPE_SECRET_KEY in the target certification environment.

6. Production-style build
   - Status: Pending
   - Benchmark: not rerun for Batch 6 yet
   - Note: Production-style build must be rerun in the target certification environment after provider secrets and smoke credentials are provisioned.
