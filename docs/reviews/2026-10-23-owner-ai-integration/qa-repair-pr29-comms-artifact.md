# Independent QA — PR29 Comms artifact; separate validation blocker

**Current Comms execution: VERIFIED PASS. Overall QA recommendation: NO-GO because current mandatory validation failed.**

Read-only assessment of run40031137572, candidateab89a11f, merge211d6bc83fde838dc5f0b087e75de4a877561bcd/treefedd245bd2ecc389918d37d81d54531b827f52ea. No new runtime, source edit, HEAD move or remote polling.

## VERIFIED — current Comms

- Raw browser-report contains exactly14 passing executions: Chromium/WebKit at320,375,390,430,768,1024,1440. Total156 checks; errors=[]; every selected axe list empty. All14 per-cell check files retain successful U08 employee standalone publication/explicit Mark read and U09 actual account-cookie replacement refusal. Manager errors are empty.
- Full5251-source manifest and1867 runtime-source hashes match clean local candidate bytes. All six suite-verification receipt hashes match downloaded files.92 extracted files individually hashed in independent audit. Exact original Preview→Publish source line/15s assertion remains the previously reviewed unchanged implementation; post14b documents did not alter it.
- All14 new preview reports show status200, completed ready preview body, visible preview candidate, one observed nonzero form identity(1), zero omitted/window-omitted events, zero pending bodies, and no body-unavailable/capacity/pending diagnostic events. Safe body observations occur94–632ms after request; first preview DOM observations106–631ms after request. These are observer timings, not server latency or React commit timestamps.
- Previously failed WebKit320 now records preview request2189ms, response2281, requestfinish2285, visible preview DOM2407, safe ready/bodyFinished observation2417. It retains form1 across preview. U08 and subsequent U09 pass under the original actions/assertions. At final collection route is other, form0 and exact Publish locator count0: this is after successful publication/replacement, not missing Publish at the attempted action. Continuous candidate observations and original successful click provide the action evidence.
- PG and Next ownership receipts are both closed; report ownership IDs and suite/checkpoint agree. Suite verification reports sourceUnchanged/localMirrorVerified. Remote receipt statements are not independent local live PID/port observations; actual mirror bytes are absent. No service archive digest was independently acquired by this review.

## QA-COM01 disposition

Current exact-source mandatory Comms execution blocker is satisfied. Retain original QA-COM01 as an **unresolved intermittent RISK**, not FIXED or causally closed. The earlier cloud lacked the necessary failure-state discriminator; the earlier independent broad diagnostic was a nonreproduction. This current14-cell run supplies meaningful safe ready/body/DOM evidence and succeeds without action retry, forced focus or widened deadline; it does not prove whether the original failure arose from lifecycle retirement, transport, application state or another cause. No Comms application correction occurred.

A future overall development recommendation may carry this explicit risk after all other mandatory gates pass and source/custody audits complete. It need not demand impossible historical facts or repeat the passing matrix blindly. Keep the new evidence and strict original assertion; recurrence becomes a blocking finding. This is QA advice, not approval of a policy exception. Prior OWN01/AT01 risks and AT02 scoped acceptance remain unchanged.

## BLOCKER — current validation failure remains separate

Independently read `ci-repair-pr29-validate-failure.log`: default suite9496 passed/801 skipped/1 failed. `src/test/phase-e-runner.test.ts:76` expected child status23, received1; named case duration232ms. The two process suites did pass natively in this cloud job (13+10 tests). Those passes do not cover away the failing runner contract. Build source upload was absent after validation stopped; do not treat that downstream missing artifact as a second application defect or claim full build acceptance.

Source inspection confirms the fictional child exits23 immediately, and the initial supervisor spawn callback requires a live root identity before pinning it. Missing/failed identity maps to failure1. This makes an early-root-exit observation race a concrete hypothesis, but the retained cloud assertion omits child stderr/reason/ownership/cleanup data, so the historical cause is not established from232ms or source inspection.

Recommended discriminating control: deterministically arrange child termination before the first root-identity observation while retaining creation-handle exit status; assert exact23 propagation, zero unauthorized resource registration/signal authority, and completed invocation-owned cleanup. Pair with positive live-root and observation-error/ownership-loss negatives so absence of an already-exited root is not confused with an unverifiable live process. Retain safe supervisor reason/status and cleanup receipts even when the first assertion fails. Preserve existing assertions and deadlines. Parent owns reproduction/fix; no reproduction or closure is claimed in this audit.

A reviewed correction, independent bounded regression evidence and fresh all12 mandatory exact-source validation remain required. Current browser successes do not permit merge/release acceptance of this failed workflow. Hosted/live-provider/production and physical-device acceptance remain separate.

Evidence: `qa/repair-pr29-comms-audit/audit.json` and manualQa matrix; downloaded artifact under `cloud-repair-pr29/phase-e-browser-211d6bc83fde838dc5f0b087e75de4a877561bcd-communications/`; retained validation log above. Original reports and failures unchanged.
