# Independent fresh cloud finding — QA-AT02

**QA recommendation: NO-GO. QA-AT02 is a separate open finding; QA-AT01 remains open and unexplained.** No runtime was started, source edited or HEAD moved in this assessment.

## VERIFIED — fresh failure

Workflow 40005779835's Attention artifact identifies testmerge `3370649db7e0d5f87f24a5d8cb4965dff7f03887`, tree `1297ccd9d6a9705dbfe2aba41ce887a881b64922`, equal to clean candidate `328822972cc600b1b0af5759406fc3528561cb93`. The failing cell is **WebKit 1024, leave-and-revoke**, candidate script 85:299. `waitForPrivateIntentClear` polls for detachment of `input[name="authority"]`; it times out at the original 15 seconds with 33 resolved hidden-input observations. This is a persistent missing clearance, not an immediate post-event count assertion.

Twelve cells passed (all seven Chromium and WebKit 320/375/390/430/768); WebKit 1024 failed and 1440 did not run. Six earlier checks in that cell completed, including response-loss recovery against one canonical operation. Runtime errors are empty. There is no failure-time screenshot or component-specific DOM/generation receipt for the pagehide stage. I inspected the latest 1024 unknown screenshot: it is the earlier response-loss state and must not substitute for the later failure view.

## VERIFIED timeline; RISK of overinterpreting it

| Sequence 5 event | Relative time |
|---|---:|
| Schedule document request |27,195ms|
| Document frame commit event |27,537ms|
| DOMContentLoaded |28,535ms|
| load / pageshow |28,733 /28,740ms|
| Synthetic pagehide after schedule/networkidle and authority-attached checks |29,296ms|
| Later frame/history event |29,466ms|

The ordering is consistent with the parent's hypothesis that SSR authority was present before the component's passive effect installed its pagehide listener. It is **not proof**. `document-history-or-commit` is emitted for generic main-frame `framenavigated`; the navigation helper deliberately leaves same-URL requests in a generic same-url phase. Neither event records confirmation hydration, effect setup or handler invocation. It also cannot exclude a listener that ran but whose result was superseded by a remount/new intent, or a missing React removal commit.

The component installs its listener in `useEffect`; its handler increments a generation and sets blocked state, causing form removal. The page keys it by operationId. Thus presence of SSR input or network quiescence does not itself prove listener readiness. Conversely, absent browser lifecycle errors does not prove that the effect was never armed. The observed failure is not yet classified as product, driver or infrastructure.

## VERIFIED — existing control's coverage limit

The actual-component readiness control passed in both browsers. It uses `createRoot`, fictional action/router boundaries, and a prior real client submission before holding React scheduler work and dispatching pagehide. It demonstrates delayed removal commit and late-result fencing after client readiness. It does **not** exercise a server-rendered authority input with hydration/effect installation still pending, nor the actual Next remount sequence. Reusing its pass as proof of this new case would exceed its scope.

## Concrete targeted reproduction recommendation

1. Add test-only observation for the **same confirmation instance and original intent**: effect/listener installed and removed, pagehide callback invoked, generation increment, result accepted/discarded, blocked-state commit and authority detachment. Use opaque instance ids/boolean intent equality and timestamps, not authority/session values. Take a bounded failure screenshot plus scoped DOM state before teardown. Preserve the 15-second clearance wait and original error.
2. Establish two controlled arms with actual component source: **event before listener armed** and **event after listener armed**. A server-rendered/hydrated setup or actual owned Next app is needed for the former; the existing client-only fixture is insufficient. Hold/release the specific hydration/effect boundary with a verified test-only mechanism, not a sleep, repeated event or arbitrary “two frames” assumption. Record the boundary directly.
3. In the before-armed arm, record whether the event is missed and whether later hydration restores/retains the same intent. In the armed arm, require handler invocation, generation retirement, real DOM detachment within 15 seconds and late-result fencing. Where possible reproduce the real Next scheduling sequence, keeping synthetic-control evidence distinct from real application acceptance.
4. Classify from the result. If the harness demonstrably dispatches its synthetic event before the intended client lifecycle exists, an explicit **verified readiness precondition** may be the smallest driver correction. Its signal must correspond to this component/effect; a generic history event, SSR input, enabled button or networkidle is insufficient. If the same listener is armed and invoked but authority persists or a retired intent returns, investigate the application generation/remount/render path. A real user/navigation event before hydration may have different requirements from a synthetic same-document test; do not silently declare it out of scope or claim a privacy fix based only on a harness adjustment.
5. Require a deterministic old-behavior regression, independently reproduced corrected behavior, full 14-cell Attention acceptance and the required cloud gate. No timeout increase, repeated pagehide, forced DOM removal, ignored errors or unconditional additional wait to obtain green. If the two arms do not reproduce/localize the failure, retain that limit and revise only from new evidence.

## VERIFIED custody and separate QA-AT01 status

All 5,214 full-source hashes and 1,866 app hashes match actual clean candidate bytes. Remote Next ownership reports closed/sourceVerified/mirrorVerified; remote PostgreSQL ownership reports closed. These are remote receipts, not live-process observations. There is no QA runtime to close.

Both 390 lock cases passed their actual unavailable/original-operation/canonical-retry assertions. WebKit 390 records 200 and requestfinished; Chromium 390 records 200 followed by requestfailed events for both actions despite the semantic assertions passing. This is another reason not to equate one HTTP event with an application result. Neither passing 390 case supplies the missing facts from the earlier QA-AT01 failure, which remains separately retained.

[Manual QA matrix](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/cloud-attention/owner-ai-at02-manual-qa.md) · [Machine matrix](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/cloud-attention/at02-manualQa.json) · [Source/timeline/custody audit](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/cloud-attention/at02-3370649d-evidence-audit.json) · [Raw failure](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/cloud-attention-diagnostic/phase-e-browser-3370649db7e0d5f87f24a5d8cb4965dff7f03887-attention/nevora-phase-e-browser-evidence/browser-failure-report.json) · [Raw failed cell](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/cloud-attention-diagnostic/phase-e-browser-3370649db7e0d5f87f24a5d8cb4965dff7f03887-attention/nevora-phase-e-browser-evidence/attention-webkit-1024-report.json)
