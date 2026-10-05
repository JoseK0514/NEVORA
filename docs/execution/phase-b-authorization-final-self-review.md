# Phase B — final self-review of authorization correction

Date: 2026-10-05
Reviewed correction: `2e94143d6fef97bbb43b8cde45d893cf441dc45f`
Exact parent: `55c0c9bee2e81bfb07c9a241c81fb747c38ce309`
Branch: `fix/phase-b-final-authorization`
Reviewer: ChatGPT, also the correction's implementation owner. This is an author self-review with fresh testing, not an independent Codex review.

## Decision and scope

**GO for controlled development integration of this correction. NO-GO for production activation.**

Jose explicitly approved final review/testing by ChatGPT now and deferred Codex's independent verification of this fix to the final release before production. That mandatory future check is recorded as **FR-AUTH-001, OPEN**, in [the final-release checklist](final-release-checklist.md). No immediate Codex handoff is required for this correction. Independent final-release evidence is not waived or marked complete.

Reviewed the complete 16-file corrective diff, the affected transaction paths, shared authorization guard, result-return contracts, three new regression files and two adjusted test helpers. The review found no new blocking defect in this corrective scope. No product implementation or tests were changed in this review; only the review/checklist documentation is updated.

The local correction is acceptable as an integration input. This is not a claim that Phase C is integrated or complete. Reconciliation of the Phase B and Phase C lines and fresh combined regression remain the next engineering gate; C6 remains paused until that passes.

## Review conclusions

1. Ordinary management writes retain their original authorization and lock protocol, and add the same current-session check after potentially blocking business, history and notification statements, within the same transaction. A failing final statement rolls back the batch; there is no post-COMMIT check or compensating delete.
2. Business RETURNING values are taken from the relevant write statement, rather than accidentally treating a trailing guard result as the saved record or revision.
3. Core profile changes use the already-locked server-derived authority and transaction-local captured database expiry so an intentional self-demotion/deactivation can finish legitimately. Its final assertion validates actor, session identity and expiry. Role/session locks protect against competing changes; a new transaction must authorize again.
4. Generation/provenance assertions remain present; retry and no-op behavior retain their original constraints. The adjusted fault injector now targets the named after-state proof rather than a positional last-statement assumption. Its corruption, retry-count and complete-rollback assertions remain.
5. The operational-profile mock now models a result array per statement and asserts the exact returned written revision. Its original batch assertions remain. No tests were removed or bypassed.
6. UI components, CSS, public assets, historical migrations and package dependencies remain identical to the reviewed parent for this correction. The approved layouts were not redesigned. Browser rejection retains the draft and uses the existing safe error presentation.

Authorization is evaluated using database wall time at the final in-transaction decision point, after the write waits. This does not claim atomic comparison to the exact later physical WAL/COMMIT instant; production transport, statement ordering and deferred work require final-release verification.

## Fresh verification in this review

| Gate | Result |
| --- | --- |
| Bare `npm test` | 1,441 passed / 140 files |
| Foundation PostgreSQL | 269 passed / 8 files |
| New expiry/control cases included in foundation | 46 passed: 23 expired-session and 23 valid controls |
| Generation PostgreSQL | 176 passed / 4 files |
| Shift-change PostgreSQL | 163 passed / 14 files |
| Notification PostgreSQL, no-network sender | 77 passed / 1 file |
| Foundation and notification configuration checks | 8 + 6 passed |
| Existing authenticated browser regression | 23 Chromium + 23 WebKit passed |
| Actual Position/Location expiry/control browser checks | 8 passed; no uncaught application errors |
| Additional captured-authority review probes | 7 passed |
| TypeScript, lint, local production build | PASS |

All gates above were run afresh on the correction's code during this review; counts are suite/check counts, not distinct product-defect counts. The original RED evidence remains in the prior remediation record and was not relabeled as a new RED run here.

Additional review probes used the actual profile writer and SQL on one reused connection: valid self-demotion returns the actual written revision; captured authority clears after COMMIT; an old Owner proof cannot authorize after demotion; missing, wrong-actor, wrong-session and expired captured authority reject and roll back without connection-state leakage. Faults were inserted only by the external test adapter. These seven probes are separate from the 46 permanent regression cases.

Native browser flow: actual login and HttpOnly cookie -> Add Position/Add Location -> observed unique-key INSERT wait -> valid save or expired rejection -> persisted SQL verified. Chromium and WebKit exercised 390px Position forms and 1024px Location forms. Fresh expired-position and valid-location screenshots were visually inspected. The original 480-frame matrix was not repeated; unchanged source is not represented as a new physical-device or complete visual certification.

## Evidence and preservation

Evidence root:
`/Users/josek0514/.codex/visualizations/2026/10/05/nevora-phase-b-final-self-review-2e94143/`

Fresh command/result files: `static-results.json`, `pg-results.json`, `browser-results.json`; each owned database run also has its own `command.json` and `output.log`. The root holds the source-before manifest, copied runners, browser screenshots, seven-probe script/results, final verification metadata and review progress.

528 tracked files were hashed before testing. The only changes observed during the test runs were the two known Next-generated configuration files, `next-env.d.ts` and `tsconfig.json`; their generated copies were archived. Product source, tests, migrations and UI did not drift. Both generated files were restored to the exact reviewed bytes before this documentation-only closeout; post-restore typecheck, lint and source verification passed.

All test data was fictional and held in newly owned loopback PostgreSQL clusters. Those clusters and scratch browser runtimes closed after each run. Providers stayed disabled. No customer database, hosted Preview/Neon, Phase C worktree or shared branch was changed; no push, merge or deployment occurred.

## Remaining gates and limitations

FR-AUTH-001 stays OPEN until Codex independently reviews and tests the **final integrated release SHA**, including the real Neon HTTP transport on an approved isolated Preview database. Earlier local or branch-specific success is not final-release acceptance. Physical devices, screen readers, customer-scale contention, live delivery and production were not certified. The prior 25 unexplained Clocker paint differences remain a separate disclosed observation and were not newly investigated here.

Next: controlled reconciliation with Phase C, preserving both existing development lines and one authoritative punch implementation, followed by combined regression. Final production approval remains Jose's decision after the documented release gates close.
