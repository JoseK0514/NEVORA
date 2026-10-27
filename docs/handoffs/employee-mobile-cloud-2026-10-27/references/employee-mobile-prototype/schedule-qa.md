# Employee Schedule independent QA

120/120 independent browser scenarios passed: 40 in each of Chromium, WebKit and Firefox. No recorded runtime errors, non-GET requests, external requests, private browser persistence or native operations.

Final HTML SHA256: `cab9d28a3f142c3707faa67fba77a48f63955c65b0d5f9710210550378d9fe5c`.

Verified own-week navigation/date selection, five current shifts/40 planned hours and four next-week shifts/32 planned hours, seven date rows, publication/empty/removal distinctions, varied/split/overnight assignments, approved call-out behavior, meaningful/equivalent revisions, canonical confirmation, original-operation lookup/replay, conflicts, current own-scope gates, independent Schedule/marketplace reads, contextual Exchange, current-week Home/notice isolation, sign-out/restart and stale callback fencing. Keyboard tests exercised containment and exact opener return at 320/390px and 320px Light/Dark 200% text.

One issue was found independently: at 320px/200% text the focused “Schedule reviewed” receipt heading was clipped 46px above the dialog viewport. The red repro exists in all engines. The scoped Schedule fix passes the same geometry assertion in the final runs.

[Full manualQa matrix](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile/evidence/schedule-pass/independent-qa/schedule-manual-qa.md) · [Hash-bound summary](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile/evidence/schedule-pass/independent-qa/summary.json) · [Independent runner](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile/evidence/schedule-pass/independent-qa/run.cjs).

Bounded closure recommendation: EM-A06 and the remaining Schedule portion of EM-A05. Other audit areas remain open. These results verify the local fictional prototype only; they do not certify live application behavior or production. Parent-owned prior 469 regression groups are separate and excluded from these counts. No product files, branch, commit or deployment were changed by this QA executor.
