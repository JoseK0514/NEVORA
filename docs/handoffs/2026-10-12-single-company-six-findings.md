# Single-company six findings implementation

Jose authorized these changes on October 12, 2026 with SaaS paused. This delivery supports one configurable company per database. It does not authorize a production deployment or close the independent board's findings.

## Source and ownership

- Implementation branch: `codex/single-company-six-findings-20261012`.
- Development baseline: `b58496b84b21690f7be22474f7570da2d81af6c3`.
- Isolated checkout: `/Users/josek0514/Documents/Codex/2026-10-12/coo/work/single-company-six-findings`.
- Single-company setup integration source: `191fbc38e68d70c2dfe0809dffbdb63eb962b1b7`, from the separate `codex/single-company-20261012` branch.
- The primary checkout, separate setup checkout, central Phase F candidate and original independent report remain preserved.
- Root Codex owns final integration and verification. The previous implementation worker has finished; root is the sole active writer.

## Changed behavior

1. Reconcile the selected business improvements onto the shared development baseline. The large central SaaS candidate is not adopted wholesale. Existing scheduling, notification, authentication and timecard contracts remain the source of truth.
2. Bind templates and children to the current workspace; enforce current management session authority for reads, creates and archive operations. Archived and active empty templates remain distinguishable. Parent, location and position relationships are checked in PostgreSQL.
3. Persist the original copy command and source, then atomically commit row outcomes with schedule/history/publication/outbox changes. Exact retries retrieve the original receipt even after later source deletion. Payload conflicts, concurrent attempts, crash rollback, source drift and final session expiry are guarded. An unavailable template now receives a durable terminal receipt. Browser recovery retains the original operation across reloads.
4. Review all roster members for a payroll period, including inactive and zero-time members; require disposition reasons and employment attestations without treating account creation as a hire date. Manifests reconcile original export batches exactly once and preserve canonical JSON/CSV contents and hashes. New handoffs reject stale roster/timecard/export/profile custody; original artifacts and exact handoff retries remain available. Manual reported submission/import is explicitly unverified. Browser period commands persist across lost responses and reloads.
5. Provide current Owner-only, immutable company/location policy revisions with field validation, inheritance and history. No business thresholds are seeded. Manager attendance uses captured published schedule context, recorded punches and effective intervals on distinct configured bases. Missing policies and unverifiable sources are explicit; source/policy changes between reads reject observation persistence. Finance projection remains unavailable to managers.
6. Run the required suites and browser scenarios against the integrated source; preserve real failures and exact source manifests. Local engineering verification is separate from independent certification.

## Current verification

Evidence directory: `.omo/evidence/six-findings/` (ignored, local only).

- Expanded native PostgreSQL suite: 15 passed, zero skipped (`resumed-native.log`). This includes populated captured lateness/effective elapsed reads, policy/source drift, missing schedule association, immutable ledger mutation/truncation rejection, payroll reconciliation, stale mapping/handoff rejection and copy concurrency/rollback.
- Typecheck and lint: exit 0 after root recovery changes.
- Full default suite before integration: 2,164 passed, one failure in the loopback-listener test under sandbox. That test passed 2/2 when rerun with local execution access. A fresh full integrated run is still required.
- Browser verification and single-company setup integration are in progress. No final build result yet.

## Decisions and controls

Product/program scope is a generic single-company deployment with SaaS deferred. CTO delivery uses the existing development services and migrations; CISO/governance controls retain server authorization, original audit artifacts, fail-closed source checks and owned fictional test data. Independent QA/UI report directly to Jose; operating executives cannot self-close their findings.

All database and browser verification uses newly created, ownership-marked loopback databases and fictional users. No production credentials, customer data, real bookings, SMS/email or payroll-provider submissions are used. The runtime substitutes only the owned scratch database transport and records hashes of the source files.

## Remaining gate

Complete setup integration, full unit/native/foundation suites, browser recovery/mobile/keyboard scenarios, production build and source-bound delivery evidence. Original independent findings remain open pending independent re-review. Hosted/provider/physical-device verification and production release require their own authorized gate.
