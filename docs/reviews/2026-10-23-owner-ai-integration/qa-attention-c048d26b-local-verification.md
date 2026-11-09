# Independent local readiness correction QA — c048d26b

**QA recommendation: GO WITH CONDITIONS for the corrected local readiness invariant. NO-GO for overall integration until current cloud/review gates and the separate historical findings receive their required disposition.** This report does not self-close historical causality for QA-AT01 or QA-AT02.

Jose: I independently executed the persisted regression and the full real Next/owned PostgreSQL Attention matrix on clean `c048d26b5bee0ba888ce1c66f3af253524ada0b7`. The regression passes in Chromium and WebKit; **all 14 full-suite cells pass, with 142 check groups, zero runtime errors and zero axe violations**. These are my fresh executions, not transferred implementation-owner GREEN results.

## VERIFIED — corrected invariant and regression fidelity

The production delta from persisted RED 52e78722 contains only the confirmation component and a scoped preparing-state CSS rule. Actual per-instance subscription installs leave/visibility/focus listeners, checks hidden state before readiness notification, and exposes the form only when the external-store snapshot is ready. Server snapshot is false; blocked state wins over readiness. Generation retirement and existing command-result/retry handling remain. The actual browser driver, 15-second clearance wait and regression assertions were not changed by the application fix.

The persisted RED report was independently inspected and remains attributed to its executor: original CSR controls passed, both SSR controls failed `authority 1 !== 0` after measured 15-second early-clearance timeouts, while armed positive controls cleared. My earlier independent 32882297 mechanism RED is also preserved separately. No previous failure was relabeled a pass.

Fresh persisted GREEN shows both browsers render **zero authority fields and zero buttons in SSR**, with the preparing status. During held hydration, authority remains absent. Real listener registration occurs before the first form-attachment observation; one listener is active and the original intent is retained when ready. StrictMode actually replays registration/cleanup. Armed pagehide clears in 1 ms Chromium / 2 ms WebKit in this control. Rearming cannot revive a retired view; unmount removes listeners; legitimate remount restores a protected form without taking focus. Hidden-at-setup never attaches the form, and subsequent focus requests refresh without reviving that retired intent. Existing held-render/late-result fencing controls pass. Runtime-error arrays and external-request counts are empty/zero.

This verifies the narrow **exposed form implies armed lifecycle** correction in the controlled component. It does not retroactively observe a pre-hydration event, certify BFCache/native restoration, or establish secrecy of all serialized props.

## VERIFIED — actual Next/PostgreSQL behavior

The unchanged full Attention driver executed Chromium and WebKit at 320, 375, 390, 430, 768, 1024 and 1440. It retained real login, published schedule revision checks, delayed conflict, canonical acknowledgement, equivalent republish, lost-response/original-operation replay, pagehide/private-intent detachment, session revocation, empty state, keyboard/44px geometry and axe checks. Both 390 cells additionally passed real lock-timeout unavailable, exact-operation retry/one canonical result and private-source unavailability. WebKit 1024 passed the previously failing pagehide criterion and completed the downstream checks; 1440 also ran.

WebKit 390 records the first unavailable action's 200 response at 1,527 ms and requestfinished at 1,528 ms; retry completes at 158 ms. The actual unavailable alert, preserved operation and canonical count assertions provide semantic evidence. Chromium 390 records 200 followed by requestfailed events while its same semantic assertions pass; these events are preserved and are not described as complete-body success. They neither invalidate those executed assertions nor explain the original QA-AT01 timeout.

The preparing-state visual transition is being independently assessed by the UI reviewer. I inspected the actual WebKit 390 unavailable screenshot and provided all full-runtime artifacts to that reviewer; this report is not physical-device or screen-reader certification.

## VERIFIED — execution issue preserved and custody closed

The first full-suite invocation omitted the explicit pinned runtime path and stopped before scenario imports/Next creation because the default cache lacked axe-core. Its failed log, source manifest and owned PostgreSQL closure are preserved. I corrected only the invocation to select the already installed `tools/ci-browser-runtime/package.json`, then used a fresh evidence directory. No dependency install, source change, assertion retry or timeout increase was involved.

Final custody independently verifies all 5,215 candidate hashes and all 1,866 actual app-mirror files, including declared DB transport/generated type-reference substitutions. The checkout was clean at c048 at closure. Next/PG receipts are closed, all 13 recorded supervised process IDs are absent, ports 64981/64974 are closed, and the PG data directory is absent. Persisted controls report both browsers closed. Source freeze is released; the UI reviewer was notified that its separate leaf run may start.

## Remaining ISSUE / RISK / BLOCKER

- **VERIFIED locally:** the independently reproduced pre-armed SSR-form exposure invariant is corrected, with persisted RED→fresh independent GREEN and full actual application coverage.
- **OPEN QA-AT02 historical attribution:** original cloud listener installation timing is still not directly observed. This correction is justified by the independently reproduced mechanism; it is not evidence that the old cloud event definitely occurred before subscription. A required exact-candidate cloud pass and independent finding disposition remain outstanding.
- **OPEN QA-AT01:** the historical lock/unavailable alert timeout is not explained by this fix or by passing current 390 scenarios. Keep its evidence and disposition separate.
- **BLOCKER for overall integration:** current mandatory cloud/review gates and independent UI/security conclusions are not replaced by this local report. Hosted/production, native OS/physical-device and screen-reader acceptance remain outside scope.

[Manual QA matrix](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-c048d26b/owner-ai-c048-readiness-manual-qa.md) · [Machine matrix](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-c048d26b/manualQa.json) · [Independent regression](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-c048d26b/regression/attention-intent-readiness-custody.json) · [Full browser report](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-c048d26b/full-replay/browser-report.json) · [Custody audit](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-c048d26b/custody-close.json) · [Exact invocations](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-c048d26b/invocations.txt)
