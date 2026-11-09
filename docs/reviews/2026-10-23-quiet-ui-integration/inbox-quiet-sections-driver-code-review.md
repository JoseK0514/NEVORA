# Inbox Quiet sections driver review

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: None found in this bounded publication review.

Reviewed /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler/scripts/phase-d-browser-qa.mjs working D7 diff, SHA256 9926c4a874bbc504a53054fe8ad98e8025c0007d79f7bfd99e548ae64ca974d7, against manager-inbox.tsx, manager-action-center.tsx useActionCenter, action-center/needs-you.ts and api/manager/today/route.ts.

CRITICAL/HIGH/MEDIUM: None.
LOW/coverage limits: expected Today keys come from a second authorized read, not the exact UI Today observation. A boundary-time/source change can cause a legitimate mismatch; an unavailable Today reply does not prove missed-shift coverage. The test should be described as checking all observed current actions plus available Today data, not universal Today availability. This adds coverage and does not weaken the original action-center equality requirement.

Actual Inbox defaults all to now and partitions actions into now, requests and planning/past, adding Today missed shifts to now. The driver traverses actual Show buttons, checks aria-pressed and URL filter, opens existing groups and compares the union to exact protected source IDs, with uniqueness both within and across sections. It does not derive expected action IDs from rendered rows or drop unmatched source items. Selecting the containing section before each targeted workflow respects the new exclusive presentation.

The same mounted action-center hook registers nevora:time-correction-changed and re-reads through its existing current handler. Dispatching it is explicitly synthetic revalidation, not a claimed native Refresh interaction. It does not invoke mutation endpoints. Existing Try again remains a real button interaction. The Today API call is read-only, protected by session/role/company scope and its required header. No app/style/timeouts changed.

Initial mixed-source API counts, exact authorized request note scope, private-correction exclusion, correction pointer destination/focus, timecard keyboard period/context/focus, offline private-content removal, held reconnect, 503 unavailable, 403 access loss and Lead denial remain. Added disabled/count-free segment assertions address actual Quiet counts rather than relying only on obsolete cm-filter-count markup. Ready state is a snapshot condition, and relevant row checks still occur before workflows. Native focus assertions use real segment/row controls; they no longer claim a nonexistent Refresh button is keyboard-accessible.

Limits: the no-empty regex covers listed exact copy, not the optional limited-attendance suffix; independent unavailable/disabled/count/private-content assertions remain. The Today request and UI section traversal are not an atomic multi-source observation. Existing held-route cleanup structure is unchanged; this review did not execute it.

remove-ai-slops and programming perspectives applied from previously consulted skills: no failure suppression or removal-only test, and expected-key union remains independent of the view's grouping algorithm. Reviewer node --check: PASS. No browser/heavy tests/build or external mutations. Parent-reported cloud failure and screenshot are context, not independently certified here. This is publication review only; mandatory combined cloud execution must establish runtime outcomes. Prior reports preserved; existing no-ULW-plan fallback used.
