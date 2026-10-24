# Claude handoff: role-change navigation, preserving Quiet v4

Jose's direction: further application UI work belongs to Claude. Preserve the Quiet v4 design. No new styling, layout, assets or policy wording changes are requested.

## Exact candidate and completed cloud result

PR30: https://github.com/JoseK0514/NEVORA/pull/30, OPEN into development.
Published source: `d6ce3ef9d7014be9f0f11126781f6b7b67c4e500` on Codex-owned `codex/premium-backend`.
Run: https://github.com/JoseK0514/NEVORA/actions/runs/40099363010.
Generated merge: `188b59f92d168d25e014df0c93be729610fe31a4`; tree `8c7b0d891823e2f8c580781487102cdb1a982d87`, identical to the published source.
Final result: FAILURE,10/12 mandatory jobs successful. Attendance and final evidence fail; nothing is accepted for integration.

Validation, all three SQL jobs, all five PhaseE browser suites (70 cells) and their aggregate pass. Every PhaseE raw receipt has14 cells, zero errors, exact source identity and closed ownership. Attention's previous login-revocation timeout does not recur; that is a successful current result, not a proved historical cause or application fix.
Owner advisor:28 checks, zero errors/external requests, provider absent; all1,880 hashes match the published source. Build receipt is clean/unchanged/exit0. D2:282 checks, zero errors. Clocker:90, zero errors. Whole PhaseD:207 functional checks, but retained runtime errors below remain fatal.

Fresh fetch still finds development `8d4a3792aceb9cd56e7e33ce318f4d5e9a74f9bb`, Claude-UI-Fix `3103829366dbf27b21c0860a7ef13fc458648563` and main `7ffd013e39a9763a0655aa092b159dea4cbbfb50`.

## Claude's bounded application investigation

Reproduce the actual-role-redirect control in `scripts/scoped-navigation-browser-check.mjs:102` using fictional local data and native WebKit. It starts a Manager at payroll export, intercepts the first Reports RSC request, changes that fictional employee to EMPLOYEE, dispatches storage, then releases the request. The original assertions require the employee Home destination, old private source absent, real role change, and awaited role/scope restoration.

Run11 observes:
1. The Reports RSC returns200 and Reports commits.
2. A same-address Reports document reload starts.
3. Native WebKit reports an owned `/app?_rsc=[opaque]` fetch error, followed by two Next RSC fallback messages and a native `/__nextjs_original-stack-frames` error.
4. That Reports document fails; a distinct /app document then returns200, commits and finishes.
5. Employee Home, private-source absence, role restoration and all207 functional assertions succeed. Window exceptions are empty.

The two caught errors project TypeError/load-failed/null cause. Native diagnostics occur during the same-address Reports reload, not the later distinct /app document. The actual /app RSC request IDs are absent from the native request trace. Network failure categories are OTHER/unknown. This evidence does not establish abort semantics, a benign classification, or a precise cause.

The existing strict fixture rule correctly rejects this source: the new application-fetch native error is outside its exact framework-only signature, and document/root evidence does not match. Do not broaden that classifier or suppress these events to obtain green.

Relevant application paths to inspect:
- `src/components/app-shell.tsx:80`: identity change invokes a full location reload; scope change refreshes.
- `src/components/company-access/use-operational-navigation.ts:12`: current authority and identity change handling, shared snapshot retirement and storage lifecycle.
- `src/components/company-access/scoped-read-frame.tsx:42`: fresh authority barrier and replacement/refresh coordination.
- `src/components/app-navigation.tsx` and the existing approved navigation/recovery changes in the candidate.

An overlap between identity reload and the server's role redirect is a hypothesis, not a demonstrated cause. Diagnose first. If an application defect is established, make the smallest nonvisual repair. Preserve authorization, source retirement, server-clock freshness barriers, destination choice, cleanup and existing keyboard behavior. If evidence shows only a framework/test-environment issue, report that evidence without changing the design.

Add a meaningful failing regression for the established cause, then verify the actual WebKit control and relevant focused suites. Return the repair commit, changed files, observed cause, tests and remaining limits to Jose/Codex. Do not merge or deploy. Coordinate one combined publication through the existing PR30 rather than starting duplicate full cloud runs.

## Codex-owned phone harness repair, already prepared locally

Remediation has21 successful checks and seven failures, all at `phase-d-report-keyboard-qa.mjs:56`: immediate person-value innerText is empty instead of8 h after native open/focus, before geometry runs. The summary's8 h assertion passes. WebKit430 completes all phone geometry. This is distinct from the previous clipping failure; run10's authenticated remediation completed28 checks with the approved CSS.

Codex reproduced the mechanism using actual portal-motion.css: both native engines with ordinary motion report open=true while rendered text is initially empty; readiness then exposes8 h. The test now waits for rendered disclosure content and completed finite animations before retaining every original value, complete-name geometry, focus, keyboard, canonical link and accessibility assertion. The same bounded helper replaces the wide branch's previous unbounded animation wait. No style or app files changed.

Local-only commits, NOT pushed and NOT cloud-verified:
- `8df2b63692b5c8a54b649dd0536518a7830da785`: helper, driver and native regression.
- `4231b5d6b064fbfa97cf9e5c2045e7c2dd28390f`: separate finite child-animation control; final tree `7228eeacce2385bfbbc063cb56f4bcad1bd0596f`.

Final local evidence:4/4 Chromium/WebKit × ordinary/reduced-motion controls pass, all browsers close, original source custody holds. All four separately prove a paused finite child animation keeps readiness pending, and closed disclosures time out.158/158 release-engineering checks and targeted lint pass. Read-only review approves publication with WATCH for actual authenticated cloud verification; these controls do not close the seven cloud failures.

These commits are on local `codex/quiet-ui-development-20261023` in the attached verify-preview-33 worktree. Codex will combine this CI repair with Claude's supported application fix before the next full cloud run. Do not overwrite this work or push Codex's remote branch.

## Evidence and release boundaries

Private raw evidence:
`/Users/josek0514/.codex/quiet-ui-pr30-evidence-20261023/attempt11/`
Whole PhaseD: `phase-d/nevora-phase-d-browser-evidence/report.json`.
Remediation: `phase-d/nevora-phase-d-remediation-evidence/report.json`.
Native readiness: sibling `disclosure-readiness-final/calendar-readiness-custody.json` and `code-review.md`.
Prior source comparison and approved phone CSS remain in the combined candidate handoff.

These are fictional isolated CI/local databases. No real notifications, hosted data writes or migrations. No main merge, production deploy or production authorization. PR30/development integration, matching development-push CI, fresh DEV Preview/own-URL smoke/NEVORA alias and recoverable five-branch cleanup remain pending. Keep required tests and failed historical evidence intact.
