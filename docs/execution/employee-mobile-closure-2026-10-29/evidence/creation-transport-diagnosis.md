# Read-only Creation transport diagnosis — agent report, October29

Author: `/root/creation_transport_diagnosis`, read-only explorer. Report received after completed8b verification. This transcription preserves its findings; no application acceptance is inferred.

The timestamped WebKit sequence relative to Cover POST browser start is: request+0ms; canonical receipt+196ms; driver Report hard navigation+252ms; exact Cover POST cancelled+273ms; native response closes without `writableFinished`+275ms; pageerror+321ms; engine teardown+6684ms. Pageerror precedes teardown by6363ms. Native ordinary POST200 logging is not a completed response.

Chromium: native response finished at1793296383343; browser `ERR_ABORTED` at1793296383344; Report navigation at1793296383359. Cancellation precedes navigation/teardown and follows server completion, with no matching application error. Firefox records normal requestfinish before receipt/navigation.

Smallest defensible remedy: install a listener before Cover click, capture the first exact action Request object, and await its first `requestfinished` or `requestfailed` terminal plus the independent canonical receipt before starting Report navigation. Keep the15s deadline, database assertions, caught-error and pageerror gates. A failed terminal means transport quiescence only; it never proves business success. Validate in the actual original configuration/concurrent environment. No app change or error exemption is justified.

Uncertainty: why Chromium labels the server-finished request aborted is not established. The sequence supports navigation-induced WebKit stream cancellation but not the exact internal React chunk or devtools failure mechanism.

Evidence: contract-final-8b75493e/device-alerts/creation/results.json lifecycle; owned-next-a6z74E/next.log lines44 and105; owned-creation-diagnostics.mjs complete is response.writableFinished; employee-mobile-creation.integration.ts receipt/hard navigation at84–86, strict error assertion at99. All paths relative to external evidence root or repository.

Earlier source investigation: action receipt follows action promise, not Flight EOF. actions.ts revalidates three paths. Installed Next server-action-reducer resolves root action before revalidation navigation; React RSC returns the root while its stream reader continues. No source-backed normal action-fetch AbortSignal was found. The earlier finished-only fence wrongly assumed browser requestfinished was mandatory; it timed out on Chromium, and teardown then cancelled the request. That failed result remains preserved.
