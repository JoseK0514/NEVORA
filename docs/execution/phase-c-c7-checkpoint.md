# Phase C C7 — Manager live operations

Date: 2026-10-05
Base: `ae3d2732b94438dcaa0a125088d21439568777ef`
Canonical branch: `phase-c/real-time-clock-live-operations`

## Scope and result

**C7 locally implemented and verified for continued development. Phase C remains in progress; production is not approved.**

C7 replaces the Manager Overview's schedule-derived presence card with **Clocked In Now**, backed by real persisted open time entries and break records. It reports distinct On Floor and On Break counts, actual location, elapsed time since clock-in, elapsed break time and the C6 position label recorded at clock-in. A scheduled employee without a punch is not counted. Overnight and inactive-employee/device history is not silently excluded while an actual entry remains open.

The selected schedule week does not alter the current clock list. No clock records, schedules or payroll data are written by this feature. No attendance/grace window, automatic clock-out, payroll hours, break deduction or correction workflow is inferred. C8 employee My Time remains separate.

The existing two-card Overview composition, blue/neutral design system and other dashboard tabs are preserved. Refresh is a 44px control with a checked timestamp. Long names and location labels wrap, and the full open-entry list is retained rather than truncated. Browser checks verified bottom navigation does not permanently obscure the Refresh control at maximum scroll.

## Authorization and data freshness

`getClockMonitor()` now derives a fresh session mutation proof and delegates to one persisted reader. The reader pins workspace and actor/session authority, observes all rows and elapsed durations in one PostgreSQL snapshot, then revalidates current Manager/Owner authorization before returning data. Expiry while the SELECT waits produces unavailable/access-denied, not a stale successful result. The route requires an actual portal session, rejects Employee/Lead access and marks responses private/no-store with Cookie variation.

The card starts without embedded employee data and fetches the current private snapshot. Visible/online pages poll every 30 seconds; manual refresh is available. Responses expire after at most 45 seconds, shortened to the remaining session lifetime and conservatively reduced by network round-trip time. This is bounded polling, not instantaneous push delivery. Hidden/offline/page-leaving states clear live data and pause polling. Resumption requires a fresh response.

Failures, malformed responses, stalled requests, expired authority and inconsistent persisted clock/break state never become a zero count. A request timeout clears stale names/counts after ten seconds. Generation checks ignore obsolete late replies; no monitor data is written to localStorage or sessionStorage. C6 detailed revision metadata is not exposed; only the authorized Manager's minimal position label is returned.

## Review and verification

Author self-review; not independent Codex certification. Runtime/data modules, transport, cleanup, scope boundaries, public validation and the complete changed-file set were reviewed separately from implementation.

A final navigation regression exposed one WebKit access-control page error. Follow-up unit testing reproduced a queued monitor request starting after stop/pause. A pre-dispatch lifecycle/generation check now prevents that behavior; its regression failed before the correction and passed afterward. The original failure and all browser output remain preserved. No page-error filtering or suppression was added. Fresh authenticated WebKit and C7 browser regressions passed afterward with zero uncaught application errors.

Early harness failures were corrected without weakening product assertions: device revocation uses the actual credential lifecycle, the blocked SQL observer checks the real ungranted table lock rather than truncated statement text, long location names respect the existing 48-character limit, later PIN setup uses Reset PIN, and fresh PIN verification follows the existing tablet privacy timeout. The stale-response controller test explicitly starts its first request before replacement. Existing assertions remain meaningful.

| Verification | Final result |
| --- | --- |
| Complete unit suite | 1,656 passed / 153 files |
| New C7 unit coverage included above | 60 additional cases; 13 refresh/lifecycle cases included |
| Clocker PostgreSQL/security/integration suite | 342 passed; 19 C7 reader cases included |
| Foundation PostgreSQL | 269 passed |
| Original B authorization replay on the installed Phase C schema | 46 passed; repeated coverage, not new unique cases |
| Generation / shift-change / notification PostgreSQL | 176 / 163 / 77 passed |
| New native C7 browser checks | 50 passed, Chromium and WebKit |
| Supplemental layout/recovery checks | 16 passed, Chromium and WebKit |
| Existing punch / device / PIN / break browser regressions | 70 / 62 / 46 / 44 passed |
| Authenticated application regression | 23 Chromium + 23 WebKit passed |
| Configuration checks | 14 passed |
| TypeScript, lint, local production build and diff/source checks | PASS |

Browser/HTTP checks total 334. C7 was exercised through real login/cookies, registered-tablet PIN and punch requests, automatic refresh, manual refresh, break/end/out, empty/error/recovery, role denial, revoked sessions, offline transitions and restored-page lifecycle events. Seven widths from 320 to 1440px were checked. Additional tests verified a 12-person list, measured small-text contrast and mobile bottom-navigation clearance. Screenshots were visually inspected.

These runs used owned disposable loopback PostgreSQL and local Next browser runtimes with disabled external providers. SQL/data source remained unchanged throughout the backend suite. After the client-only cleanup correction, the full unit/static suite and affected browser regressions were rerun. Build-generated configuration changes were inspected and restored to the baseline bytes before final source verification.

## Evidence and release boundary

Evidence and reproducible supplemental scripts:
`/Users/josek0514/.codex/visualizations/2026/10/05/nevora-c7-manager-live-operations/`

Permanent native workflow: `scripts/phase-c-monitor-ui-qa.mjs`.
Permanent database coverage: `src/test/integration/clocker-monitor.integration.ts` (automatically included in the existing Clocker suite).

No numbered migrations, C1–C6 schema drafts, authentication primitives, canonical punch writer, dependencies or production database transport were changed. No push, deployment, hosted database modification or live-punch activation occurred. No physical-device, screen-reader, hosted Neon or customer-scale performance certification is claimed.

**FR-AUTH-001 remains OPEN and required before production.** Codex must verify the final integrated release, including current authorization during blocked reads, safe errors/caching, queued-request cleanup, polling lifetime, offline/restored-page privacy and real hosted transport. Earlier branch-specific success does not close that gate.

Next: C8 — Employee My Time, using actual persisted records and explicit self-service authorization. Phase C overall remains in progress.
