# Phase 4 code review

Baseline edce7661c211aba588f29bd6d56327fabdc11b47. Reviewed the initial uncommitted reminder service, validation types, transport, eligibility route, changed unit/SQL tests and server-error tests. Worklog: docs/handoffs/2026-11-16-backend-phase4-worklog.md. This is code review; lifecycle, Rondo and Claude handoff reconciliation are separate deliverables.

**BLOCK / REQUEST_CHANGES**

## CRITICAL

None found.

## HIGH

- src/lib/manager-reminders/service.server.ts:107. The cooldown's nextEligibleAt returns the next day's quiet end (07:00). A command can already queue for that day at 21:00 on the budget day. Distinguish next queue admission from next due time and use configured boundaries when checking expiry.
- src/lib/manager-reminders/service.server.ts:94. Preview checks the operation in a separate transaction before source/budget. An original command committing between lookup and budget evaluation produces cooldown for an operation that moved directly from ready to committed. Acknowledgment/withdrawal in that window can similarly produce conflict despite a stored receipt. Prefer an authoritative receipt recheck on those exits. Exercise the interleaving using an owned SQL barrier.

## MEDIUM

- src/lib/server-error.test.ts:72. The constructed request never enters a handler. For concurrent calls the test checks only global log ID membership; a permutation of response IDs passes. Bind each response to its particular invocation's log and exercise an incoming header through an actual route. The refusal branch uses index%3===0 and then indexes [400,403,409] by index%3, so it always produces 400.
- src/test/integration/phase-e-communications.integration.ts:178. The foreign target check reuses the committed ID with changed payload, testing hash mismatch only. Use a fresh operation ID and an existing employee outside the authorized workspace to check the source predicate directly.
- src/lib/manager-reminders/http.server.ts:32 and service.server.ts:115. Unexpected request and SQL errors return read_failed without recording a sanitized event or attaching a reference. The ownership log promises HTTP diagnostics for unexpected boundary failures. Apply existing diagnostics to genuinely unexpected failures or bound the handoff explicitly. Keep expected holds/refusals without support IDs.

## LOW

None.

## Evidence and skill check

Consulted remove-ai-slops and programming SKILL.md; applied their overfit, type-boundary, and unnecessary-complexity perspectives. The server-error and foreign-target coverage defects above violate both skills' behavioral-test criteria. No evidence of unnecessary normalization, deletion-only assertions or production abstractions in the new path. The established command paths retain authoritative transactional checks. Reviewed docs/handoffs/2026-11-16-backend-phase4-evidence/reminders-sql.log (47), recovery-sql.log (18), focused-units.log (240), and support-access-units.log (100). These are existing run artifacts; reviewer did not rerun heavy suites. No ULW plan exists. This report covers the initial diff only.
