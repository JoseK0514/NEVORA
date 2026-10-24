# Reports navigation correction — closure review

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: None for publishing this bounded candidate for mandatory cloud verification. This is not release/runtime approval.

## Scope and identity
Reviewed working changes over HEAD 56d1684bc6f2216d2811aae67334eefb14987efd in /Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler, and the five production navigation paths against Claude 3103829366dbf27b21c0860a7ef13fc458648563. The original BLOCK report remains at .omo/evidence/reports-navigation-c62-code-review.md. No source, test, branch, database or external-state changes were made by this reviewer.

Working file SHA256:
- src/lib/navigation-coordinator.ts: 29b32dfd6247cbb48999314f6e8648a548257818e5fee70ae01656dcccb2d71b
- src/lib/navigation-coordinator.test.ts: a5dc1b004f087be68b83b48860c3375d6c3d7644be7582ff5af8d5dc78e3d0db
- scripts/scoped-navigation-browser-check.mjs: 1a2260add892f4411a10e86ab506bf4c6b822847cecba17b7617b79c604f3aae
- scripts/phase-d-browser-qa.mjs: ab344db87e58ac85744aac0d3855f05b99dbc9fed0ffd21c05bbf80772b5de03

## Findings by severity
CRITICAL: None found in this bounded review.
HIGH: None remaining in this bounded review. Previous stale-address blocker closed: src/lib/navigation-coordinator.ts:29 now accepts only the current destination including query. Old destination commits and old attempt completion cannot release a different current attempt. Redirect completion still accepts the current attempt's observed native pending-to-settled transition.
MEDIUM: None identified in the correction.
LOW: scripts/scoped-navigation-browser-check.mjs:97-115 has a failure-path cleanup race. If the browser wait times out while the asynchronous role UPDATE is still pending, finally may see changed=false before the handler later completes. unroute does not establish that an already-running handler is finished. This only touches a disposable fixture and the surrounding harness fails/disposes it, so it is not an application-security or publication blocker. Before relying on guaranteed restoration under timeout, retain/await the handler task and restore in a nested finally even if unroute fails. A failed restoration should also make the row failed rather than leaving its earlier passed status.

## Controls and test relevance
Compared app-shell.tsx, app-navigation.tsx, navigation-link.tsx, company-access/scoped-read-frame.tsx and navigation-coordinator.ts to Claude 310. No style changes in these paths. Private-body retirement, authority reads and freshness barriers remain; only conflicting router refresh/replace is deferred. Explicit Refresh current view discards navigation coordination then starts recovery. NextLink remains the navigation mechanism; no synthetic router push, focus interception, or custom modifier policy was added.

The added coordinator negatives exercise stale completion, distinct destination query and unrelated redirect addresses, not merely implementation constants. Redirect positive now tests the supported generation-guarded native completion rather than treating any changed URL as proof. Phase D selector changes retain the PIN save outcome, proof issuance/use/expiry checks and export/print checks. Canonical phone hours are asserted before desktop export/print, consistent with the approved phone figures-only contract. Original Reports assertions get their original source and navigation re-prepared after added controls.

The remove-ai-slops and programming skill-perspective checks ran (skills consulted earlier in this review chain). No deletion-only or tautological tests, untyped escape hatch, or unnecessary production parsing/normalization were introduced by this correction. Existing unrelated test limitations in earlier reports remain outside this closure.

## Evidence and limits
Reviewer executed the coordinator directly with assertions for older destination plus older completion, query mismatch, exact destination release, and current-attempt redirect pending/settled: PASS. Reviewer ran node --check on both changed browser scripts and git diff --check: PASS. No heavy suites or browser runs were performed. Parent-reported 134 focused cases and RED 3-fail/7-pass are not independently certified by this report.

The retained prototype runtime report at /Users/josek0514/.codex/owner-ai-integration-evidence-20261023/engineering/reports-native-link-spike/runtime/report.json was inspected earlier: both WebKit held-navigation arms passed with zero source requests during the hold, and the lifecycle arm retired private content. That artifact predates the new browser controls and is not evidence those controls pass on the combined candidate.

New explicit-source recovery observes the exact held request reaching finished/failed, then two animation frames and source URL/content. This is a bounded observation, not proof no later router work can ever occur. New role-denial redirect uses a real Reports request and server role decision; it verifies employee landing and source-private-body removal. Because AppShell keys the provider by user role, this also remounts/discards the coordinator. It therefore does not independently prove same-role redirected Link completion or instant/prefetched redirect behavior. Those remain coverage limits, not claims of verified behavior.

Next gate: mandatory combined-candidate Chromium and WebKit cloud execution including these new arms, original Phase D assertions and all other required release controls. Attention remains unresolved until its actual fixture failure is diagnosed and its mandatory gate passes. No main/production/real data/notifications authorization is implied.

Report path uses fallback because omo-agent-toolkit ulw-loop status --json returned ULW_LOOP_PLAN_MISSING.
