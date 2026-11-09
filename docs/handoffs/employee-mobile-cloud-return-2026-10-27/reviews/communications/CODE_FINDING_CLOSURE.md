# Author-owned targeted code finding closure

Author: original independent code reviewer `/root/communications_code_review`.
Date: 2026-10-27.
Original review: `/workspace/nevora-evidence/reviews/FINAL_CODE_REVIEW.md`, candidate `f7e331a7859ef55400eb1ce1e6420d4b5a9fdff9`.
Corrected application candidate: `8ec15116c1ee37b8b46304d1cbcca439c7778dc7`.
Final targeted evidence candidate: `e9b9ff7dae7687a1d3099b04b792b293f1e5299a`.

**CR-1, CR-2 and CR-3 are CLOSED by their original author. CR-4 remains OPEN, Minor and nonblocking.** No Important code finding from the original report remains open. This is targeted finding verification, not a second whole-change review or approval of the entire batch/release.

The original report was not edited. Its SHA256 remains `ee9c70a90b96c0106da82e13a73f506a774012fb817e618e006337c9bd83ea1f`. This addendum changes its finding dispositions; it does not rewrite the original findings or evidence.

## CR-1 — Unknown original operation survives a refused lookup: CLOSED

Inspected the correction in `src/lib/communications/recovery.ts`, `src/components/employee-mobile/message-session.tsx` and `src/components/employee-mobile/use-messages.ts`. A lookup refusal now preserves the original command and operation ID, fences recovery authorization, reports unknown, disables retry and invokes current-read invalidation. The provider releases the current private snapshot before revalidation, so the old ready/on read cannot immediately re-admit another lookup. Actual account/session-owner replacement and unmount still reset the mounted owner.

Personally executed a direct import probe against the corrected controller for each of 401, 403, blocked and conflict lookup responses. Each retained `{pending:false, notice:'unknown', hasUnknown:true, canRetry:false}`, invoked invalidation once, prevented another lookup/new send while unauthorized, and recovered exactly the original operation through deliberate lookup after reauthorization. Each successful trace contained one original send and two lookups of the same original ID, with exactly one commit callback.

Reviewed the real three-engine browser race at `e9b9ff7d`, its source and final results. An actual publication commits and its response is lost. The test pauses the lookup at the main transaction's development-guard statement, after workspace bootstrap and before workspace locks; the real Owner disables Updates; releasing the lookup produces an explicitly asserted HTTP 403. The private view changes to module off, original uncertainty remains and lookup is disabled. After restoration and a fresh read, deliberate lookup recovers the committed original. The test checks a single original operation record and an original-send counter of one. Chromium, WebKit and Firefox all pass. No response rows or receipt outcomes are fabricated by the SQL barrier.

The publication interceptor is removed before the lookup stage, so its send counter alone is not a complete post-refusal network audit. The no-automatic-replay conclusion also rests on inspection of the actual lookup-only control path and my direct controller probe, which records every request across refusal/restoration. I do not overstate that browser counter as proving all possible duplicate-publication behavior.

Evidence:

- `/workspace/NEVORA/.superpowers/sdd/employee-mobile-communications-plan/cloud-source-units-red.log`: original controller refusals and OPTIONAL action regression reproduced RED, 5 failed / 14 passed.
- `/workspace/NEVORA/.superpowers/sdd/employee-mobile-communications-plan/cloud-review-units-green.log`: corrected focused suites, 33/33 passed, including all four refusal categories.
- `/workspace/NEVORA/.superpowers/sdd/employee-mobile-communications-plan/cloud-lookup-race-green-2.log`: targeted CR-1/CR-3 case passed; three other review cases deliberately skipped in this invocation; 55.59 seconds total.
- `/workspace/nevora-evidence/lookup-race-green-2/results.json`: six checkpoints, two per engine; six captures; no page errors. Expected lost-response/403 diagnostics are retained, alongside three preload warnings.
- `/workspace/nevora-evidence/lookup-race-green-2/owned-next-aQU0b6/source-manifest.json` and `ownership.json`: exact `e9b9ff7d` checkpoint; source and mirror verified; app closed; owned database identity retained; invocation log confirms PostgreSQL stopped.

## CR-2 — Notification-open deadline and private-lifetime cancellation: CLOSED

Inspected `src/components/employee-mobile/messages.tsx`. A ten-second deadline aborts the notification fetch, including response-body consumption. Private read/context disposal aborts the request. A timeout presents recovery feedback, matching-request ownership controls clearing busy state, and the existing current-snapshot/abort checks reject late navigation.

Reviewed the actual three-engine deadline, pause and refresh cases on corrected application candidate `8ec15116`. All nine CR-2 checkpoints passed: the deadline clears opening without navigation; pause/resume and refresh release the held opening; another notice opens successfully; releasing the older response cannot replace the destination. These scenarios are materially stronger than simply hiding the busy copy. The original browser RED had failed the deadline recovery expectation.

Evidence: `/workspace/nevora-evidence/review-green/results.json`, `/workspace/NEVORA/.superpowers/sdd/employee-mobile-communications-plan/cloud-review-browser-green.log`, and `/workspace/nevora-evidence/review-green/owned-next-iuvhmG/{source-manifest,ownership}.json`. Source and mirror were verified and runtime closure recorded. The CR-2 case also passed again across all three engines in `/workspace/nevora-evidence/review-green-2/results.json` on `4f2f5c7f`.

These two whole review-file invocations were **3 passed / 1 failed**, not wholly GREEN; their unrelated CR-1 oracle failures are described below. The completed CR-2 case is the evidence used here. I verified that the entire Git diff from `8ec15116` to final targeted candidate `e9b9ff7d` changes only `src/test/integration/employee-mobile-communications-review.integration.ts`; the corrected application inputs are identical. The targeted final invocation did not rerun CR-2. The required final broad run on the final frozen candidate remains an independent QA gate.

The browser fault holds a response before delivery; it does not separately stall only the response body after headers. The inspected use of the same AbortSignal across fetch and body consumption addresses that part of the original finding; I do not claim a separately executed body-stream experiment.

## CR-3 — Separate permitted reading facts for OPTIONAL content: CLOSED

Inspected `src/components/employee-mobile/messages-view.tsx`. The independent controls now expose Mark as read when acknowledgement is not REQUIRED and the item is neither read nor acknowledged; Acknowledge remains available for OPTIONAL/REQUIRED content when not yet acknowledged.

Personally rendered the actual corrected component in all three modes: NONE has Mark as read only; OPTIONAL has Acknowledge update and Mark as read; REQUIRED has Acknowledge update only. The expanded render regression checks the same matrix. The final real browser case described under CR-1 passed OPTIONAL Mark as read in Chromium, WebKit and Firefox. Its database assertions confirm exactly one own attention-read receipt and zero acknowledgement receipts, and acknowledgement remains available afterward. This closes the original parity/integrity defect without changing canonical permission rules.

## Preserved unsuccessful oracle attempts

No unsuccessful invocation is relabelled as passing because its directory contains “green.”

1. `review-green`, candidate `8ec15116`: disabling Updates before lookup hit HTTP 404 preflight, so the test did not exercise the refused-lookup branch and timed out waiting for immediate module-off refresh. I identified this distinction before the run completed.
2. `review-green-2`, candidate `4f2f5c7fdf24fb805d4be8dbe662344eb56c3d41`: pausing at the operation statement was too late because workspace FOR SHARE already blocked the Owner's FOR NO KEY UPDATE; the Owner write hit statement timeout. Root and this author independently traced the lock order.
3. `lookup-race-green`, candidate `e05546badebd421c4873dfc8846e6810b956b05e`: pausing before the module executor's schema observation allowed the module change too early; workspace bootstrap wrapped the module failure and returned 503 rather than the required 403. The strict assertion failed.

Only test barrier placement changed between these attempts and the final exact-403 run. No product remapping, authorization weakening, timeout relaxation or exception suppression was needed to make the intended race observable.

## Remaining scope and readiness

- **CR-4 OPEN / Minor / nonblocking:** partial zero-item pages still combine an unavailable-source warning with a confirmed-empty sentence. It was deliberately deferred and is not silently closed by this addendum.
- Other independent QA/UI findings and harness/legacy-navigation changes belong to their authors. This addendum does not certify or close them.
- Final broad combined regression, affected final-candidate checks, independent QA/UI acceptance, and final handoff custody remain mandatory. Passing targeted evidence is not a substitute for those gates.
- Production, hosted execution, live activation, assembly, physical-device and assistive-technology gates remain outside this closure. The original report's Declined to judge limitations remain in effect.

**Code-finding disposition: GO for closure of the three original Important findings, with CR-4 retained as nonblocking debt. Whole-batch/release readiness is still conditional on the separately owned mandatory gates.** No production authorization, policy exception or risk acceptance is inferred.

This author made no application/test/index/HEAD/branch changes, launched no owned Next/PostgreSQL/browser runtime, and performed no remote action. Browser evidence was run by the implementation owner; I independently inspected its source, results, failure history, candidate equivalence and custody, and personally ran only the small controller/render probes described above.
