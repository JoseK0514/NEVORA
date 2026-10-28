# Independent Alerts lifecycle probe

Author: alerts_qa_acceptance. Read-only application review. Candidate ebec721a3d6cfd842a5037fc4598b77e2454d9e8, baseline059f4ac2. Exact hashes in frozen-source-identity.json. No browser, SQL, native permission, subscription provider, or real notification was invoked by these probes.

## VERIFIED — QA-OWN-1 / QA-OWN-2

The actual public/fuel-portal-sw.js runs in a Node VM. Native IDB, PushManager, and browser message boundaries are fictional. A rejected native unsubscribe settles and clears the opaque OPERATION_KEY, but a successfully persisted worker suppression remains. After both controller and worker replacement, passive SET_OWNER is rejected by the worker and the controller remains error. Separately, an unsettled operation tombstone prevents any SET_OWNER admission and is not cleared. This correctly rules out the broad claim that every document replacement restores ownership after an unknown turn-off.

## RISK — QA-OWN-3 retained failure, reproduced

Sequence: start enabled; make the worker IDB suppression write fail; explicit turn-off receives503 and native unsubscribe rejects; wait for that actual native operation to settle; dispose the old controller; restore IDB and replace the worker and controller; passive status still reports the original server generation. The worker has no durable suppression for that generation and its in-memory storage-failure latch has been lost; the replacement controller returns enabled and worker state returns active for the original generation without a fresh opt-in.

This reproduces identically on the extracted pre-Alerts059f4ac2 device controller and the frozen Alerts candidate. public/fuel-portal-sw.js and device-state.ts have identical baseline and candidate contents. This is a retained engine resilience gap, not an introduced Alerts regression. A production/release safety claim must not omit it. Bounded Alerts continuation may retain it explicitly as an open risk; no policy exception or risk acceptance is inferred from a local passing test.

The third probe asserts the observed unsafe result to establish a stable reproduction. Its green Vitest result is NOT a safety PASS. The manual adversarial verdict is FAIL / retained issue. Candidate- and baseline-QA-OWN-3.json contain the exact messages and resulting ownership state.

## Exact invocations

Working directory: /Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume

- NEVORA_QA_PROBE_LABEL=candidate /usr/local/bin/node node_modules/vitest/vitest.mjs run --config ../../outputs/employee-mobile-device-alerts/reviews/qa/candidate-probe.config.mts
- NEVORA_QA_PROBE_LABEL=baseline /usr/local/bin/node node_modules/vitest/vitest.mjs run --config ../../outputs/employee-mobile-device-alerts/reviews/qa/baseline-probe.config.mts

Both actual runs:3 tests passed. State artifacts for all six candidate/baseline scenarios are nonempty and were read after execution. Initial probe omitted waiting for the independent native operation after immediate server503; that fixture synchronization error is preserved in candidate-ownership-probe-initial-fixture-await.log and corrected in the final authored probe. No product edit or weakened application assertion was made.

## Other owned verification

frozen-focused-units.log:169 tests /8 files pass on the frozen source, covering controller/worker/protocol/server route and mobile/desktop component contracts. These are unit contracts, not browser or HTTP-server certification. Full owned combined browser/SQL gate awaits the runtime release from the parent; no acceptance verdict is recorded before that gate.

## Final application source recheck —72b1c192

Actual final external probes:4/4 pass,exit0; `final-probes.log`. Durable suppression and opaque-operation boundaries still pass. `final-candidate-QA-OWN-3.json` reproduces unsafe retained compound outcome: original generation enabled after failed suppression storage, native unsubscribe rejection, server503 and storage/controller/worker replacement. No new opt-in. QA-OWN-3 remains OPEN / retained baseline risk. A green reproduction test is not a safety pass or release acceptance.
