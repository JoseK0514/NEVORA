# Phase E bounded CI suite execution

Implementation owner: Codex `phase_e_ci_capacity_impl`. Base:
`b3cf9bfbc3671a8882ddc68ba24c8c1b27e13042` on `codex/verify-preview-33`.
This handoff covers Tasks 1 and 2 of the approved Phase E CI capacity plan.
The controller owns independent review, final candidate build/push and both
hosted workflows. No hosted result is claimed for this implementation.

## Changed scope

- `scripts/phase-e-owned.mjs`: an explicit allowlisted browser-suite argument to
  `verifyEvidence`; default browser verification still requires all five suites.
  Existing mirror verification delegates metadata checks to an exported helper,
  then still verifies every actual local mirror byte. SQL behavior is unchanged.
- `scripts/phase-e-browser-evidence.mjs`: strict leaf and aggregate CLI.
  Leaf checks the real mirror, 14 executions, raw browser and owned reports,
  matching source/owners/command checks, resource closure and unchanged source
  before writing a hash-bound leaf receipt. Aggregate independently checks all
  five downloaded artifacts and all 70 unique rows, raw reports, source hashes,
  approved substitution metadata and closure relationships. It reads only
  validated relative paths under the downloaded root; remote absolute paths
  are relationships, never filesystem inputs or PID authority. Traversal,
  symlinks, duplicate layouts/owners and incomplete records fail closed.
- `.github/workflows/ci.yml`: five `phase-e-ui-suite` leaves with `max-parallel: 2`
  and `fail-fast: false`; stable required `phase-e-ui` aggregate uses `always()`.
  `phase-e-evidence` and its six required dependencies remain unchanged.
  Each leaf uploads its own SHA/suite artifact, always, with missing-file errors
  and 14-day retention. The aggregate downloads separate current-run directories
  outside checkout using the pinned official download action. No token,
  repository/run override or permission expansion was added.
- Home's controlled scheduling check remains mandatory in the Home leaf.
  Existing diagnostic JSON, Home receipts and screenshots remain uploaded.
- Tests exercise actual CLI subprocesses and workflow-derived negative fixtures.
  A final bounded-error change prints only `PHASE_E_BROWSER_EVIDENCE_INVALID`
  when malformed evidence is rejected, avoiding arbitrary artifact text in logs.

All original budgets remain: 45 minutes for local all-suite browser execution,
30 minutes for one suite, 8 minutes for SQL, 50 minutes per browser/aggregate job,
15-second browser assertions and 8-second SQL assertions. There are no retries,
ignored failures, reduced matrices or application changes.

The aggregate installs locked application dependencies because existing
source-pinned approved-adapter derivation uses `tsx`. It installs/starts no
browser or database runtime. Home's additional uploaded directory changes
GitHub's least-common-ancestor layout; fixtures exercise both nested Home and
flat non-Home artifact layouts.

## Exact checkpoints and evidence

Evidence root `E`:
`/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/ci-e-suite-capacity`

Implementation commits:

1. `deeab83d`: strict local/downloaded evidence verification.
2. `0fb4b94e811c0d3b094852f613c9bf235aa8fd3a`: workflow split, tested with the real
   Home runtime and strict leaf.
3. `94527cb9468d5f5b8d2242b1440ef082170da307`: bounded failure output plus two
   regression tests; final local gates.

| Scenario / criterion | Invocation | Binary observable | Captured artifact |
|---|---|---|---|
| Complete relocated evidence and fail-closed mutations, Tasks 1/2 | `node node_modules/vitest/vitest.mjs run src/test/phase-e-runner.test.ts src/test/phase-e-browser-evidence.test.ts` | Exit 0; 135 tests pass at `94527cb9`; positive actual aggregate CLI emits exactly 70 unique rows | `E/final-focused.log`, `E/final-gates-verification.json` |
| Workflow preserves complete scheduling and mandatory failure propagation, Task 2 | `npm run test:release-engineering` (equivalent explicit Node invocation recorded in receipt) | Exit 0; 62 checks pass at `94527cb9` | `E/final-release.log`, `E/final-gates-verification.json` |
| Types / full lint | `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/eslint/bin/eslint.js .` | Both exit 0, source unchanged at `94527cb9` | `E/final-types.log`, `E/final-lint.log`, `E/final-gates-verification.json` |
| Default unit suite | `node node_modules/vitest/vitest.mjs run` | Exit 0; 7,455 passed, 801 existing skips; 451 passed files / 27 skipped at `94527cb9` | `E/final-units.log`, `E/final-gates-verification.json` |
| Existing controlled Home check on both engines | `node --import tsx scripts/phase-e-home-held-response.check.mjs` | Exit 0; both engines pass, fresh generation observed, both browsers closed at `0fb4b94e` | `E/real-home-controlled/readiness-report.json`, `readiness-custody.json`, `E/frozen-verification.json` |
| Actual owned Home suite and new local leaf | `node scripts/phase-e-owned.mjs browser --suite home`; `node scripts/phase-e-browser-evidence.mjs leaf --suite home` | Both exit 0; 14/14 cells, zero errors, full source/mirror and ownership verification at `0fb4b94e` | `E/real-home14/browser-report.json`, `owned-browser-report.json`, `suite-verification-report.json`, `E/frozen-verification.json` |
| Owned runtime closure | `node E/run-frozen.mjs` post-run inspection | All 55 recorded PIDs absent; ports 61429 and 61478 refused connections; all recorded resources stopped | `E/real-home-closure.json` |
| Checkpoint relationship and artifact custody | `node E/audit-evidence.mjs` | Exit 0; exact CLI delta is only bounded catch output; positive logic unchanged; indexed artifact digests | `E/source-equivalence.json`, `E/evidence-index.json` |

`E/run-frozen.mjs` records the isolated PostgreSQL and pinned Playwright selections
and safe environment used for the eight source-guarded invocations at
`0fb4b94e`. `E/run-final-gates.mjs 94527cb9468d5f5b8d2242b1440ef082170da307`
records all five final local invocations. Both source manifests are retained.
The real Home run was not repeated solely for the failure-message change;
the controller explicitly accepted the bounded equivalence proof and new local
gates. Hosted all-suite proof is still required on the final candidate.

Negative fixtures independently mutate missing/extra/duplicate suites and cells,
failed/skipped rows, empty checks, SHA/tree/source/mirror hashes, runtime errors,
owners/resources, observation failure, commands, partial command checks, local
mirror proof, missing receipts, unsafe paths and matrix results including
failure/cancelled/skipped/neutral/missing dependencies. Tampered raw receipts are
rehashed in the leaf fixture so rejection exercises independent aggregate
validation. Default all-suite verification rejects a lone Home suite.
Workflow negatives assert the exact rejected controls, including both controls
for a skipped aggregate, rather than accepting an unrelated failing test.

Initial RED and exploratory failures remain in `task-1-red.log`,
`task-1-focused.log`, `task-1-focused-green.log`, `precommit-*.log` and
`artifact-output-red.log`. The initial fixture needed canonical temporary paths;
the owner-directory filter initially included the owned report file; fixture
typing needed `NODE_ENV`; one negative workflow fixture correctly rejected two
controls instead of one. These were corrected and full relevant scenarios rerun.
The untrusted-output regression was RED 2 failures then GREEN 2 passes before the
final full checks. Earlier passing totals of 133/7,453 belong to `0fb4b94e`.

## Positions, limits and next gate

CTO: existing-suite decomposition preserves the architecture and budgets.
CISO: downloaded evidence stays untrusted, failure output is bounded, no
credentials or permissions are broadened. Technical assurance: this addresses
execution capacity, not the unknown historical Communications page-error cause
or runner-speed cause. Governance: release remains **NO-GO**.

The prior e746 push's 70-cell pass and PR's timeout plus four unknown page errors
remain distinct historical outcomes; this work does not reinterpret either as
acceptance. No full local 70-cell rerun or new hosted result is claimed here.
Independent review and fresh push **and** PR runs must each show all five leaves,
the strict 70-cell aggregate and the final required-job rollup passing.

Seven independent exit findings, Schedule performance acceptance, migration
authorization/recovery work, native enlarged-select clipping and physical
device/assistive-technology limits remain open. No independent finding was
closed. No main merge, push, production operation, notification, payroll/legal
wording change or compliance migration 0034 change occurred in this task.
Rollback is a targeted revert of these capacity commits on the owned branch,
preserving other work and mandatory checks; the former serial timeout limitation
would return. Next owner: controller, for scoped review and exact-candidate CI.
