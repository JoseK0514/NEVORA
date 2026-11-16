# November 16 readiness backend delivery — SCRUM-204–207

Backend implementation: `c9de85ecef4f8eb2fb9f109e494bfde892022f65`.
Base: freshly fetched `origin/development` at
`22a9d598eb470cd380ee739d7396f06ecf335ed5`.

## Implemented changes

| Finding | Change and principal source |
|---|---|
| SCRUM-204 | `src/lib/data/notification-transactions.ts` selects newly published commitments against the latest immutable capture, including unchanged Draft rows and materially changed held assignments. It applies canonical current capability checks and existing approved-restriction rules; employee/location/position/membership/restriction facts are fenced through the transaction. `publication-restrictions.ts` retains historical captures and employee preference semantics. Publication actions map expected eligibility refusals to the existing feedback route. |
| SCRUM-205 | `src/lib/data/shift-review.ts` computes one opaque SQL material-review token, locks the shift row, then compares with a fresh statement. `schedules.ts` and `generation-exclusions.ts` carry the submitted expectation unchanged across retries and into the generated exclusion transaction. Management/scoped reads expose the token; actions return inline `SHIFT_REVIEW_CONFLICT` without replacing the user's draft or returning another person's data. |
| SCRUM-206 | `src/lib/period-close/service.ts` separates latest-per-kind summaries/counts from a bounded `HISTORY` operation. `history.ts` validates workspace/period-bound opaque cursors with a fixed upper watermark and exact timestamp/UUID order. `/api/period-close` exposes that read through its existing protected contract. Events and artifacts are never deleted or rewritten. |
| SCRUM-207 | `src/lib/server-error.ts` adds request-local correlation through the existing sanitized logger. `payroll/http.ts`, the cited timecard/action-center services and their request handlers distinguish expected refusals from handled unexpected errors and add a matching `X-Nevora-Request-Id` without changing existing JSON receipt bodies. No logging vendor or dependency was added. |

No schema/migration, production configuration, Rondo implementation or business
policy changed. Financial source bounds unrelated to event history remain in force.

Local detached worktree:
`/Users/josek0514/.codex/worktrees/nevora-readiness-backend-20261116`.
The integration owner can cherry-pick the implementation commit from the shared
repository. No branch was pushed, assembled or deployed. The remote heads were
rechecked unchanged: collaboration `40ccc4e4e5b74b48c8fd86ef50c4ec6efe9b4dd1`,
main `46d6dc76922bb273379baccd329e0af636d1dcb6`.
No other chat was contacted, interrupted or edited. SCRUM-199, Rondo, billing,
provider activation and unrelated recommendations were excluded.

## Changes

| Finding | Backend fix and source |
|---|---|
| SCRUM-204 | `src/lib/data/notification-transactions.ts` selects current eligibility checks for newly published commitments against the last immutable publication, including unchanged Draft rows and material held edits. The shared capability validator checks employee, workspace/location, position, memberships and Lead capability. `publication-restrictions.ts` checks effective agreed restrictions for new commitments. Existing snapshot fences and employee/catalog/membership locks remain; scheduling-settings locks pin restrictions across the final fence. Captured history, preference semantics, coverage warnings and atomic revision/outbox behavior remain intact. Publication actions use the existing rule-feedback route for expected refusals. |
| SCRUM-205 | `shift-review.ts`, `schedules.ts`, `generation-exclusions.ts`, scoped editor projections and schedule actions carry an opaque original review token. SQL binds the exact shift, timestamp, assignment episode, provenance/claims and schedule status. A shift row lock followed by a fresh review assertion precedes the business write. Retries keep the original token. Missing/stale reviews fail closed; generated deletion uses the same token before writing its exclusion. Actions return the stable inline conflict without clearing submitted values. |
| SCRUM-206 | `period-close/service.ts`, `period-close/history.ts` and `/api/period-close` separate latest-per-kind summaries/counts from explicit immutable history pages. Pages use exact timestamp/UUID ordering, a period/workspace-bound cursor, an upper watermark, explicit coverage and current Company authorization before disclosure. A first-page table lock drains prior inserts before selecting the watermark. No history/artifact/hash is changed. |
| SCRUM-207 | `server-error.ts`, `payroll/http.ts`, timecard/action-center services and their cited routes reuse the sanitized logger. Request-local correlation uses a server UUID exposed in `X-Nevora-Request-Id`, preserving JSON/receipt bodies. Logs contain static route, reference, error class and bounded SQLSTATE/digest only. Expected validation, authorization and conflict refusals stay separate; uncertain timecard commands retain their operation ID/recovery semantics. No vendor/dependency was added. |

Full field/response contract and remaining Claude files:
[Claude UI contract](2026-11-16-readiness-backend-ui-contract.md).
Do not integrate the backend without the corresponding original-token fields:
legacy edit/delete submissions intentionally refuse the write.

## Executed evidence

All SQL tests used the existing `scripts/payroll-postgres.mjs` runner with the
local PostgreSQL 16.15 runtime, a newly initialized loopback cluster per run,
owned disposable databases, fictional people and no application `DATABASE_URL`.
Every runner reported cluster shutdown. No live message/order/customer-data test.

| Check | Observed result |
|---|---|
| Notifications/publication/original-review SQL | 100 passed, including two actual PostgreSQL sessions, current eligibility changes, lock waits, final row-lock barriers, stale edit/reassignment/delete, retries and lost-response replay. |
| Foundation SQL | 286 passed, including final session/authorization boundaries, held changes and atomicity. |
| Generation SQL | 201 passed, including original-review exclusion behavior, provenance, claims, concurrent deletion and session/revocation boundaries. |
| Company schedule and period/export SQL | 52 passed, including Company/location-scoped Managers, generated/manual transitions, 1,000/1,001/4,000 events, timestamp ties, gap/duplicate-free traversal, a new download outside the existing cursor, cursor validation, scope loss before disclosure and original artifact bytes/hashes. |
| TypeScript | `npm run typecheck`: passed. |
| ESLint | `npm run lint`: zero errors; one existing `import/no-anonymous-default-export` warning in untouched `services/hosted/neon/workforcemonitor.entry.ts`. |
| Production build | `scripts/release-build.mjs`: passed on clean implementation SHA/tree `6815d3a36b2865c4cee006abd32d8eed31c5a7c5`; receipt confirms source unchanged. This was a local optimized build, not a deployment. |
| Complete unit suite | 13,203 passed; 944 skipped; one mandatory failure: `src/test/manual-publication.test.ts` reports `Stale or foreign application content hash`. Source qualification must be regenerated/reviewed on the final combined source; this gate was not suppressed or waived. |

Regressions were observed failing before their fixes: publication unit/SQL checks,
stale-write SQL on the original base, the 1,001/4,000-event summary reads and the
payroll correlation check. These are execution receipts from this work, separate
from the auditor's reported synthetic diagnostics.

Logs and build receipt summary:
[verification evidence](2026-11-16-readiness-backend-evidence/).
The full build hash receipt is retained at the external path recorded in that
summary; generated `.next` bytes/dependencies and credentials are not committed.

The mandatory `src/test/manual-publication.test.ts` guard passes on the untouched
base and fails on the backend candidate with `Stale or foreign application content
hash`. The changed application source requires proper manual source qualification.
The assertion was preserved. No manual/PDF hashes were fabricated or refreshed,
and Rondo's separately owned outputs were not regenerated. The integration owner
must qualify the manuals once the final combined source is fixed.

## Controls, ownership and next gate

- Engineering: bounded fixes use the existing writer, validators, session fences,
  receipts and logging transport; no schema migration or runtime dependency.
- Security: current authorization and scoped privacy remain mandatory. A review
  token is concurrency evidence, never authority. Diagnostic references contain
  no employee identity, request body, SQL, credentials or provider material.
- Assurance: local SQL/action evidence does not certify an actual browser,
  hosted deployment, physical device or independent audit disposition.
- Governance/delivery: **GO WITH CONDITIONS for backend handoff; development
  acceptance remains blocked by the pending combined-candidate gates.** No policy
  exception or Jose decision is needed for this local handoff. No production
  authorization was requested or inferred.

Remaining owners:
1. Claude: original-token hidden fields in both edit/delete flows, readable
   conflict/draft recovery and explicitly paginated history controls/labels.
2. Integration owner: preserve development protections and collaboration's reviewed
   parser/UI fixes; qualify one combined development SHA, refresh manual source
   qualification, and run its required CI/hosted checks.
3. Combined UI/QA owners: two actual browser sessions covering edit/edit,
   reassignment/edit and edit/delete in both orders, Company/location scopes,
   generated/manual transitions, recovery, mobile and keyboard behavior.
4. Independent reviewers: dispose the four audit findings against that candidate.
   These local implementation results do not mark pending UI, integration or
   independent acceptance complete; Jira findings remain open.
