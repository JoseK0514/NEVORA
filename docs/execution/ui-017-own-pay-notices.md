# UI-017 own published pay-statement notices

Spec: canonical `outputs/UI_017_OWN_PAYROLL_NOTICE_QUEUE.md` in the Business Analyst task. Exact Finance final predicate is pending; prepare the UI adapter against its unchanged two-argument interface without self-closing assembled privacy acceptance.

## Context and Global Constraints

Base a44fce7c3b0470aa9250f983d64d79c22f5371ef in an independent clone/branch. Preserve UI-015 candidate and b6e7c44 preview. No Finance, migration, settings, permission, payroll calculation, publication or delivery changes. Reuse source check, destination and protected observation; no copied payload financial fields or management capability. No merge/push/deploy/real sends. Existing explicit read/acknowledgement behavior stays intact.

### Task 1: Own statement read adapter

**Ownership:** employee-notification-list.server.ts, portal-notification-list tests, direct adapter/UI fixture tests, execution evidence. Canonical query registration and metadata projection only; modify existing carry-forward fixture SQL matching only if discovery metadata shape changes.

**Interfaces:** Consume `payrollNoticeReadSql(id,recipient)` and canonical repository check; same EmployeeNotificationItem/API response. Include payroll metadata in final protected observation and in-memory replay. No Finance interface changes.

1. Add failing tests: Employee/Lead own statement; common query accepted in finite manifest; Owner/Manager own preserved; explicit read/unread metadata; final source/role/session/version/candidate denial; no financial text or custom href; 25-notice budget. Expected: current Employee/Lead notices omitted and manifest rejects query.
2. Register canonical two-argument payroll query in common template set, support own PAYROLL_STATEMENT only, and project it after canonical check directly from minimal metadata. Do not invent SourceSnapshot/financial contents because payroll readSource deliberately returns null. Current source failure must produce unavailable rather than all-clear. Expected: adapter tests and existing source/receipt capacity tests pass.
3. Verify actual owned PostgreSQL/Next inbox/bell and protected open path on Employee/Lead using fictional published legacy fixture, plus foreign/unpublished/version/access negatives. Chromium/WebKit desktop/mobile/keyboard/axe. Expected: available own notice opens My Pay, counts include it, other sources remain usable, no money details or payment claims.
4. Run affected suites, full suite, typecheck/scoped lint. Capture source/evidence hashes. Expected: no new failures, all held/skip/final-Finance limitations reported.
5. One fresh final whole-branch review, then one TDD fix pass if needed. Commit local UI-only increment and exact receipt; independent assembled Finance/QA gate remains open.

**Task verification command:** `npm test -- src/lib/data/employee-notification-list src/lib/data/portal-notification-list src/lib/notification-inbox-view.test.ts src/lib/employee-view-route.test.ts src/app/app/notifications/open/route.test.ts --maxWorkers=2`.

## Review Focus

Meaningful Employee/Lead positive notices, own Owner/Manager source unchanged; no preparation/management capability exposed; exact imported two-argument SQL in final observation; deny post-discovery source/intent/current-role loss without executor fallback; constant metadata labels/destinations only; read/ack distinction; 25-source budget and preserved supported sources. Final Finance predicate and native statement generation are independent coupled acceptance dependencies, not proven by contract fixtures or old backend tests.
