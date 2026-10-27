# Employee mobile — swap/cover responses and own-request details

Implemented in the real Next application, continuing the approved teal Employee/Lead system. This bounded Phase 2 batch covers incoming swap responses, own request detail/history and currently permitted cancellation/withdrawal. Phase 2 remains active; Phase 3 has not started.

Application candidate: `333c476250b6727f72b8746404b25ab53a3b88ed`.
Branch: `codex/employee-mobile-responses-20261027`.
Worktree: `work/employee-app-phase1` in Jose's Nevora design task.
Base: accepted Requests plus sequencing record `583b39b4`.
The branch/worktree are preserved locally. No push, PR, merge or deployment. Documentation/design-record commits must preserve the tested application inputs; see `candidate-verification.json`.

## Resulting behavior

- **Swaps for you:** only requests addressed to the current employee. Detail compares the original reviewed shifts, dates, location/role and overnight ending. Acceptance explains immediate completion versus manager review. Current planner checks decide whether Accept, Decline or another response is available; stale reviewed terms withhold acceptance while preserving permitted decline.
- **My shift requests:** own swap/cover offers, pickup responses and Unable-to-work reports. Exact permitted links work beyond the recent list window. A deleted live request can retain safe immutable history, with no current-response controls. Raw peer IDs, absence reasons, policy records and scheduling profiles are not transported.
- **Cancellation and withdrawal:** reuse the existing planner/command service. Cancelling a permitted own offer/report or withdrawing a pending response reflects the actual canonical result. Withdrawing closes the request; a pending swap leaves both assignments unchanged, while pickup leaves the original employee assigned. The interface does not invent an offer reopening or completed assignment.
- **Unknown outcomes:** the established command owner retains one immutable operation ID, kind and payload. Conflicting intents cannot run together. A lost committed response reconciles that operation before resend. Current lifetime admission fences captured handlers. Canonical reads, rather than optimistic receipts, settle the displayed state.
- **Private reads:** actual own Employee/Lead session, role, workspace, module and exact current location scope. The captured permitted scope is checked under the existing locks before/after later transactions, including final lease admission. A mid-read scope change releases the view. Missing immutable report terms remain explicitly unavailable instead of substituting a changed live assignment. Facts/actions release on finite expiry, pause or current authority loss.
- **Presentation:** shared teal tokens, original wordmark, regular Phosphor icons, native page navigation/history disclosure, 48px response controls and visible keyboard focus. Exact row focus returns after detail navigation. Shared mobile navigation remains opaque in Dark. Desktop keeps its original direct-child presentation; management retains its existing branch.

Main owners: `src/components/employee-mobile/{exchange.tsx,exchange-view.tsx,exchange.css,request-operation.ts}`, `src/lib/{employee-exchange.ts,data/employee-exchange.server.ts}`, protected `/api/employee/exchange` reads, responsive exchange route and scoped shell marker. Previous pickup reuses the generalized operation adapter through its existing export. No new dependency, schema, migration, eligibility engine or management command.

## Verification and independent findings

| Check | Exact local evidence |
| --- | --- |
| Current unit/component/server | 20 files,166 passed,0 skipped. Command retained in `.omo/evidence/employee-mobile-responses/unit-fixed-command.txt`;14 focused tests also pass. Earlier206-pass/12-skipped invocation belongs to the earlier candidate/scope, not an exhaustive current-suite claim. |
| Root PostgreSQL/browser | 44/44 pass in116.93s:42 actual SQL tests plus two orchestrated browser tests. The four new adversarial SQL cases cover location revocation during detail/list/final admission and failed immutable report history after a live shift changes. |
| Response browser | 34 named journey checks across Chromium/WebKit/Firefox; previous pickup regression28. These are scenario checkpoints within two tests, not62 independent tests or a completion percentage. |
| Rendered controls/layout | Response36 contrast samples and pickup18, Light/Dark320/390/430px; minimum6.089:1. Response controls at least48px, no horizontal overflow,200% root text, measured navigation clearance and opaque nav verified. Actual Tab in Chromium/Firefox and Option-Tab in WebKit, exact return focus and preserved desktop1440px. |
| Authority/data/recovery | Actual SQL/HTTP verifies own/foreign selectors, Employee/Lead reads, current-role/module refusal, canonical automatic/manual decisions, one persisted operation after a lost response, decline/cancel/withdraw/report cancellation, older exact links and retained deleted-row history. Actual browser offline/resume and current authority loss release facts. This does not certify actual OS background behavior. |
| Diagnostics | Final root response run retains3 deliberate drop/401 errors; prior pickup retains4 deliberate errors. No unmatched console error, page error, hydration failure or error boundary in those passing runs. Raw failed requests also remain recorded; cancelled navigation/private-read requests are not claimed to be network-clean. |
| TypeScript/targeted ESLint | Pass. No production build or hosted environment certification performed. |
| Fresh code review | APPROVE/WATCH. Author independently closed HIGH CR-RSP-1 scope race and MEDIUM CR-RSP-2 live-term fallback using the original2 SQL reproductions now passing and25 focused tests. |
| Independent UI | APPROVE / GO WITH CONDITIONS. Author closed UI-RSP-1/2/3 after4/4 component tests, actual settled manual-swap/pickup captures, opaque dark navigation and1,930 matching source hashes. Device/AT/release gates remain separate. |
| Independent QA | GO WITH CONDITIONS for this local batch. Independently passed44/44 in109.20s plus14/14 supporting tests; author closed QA-RSP-1/2 after actual settled outcomes, strict diagnostics and1,930 source/mirror hashes per runtime. Original failures remain preserved. Physical-device/AT/hosted and remaining Phase 2 gates stay open. |

Reviewers own their reports and closure: [code](code-review.md), [UI](ui-review.md), [QA](qa-review.md). Root may remediate but cannot self-close their findings.

Earlier failed runs, raw logs and RED evidence are preserved. Incorrect withdrawal/stale test expectations were corrected to the existing lifecycle, not used to change domain policy. Ordinary WebKit Tab exited the page and correctly paused private data; documented Option-Tab supplies its actual keyboard path. A screenshot-induced hydration diff was traced to Playwright's caret-hiding input-style mutation; captures now use `caret:initial`. Later WebKit Load-failed/error-boundary diagnostics were not filtered out: terminal/navigation tests now await the original operation and canonical refresh instead of moving on at an already-present label or transient receipt. A zero-height empty completed action section exposed another test visibility assumption; settlement still requires a nonbusy attached action section, no uncertainty/recovery button and completed refresh. Fresh root and independent replay, rather than inference alone, control the diagnostic gate.

## Evidence, supply and release conditions

Root passing evidence: `outputs/employee-mobile-responses/accepted/{details,pickup-regression}` outside the checkout. Preserved failed attempts: `run-1` through `run-4`, `final` and `fixed`. Independent evidence: `outputs/employee-mobile-responses/independent-qa`. Each owned Next/PostgreSQL runtime freezes committed application bytes, substitutes only the declared local DB/generated-type inputs, verifies original/mirror hashes at closure and releases only owned derived artifacts.

Review gallery: `http://127.0.0.1:18763/employee-mobile-responses/`. It shows actual captured application states with fictional accounts; it is a review record, not a deployed or persistently running authenticated application.

21st free metadata results12387/24840/37491 were evaluated; existing live components fit better. No paid retrieval, generation or new UI package. CLI review is unavailable (`21st` command not found); no CLI review certification is claimed. Impeccable guidance and the scoped `.21st/design.json` decision preserve the approved composition, semantic palette and restraint. This is not a fresh competitor audit or exact ADP/Gusto/Homebase clone claim.

Development source inventory still fails. Current recorded development head is `dfdcefa0edc9d02bad5edf79b2b5a9587b194eb2`; relevant exchange/history/service owners were unchanged on the fresh comparison. Missing branches: `Claude-UI-Fix`, `codex/owner-ai-release-testing-20261023`. Unclassified at the latest check: `claude/home-clock-row`, `claude/quiet-everywhere`, `codex/light-default-20261027`. Remote development also has changes absent from this checkout. Reconcile source inventory and current development before assembly; no waiver or unrelated merge.

Physical iPhone/Android, actual OS text scaling/background lifecycle, VoiceOver/TalkBack and hosted/staging parity remain Phase 3/release gates. Source/component checks of absence/empty/error states do not certify every visual/localized case. No production/customer data, actual messages, native prompts or analytics were used.

Product/experience: bounded own-employee tasks and clear consequences. Engineering/security: incumbent authority and operation/history owners remain decisive. Assurance/governance: exact evidence and independently owned closures; no policy exception or production authorization. Implementation owner: root; independent findings remain with their authors.

Next bounded Phase 2 batch: new swap/cover creation and Unable-to-work submission. Time off/availability and the other Phase 2 groups remain in `../employee-mobile-phase2/STATUS.md`; reachable legacy destinations do not count as completed mobile ports. No further user action is required to preserve this local candidate. Any assembly/release action needs its separate gate and authorization.
