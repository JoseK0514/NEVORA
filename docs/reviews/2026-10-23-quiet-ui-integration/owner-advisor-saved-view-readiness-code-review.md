# Owner advisor saved-view readiness review

codeQualityStatus: WATCH
recommendation: APPROVE for publishing the two strengthened test waits
blockers: None in this test-only patch. The native error and possible navigation race remain unresolved pending runtime evidence.

Reviewed /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler/src/test/integration/owner-advisor-browser.integration.ts:218 and :240 (working SHA256 04d28b4bb410d37fa237e67aca88048e0c1e55c35b4d06f0ab5a9c8324f095ef), against coverage page/action, CoverageAssistant and ScopedReadFrame.

CRITICAL/HIGH/MEDIUM/LOW: No defect identified in the two-wait patch.

Both new waits follow the existing saved=1 URL wait and require visible exact Replacement saved text. CoverageAssistant renders that notice only with saved=true; the repair coverage page sets it from params.saved==='1' and wraps the component in ScopedReadFrame. The action redirects to coverageRepairUrl(...,true) plus saved=1. The wait therefore requires the released protected destination content, strengthening URL-only readiness. Existing database schedule/revision/notification assertions, original URL waits, default 20-second timeout, page-error gates and window-event handling remain unchanged. No error classification, suppression, retry or application/style change is introduced. This is an additional sequential readiness wait, not proof the navigation bug is fixed.

Inspected actual /Users/josek0514/.codex/quiet-ui-pr30-evidence-20261023/attempt5/owner-advisor/webkit-QAOWNER-diagnostics.json. It records AI document request at 05:15:49.933Z, a coverage document commit/unproven navigation state and native authority-fetch pageerror at 05:15:49.934Z. The error's coverage URL contains refresh=1 and no saved=1; artifact contains four authority-request and three authority-response records. These observations support investigating overlap but do not establish causal request/replace ordering or prove benign cancellation. No classification exemption is justified by this review.

Source-backed concern to investigate: ScopedReadFrame's authority callback at src/components/company-access/scoped-read-frame.tsx:47-51 can issue router.replace of the then-current URL when anchored recovery is required and no tracked navigation is pending. Server-action redirects and an automation hard goto are not, by themselves, registered as accepted NavigationLink attempts. A recovery replace started against an older coverage URL can therefore plausibly compete with a saved redirect/hard navigation. The current artifact does not log router.replace issuance or its source address, so this remains a hypothesis rather than a demonstrated application defect. The new visible saved-state waits may expose an actual lost redirect; they must fail normally if that state never arrives.

remove-ai-slops/programming perspectives applied from earlier skill consultation: waits test real user-visible completion, not arbitrary delays or removal-only assertions. No heavy tests, browser run, app edits or external state changes. No new runtime success claimed; parent-reported 28 functional checks/provider state not independently certified here. Prior reports preserved; established no-ULW-plan fallback used.
