# R6 Attention document-title diagnosis

WATCH / REQUEST_CHANGES to the final route-readiness evidence. Keep the failed accessibility finding open pending replay.

MEDIUM — scripts/phase-e-attention-browser-scenarios.mjs:160 checks the exact destination/assignment controls but has no document-title observation. The outer scripts/phase-e-browser-qa.mjs:242 waits only for finite animations before running axe. In the R6 WebKit 1024 detail all ten scenario assertions, both Hours login proofs and the same-document layout return passed; runtimeErrors was empty. The captured axe report has one document-title violation targeting html. In the pinned axe rule the check returns the truthiness of sanitized document.title. This supports a missing/blank title at audit time. It does not show when the title disappeared or whether it ever recovered.

The Schedule route owns static title Schedule (src/app/app/schedule/page.tsx:81) and the app layout supplies the template %s · NEVORA (src/app/app/layout.tsx:81). Installed Next 16.4.2 app-router.js:141–152 renders head state with useDeferredValue while swapping from prefetched to final head. That provides a possible timing explanation, not proof of what happened in this instance. Both visited weeks have the same target title, so an immediately inherited exact title alone is insufficient evidence of completed navigation.

Use a passive, scoped evidence witness starting before the click. After the current body/URL/document checks, verify the exact Schedule · NEVORA title over consecutive animation frames under the same navigation deadline. Retain title observations at scan/timeout (empty / expected / other and timing suffice). Keep the original single full axe run and strict zero-violation assertion, without modifying title or suppressing the rule. The finite sample is a readiness indication; the actual scan remains the final check. A persistent blank, wrong title or subsequent regression during scan must still fail.

A real-browser controlled transition can begin with the matching source title, show the destination body with an empty title, then deliver the correct title. Assert the witness waits. Cover persistent empty/whitespace and wrong nonempty titles, and a deadline followed by late restoration. Confine fake title changes to the synthetic control page. If the real title never restores, preserve evidence for the owning UI team.

No critical, high or low findings. Programming and remove-ai-slops perspectives favor a real browser observation over a test of metadata constants. No source edits or browser execution. Source 70cc98f0, CI 43999229509, job 133758835350. Evidence in r6-ci-artifacts/attention/nevora-phase-e-browser-evidence/{axe-attention-webkit-1024.json,attention-webkit-1024-report.json,browser-failure-report.json}.

## Prepared C8 test review

WATCH / REQUEST_CHANGES. MEDIUM findings in scripts/attention-layout-return.mjs.

1. Lines 12 and 37 count every title element in the document, including accessible SVG title nodes. Count HTML title elements directly in head and keep exact document.title and document identity. Include an independently titled SVG in the positive fixture.
2. Line 39 records the final title sample but accepts a blank/wrong final observation when the prior two frames passed. Check the final observation before returning documentTitleReady.
3. Lines 67 and 85–88 use a held HTTP response to defer title recovery. This can block network idle, independently of the title gate. Use a fixture-only browser promise for deferred/late title, wait for the recorded network-idle stage while the title is blank, and explicitly release the title update before/after deadline. Keep the original held HTTP body control. For permanent wrong/blank cases require evidence that the network-idle stage was reached before the deadline.

The existing outer deadline bounds acceptance and the extra one-second failure diagnostic cannot restore it. The actual axe rule and strict runtime assertion are retained. No critical or high issues. No suite run in this review.

## Corrected title controls

CLEAR / APPROVE for the C8 commit and clean full-matrix replay. All three earlier findings are resolved. The helper counts only direct head titles, verifies the final recorded title state/count/document identity and preserves its common navigation deadline. The positive fixture has a separately titled SVG and explicitly serves UTF-8. Both deferred-title modes now use a fixture-local client promise. They require a blank title at network idle with ready destination content and an unsettled result before release. Permanent invalid titles also require evidence of the expected invalid state at network idle. The held HTTP response is reserved for testing body readiness. No remaining findings or blockers.

Static approval covers the two modified QA paths. The failed preliminary run is separate evidence; the final clean-source replay and full axe outcome were not verified by this review.
