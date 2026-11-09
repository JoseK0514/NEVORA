# Phase B — B-FR-01 final transactional authorization remediation

Date: 2026-10-05
Base: 55c0c9bee2e81bfb07c9a241c81fb747c38ce309
Branch: fix/phase-b-final-authorization
Frozen Phase B ancestor: 20a1026a2fa88c5923b015a3384b980ff7d676cc
Owner: ChatGPT, executing Jose's approved technical remediation. Independent Codex acceptance remains pending.

## Current review timing — Jose decision, 2026-10-05

The original remediation evidence below is retained. Jose subsequently approved ChatGPT final self-review and fresh testing now, with independent Codex verification deferred to the final release before production. The completed local review is recorded in [phase-b-authorization-final-self-review.md](phase-b-authorization-final-self-review.md). **FR-AUTH-001 remains OPEN and mandatory** in [final-release-checklist.md](final-release-checklist.md). This supersedes the original immediate Codex handoff in this record, without waiving final independent verification or production approval.

## Result and release boundary

The reproduced late-write session-expiry defect and the analogous management paths tested here are corrected and locally verified. This is a correction checkpoint for independent review, not production authorization or full Phase C completion.

No push, merge into another branch, hosted migration, production deployment, provider activation, real notification or customer-data change was performed. C6 remains on hold. The other Phase B and Phase C worktrees were not modified by this task.

## Isolation and preservation

The hardening checkout already contained an uncommitted draft correction for positions, locations, workspace and employee writes plus two SQL regression files. A stable, hashed copy was preserved externally. The remediation uses its reviewed correction and tests in a separate worktree, after freshly reproducing the failures against the unmodified base. It neither overwrites that checkout nor duplicates its changes in a competing edit to the same files.

The exact reviewed base commit is retained as the parent of this additional correction. The current task extended the same verified failure class to schedule/publication, Time Off, deadline and generation boundaries. No authentication redesign, new customer policy or schema change was needed.

## Corrective behavior

- Position and location create/update transactions retain their existing entry guards and add a final current-session assertion after potentially blocking writes.
- Employee creation, scheduling-profile saves and workspace changes receive the equivalent final in-transaction protection.
- Business RETURNING rows are read from their actual statement index, not the trailing guard result.
- Core profile changes preserve legitimate self-demotion/self-deactivation. Existing lifecycle and session locks pin the original authorization; a transaction-local, actor/session-bound database expiry is captured before the intentional self-change and tested at the end. Missing or expired captured authority rejects. It is not client supplied and does not escape the transaction.
- Management schedule creation, shift changes, publication/history and notification intents receive a final assertion after the complete shared write batch.
- Management Time Off decisions and their notification work receive the same end-of-batch assertion. Employee submission semantics are unchanged.
- Availability deadline and seeding/cancellation writes validate the session at the end of their existing atomic batch.
- Build Week, Fill Gaps, generated-shift removal and exclusion clearing validate at the end of the guarded batch, after source/provenance checks. Existing no-op guards, retry policy, lock order and Draft-only behavior are retained.
- The shared management proof validator and lock/role rules are unchanged. Existing Scheduling Rules writers already had final guards; their existing tests were rerun.

The final authorization decision uses database wall time inside the same transaction, after business writes and before COMMIT. A failed assertion causes the existing transaction executor to roll back the entire batch. This is not an after-COMMIT check or compensating delete.

## Reproduction and regression evidence

Three new permanent SQL files are part of the normal foundation integration configuration:

1. phase-b-late-write-session.integration.ts — eight checks: create position/location, explicit table waits and natural competing unique-key waits, each with expired and valid controls.
2. phase-b-analogous-expiry.integration.ts — sixteen checks: catalog updates, workspace, employee creation/profile/scheduling and intentional self-demotion/deactivation, each with expired and valid controls.
3. phase-b-final-boundaries.integration.ts — twenty-two checks: schedule creation, shift create/update/delete, publication, Time Off, deadline, generation/fill, generated deletion and exclusion clearing. A test-only advisory-lock trigger forces actual late DML waits without changing product policy or adding product hooks. Complete source and notification/delivery records are compared after rollback.

Fresh RED: 12 expiry failures / 12 valid controls on the exact base for the first group. Fresh additional RED: 11 expiry failures / 11 valid controls before the five additional shared modules were corrected. GREEN: all 46 checks pass. These are test cases, not 46 distinct defects.

An external native browser verifier also uses real login, HttpOnly cookies, existing Next Server Actions and actual PostgreSQL unique-key waits. Both Chromium and WebKit reject expired position/location saves without a framework error or persisted record, preserve form drafts and permit valid saves: eight checks, zero uncaught application errors. Existing safe form-error wording and UI geometry are unchanged.

## Final verification actually run

| Gate | Result |
| --- | --- |
| Bare npm test | 1,441 tests / 140 files passed |
| Foundation PostgreSQL, including 46 new checks | 269 tests / 8 files passed |
| Generation PostgreSQL | 176 tests / 4 files passed |
| Shift-change PostgreSQL | 163 tests / 14 files passed |
| Notification PostgreSQL, no-network provider | 77 tests / 1 file passed |
| Foundation / notification configuration checks | 8 + 6 passed |
| Existing authenticated Phase A browser regression | 23 Chromium + 23 WebKit passed |
| New native expiry/control browser checks | 8 passed; no uncaught application errors |
| TypeScript, lint, local production build, diff whitespace check | Passed |

Initial non-final verification failures are retained, not hidden:
- One operational-profile unit mock returned only one result array for an entire SQL batch. It now returns one array per statement and places the revision at the real UPDATE RETURNING slot. All existing assertions remain, with an added exact returned-revision assertion.
- One generation fault injector assumed the after-state proof was always the final statement. Final session checks moved that position. Injection now targets the named after-state proof, keeping its original corruption, three-attempt and complete-rollback assertions. The full 176-case generation gate passed afterward.

These test-only adjustments do not weaken guards or bypass product authentication. Full failed and passing logs remain preserved.

## Evidence and review

External evidence root:
/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-final-authorization

It contains incoming draft hashes, before/final source hashes, baseline-red and cross-path-red logs, first-green and cross-path-green logs, full-foundation, final-generation, full-exchanges, full-notifications, final static/configuration logs, native-expiry browser evidence and phase-a-chromium/phase-a-webkit evidence. All database runs create new owned loopback clusters and record their shutdown. Browser runtimes and disposable databases are closed after each run.

Final review: author self-review of the complete corrective diff and verification evidence; no fresh reviewer subagent was used. Independent Codex review of this exact correction is still required. The original 55c0c9b review does not substitute for review of these additional changes.

Migrations 0001–0010, components, CSS, public assets, dependencies and the production DB transport are unchanged from 55c0c9b. The 480-capture historical UI matrix was not repeated because this correction does not change those UI inputs; native forms and the existing authenticated regression were freshly exercised. The prior 25 unexplained Clocker edge-paint pixels remain a disclosed prior observation, not newly investigated here.

## Next gate

Following Jose’s updated decision and the completed ChatGPT self-review, the next engineering gate is controlled reconciliation into Phase C with combined regression. Independent Codex verification of the final integrated release is mandatory before production under FR-AUTH-001. Do not continue from a stale partial correction or blindly merge unresolved Phase C work.

Hosted Neon HTTP-transport verification, hosted Preview, physical devices, screen readers, production capacity and live-provider delivery are not certified by these local results. Production sign-off remains withheld until the remaining release gates are satisfied.
