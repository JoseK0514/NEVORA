# Full code inspection: eleven-area audit, recommendations only

Date: 2026-10-21. Requested by Jose: inspect everything, change nothing. Eleven read-only inspectors each audited one area of `origin/development` (`d4b01453`, viewed from `claude/preview-full-chain`). **No code was changed.** Every claim is from reading code and migrations; performance statements are inferred from query and loop shapes (plus the existing LOAD-2026-10-19 note), not measured, unless marked otherwise. Findings already fixed on the pushed branches (D1–D4) were excluded.

Totals: 1 critical-labeled, ~14 high, ~40 medium, ~50 low findings after de-duplication. Independent inspectors converged on the same few root causes, which raises confidence in them.

## The five problems that matter most

**P1. The sign-in and recovery edge is open to abuse (confirmed independently by two inspectors).**
- Login has no throttle, lockout or backoff anywhere in the repo, and unknown/inactive IDs skip the ~50ms password hash, so response timing reveals which employee IDs exist ([actions.ts:22](../../src/app/login/actions.ts)). Employee IDs are short; the policy is an 8-character minimum; every guess also burns a scrypt slot on the 4-thread pool.
- **Assisted recovery lets any company-scope Manager take over any non-Owner account, including Managers who hold payroll APPROVE grants** ([recovery.server.ts:49](../../src/lib/auth/recovery.server.ts) only protects Owner targets; the raw reset code is handed back to the issuing Manager; no notice is ever sent to the victim). This is privilege escalation with a thin free-text attestation as the only control.
- Anonymous requests can exhaust the recovery/reset budgets (counted before validation, no per-IP dimension): ~4 requests lock one named employee out of self-recovery; ~300 stop recovery company-wide.
- Recommended: per-ID + per-IP attempt buckets and a dummy-hash on unknown IDs; Manager targets require an Owner actor (or subset-of-grants rule), out-of-band code delivery and a "your password was reset" notice; count recovery budgets on successful issuance only. Owner: Codex (auth).

**P2. The "whole-database snapshot + table locks" data-access pattern is the root cause of the known latency and will become write failures (three inspectors converged).**
- Every guarded schedule write serializes ALL rows of 25 tables to JSON 2–4 times and takes `SHARE ROW EXCLUSIVE` on all of them ([generation-guards.ts:7-70](../../src/lib/data/generation-guards.ts)); the Manager Schedule page runs that read per render (the 10.6s p95 floor — measured on ONE seeded week, no history); with 5s statement timeouts, growth turns edits into 57014/55P03 failures that the shift actions don't map.
- Authority reads take write-class locks (`FOR NO KEY UPDATE` on the singleton workspace + `FOR UPDATE` on the actor) on every `/app` render and 30s/60s polls, callable by any role with no throttle — a company-wide serialization point and a trivial internal DoS.
- Payroll/timecard/employee-Home reads take `LOCK TABLE employees SHARE ROW EXCLUSIVE` / all-row `FOR SHARE` — manager timecard reads can stall every kiosk punch; employee "My pay" views serialize against punches on payday.
- Missing indexes under the hottest correlated lookups: `schedule_publication_revision_shifts(source_shift_id)`, `shift_callouts(shift_id)`, `shift_exchanges(source/target_shift_id)`, `shifts(date)`, `schedules(week_start)`, `time_entries(location_id, clock_in_at)`, `push_deliveries(subscription_id)`, plus unindexed whole-history time-entry scans behind Today/inbox-count (the 3.0s p95).
- Recommended: window every snapshot to the target week ± days; replace full-JSON equality guards with per-week/per-employee version tokens; shared locks for pure reads, exclusive only for writes; the index set above (CONCURRENTLY, separate migration); React `cache()` for session/workspace reads. Owner: Codex (backend) — this is the single highest-leverage performance and availability workstream.

**P3. Push notifications are silently lost today (would surface immediately after provider activation).**
- The service worker's kind whitelist omits six server-built kinds (all coverage/swap lifecycle pushes and COMMUNICATION) — delivery records `provider_accepted`, user sees nothing ([fuel-portal-sw.js:155](../../public/fuel-portal-sw.js) vs [payloads.ts:4](../../src/lib/notifications/payloads.ts)); hand-maintained test lists hide it.
- Any transient DB error during delivery becomes a terminal, irreversible `cancelled` — one Neon blip permanently loses the notification, and daily-budget rules then block regeneration; payroll notices are one-shot.
- Also: no key-rotation path (rotating the encryption key 409-locks every installed device with no self-heal), ~8–10 deliveries per 20s invocation with no urgency lane, deterministic poison-pill release loop.
- Recommended: SW builds title/body from `kind` with a generic fallback + a parity test importing the server list; treat `*_unavailable`/`workspace_changed` as transient (defer, don't cancel); key id + keyring; urgency-first claim ordering. Owner: Codex (worker/SW).

**P4. Payroll's seams can misstate pay even though the money core is excellent.**
- Timecard REOPEN after payroll approval/export is allowed and unflagged — approved runs, immutable YTD and published PDFs silently diverge from corrected hours.
- A Time Manager (operational scope, no financial grant) can EXCLUDE an employee with finalized hours from pay with a 1-character reason — silent zero row, no exception.
- Hours exports have no exactly-once control (same period re-exported under a new operationId → double-credit risk); correction runs' payment artifacts repeat the full net with no supersession label (double payment risk on the legacy provider path); `/api/payroll/documents/[id]/view` skips the pay-statements module gate, and the module gate itself fails OPEN on a read error; native payroll hard-stops at the first 2027 payday with no advance warning.
- Recommended order: REOPEN interlock, EXCLUDE evidence rule, export dedupe, correction supersession, view-route gate + fail-closed modules, 2027 ruleset before December. Owner: Codex (payroll).

**P5. Real-life dead ends in time & attendance block final pay.**
- Only the employee can close an open time entry, at a kiosk, at that location, while active — a deactivated employee (or deactivated location/revoked tablet) leaves an entry open forever, which blocks timecard finalization: exactly the terminated-employee final-pay case. No manager close/correct-for-someone path exists.
- Hard caps blank whole screens: Timecards throws above 300 employee cards (inactive included — guaranteed with turnover, and payroll export + Action Center fail with it); 101 pending corrections blank the entire correction queue AND Action Center with no UI recovery (an employee can do this deliberately).
- Owners/Managers can't see their own time or file their own corrections, so their timecards can never be finalized.
- Recommended: audited manager "close open entry" + manager-filed corrections; scope timecards to active-or-has-data and paginate; per-employee pending-correction cap + oldest-100 view; open self-service to all four roles. Owner: Codex (T&A).

## Also high, in brief

- **CI/test wiring** (one critical): `server-only` is undeclared and un-owned — 4 of 5 release-postgres suites and ~29 QA scripts cannot start (the known red CI, now with a full remedy: declare the package, one `vitest.base.mts`, one shared node-args module, a config-coverage test). 49 of 123 integration files — including ALL 30 company-access and the payroll ones — run in no CI-wired config; the 801 "skips" are env-gated suites nothing ever enables (fake green); the lockfile lacks integrity hashes for 349/516 packages; nine QA runners pass the whole shell env (real SMTP/VAPID keys could reach QA runs that send email).
- **UI**: the portal-wide error boundary's "Try again" calls `reset` (doesn't refetch) instead of `retry` on 35 of 44 routes — small mechanical fix; two surfaces use the browser timezone instead of America/Puerto_Rico, one of them the payroll Effective-date default; ~1.57MB of render-blocking CSS ships to every role (24% is the manager-only layer that phone employees pay for), with ~20% estimated dead.
- **Privacy payloads**: shift-picker pages serialize every employee's phone+email (incl. inactive) into the browser payload; swap pages expose coworkers' employee IDs (the login identifier) to all eligible employees; employee pay-statement responses leak internal hashes. All fixable with narrow DTO projections.
- **Observability**: zero server-side logging anywhere — every catch discards the error; inconsistent status taxonomy (bad input → 503, outages → 200/401/403) makes incidents un-diagnosable and invites blind retries.
- **Fragile version tokens**: `updated_at::text` is the version/authority token everywhere, but the session TimeZone/DateStyle are never pinned and nothing maintains `updated_at` — a server setting change would silently void payroll grants and invites. Pin `TimeZone=UTC, DateStyle=ISO` on the app roles and add a monotonic bump trigger.
- **Latent Phase F hazards** (beyond the diagnosis doc): the legacy manager-scope fallback is authority-free by convention; installing the held tenancy tables would silently flip live access semantics; `assertOperationalAccess(proof, undefined)` is vacuously satisfiable; dead `getClockMonitor` chain should be deleted.

## What the inspectors found sound

Server-derived session proofs with in-transaction re-checks on every write; no getSession-only mutations; clean Lead/Employee boundary with no path to manager data; correct last-Owner and deactivation lifecycle (sessions, calendar tokens, recovery proofs revoked atomically); BigInt/exact-rational money math with recorded rounding evidence and DB-enforced immutability; parameterized SQL throughout (no injection surface found); careful idempotency receipts (copy, shift-change, scope, invitations); strict body parsing with no stack/SQL/secret leakage; quiet hours correct and tested; sound calendar-token model; disciplined server→client data boundary and a11y fundamentals in the UI; reduced-motion handling everywhere; well-guarded disposable-DB test tooling.

## Suggested sequencing (all subject to Jose's approval; nothing has been changed)

1. Before release: P1 (login throttle + dummy hash + assisted-recovery restriction + reset notices), P4's REOPEN interlock and EXCLUDE rule, the payroll view-route gate + fail-closed modules, P3's two silent-loss fixes, the UI `retry` fix, and the payroll-settings timezone default. These are small-to-moderate, high-impact, and mostly Codex-owned.
2. Release-infrastructure: the `server-only` remedy (unblocks the red CI), integration-file inventory test, lockfile regeneration, `safeEnvironment()` in runners.
3. First weeks after release: P2 (snapshot windowing, read-path locks, the index set), P5's dead-end commands and caps, export exactly-once, the 2027 payroll ruleset (hard deadline: before the first 2027 payday), key-rotation design.
4. Opportunistic: privacy DTO projections, error taxonomy + logging, CSS role-split and prune, locale seam, dead-code deletion lists (each slice names its items).

## Per-area detail

Each area has its own report in [`code-inspection-2026-10-21/`](code-inspection-2026-10-21/), with file:line references, mechanism, impact, recommended fix and test gaps (up to 12 findings per area):

| # | Area | Report |
|---|---|---|
| 01 | Authentication and sessions | [01-auth-sessions.md](code-inspection-2026-10-21/01-auth-sessions.md) |
| 02 | Management authority and Company Access | [02-company-access.md](code-inspection-2026-10-21/02-company-access.md) |
| 03 | Scheduling | [03-scheduling.md](code-inspection-2026-10-21/03-scheduling.md) |
| 04 | Time and attendance | [04-time-attendance.md](code-inspection-2026-10-21/04-time-attendance.md) |
| 05 | Employee data, self-service and privacy | [05-employee-data-privacy.md](code-inspection-2026-10-21/05-employee-data-privacy.md) |
| 06 | Notifications, push and background work | [06-notifications-workers.md](code-inspection-2026-10-21/06-notifications-workers.md) |
| 07 | API routes and server actions | [07-api-boundary.md](code-inspection-2026-10-21/07-api-boundary.md) |
| 08 | Payroll and money | [08-payroll-money.md](code-inspection-2026-10-21/08-payroll-money.md) |
| 09 | Database layer | [09-database.md](code-inspection-2026-10-21/09-database.md) |
| 10 | Tests, tooling, CI and dependencies | [10-tests-ci.md](code-inspection-2026-10-21/10-tests-ci.md) |
| 11 | UI layer | [11-ui-layer.md](code-inspection-2026-10-21/11-ui-layer.md) |

Related, already fixed and pushed for review: `claude/tenancy-defect-fixes` (D2, D4 and the Codex handoff), `claude/d1-preview-company-access` (D1), `claude/d3-runbook-migrations` (D3). `claude/test-suite-repairs` (another session) partly addresses area 10's `server-only` finding; foundation and generation suites remain red there.

Limitations: static analysis only; nothing was executed against a database or browser in this audit; lock durations and latency mechanisms are inferred; two findings (employee-Home fail-open coherence, read-lock contention) explicitly need load-test confirmation; browser-QA scripts may cover some components the static test-gap scan counted as untested.
