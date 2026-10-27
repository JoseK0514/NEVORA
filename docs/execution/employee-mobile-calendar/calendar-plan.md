# Employee mobile Calendar continuation

## Spec and source of truth

Jose authorized Calendar on Employee mobile, preserving the accepted teal style and current Employee/Lead permissions. Binding spec: docs/product/specs/employee-mobile-teal/README.md and docs/execution/employee-mobile-profile/NEXT_CALENDAR_DISCOVERY.md. Start: accepted unassembled stack a1b62ca, application acceptance 2e4104ce. Current worktree/branch remains isolated; no assembly, main merge, real provider subscription or deployment.

## Global constraints

One canonical Calendar subscription/operation/feed owner. Preserve server own-session/workspace/role/current eligible-location rules, bearer feed lifecycle, operation receipts and generation guards. No employee selector, private persistent cache, invented provider connection, new dependency, paid resource or real notification. A copied feed survives portal logout by existing policy; revoke stops future access, not already copied events. Desktop remains incumbent presentation. Profile disclosure/hash and stable owner across resize remain.

## Task 1: Bound the existing Calendar lifecycle

Interfaces: CalendarSubscriptionStatus adds server-observed finite lease/current canIssue metadata; canonical GET produces it; one mounted client consumes it and exact CalendarCommand/result. Backend lifecycle remains unchanged.

1. Add actual-panel hook-host regressions for unbounded read/write, unrelated storage and signout fencing. Run before implementation. Expected: meaningful current failures, preserve output.
2. Replace the existing component's state/effects with one tested controller: strict current status and operation-bound receipt decoding; bounded headers/body; lease minus round-trip; explicit original retry after unknown outcomes; pause/expiry/signout clear private data; stale completion fences; fresh GET verifies a created URL before reveal; no secret reconstruction. Add finite metadata within existing guarded server read, without borrowing another feature's policy.
3. Unit and canonical SQL cases prove lease, real eligibility and permission boundaries, issue/rotate/revoke/replay/current refusal. Expected: all relevant tests green.
4. Commit code/tests and ledger result.

Whole-task command: npx vitest run src/lib/calendar src/components/calendar-subscription-panel.test.tsx src/components/calendar-subscription-panel-lifetime.test.tsx

## Task 2: Present the deliberate mobile Calendar flow

Interfaces: consumes Task1's single controller state and existing canonical command callbacks. Mobile changes presentation only, not controller identity or permissions.

1. Read craft floor immediately before edits; write semantic render regressions first. Expected: new mobile requirements initially fail.
2. Keep optional inline Profile disclosure and Schedule fixed hash. Present current state, one-time private link copy/select, provider steps, honest independent refresh and explicit replace/revoke confirmations. Use scoped shared teal tokens, rem type, inset Phosphor carets, 44/48px targets and light/dark wrapping; omit decorative example week only on mobile. No misleading connected status or yellow warning blocks.
3. Verify official provider instructions. Run render/controller tests, nonincremental TypeScript and scoped lint. Expected: green; desktop remains incumbent.
4. Commit code/tests and design record.

Whole-task command: npx vitest run src/lib/calendar src/components/calendar-subscription-panel.test.tsx src/components/calendar-subscription-panel-lifetime.test.tsx src/components/employee-mobile/calendar.test.tsx

## Task 3: Verify and independently review the frozen continuation

Interfaces: Task1 canonical guarded lifecycle + Task2 responsive single owner, accepted prior mobile stack. Tests must exercise actual owned Next, not a static prototype.

1. Extend the explicit disposable PostgreSQL/config allowlist with a Calendar combined suite, preserving prior required groups/namespaces. Add actual owned Next browser scenarios in Chromium/Firefox/WebKit for create/copy/select/replace/revoke, lost response original replay, current refusal/peer isolation, pause/signout/finite expiry, held headers/body/late replies, media resize owner preservation, disclosure/hash/keyboard focus, clipboard failure, dark/narrow/landscape/enlarged text and no-overflow/targets/contrast. Canonical existing token/feed/access fixtures remain required. Preserve all failures.
2. Freeze application/test/config commit before owned Next launch. No source/HEAD/index mutation while any owned Next lives. Run full combined suite and relevant units, TS, lint; verify source/mirror/PID/port/disposable DB custody. Expected: required gates pass, no surviving owned processes/database.
3. Fresh whole-change code reviewer and independent UI/QA authors evaluate exact evidence and own closure. Record and remediate actual findings; no self-certified independent closure.
4. Commit durable HANDOFF/EVIDENCE_HISTORY/phase status with actual candidate/counts/remaining native/physical/hosted/release gates. Publish feature branch only, no PR/merge/deployment unless explicitly authorized.

Whole-task command: npx vitest run src/lib/calendar src/components/calendar-subscription-panel.test.tsx src/components/calendar-subscription-panel-lifetime.test.tsx src/components/employee-mobile/calendar.test.tsx

## Review Focus

Check finite authorization during busy and hung bodies; stale receipt/operation/authority/generation binding; unknown command retained until exact recovery; unauthorized retry behavior; account storage versus unrelated theme storage; signout cannot reopen; no one-time URL before current revalidation or in logs; original operation/service survives resize. Assess native provider copy clarity, deliberate destructive confirmation, enlarged layout/contrast/touch/focus and fixed Schedule/Profile return. Existing bearer lifecycle and current backend rules are the authority. Local evidence does not certify physical providers, native permission hardware, assistive technology or release readiness.
