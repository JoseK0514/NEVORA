# Mobile baseline CI checkpoint

Date: 2026-10-18, America/Puerto_Rico.

## Approved scope and change

Jose approved branch-specific CI and the remaining baseline checks. The implementation adds the exact `codex/nevora-mobile-launch` branch to the existing workflow push filter. Existing shared-branch filters, mandatory jobs, aggregate failure handling, workflow permissions and `vercel.json` deployment hold are preserved.

Implementation commit: `31d6c770473369a9a8eae8c99a3f75436aa6a93e`, based on starting checkpoint `8fef0ddf93dbe791da2018d1bd69a805e7c482bf`. This document is a documentation-only successor, committed before the first CI push so the full run can identify one clean candidate. No application or migration source changed in this continuation.

## Verification before CI

| Check | Observed result |
|---|---|
| New mobile-trigger contract test before the workflow fix | Failed on the missing push branch; other three existing contract checks passed |
| `npm run test:release-engineering` after the fix | 52 passed, 0 failed |
| `npm run test:payroll:owned` at `31d6c770` | 36 passed, 0 failed; fresh owned loopback PostgreSQL 17.10 cluster stopped cleanly |
| `git diff --check` | Passed |
| Separate code review of `8fef0ddf..31d6c770` | CLEAR / APPROVE for triggering this CI checkpoint; no blockers; reviewer independently reran all 52 release-engineering checks |

The payroll runner used fictional data and no inherited application/test database connection. Test delivery adapters are fake; no customer payroll or real provider delivery was used. Local logs are in `.superpowers/sdd/2026-10-18-nevora-ios-android-launch/`: `mobile-ci-red.log`, `mobile-ci-green.log`, and `payroll-baseline.log`. The local code-review artifact is `.omo/evidence/nevora-mobile-ci-review.md`.

## Exact-candidate remote checks

At this document's commit, remote CI is **pending execution**, not passed. Its authoritative results belong to the GitHub run's exact `headSha`; query that immutable identity rather than inferring success from this document or an older branch result.

The existing workflow runs all of these jobs on the mobile push:

1. `validate`: full default unit suite, notification/foundation/release-engineering checks, typecheck, lint, source-bound build and both dependency audits.
2. `clocker-postgres`: mirror custody checks and persisted Clocker tests.
3. `release-postgres`: foundation, final authorization, generation, exchanges and notification PostgreSQL suites.
4. `phase-d-attendance-ui`: attendance, full Phase D browser/UX coverage, audit remediation, corrections and Clocker lifecycle/recovery browser checks.
5. `phase-e-postgres`: owned runtime startup plus all Phase E SQL suites and source/evidence verification.
6. `phase-e-ui`: both browser engines, required widths and all Phase E feature suites, followed by source/evidence verification.
7. `phase-e-evidence`: aggregate that rejects failed, cancelled, skipped, neutral or missing mandatory jobs.

The remote workflow selects its own fresh PostgreSQL 16 clusters and pinned Chromium/WebKit runtime. It receives no production database or provider credentials from this change. Local payroll evidence and remote CI remain separate records.

To retrieve the current branch candidate and its actual run:

```sh
git rev-parse HEAD
gh run list --repo JoseK0514/NEVORA --branch codex/nevora-mobile-launch --workflow ci.yml --limit 10 --json databaseId,headSha,status,conclusion,url
gh run view RUN_ID --repo JoseK0514/NEVORA --json headSha,status,conclusion,jobs,url
```

Match `headSha` to the intended candidate, require all seven job conclusions, and retain failure logs/artifacts when anything fails. A newer documentation or code commit creates a new candidate; older CI must retain its original identity. Execution receipts and the final run URL are recorded in the plan ledger and external task evidence after the run finishes.

## Remaining boundaries

- G0 is still open at authoring time. Remote success, any failures/remediation and the remaining release-source reconciliation must be recorded before changing that status.
- The upcoming web release's frozen branch/tag/SHA has not been identified. The observed remote heads remain development `b58496b8`, main `7ffd013e` and full-app source `33b6dfa0`; their existence does not establish a final web release candidate.
- Hosted schema identity, migration/backup/rollback evidence, hosted functional testing and final independent release acceptance remain separate gates. No hosted database is selected or migrated here.
- Existing lint warning in `employee-weekly-confirmation.tsx:18:25` remains disclosed. Gated tests skipped by the default suite must be assessed through their separate jobs.
- Native implementation and store/signing work are not started by this checkpoint. The next feature stage remains production native contracts/authentication after the required baseline gate.
- Implementation owner: current execution agent. Governance recommendation: CI execution is authorized; release acceptance remains conditional on its exact evidence and the open gates. No production exception or deployment authorization is requested or inferred.

## Rollback

If this branch trigger must be removed, revert the bounded workflow/contract change through a normal commit on the mobile branch. No database, application behavior, shared branch or deployed state requires rollback from this change. Do not disable the existing mandatory jobs or their aggregate to obtain a green run.
