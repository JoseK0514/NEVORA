# Independent revised Owner resource diagnostic — 8d4a3792

**QA recommendation: NO-GO. The one newly authorized diagnostic set completed and is CLOSED, but failed its final unexplained-error criterion. No runtime-error exclusion is approved.** The earlier failed probe remains intact. No Communications runtime was repeated.

Actual source stayed clean `8d4a3792aceb9cd56e7e33ce318f4d5e9a74f9bb`. The new external `diagnostics/owner-boundary-resources.mjs` changes only the diagnostic collector: known loopback path/method/fetch-profile identity, query/body/header-value-free error attribution, network/navigation/window events, and delayed final assertions so independent negatives execute even after a positive profile mismatch. It is not a changed product or relaxed acceptance test. Original15s control deadlines remain.

## VERIFIED observations from this execution

- Stationary actual authority-reader control returned ready without a native page error.
- Destination `/app/ai-manager` navigation was requested and held at1792791498311. In the original document, the actual authority GET at1188315 used credentials same-origin, cache no-store, redirect error, AbortSignal and x-nevora-company-access header equal to1. Its exact native access-control diagnostic appeared at1188316; the caught fetch rejected TypeError at1188317. A source coverage history/frame update at1188318 did not constitute the destination commit; actual destination commit was1188571.
- The additional native resource is now identified **in this new run**: `/__nextjs_original-stack-frames`, POST with default credentials/cache/redirect, no signal, followed by exact native diagnostic at1188331 and caught resource rejection at1188333. This is Next's development stack-frame request, not another authority read. Because the prior probe retained only a nonmatch boolean, this does not retroactively prove the prior second event's identity.
- Independent negative controls completed: one deliberate thrown error and one deliberate rejected promise produced both browser page-error events and the corresponding window-error/unhandled-rejection observations. Negative controls no longer disappear behind a positive-arm assertion.

## ISSUE — a real observed discriminator remains unexplained

The pending arm also emitted a **non-native TypeError** at1188320 (message SHA256 `d352597ffd8fa8169c56cc3e8a08c73f0354b4aea225a4d98b0cd54c1db07ee8`) and two window-error observations at1188319/1188321. These precede the stack-frame fetch. The final assertion correctly preserved/fails this unexplained event rather than classifying every error as native cancellation. `windowErrors:[]` at the report top is an unused legacy array, not a clean-window result; the actual `observations`/`pendingWindowEvents` contain the two events and govern this assessment.

The run therefore supplies exact-resource/native-navigation evidence and verified exception-observer negatives, **but does not support the proposed zero-window-exception condition**. Current instrumentation records safe type/hash rather than a non-native message/stack, so it cannot identify whether the TypeError originated in application code, Next development machinery or the additional collector. Fetch wrapping/Headers/profile observation is itself a possible perturbation and must not be silently exonerated. I do not claim a new production defect or an infrastructure cause from this partial localization.

One new set was executed and stopped as requested. No assertion was changed after seeing the result and no repeat was run. Before any further execution or classifier proposal, review the observer's failure semantics and retain safe source file/line plus a bounded sanitized non-native error classification independently of raw authority/data. A future comparison should avoid wrapping application fetch where Playwright observation suffices and must continue to fail every unexplained window/app exception. That is a recommendation, not another executed diagnostic or policy exception.

## VERIFIED closure and separate proposal

Runtime exited1 at its final unexplained-diagnostics assertion after collecting negatives. Both owned Next/PG receipts are closed, both ports refuse connections, recorded harness/Next PIDs are absent, and1866 source plus actual mirror hashes match (declared DB transport/generated-type substitutions included). Browser close was awaited; no separate native browser PID was recorded. Git HEAD/status remain clean8d. Source freeze is released; prior evidence is preserved.

The adjacent `communications-persistent-proposal/README.md` specifies the minimal safe Preview/result/DOM-instance instrumentation and corrected PendingLabel button proxy. `upload-evidence.proposed.patch` proposes only the two workflow upload pattern additions for existing failure/check JSON. These are external review artifacts, **not applied changes**. No broad Communications rerun occurred.

QA-DEV-COM01 remains an unexplained failed development criterion after one non-reproducing local run. QA-DEV-OWN01 retains the original failed error gate; the new native mechanism evidence does not authorize suppression in the presence of unexplained exceptions. Previous QA-AT01 risk and QA-AT02 scoped acceptance remain separate. Fresh reviewed correction/disposition and required development gates, six-max/Claude, hosted/new-spend/production constraints remain binding.
