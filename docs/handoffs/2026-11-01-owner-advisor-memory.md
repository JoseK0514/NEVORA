# Explicit Owner memory — local candidate

Task 1 of the [Owner-aware operations partner](../superpowers/specs/2026-11-01-owner-ai-partner.md). This candidate has not been integrated or deployed. No paid inference was used for its verification.

## Storage and authority

`src/lib/owner-advisor/memory.ts` owns the strict public command/read contracts and pure projection. `AdvisorMemory` in `memory.server.ts` applies current original Owner/company/session guards on every database operation. Migration `0046_owner_advisor_memory.sql` adds private `(workspace_id, owner_id)` revisioned records: at most 12 explicit preferences/Owner constraints and 20 decisions, UUID identifiers, existing task scopes and 1,000-character text fields. The complete serialized record is capped at 131,072 UTF-8 bytes. There is no inference write tool.

Every mutation supplies an expected revision and uses the existing advisor request namespace and workspace advisory lock. Memory receipts contain revision only. Exact retries replay that revision; changed payloads under the same ID conflict. Checked outcomes invoke the existing `coverageAction` server path, require an owned saved receipt in the current session and matching coverage date, and retain its exact progress and timestamp. Owner-reported outcomes never become verified outcomes. Editing a decision clears its previous outcome so that the revised choice requires a new report/check.

## Expiry and forgetting

Effective and expiry days are inclusive. Scope matching is exact for coverage dates and period boundaries; general intent applies to each scope. For a scoped investigation, applicability uses the investigated date/range, so future coverage can be planned before its effective date. Current-date expiry/purge uses database time and the workspace timezone. Records also have an immutable absolute retention ceiling of 365 elapsed days from `createdAt`; edits preserve creation time. Expiry dates cannot exceed the UTC creation calendar day plus 364 days, a conservative calendar ceiling independent of future scope. The interface exposes source, dates and modification time.

A guarded read validates the whole record before pruning expired items; malformed data fails closed. It performs at most three revision-CAS purge attempts, each with the same workspace lock and authority guards. No background job is installed. Expired data is excluded from inference, and retained application data is purged on the next read/edit. Expiry during an investigation invalidates its settlement.

Memory changes, notebook changes and priority changes atomically clear recent conversation and completed ask payloads and terminally invalidate running asks. Settlement also checks notebook, memory and profile revisions. Historical priority receipts are scrubbed to revision only; priority retry responses return the current profile rather than resurrecting an old value. These are application retention guarantees, not deletion claims for provider systems, external exports or backups.

## Context and interface

Snapshots include optional `memory: MemoryRead`; new ask answers include memory, notebook and profile revisions. Older answer shapes remain parseable for compatibility. Context passed to `investigate` is labeled explicit intent/historical decisions rather than fresh evidence. All applicable intents are included; historical decisions are newest-first and bounded by a 32,768-character serialized projection, with an explicit `omittedDecisions` count. Existing provider request/tool/effort limits are unchanged. A large combined history/tool request may still hit those pre-existing limits rather than silently dropping an applicable constraint.

The existing advisor controller and finite authority lifecycle own memory commands and draft visibility. The panel offers Add/Edit/Remove preferences and constraints, decision/course/reason forms, expiry/scope controls, explicit Owner outcome reports, and exact draft receipt checks. The check selects only a matching currently saved draft in this session, showing its date and assignment labels without exposing a UUID input. Without that context the check is disabled; a stored observation remains historical and does not establish new-session receipt authority. New records default to the displayed maximum retention day while leaving expiry editable. A stale editor preserves its draft and requires explicit review before using a newer base revision. New context revisions retire displayed answers. The final real-browser acceptance stage remains separate.

## Release boundary

The change is additive, but its migration must accompany the application for memory to be available. Missing schema is an explicit unavailable state. Deployment/integration, live model evaluation with a new budget, and the later browser/independent review gates are not authorized or completed by this handoff. Keep the forgetting triggers and current receipt behavior when rolling application code back; removing those controls would require a separately reviewed migration.

## Verification evidence

On November 1, 2026, the focused advisor run passed 261 tests; owned PostgreSQL advisor integration passed all 119 tests. The existing expiry integration was then strengthened to exercise direct POST after expiry (no preceding snapshot), and its seven-test file passed again. Typecheck, focused production-file ESLint and `git diff --check` passed.

The full default run finished with 10,624 passed, six failed and 801 skipped. One failure was the migration-order test's expected tail, updated explicitly to include `0046` while preserving all previous ordering. The other five were unchanged 5-second timeouts in `typed-guarded-backfill.server.test.ts` (three cases) and `phase-e-runner.test.ts` (two cases). A subsequent sequential rerun of all three failed files passed all 162 tests with original timeouts/assertions. This is not a claim that the full default suite was rerun green. Final whole-candidate verification and browser acceptance remain later gates.

Raw local logs and the detailed task report are under `.superpowers/sdd/2026-11-01-owner-ai-partner/` in the detached candidate checkout; they are intentionally local evidence, not committed provider/test credentials.
