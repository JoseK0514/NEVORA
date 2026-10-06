# NEVORA Phase C — C5 operational break configuration checkpoint

Date: 2026-10-05
Branch: phase-c/real-time-clock-live-operations
Starting commit: d589ac7f34be0c4397b053d9c68a91ff448e7819
Frozen Phase B ancestor: 20a1026a2fa88c5923b015a3384b980ff7d676cc

## Status and scope
C5 catalog configuration, historical settings capture and protected punch-service integration are implemented and locally verified. Phase C remains IN PROGRESS. This is not a release or live timekeeping activation.
The canonical development line remains this parent branch; the older independent 3617e4d punch-engine child was not merged, overwritten or rebuilt.

Owners can create, edit, archive and reactivate break types under Settings -> Break Types. Each type records a name, Rest/Meal/Other classification, optional reference duration and active state. No classification is preselected in the creation form; no default type is seeded.
The reference duration accepts whole minutes from 1 through 1,440 or no duration. It is operational display context, not a legal entitlement, maximum allowed break or payroll instruction. C5 adds no paid/unpaid determination, overtime/attendance policy, payroll computation, automatic deduction or automatic end.

## Historical preservation and reliability
- Start Break requires an explicit type ID and its observed version. The public request never supplies a trusted name, duration or category.
- Current active type/workspace/version is checked under a database row lock within the same punch transaction.
- The actual name, category, reference minutes and version are copied to the break record at its start. Current break reads and command receipts use that snapshot, not later catalog settings.
- An edit from a 15-minute Rest type to a 30-minute Meal type cannot rewrite the earlier break's classification or reference duration.
- Archiving prevents new starts while allowing an existing open break to end or close during Clock Out. Reactivation preserves the same type identity and advances its version.
- Missing active types do not create a default Start Break option. Existing unclassified historical breaks retain NULL classification and remain closable.
- Recorded type/snapshot pairs and settings audit events cannot be edited or deleted through ordinary SQL updates; historical timestamps are not backfilled by the migration.
- Identical retry commands return the original immutable receipt even after the selected type is archived. A changed type/version contributes to the request fingerprint and cannot reuse a prior command ID.
- Current Owner/session authority is checked before and after catalog mutations, including after a waiting lock; expiry rolls back the catalog and audit together.
- Stale forms and ambiguous save replies disable resubmission until reload; a lost committed response does not create a duplicate type.

## Implementation boundaries
New additive draft: db/phase-c/clocker-breaks.sql, after clocker-devices.sql, clocker-pins.sql and clocker-punches.sql.
The C5 draft replaces the internal snapshot/apply functions using the existing transactional guard protocol. All previous numbered migrations and C1/C2/C34 draft bytes remain unchanged. No numbered migration was reserved.
No dependency, shared DB transport, environment value, Phase B ref, main/development branch or external service was modified.
The test runner adds --breaks-ui. Existing punch fixture/HTTP tests now explicitly provision a synthetic break type and include its ID/version; their concurrency, replay, authority, lifecycle and rollback assertions remain intact.

## Verification actually run
| Check | Result |
| --- | --- |
| Hardened full unit regression | 142 files / 1,486 passed |
| Hardened combined Clocker device/PIN/punch/break PostgreSQL suite | 12 files / 215 passed |
| C5-specific catalog/snapshot/upgrade tests | 3 files / 31 passed, included in 215 |
| Existing foundation PostgreSQL regression | 2 files / 75 passed |
| C5 Owner browser checks | 44 passed / 0 errors, Chromium and WebKit |
| Typed-break punch HTTP regression | 21 passed / 0 errors, Chromium and WebKit plus default-disabled runtime |
| C1 device setup browser regression | 62 passed / 0 errors |
| C2 PIN browser regression | 46 passed / 0 errors |
| TypeScript / ESLint | PASS |
| Local production build without DATABASE_URL or PIN key, punches disabled | PASS |

Browser checks cover real Owner server actions, create/edit/archive/reactivate, stale tabs, lost committed responses, Manager denial, keyboard Escape/focus return, long names and 44px minimum control-height checks. Management widths: 320, 375, 390, 430, 768, 1024 and 1440. Screenshots were inspected for desktop and mobile/editor layouts. Existing device/PIN suites retain their tablet portrait/landscape checks.
Browser runs used the installed Playwright runtime because the Browser plugin is not listed. All test databases were newly provisioned owned loopback PostgreSQL instances; the Next harness used an isolated scratch copy and substituted only that copy's DB transport. No customer records or existing database were used.
The foundation suite retains its prior 0001–0010 fixture chain. Not every older non-Clocker PostgreSQL suite was rerun with all four Phase C drafts. Physical iPad/Safari, hosted Neon, assistive technology, large-scale performance and production behavior are not certified by these results.

## RED/GREEN and review evidence
Validation, schema, catalog, snapshot integration, server action, navigation and real new-route tests were observed failing before their implementation, then passing. Real PostgreSQL lock barriers verify that archive/edit wins reject a stale break start, and Owner session expiry rolls back a waiting configuration update.
Guardrail review reproduced a false Clock Out receipt when both closing updates were silently suppressed by test-only triggers. The additive function now requires each intended time/break/revision write to affect its row, or the whole transaction rolls back.
Two final review tests reproduced silent command-receipt and settings-audit suppression. The punch receipt insert must now affect a row; the exact new settings audit event/version must exist before commit. Both tests passed after the fix, and the full unit, Clocker PostgreSQL, Owner UI, HTTP, type, lint and build gates were rerun on the hardened source.
Final review was author self-review, not a fresh independent reviewer. Independent Codex Phase C review remains required.
465 source/test/script/package files were captured in a SHA-256 manifest and remained unchanged throughout the final hardened verification. Only inspected Next-generated configuration drift was restored before local save.

## Evidence locations
Local logs: .superpowers/sdd/2026-10-05-nevora-phase-c-live-operations/c5-*.log
Source manifest: .superpowers/sdd/2026-10-05-nevora-phase-c-live-operations/c5-hardened-snapshot.json
Browser evidence under /Users/josek0514/.codex/visualizations/2026/10/05/:
- nevora-c5-ui-hardened
- nevora-c5-http-hardened
- nevora-c5-devices-regression
- nevora-c5-pins-regression

## Release boundary and next step
No push, merge, deployment, hosted migration, notification or production change was performed. NEVORA_CLOCKER_PUNCH_ENABLED remains false by default.
The Owner catalog UI works locally and the API captures actual break settings in isolated tests. Visible employee punch buttons and break selection on the tablet are still pending C9; the informational duration helper is not a completed tablet countdown UI.
Next: C6 published schedule context, followed by C7/C8 live operations and My Time, C9 connected tablet action/recovery UI and C10 final cross-phase verification. Reconcile accepted Phase B hardening and validate an isolated hosted Preview before freezing/releasing Phase C.
GO for continued isolated development. NO-GO for live/customer timekeeping or production release.

## Primary technical references
- PostgreSQL explicit locking: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL CREATE FUNCTION: https://www.postgresql.org/docs/current/sql-createfunction.html
