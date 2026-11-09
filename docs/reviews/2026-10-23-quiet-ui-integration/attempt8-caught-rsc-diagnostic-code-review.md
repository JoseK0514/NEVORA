# Caught RSC diagnostic publication review

codeQualityStatus: BLOCK
recommendation: REQUEST_CHANGES
blockers: Bound the new calibration's pending operations and guarantee context cleanup after navigation rejection before publication.

## Scope
Read-only working-source review of scripts/rsc-caught-error-observer.mjs/.check.mjs, scripts/rsc-caught-error-diagnostic.mjs, integration in phase-d-browser-qa.mjs and phase-d-report-navigation.mjs, browser-response-deadline.check.mjs, package registration, and Clocker selector. No app/CSS change found. No tests/browser/network/external mutations performed. Parent's43 passing tests/lint and in-flight local calibration not independently verified.

## Findings
CRITICAL/HIGH: None.
MEDIUM M1 — new mandatory calibration can hang before producing actual scenario evidence, and navigation rejection can skip context cleanup. scripts/rsc-caught-error-diagnostic.mjs:44 awaits an incoming HTTP request with no deadline or linkage to reload rejection. Lines47-51 and60-63 await browser fetch/JSON work inside evaluate with no explicit deadline; page.setDefaultTimeout does not bound these evaluate promises. The five-second waitFor runs only after those operations finish. A reload failing before server ingress or a nonsettling fetch therefore prevents the calibration from reaching cleanup and can consume the entire Attendance job. Finally at70 awaits navigationResult before context.close; rejection skips context.close and can replace an earlier primary failure. Add a bounded cell/operation deadline, attach a rejection handler to reload immediately, and ensure context closure runs in nested finally regardless of navigation outcome. A timeout must remain fatal and must not be presented as a successful native mechanism observation. This is a diagnostic harness correctness issue, not an app finding.
LOW — caught metadata has page/stage and browser document timeOrigin but no fixed target-resource category or request identity. It can distinguish network wording from SyntaxError, but simultaneous fallback events still cannot be individually tied to RSC9/10. Do not infer exact association merely from arrival time. The actual browser timestamp and Node receipt timestamp are different clocks; timeOrigin identifies the document, not an automatic cross-clock causal mapping.

## Controls retained
Projection outputs only fixed names/message categories, stack-function booleans and similarly bounded cause fields. Arbitrary strings/stacks/causes never reach persisted metadata. Binding reprojects arbitrary caller input; application capture caps64 rows and counts omissions. Request failure strings map to fixed categories. Source console arguments, receiver, return and exception are forwarded unchanged by Reflect.apply; projection itself handles property-access exceptions and binding delivery errors are swallowed only for diagnostics. Existing application console fallback/pageerror/window fatal paths remain intact. No new error classifier or eligibility exemption.

Normal-success and malformed-JSON controls test a meaningful distinction: a handled processing error can produce the same fallback text with zero window events. The native calibration remains an HTTP approximation, not actual Next processing. Tests exercise privacy, throwing projection input, original console semantics, binding revalidation and request failure projection; they do not delete existing assertions or merely test removal. Existing fatal report.errors handling remains. Clocker getByLabel('Add device',{exact:true}) matches the unique primary aria-label and retains dialog/enrollment contracts as previously reviewed.

## Perspectives and limits
remove-ai-slops/programming perspectives applied from previously consulted skills: narrow diagnostic utility justified by actual evidence gap; no needless production extraction/normalization. Requested bounded-wait correction prevents evidence tooling from blocking the gate it observes. Actual cloud caught Next error is still needed before any classification decision. Prior artifacts preserved; no-ULW-plan fallback used.


## M1 closure addendum — bounded calibration

Updated codeQualityStatus: WATCH
Updated recommendation: APPROVE publication of diagnostic patch
Remaining blockers in patch: None. Actual application errors remain fatal and unclassified.

Re-inspected scripts/rsc-caught-error-diagnostic.mjs and added tests in rsc-caught-error-observer.check.mjs:37-44. One fixed performance.now()+5000 deadline now surrounds context setup, initial navigation, incoming request wait, handle/evaluate reads, observer waits and assertions. Reload rejection is handled immediately as false, which the successful path asserts against. Finally releases held HTTP response, closes context before awaiting navigationResult, and the outer finally closes server connections. This addresses the specific unbounded incoming/evaluate and navigation-rejection-skips-context issues reported as M1 above; original finding preserved.

The two regression cases call the actual exported verifier using fake contexts and deliberately nonsettling navigation/read promises, require deadline rejection, and assert context closure happened before return. They meaningfully exercise timeout cleanup through the exported path. Final coverage precision after re-inspection: navigation case stalls initial goto. The refined read case advances through listener registration and identity read, then stalls the third handle.evaluate, the actual fetch/response evaluation; it asserts reads===3. Fake context.close rejects the pending operation, and both cases await a subsequent event-loop turn and assert no late read result resolves. Reload-before-ingress rejection is not individually reproduced, but its incoming wait remains inside the same inspected deadline boundary. The race itself does not cancel underlying work; context closure terminates actual browser work, and the run remains rejected even if a late operation settles. Browser/context creation and teardown retain their existing browser-runtime dependencies; this is not a guarantee against a wholly wedged browser process.

No reviewer test execution. Parent's new GREEN/native run results remain separately owned execution evidence. Console/privacy/fatal controls unchanged, and the LOW request-attribution limitation remains. This closure approves publication for collecting actual Next evidence, not error classification or release acceptance.

Final test refinement inspected directly. Parent reports6/6 focused passes and4/4 local native calibration passes; reviewer did not independently execute them. Publication recommendation remains APPROVE, with actual Next classification still unapproved.
