# Device alerts verification

The focused device-alert checks pass against HTML SHA-256 `00bcc2615af63ad23d21109f3eca90ff24cfab8950a470bf4984ae9e6d00619c`; the complete HTTP response body matches the saved deliverable.

| Check | Result | Evidence |
|---|---|---|
| Chromium browser | 32/32 PASS | [Results](../../work/employee-mobile/evidence/device-alerts-pass/qa/chromium/results.json) |
| WebKit browser | 32/32 PASS | [Results](../../work/employee-mobile/evidence/device-alerts-pass/qa/webkit/results.json) |
| Firefox browser | 32/32 PASS | [Results](../../work/employee-mobile/evidence/device-alerts-pass/qa/firefox/results.json) |
| Pure model | 20/20 PASS; 98,304 source-oracle combinations | [Results](../../work/employee-mobile/evidence/device-alerts-pass/model-results.json) |
| HTTP integrity | 200 OK; saved/served hashes equal | [Response](../../work/employee-mobile/evidence/device-alerts-pass/qa/http-response.txt) |

The browser checks exercise feature/ownership refusal, explicit sample grant/block/cancel, permission-only enrollment, unsupported/install/revoked states, uncertain cleanup and retry, test allowlist/cooldown, signout, inbox/search preservation, native keyboard/focus, 320/390/430/884px, and 200% text in Light/Dark. Every context instruments native permission, notification, service-worker, push and storage APIs before bootstrap. No forbidden calls, runtime errors, external requests, private storage or cookies were observed. The anonymous ended-session marker is the sole storage exception.

The model checks execute the frozen source `deriveDeviceState` function directly after TypeScript stripping, alongside the prototype function. They cover role/actor/workspace/session/installation/owner boundaries, matching generations, stale callbacks, pending duplicate operations, capability rechecks, partial failures, cooldown at 299,999/300,000ms, signout clearing and actual session epoch gating.

Initial runs found a real permission-cancel focus defect. The implementation owner fixed it; the final three-engine runs verify exact Enable focus after Not now, Close and Escape. Original failed runs are preserved under `qa/*-initial-failures/`. Initial QA selector/theme errors were corrected; final theme captures assert the actual theme. Firefox's first run crossed a build change and is excluded from final evidence.

See the [manualQa matrix](../../work/employee-mobile/evidence/device-alerts-pass/device-alerts-manual-qa.md) and [machine-readable ledger](../../work/employee-mobile/evidence/device-alerts-pass/qa/manual-qa.json) for exact invocations, criteria and non-empty artifact references. The source model hash is `2e61efc341d70ef9b5059f856cce100f65cab2b2d6eed659d41f3c30f5799d99`; the frozen oracle hash is `1722643849dfd1148700a661b0e14b36b853338b9ad1be4ae3263112febf797a`.

This report covers the focused local prototype only. The coordinator owns the separate existing 279-group regression suite and build/type checks. No real permission, subscription, installation, push delivery, production data, deployment or Git state was changed by QA. No unresolved focused-suite failure or user action remains.
