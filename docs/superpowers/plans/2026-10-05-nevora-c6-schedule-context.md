# C6 — published schedule context

## Execution clarification

The completed C6 slice keeps detailed context server-side and preserves the established shared-tablet UI; the public metadata/display extension discussed below was not implemented. Authorized display belongs to the subsequent C7/C8 work. Continuation moved to `phase-c/c6-transaction-continuation` to avoid concurrent original-worktree edits. Local reconciliation within Phase C is distinct from a merge to development/main or production release. See the C6 checkpoint for the actual verified scope.

Approved base: `8e7ba3cc88fbc7369ec6a15908c57e8c307f3994`.
Branch/worktree: existing `phase-c/real-time-clock-live-operations`.
Spec: `docs/superpowers/specs/2026-10-05-nevora-phase-c-live-operations-design.md`.
Evidence/ledger: `/Users/josek0514/.codex/visualizations/2026/10/05/nevora-c6-schedule-context/`.

## Binding scope and decisions
Actual clock-in, break and clock-out timestamps remain the source of actual time. Context is captured once at Clock In and never rematched by a later publication, reassignment, rename, archival or retry. Legacy entries retain absent context; no backfill, attendance/grace window, paid/unpaid policy, clock restriction or payroll change.

Match only this employee at this registered location against the latest committed publication revision per relevant week. Select the latest revision BEFORE filtering its shifts; an empty latest revision must not resurrect a removed shift. Released callout assignments are excluded. A unique containing half-open interval `[start,end)` is MATCHED; none is UNMATCHED; overlapping candidates or unresolved daylight-saving boundaries are AMBIGUOUS. No arbitrary nearest-shift or early/late tolerance is invented. These statuses do not block otherwise valid punches.

Reuse Temporal's explicit reject behavior for ambiguous/skipped local boundaries. An unresolved candidate contributes only within the envelope of its earlier/later interpretations, without selecting either as a real match. Preserve seconds/microseconds, overnight dates and 24:00 end boundaries. Workspace timezone, not browser timezone, is authoritative.

## Architecture
- Read the bounded latest-publication source in one SQL snapshot using database-local date; normalize candidate instants server-side. Retain a fixed window spanning yesterday through tomorrow plus previous-day starts for overnight matches.
- At Clock In, obtain the existing schedule-week advisory locks BEFORE employee/device locks, in the same global order as publication. Validate the source after waits. Pass server-prepared capture context through a transaction-local setting, never request/form fields. A changed source produces an explicit retryable conflict, not a guessed match or automatic unknown-outcome retry.
- New additive `db/phase-c/clocker-schedule-context.sql` adds an immutable optional JSON context to time entries. A BEFORE INSERT hook captures it at the canonical engine's actual database clock-in timestamp. Extend the snapshot reader to expose captured context; do not replace the canonical punch writer. Existing numbered migrations and C1–C5 draft bytes remain unchanged.
- Confirm required capture persisted for a newly executed Clock In, with explicit original-command existence tracked inside the locked transaction so legacy replay is not backfilled. Any missing capture or final authority failure rolls back the punch and receipt together.
- Add a restrained read-only published-context line to the existing tablet, with wrapping and truthful unmatched/ambiguous language. No new management workflow or redesign.

## Work / verification
1. Baseline: inspect source and rules, hash exact baseline, run bare unit suite. Expected: clean branch, tests pass.
2. RED pure boundary/projection tests, then implement types and server candidate normalization. Cover latest-empty, identity/location scoping, released callout, overnight/week boundary, exact endpoints, DST gap/fold and non-hour offsets.
3. RED disposable PostgreSQL capture/immutability/rollback/source-race tests, then add schema and integrate canonical service. Keep all prior authorization and original-ID retry protections.
4. RED client-context validation/rendering checks, then connect compact tablet display. Verify no private schedule notes or peer data is exposed or put into recovery storage.
5. Run complete unit, Clocker, foundation, original B-on-C authority, generation, exchanges, notifications and configuration suites; typecheck/lint/build. Run Chromium/WebKit C6 and existing device/PIN/punch/break flows. Verify schema upgrade and actual lock waits using owned databases only.
6. Author self-review of complete diff, record exact results/limits and commit only verified scope. FR-AUTH-001 remains OPEN for independent Codex final-release review. No push, merge upward, hosted database change, production deployment or feature activation.

Pre-flight interfaces: C6 extends optional entry snapshot context, not command inputs or expected-state revision. Historical receipts may lack the extension; new receipts preserve it immutably. Current-runtime test fixtures install the additive C6 draft; historical upgrade fixtures retain explicit earlier schema stages.
