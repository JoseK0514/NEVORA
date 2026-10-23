# Independent bounded QA transfer — cb115c2a

**QA recommendation: GO WITH CONDITIONS for functional evidence transfer from c048d26b to cb115c2a.** I find no concrete functional concern requiring another full 14 local run solely for this visual delta. Current visual/accessibility acceptance, normal validation and mandatory fresh full cloud verification remain required. This is not overall integration approval.

Reviewed clean candidate `cb115c2a1b07f92d918c7323894a4b3e0b0c623c`, tree `f12fac1cf9fd1811d4d43d3dc1dd0c9c0c0aa156`. This was read-only: no runtime, tests, source/HEAD/index edits or interference with the UI reviewer.

## VERIFIED — complete bounded delta

I compared every entry in the prior 5,215-source manifest and 1,866-runtime-source manifest against current bytes. Exactly four paths differ: the canceled-to-empty SSR composition test, global preparing CSS, schedule review-row CSS, and the confirmation component's outer class. The other 5,211 full-source entries and 1,862 runtime entries match. All 1,106 checked service/API/migration/script paths are unchanged. All 16 hashed references from the previous independent QA matrix remain nonempty and match.

The component is **byte-identical to c048 after normalizing only `<div className="employee-weekly-confirmation">` back to `<div>`**. Subscription readiness, serverSnapshotfalse, hidden-at-setup retirement, blocked precedence, generation fencing, actions, original-operation identity and retry logic are therefore unchanged. SQL, server contracts, runtime driver, persisted CSR/SSR controls and 15-second assertions are unchanged.

CSS adds max-width containment to preparing, lets the review row wrap, constrains the action slot, and gives the shared outer confirmation wrapper a consistent minimum slot height/alignment. Those changes can affect layout, focus geometry, clickability and accessibility presentation; they do not by inspection change the lifecycle or command protocol.

## VERIFIED — SSR assertion correction is justified

I read the raw c048 default-suite failure: one failed test expected `Confirm schedule` in `renderToStaticMarkup`, while 9,486 passed and 801 existing skips remained. That old expectation conflicts with the independently verified intentional SSR contract: no private command form before listeners are ready.

The new canceled-to-empty test preserves published-empty review context (`Off`, `Confirm this week`, `No assignments remain`), **requires the preparing status**, forbids authority and operation fields, and retains the no-false-success assertion. This is a meaningful contract update, not removal of the readiness criterion to hide a failure. It remains an SSR composition test; it does not replace the existing real hydration/interaction tests. I did not independently run the reported focused two tests or parent validation, so their execution outcomes are not claimed here.

## Accepted transfer and explicit exclusions

The c048 persisted CSR/SSR observations transfer for functional purposes: absent SSR private controls, actual listener-before-form readiness, StrictMode setup/cleanup, rearm/remount, hidden-at-setup, retired-intent nonrevival and late-result fencing. The functional workflow facts from the independently executed real Next/owned PG 14-cell run also transfer: canonical revision conflict/confirmation, original-operation replay, private-intent detachment, session revocation, lock-unavailable retry and blocked-source clearing. Underlying behavior and its selectors/driver are unchanged.

**The runtime evidence is still from c048; none is relabeled as a cb115 rerun.** In particular, previous screenshot appearance, text wrapping, layout shift, 44px geometry, focus placement and axe results do not establish current-head visual/accessibility acceptance. The independent UI replay owns that verification. If it finds an interaction issue, the affected scenario warrants a targeted recheck; otherwise a repeat full 14 local run would not add a new functional discriminator here.

## Remaining gates and findings

- Current UI acceptance must cover the corrected preparing/ready layout, mobile/text scaling, focus and clipping. No UI result is inferred from CSS review.
- Parent default/type/lint validation and mandatory full cloud gates must pass on the corrected candidate. Prior c048 default failure and current validation are not silently treated as green.
- QA-AT02's narrow readiness invariant has independently verified local correction, but historical cloud effect timing is not retrospectively proven and its required cloud/finding disposition is unchanged.
- QA-AT01's historical unavailable timeout remains separate and unexplained; a CSS transfer or passing later 390 cases cannot close it.
- Hosted/production, physical-device/native OS and screen-reader acceptance remain outside this transferred local evidence.

[Transfer audit](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-cb115c2a-transfer/transfer-audit.json) · [Exact diff](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-cb115c2a-transfer/candidate.diff) · [Matrix](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-cb115c2a-transfer/owner-ai-cb115-transfer-manual-qa.md) · [Prior independent execution report](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/reviews/qa-attention-c048d26b-local-verification.md)
