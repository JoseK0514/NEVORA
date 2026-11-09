# Independent Employee mobile creation QA review

**QA recommendation: GO for the bounded local QA acceptance gate.** No open QA blocker for this batch. This is not a production, hosted, physical-device or assistive-technology certification.

Candidate: `351e33a1a7ecb04dfb6de01a9674953ea7eff903`

Branch: `codex/employee-mobile-creation-20261027`

Base: `f3a72860`

Scope: Employee/Lead mobile swap creation, own cover offers and Unable-to-work submission; regression of existing response, own-detail and eligible-pickup flows. QA changed only this report and its external evidence files. Findings and closure remain independently owned.

## Independently executed evidence

- **214/214 unit/render tests passed**, 28 files, zero skipped, on the final candidate. Serial file scheduling; existing assertions and default timeouts unchanged. Exact invocation and log: [unit invocation](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-creation/independent-qa/unit-accepted-invocation.json), [unit log](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-creation/independent-qa/unit-accepted.log).
- **48/48 integration tests passed**, seven files, zero skipped, 212.49 seconds. Actual owned loopback Next, real login/session/server actions and disposable PostgreSQL. This comprises 45 SQL tests and three browser orchestration cases, each running Chromium, WebKit and Firefox. [Invocation](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-creation/independent-qa/replay-invocation.json), [raw log](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-creation/independent-qa/replay.log), [exit/candidate record](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-creation/independent-qa/replay-exit.json).
- Browser artifacts contain **102 named checks**, **318 nonempty captures**, and **108 measured primary-control contrast samples**, minimum **6.089:1**. New creation forms alone: 40 named checks, 192 captures and 54 contrast samples. All three forms ran Light/Dark at 320, 390 and 430 CSS pixels; 200% root text, navigation clearance, native keyboard focus, direct/intercepted routes and desktop preservation. Twelve final-candidate screenshots were personally inspected; I do not claim visual inspection of all 318. [Audit](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-creation/independent-qa/results-audit.json), [visual observations](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-creation/independent-qa/visual-observations.json).
- **Custody verified independently:** all 1,943 application inputs in each of three runtime manifests match current frozen source; mirrors match their expected originals and independently reconstructed approved DB/type-reference derivations. Seven runner/config/helper files match committed candidate bytes. All three runtimes closed and verified source/mirror, their owned `.next` and `node_modules` directories are absent, and the disposable cluster stopped. Zero custody errors. [Custody](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-creation/independent-qa/custody.json).

## Verified behavior

Actual cases covered own Employee and Lead authority; module-off/foreign/arbitrary-selector refusal; location revocation during reads; current authority loss; minimal peer facts; stale source and target terms; explicit rereview; invalid Other details with no persisted report; rapid duplicate swap submission; partial candidate lookup distinguished from empty; separately checked cover fallback; private UI release with retained mounted draft; original-operation recovery after a committed report response is lost; one canonical report and receipt; exact own result destinations; no premature assignment/release claim. Prior acceptance, decline, cancellation, withdrawal, manual/automatic review, immutable history, pickup recovery and transaction regressions passed at this same candidate.

The full [manualQa matrix](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-creation/independent-qa/employee-mobile-creation-manual-qa.md) records exact surfaces/invocations, criterion mappings, adversarial cases and nonempty artifacts. [Machine-readable matrix](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-creation/independent-qa/manualQa.json).

## Findings and retained history

- **VERIFIED — keyboard diagnostic resolved for this local gate.** The earlier root full run at `8125d881` was **47 pass / 1 fail**, not a passing matrix. I personally inspected the preserved failure and diagnostic. The failing Tab assertion treated genuine browser-chrome departure (`document.hasFocus=false`, active BODY) as interactive background escape. Final independent traces show strict native-task containment while the document is focused; Chromium/WebKit chrome departure releases private facts; actual pointer return fetches fresh authority and subsequent native Tab is contained. Firefox's eight steps stayed in-document. Escape and explicit My schedule dismissal restore the exact originating shift. No privacy pause or dialog control was weakened. Original failed artifacts remain linked in the matrix.
- **VERIFIED — final serial unit execution closes the runnable unit gate, with timing history retained.** My earlier concurrent run at `2db6f316` passed 214 tests and timed out one existing Home controller test at five seconds. The final complete serial run passed all 214 remaining tests with the same assertions/timeouts. The removed test was an already-passing exact-copy sentence assertion requested by code review; it was unrelated to the timeout. Concurrent timing variance is observed; its cause is not proven. No failing assertion was removed or suppressed.
- **VERIFIED — diagnostics audited, not described as empty.** Ten intentional transport-loss/401 console errors and nine WebKit development CSS-preload warnings are retained. No unexpected console error, pageerror or hydration diagnostic was observed. Each Next log has the root-lock discovery warning, also retained. Creation/response request logs include lifecycle/navigation cancellations and deliberate aborts. The inherited pickup runner has no `requestfailed` capture, so this review does not claim zero failed pickup requests. [Diagnostic review](/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-creation/independent-qa/diagnostics-review.json).
- **Independent UI/code findings:** their authors own their findings and closure. This QA report does not self-close their reviews. The final unit suite exercises the single empty-state explanation; actual blur/recovery and privacy scenarios remain covered.

## Remaining conditions outside this batch

- Physical-device/browser and OS text scaling/backgrounding, VoiceOver/TalkBack, and hosted/CI environment checks remain separate acceptance gates. This local browser run is not a load, soak or production-performance test.
- Development source-inventory reconciliation and integration are still required before assembly. No push, merge, deployment or production authorization was performed or inferred.
- Remaining Phase 2 work and Phase 3 are not certified or advanced by this bounded creation review.

No policy exception or production-risk acceptance is requested. Preserve this exact candidate/evidence relationship; application changes reopen affected verification.
