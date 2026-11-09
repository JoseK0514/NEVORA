# Independent QA — Employee mobile responses and own-request details

**QA recommendation: GO WITH CONDITIONS for this bounded local Phase 2 batch.** No open QA blocker remains in the tested response/detail workflows. Physical-device, assistive-technology and hosted acceptance, development-source reconciliation and the rest of Phase 2 remain separate gates. This verdict does not authorize assembly or production.

Final application/test candidate: `333c476250b6727f72b8746404b25ab53a3b88ed`.
Base: `583b39b4`. Branch: `codex/employee-mobile-responses-20261027`.
Reviewer: `responses_independent_qa`. No application, test or configuration edits were made by this reviewer. Findings and closures below are independently owned.

## Executed evidence

| Scope | Independent result |
| --- | --- |
| Full owned PostgreSQL/Next/browser config | **44/44 passed**, 5 files, zero skipped, 109.20 seconds. This includes the new response browser, previous Requests/pickup browser, four new read-privacy/history regressions and 38 incumbent SQL regressions. No carry-forward substitution for these results. |
| Response browser | **34 named journey checks** across Chromium, WebKit and Firefox; 90 full-page/viewport screenshots; 36 Accept/Decline contrast samples, minimum **6.089:1**. Named checks and samples are not additional top-level tests. |
| Previous Requests/pickup browser | **28 named checks**, 36 captures and 18 primary contrast samples, minimum **6.089:1**, independently rerun on the final candidate. |
| Focused supporting unit/component/server tests | **14/14 passed**, 5 files, zero skipped. Initial candidate had 13/13; the added withdrawal consequence regression is included in the final 14. These are code-level checks, not substitutes for browser or SQL evidence. |
| Source/environment custody | Independently hashed both owned source manifests and both retained app mirrors: **1,930 inputs each, zero mismatches**. All inventories match the current tracked application inputs. Both ownership records are closed, source/mirror verified, with owned `.next` and dependency copies released and independently confirmed absent. Runner/config/test files also match the committed candidate. |

Exact commands were recorded before execution in `invocations.md` and `replay.sh`. The full replay used scrubbed environment variables, fresh loopback PostgreSQL, fictional fixtures and actual Next authentication/server actions. No existing application database, production credentials or real delivery was used. The isolated runtime substitutes only the documented database transport and Next development type-reference paths; these substitutions are separately hashed.

The complete `manualQa` matrix includes `surfaceEvidence`, `adversarialCases` and 23 verified non-empty `artifactRefs`:

- [Manual QA matrix](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-responses/independent-qa/employee-mobile-responses-manual-qa.md)
- [Independent execution log](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-responses/independent-qa/replay.log)
- [Response checks and raw diagnostics](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-responses/independent-qa/replay/details/results.json)
- [Previous pickup regression](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-responses/independent-qa/replay/pickup-regression/results.json)
- [Independent custody audit](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-responses/independent-qa/custody.json)

## Verified behavior

- Current Employee/Lead data is scoped to the actual actor. Real SQL and authenticated browser-context requests reject foreign report details, arbitrary employee selectors, current-role loss, inactive authority and a disabled marketplace. The new SQL regressions revoke secondary-location eligibility during detail/list reading and immediately before final lease admission: all three refuse the whole private read. Legitimate cross-location responses still pass.
- Incoming review preserves the recorded shift terms and overnight ending. A changed publication keeps the original reviewed time, withholds acceptance, preserves permitted decline and is rejected by the command service. An own report with unavailable immutable history renders the reported slot unavailable after a live shift change, rather than substituting the replacement time.
- Automatic acceptance exchanges the published assignments; manual acceptance retains both assignments pending review. After a committed response is deliberately lost, the UI clears facts offline, resumes, reconciles the original operation and settles with one recorded receipt.
- Own cover cancellation, own pending report cancellation, pending pickup withdrawal and decline use actual server actions and canonical SQL readback. Manual swap withdrawal is separately executed; it uses the correct two-employee consequence, settles on Cancelled and leaves both assignments unchanged.
- Exact own detail remains accessible beyond the recent-list window. Deleting its live row retains protected immutable history without a response action. Fixture rows used only to move the request outside the recent window are not presented as actual cancellation receipts.
- Browser verification covers Light/Dark at 320/390/430px, 200% root font, measured bottom-navigation clearance, response target size, actual keyboard focus (WebKit Option-Tab), focus return to the exact list row and the incumbent desktop tree at 1440px. The previous open-shift pickup path remains functional.

## Findings and independent closure

### QA-RSP-1 — ISSUE / medium — closed on final candidate

Initial candidate `42237d75` captured outcomes before response reconciliation and refresh settled. Its Firefox `accepted-canonical.png` still displayed “Checking the original response…” / “Outcome uncertain”; `pickup-withdrawn.png` displayed “Waiting for manager review” / “Refreshing…” beside a withdrawal receipt. I personally inspected those images and the corresponding premature test postconditions. Database mutation alone did not prove final UI settlement.

The corrected test waits for a nonbusy response section within the visible page, absence of the recovery control and uncertainty text, enabled refresh, and the canonical status. The first correction incorrectly required an empty completed-action section to have a visible box; the retained `fixed` run exposed that selector error. The final test uses attached nonbusy state while retaining the substantive settlement checks, and also waits after report cancellation and decline.

**Independent closure evidence:** my final response replay passes all 34 checks. I personally inspected my Firefox settled manual acceptance and pickup-withdrawal screenshots: the former has correct swap consequence copy and a usable Withdraw response control; the latter shows canonical Cancelled with no pending/uncertain receipt. Actual manual-swap withdrawal and SQL assignment assertions also pass. Paths: `independent-qa/replay/details/firefox-accepted-canonical.png`, `firefox-pickup-withdrawn.png`, `firefox-manual-swap-withdrawn.png`.

### QA-RSP-2 — BLOCKER — closed for this bounded workflow on final candidate

The initial full root run was 39/40, despite reaching all 33 then-current named journey checks. Its strict diagnostics failed on unexpected WebKit `TypeError: Load failed` / `ErrorBoundaryHandler` and a stack-frame page error. I independently read the raw log and results; it was not accepted as a passing run.

**Independent closure evidence:** the corrected full config passes 44/44 with the strict unmatched-console/pageerror assertion retained. My response run records three deliberate transport/refusal console errors, **zero warnings, zero page errors and zero hydration/ErrorBoundary errors**. It also retains 12 raw failed-request events, including injected response drops and navigation/private-read cancellations; this is not a network-clean or console-clean claim. The previous pickup replay records four deliberate transport/refusal errors and no unexpected page/console errors. Earlier failed logs and captures remain preserved. No diagnostic failure was suppressed or reclassified to pass.

The independent code reviewer owns CR-RSP-1/2 closure and the UI reviewer owns UI-RSP-1/2/3 closure. My four actual SQL regression passes and inspected final captures support their corrections; this report does not replace or rewrite their decisions.

## Conditions and boundaries

- **VERIFIED:** bounded local response/detail integration and regression evidence above. Final source freeze was respected through replay and custody audit. No ULW loop plan existed (`ULW_LOOP_PLAN_MISSING`), so the caller's external evidence directory was used.
- **RISK / later acceptance:** root-font enlargement and headless engines do not establish real OS scaling/background behavior, physical iPhone/Android or VoiceOver/TalkBack behavior. Those remain Phase 3 gates; no broad accessibility certification is made here.
- **RELEASE CONDITION:** development-source reconciliation, exact hosted/staging parity and required CI/release custody remain unverified by this local QA task. No production build/deployment, push or merge was performed by the reviewer.
- **SCOPE:** creation/report mobile ports, time off/availability and the other Phase 2 groups remain. Phase 3 must not start until Phase 2's exit conditions are met. Existing routes and these passing tests do not mean all Employee features are integrated.

No material policy exception or risk acceptance is requested. The implementation owner retains the next Phase 2 batch; QA and UI retain independent finding authority.
