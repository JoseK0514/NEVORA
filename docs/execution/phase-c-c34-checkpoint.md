# NEVORA Phase C — C3/C4 persisted punch checkpoint

Date: 2026-10-05
Branch: phase-c/real-time-clock-live-operations
Starting commit: e00e3aa35b0adab555ec473abe7190f0a1c48d4a
Frozen Phase B ancestor: 20a1026a2fa88c5923b015a3384b980ff7d676cc

## Status

C3/C4 server-side recording, reliability and protected API are implemented and locally verified. Phase C remains IN PROGRESS. This checkpoint is not a live release or a finished tablet action experience.

The API is disabled unless NEVORA_CLOCKER_PUNCH_ENABLED is explicitly true. The checked-in example is false. Only owned local test runtimes enabled it. Existing tablet screens still offer PIN verification only; no live Clock In/Break/Clock Out buttons were added in this checkpoint.

## Implemented

- Real Clock In, Start Break, End Break and Clock Out persistence using PostgreSQL timestamps.
- Clock Out while On Break closes both records at exactly the same timestamp in one transaction.
- Per-employee serialization, original Clock In device preservation and same-location replacement-tablet continuity.
- Expected employee revision plus entry/break IDs and versions; delayed commands cannot change a later shift or break.
- Domain-separated opaque verification context; a new PIN verification or different employee cannot inherit an older command.
- Append-only command receipts keyed by enrolled device and command UUID, with canonical payload digest.
- Identical current-context retries return the original saved receipt; changed payload reuse is rejected.
- Receipt lookup after fresh verification remains same-employee/same-device and never replays a mutation.
- Current device/PIN/employee/eligibility authorization inside the write transaction and again after deeper lock waits.
- Atomic rollback if identity expires while waiting or receipt persistence fails.
- Explicit other-location, invalid-transition, stale-state, clock-regression and inconsistent-data handling; no false Off Clock or silent data repair.
- Strict bounded HTTP envelopes, explicit Origin/custom-header checks and private no-store responses.
- Authority-free public command contracts replace the older unused actor-ID-bearing interface.

## Verification actually run

| Check | Result |
| --- | --- |
| Full unit regression after final review | 140 files / 1,450 tests passed |
| Combined C1+C2+C3/C4 Clocker integration/security/crypto | 9 files / 184 tests passed |
| C3/C4-focused schema/service/HTTP integration subset | 3 files / 65 tests passed (included in 184) |
| Existing foundation PostgreSQL regression | 2 files / 75 tests passed |
| Real Next HTTP with Chromium and WebKit, plus default-disabled runtime | 21 checks / 0 errors |
| Existing C1 device-setup browser regression | 62 checks / 0 errors |
| Existing C2 PIN browser regression | 46 checks / 0 errors |
| TypeScript | PASS |
| ESLint | PASS |
| Local production build, without DATABASE_URL/PIN key and with punches disabled | PASS |

The foundation suite retains its unchanged 0001–0010 fixture chain. The dedicated punch tests apply all three Phase C drafts, including legacy time-record preservation. No claim is made that all older PostgreSQL suites have been rerun against the combined C3/C4 schema.

Current C1/C2 browser regressions retain their seven management widths, tablet portrait/landscape and small-screen coverage. The new punch checks exercise actual HTTP operations with real browser cookies after real Owner setup and PIN verification; they do not certify visible punch buttons that have not yet been implemented.

## Guardrail and RED/GREEN evidence

- The history-preserving schema test failed before the additive draft existed, then passed.
- All 39 initial service tests failed against the unimplemented scaffold, then passed against the persisted service.
- All 21 initial input-contract tests failed against the validation scaffold, then passed; two additional exact-boundary probes passed unchanged during review, bringing command unit coverage to 23.
- HTTP boundary tests failed against the route-handler scaffold, then passed.
- The real Next test returned 404 before the punch route existed, then passed through Chromium and WebKit.
- A historical break extending beyond its closed parent incorrectly allowed healthy Off Clock. A failing regression reproduced it; the snapshot now rejects parent-range violations without altering history.
- Real PostgreSQL lock barriers verify session expiry rollback, post-wait wall-clock timestamps and independent-employee progress.
- Lost database and lost HTTP commit responses are deliberately injected; original receipt lookup and retries produce no duplicate time entry.
- A fixture array type-inference error was corrected; final TypeScript verification passed.

Full local logs: .superpowers/sdd/2026-10-05-nevora-phase-c-live-operations/c34-*.log
Browser/HTTP evidence:
- /Users/josek0514/.codex/visualizations/2026/10/05/nevora-c34-http-green
- /Users/josek0514/.codex/visualizations/2026/10/05/nevora-c34-c1-regression
- /Users/josek0514/.codex/visualizations/2026/10/05/nevora-c34-c2-regression

459 source/test/config files were hashed before full verification and remained unchanged during that run. Review subsequently added two parser tests only; the full unit suite, TypeScript and lint were rerun. No production implementation changed after the successful database/browser/build snapshot.

## Release boundaries and remaining work

No numbered historical migration, production DB transport, package dependency, existing UI component, main/development branch or frozen Phase B source was changed. No push, merge, paid infrastructure, real notification, hosted database update or deployment was performed.

Draft schema is db/phase-c/clocker-punches.sql, after the C1 and C2 drafts. Final numbering, hosted Phase C database isolation and reconciliation with accepted Phase B hardening remain pending.

C5 break-type configuration and policy snapshots, C6 schedule context, C7 manager live operations, C8 employee My Time, C9 connected tablet action/recovery UI and C10 final phase-wide certification remain. No paid/unpaid, overtime, attendance or automatic-deduction policy was invented.

Review was an author self-review; independent Codex Phase C review remains required. Owned loopback PostgreSQL and scratch Next tests do not establish hosted Neon, real customer data, physical iPad/Safari, accessibility assistive-technology or production certification.

## Recommendation

GO for continued isolated Phase C implementation.
NO-GO for live/customer timekeeping or production release.
