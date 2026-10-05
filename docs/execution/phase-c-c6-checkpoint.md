# Phase C C6 — published schedule context checkpoint

Date: 2026-10-05
Accepted base: `8e7ba3cc88fbc7369ec6a15908c57e8c307f3994`.
Implementation/verification branch: `phase-c/c6-transaction-continuation`.

## Acceptance

**Locally verified for continued Phase C development; not approved for production.**

C6 uses one canonical punch engine, one `schedule-source.server.ts` capture adapter, and one additive draft schema. The earlier overlapping C6 attempt was preserved on `archive/c6-original-attempt-20261005` at `3ee4f0ea88b27a5abd7971f592d92f4d25786124` before switching back to the clean canonical branch. The canonical `phase-c/real-time-clock-live-operations` branch was then fast-forwarded to verified implementation `6a626c7a324cc005f741c9cd8eda9b60e78e965f`. Its complete source tree matched the verified continuation exactly. The 29 C6 SQL cases, complete 1,596-unit suite, TypeScript and lint passed again from the canonical worktree. Local C6 reconciliation is complete; no main/development merge, push, hosted migration or activation occurred.

At actual Clock In, the backend captures a unique containing published assignment when determinable, including the publication revision, published shift/schedule identifiers, published position, configured timezone and exact recorded timestamp. Otherwise it records UNMATCHED or AMBIGUOUS without inventing a shift or rejecting valid work merely because no schedule matches. Released callout assignments are excluded. The latest empty revision cannot resurrect an older assignment.

Matching uses exact start-inclusive/end-exclusive intervals, overnight dates and the configured timezone. Subsecond precision is retained; unresolved daylight-saving boundaries remain explicit ambiguity. There is no nearest-shift/grace window, attendance policy, payroll calculation, paid/unpaid inference, rounding or automatic deduction.

Captured context is immutable across breaks, Clock Out, later publications, position changes and command replays. Existing history and old receipts retain absent context; no backfill occurs. Detailed context stays server-side for the later authorized dashboard/history work. No shared-tablet layout or public success-response metadata expansion was introduced.

## Reliability closure

Publication and Clock In now share the same ordered week-lock namespace: Clock In uses shared locks before employee/device locks; publication takes exclusive locks. The exact source is revalidated after waits. A source change returns a retryable conflict rather than an obsolete match. The original command identity and existing receipt rules remain intact.

The transaction verifies that the exact captured context persisted alongside the punch and ledger. Suppressed or plausibly altered capture rolls back instead of returning false success. Final current-identity checks still run after the business writes. Temporary captured data is transaction-local and explicitly cleared; review probes verified pooled-connection reuse after both COMMIT and ROLLBACK.

During implementation, failing tests identified and closed the mismatched capture/schema integration, missing owning-week discovery for a relevant dated assignment, and a nullable CHECK-expression gap. Original failures remain preserved. The original Phase B product modules, numbered migrations 0001–0010 and C1–C5 draft SQL were not rewritten.

## Verification

| Gate | Final local evidence |
| --- | --- |
| Complete unit suite | 1,596 passed / 149 files |
| Candidate/timezone tests, included in unit suite | 27 passed |
| Clocker PostgreSQL/security/integration suite | 323 passed / 19 files |
| C6-specific SQL, included in Clocker suite | 29 passed; rerun again in final review |
| Foundation PostgreSQL | 269 passed |
| Original B authorization cases on the C6-installed schema | 46 passed; repeated coverage, not new unique tests |
| Generation / shift-change / notification PostgreSQL | 176 / 163 / 77 passed |
| Configuration checks | 14 passed |
| Punch UI / device UI / PIN UI / break UI | 70 / 62 / 46 / 44 passed |
| Punch HTTP, including actual published-context persistence | 23 passed |
| Authenticated application regression | 23 Chromium + 23 WebKit passed |
| Additional final-review transaction probes | 3 passed |
| TypeScript, lint, local production build | PASS |

Browser/HTTP checks total 291. They use real local Next login, cookies, form/API actions and disposable PostgreSQL, with external providers disabled. The final review visually inspected 1024px tablet and 390px phone screenshots and confirmed no source changes to existing UI components or CSS. The full original 480-capture Phase B matrix was not repeated. No physical iPad, screen-reader, customer-scale performance or hosted Neon certification is claimed.

The three supplementary review probes cover successful connection reuse, failure/rollback before the next employee, and PIN expiry during an observed publication-lock wait. They are saved with the review evidence, separate from the 29 committed C6 tests. No new blocker was found in the completed self-review. This is not independent Codex certification.

## Evidence and remaining gates

Implementation/test evidence:
`/Users/josek0514/.codex/visualizations/2026/10/05/nevora-c6-transaction-continuation/`

Fresh final review, source manifests, supplementary probes and original-attempt preservation:
`/Users/josek0514/.codex/visualizations/2026/10/05/nevora-c6-continuation-final-review/`

The source was frozen during final verification. Only the inspected build-generated `next-env.d.ts` and `tsconfig.json` changes were restored to their accepted bytes; post-restore static results are recorded with the review evidence. Disposable test clusters and owned browser servers were stopped.

**FR-AUTH-001 remains OPEN and mandatory before production.** Codex must independently review the final integrated release SHA, including C6 publication-lock ordering, source change/retry behavior, complete rollback, transaction-local context isolation and the actual Neon transport in an approved isolated Preview environment. No hosted database was touched.

Next functional work: C7 live operations dashboards, then C8 employee My Time. Phase C and the final release remain in progress.
