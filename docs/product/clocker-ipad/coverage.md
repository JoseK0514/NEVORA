# Clocker workflow coverage

This interactive prototype uses fictional in-memory records. Reload or Reset clears all changes. Employee clocking and separate Owner controls share one local state contract; no production endpoint, customer record or credential is used.

| Workflow | Implemented prototype behavior | Integration still required |
|---|---|---|
| Registered tablet | Named/location context; ready, setup, removed and unavailable states | Real cookie/status and active-location reads |
| Enrollment/replacement | Immediate invalidation, one-use scoped code, ten-minute expiry, explicit setup check; interrupted/cookie/expired/inactive/empty states | Real secret generation/redemption, browser storage and concurrency |
| Employee PIN | Masked four-digit input, keypad/keyboard, invalid/limited states, no public roster; partial PIN clears after20 seconds | Server verification, secure PIN storage and rate limiting |
| Privacy | Hard30-second verified window, warning in last10 seconds, secure re-verification; same actor resumes unsent mode, different actor starts fresh; Escape/visibility clearing | Real session and physical-device lifecycle verification |
| Status/location | Off clock, working, on break; eligible locations separate from an existing shift location | Current server status/freshness |
| Clock/break actions | State-derived choices, clock-out confirmation, accurate cancellation, explicit break end; reference minutes never auto-end | Real idempotent punch service and policy |
| Receipts | Original action UUID, recorded sample time, immediate Done; identity clears within8 seconds | Durable server receipt/time |
| Pending isolation | Original actor/action/device locked; other employees continue independently | Durable per-employee intents and shared-device concurrency |
| Recovery | Recorded reconciliation, unknown, safe original-ID retry, current-status review, re-verification, unreadable record; no blind replacement | Real transport reconciliation and recoverable durable records |
| Changed context | Check/Retry/Review agree after PIN reset or tablet replacement; explicit known-not-recorded retirement preserves history and changes no time | Real revisions and authoritative not-recorded evidence |
| Employee escalation | Compact/collapsible/copyable anonymous reference; dismissal does not clear pending or open administration | Native clipboard and secure incident transfer |
| Owner action review | Pending incident list, read-only receipt/reviewed-reference lookup, bounded Timecards handoff | Scoped server lookup and actual Timecards destination |
| Device administration | Add, rename, replacement code, remove confirmation, search/filter, physical handoff instructions | Owner-only server enforcement and stale writes |
| PIN administration | Set/unset/inactive, masked new/confirm, generic duplicate rejection, uncertain-save readback | Owner-only authorization, crypto and durable save confirmation |
| Break administration | Edit/archive/restore separated; past/current break snapshot preserved; disabled/unconfigured choices explained | Real settings versions and policy/history |
| Employee languages | Full English/Spanish labels, errors, actions, cancellation, recovery, receipts and setup | Human localization review and integrated/native validation |
| Responsive use | Tablet landscape/portrait, compact Owner navigation, narrow fallback,200% text, focus/touch geometry | Physical iPad/Android and assistive-technology testing |

Owner-only administration is the confirmed design. The real application's scoped manager permissions are separate integration work; no server permission migration occurred here. Registration does not imply live connectivity. Operational Timecards editing, payroll, remote punches and invented paid/unpaid settings are outside this phase.

All original analyst findings have scoped dispositions: [business re-review](business-re-review.md), [UX re-review](ux-re-review.md). [Verification](verification.md) records the actual checks and remaining integration boundaries.
