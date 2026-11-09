# Independent UI remediation design review — confirmation readiness

**Design recommendation: GO WITH CONDITIONS for a narrow application readiness gate. Release/closure recommendation remains NO-GO.** I prefer the application invariant to a driver-only readiness workaround. This review neither attributes the historical cloud failure nor closes it or QA-AT01. No implementation or runtime execution was performed. Source remains clean at `328822972cc600b1b0af5759406fc3528561cb93`.

## Evidence assessed

I read the external SSR lifecycle harness and r3 report directly. It imports the actual confirmation component and real React server rendering/hydrateRoot, mocks only declared router/action boundaries, and holds actual scheduler delivery. It measures native pagehide registration/removal/invocation without inspecting callback source. StrictMode's install/remove/install is recorded. The component hash matches the source inspected in the previous independent review.

Both retained r3 engine results show an SSR authority field with no component listener; the early event invokes no component handler. After scheduler release, one listener is active and the original operation remains. The original clearance criterion times out at 15,004 ms / 15,002 ms. A second, armed event in that same document invokes the handler once and clears the form in 11 ms / 15 ms. Both reports record empty page runtime-error arrays, closed browsers and unchanged source. This is artifact-backed support for the controlled mechanism, not my independent replay or evidence that the historical cloud listener was unarmed. Earlier fixture failures remain retained; r3's explicit UTF-8 document/script encoding is a fixture correction, not a product remedy.

## Recommended observable invariant

The server render and first matching client render should show a neutral, noninteractive preparing status. The confirmation form—including its hidden command fields and submit control—should appear only after the current component lifetime's blur, pagehide, visibility and focus behavior has been installed. A retired/blocked state takes precedence over readiness.

This directly connects a visible product affordance to its actual behavior. The existing driver waits for `input[name="authority"]` to attach before dispatching pagehide. If that input is only rendered after subscription, the wait becomes meaningful without framework internals, callback inspection, a production test API, or a fixed delay. It also prevents a real user from activating an apparently ready confirmation before its lifecycle fences exist.

Readiness belongs to this confirmation's mounted lifetime, not to the whole app or a global “hydrated” flag. Initial readiness must be false on both SSR and initial hydration to avoid mismatches. All needed listeners should be installed before marking it ready. Keep hooks unconditional. A StrictMode setup/cleanup/setup or router-dependent effect replacement must leave the final lifetime correctly armed; it must not produce a permanently preparing view or revive a blocked form. Do not use setup as an excuse to clear existing result/retirement state, replace operation identity, or refresh automatically.

The existing generation fence, exact-operation retries, server authorization and canonical success refresh remain separate requirements. A readiness boolean is not a substitute for any of them. Moving the same listener to a layout effect while continuing to SSR the live form would leave the pre-hydration exposure; CSS hiding or a disabled button would also leave the authority field present and fail the proposed observable invariant.

## UX conditions

- Use a brief sentence such as **“Preparing confirmation…”**, styled as a quiet status in the current confirmation slot. It is preparation, not an in-flight command: do not say “Confirming…” or imply a confirmation was sent.
- Use a noninteractive status, with appropriate polite status semantics; no disabled fake button, automatic focus movement, assertive error, or artificial minimum display time. The weekly schedule remains readable while the action prepares.
- Keep the slot's geometry stable enough that the action's appearance does not move nearby controls under a pointer. Preserve the eventual 44 px target, current accessible name, and keyboard order. Verify narrow screens and large text rather than choosing a new rigid width that truncates the status.
- Do not make another spinner or timer mandatory. Existing quiet loading vocabulary in DESIGN.MD supports a small status caption; the existing component's scope does not justify a new page-level loading treatment.
- “Preparing” may last longer than expected if hydration fails or JavaScript is unavailable. Do not promise a measured short duration, manufacture a server-unavailable result, or add retry/refresh side effects without a supported failure signal. The proposed gate intentionally makes the JavaScript requirement explicit; this component's current submit handler is already client-side. Check the resulting slow/failed-hydration experience and existing application error handling.

## Why driver-only readiness is weaker here

A driver-only gate can be valid when testing an explicitly already-interactive lifecycle. However, the current product has no public observable signal tying form availability to listener registration. `networkidle`, DOM attachment, a generic history event, animation frames or an arbitrary delay do not create that guarantee. A test that inspects React internals or callback text would be brittle and outside the requested approach. Initiating a real confirmation merely to prove JavaScript responsiveness also changes the scenario and command state.

If a legitimate product readiness indicator already existed, waiting on it would be reasonable. Adding a hidden test-only readiness API would improve the test while leaving users exposed to the reproduced pre-ready form. The small application gate addresses that interaction gap and lets the driver keep its existing observable wait. It should be described as making action availability depend on lifecycle readiness, not as a proven correction for every cloud timeout.

## Important scope limits

**RISK:** the gate does not replay a pagehide that happened before any listener existed. In the controlled fixture, no private form would be exposed at that earlier moment; after hydration a newly ready form may appear. This satisfies the proposed pre-interaction invariant, but not a stronger requirement that every pre-hydration event permanently retires an intent. Do not silently redefine such a requirement.

**RISK:** if the document is already hidden when setup runs, subscription alone does not establish that it is appropriate to expose the form. Define and test that state explicitly. Prefer withholding/retiring the action until the existing canonical return/refresh behavior establishes an eligible view; do not equate a focus-state heuristic with authorization or add a broad new navigation system. Actual early hiding and BFCache restoration are distinct from the fixture's synthetic pagehide while the page stays visible.

**VERIFIED scope limit:** removing a form from SSR markup does not remove `intent` from server-to-client serialized props/RSC, remove private schedule content, or replace server-side authorization. No claim of eliminating all private information before hydration is supported.

## Acceptance evidence needed after implementation

1. Independently replay the unchanged red mechanism against the unchanged source and preserve its result. On a fresh candidate, require zero SSR/pre-subscription authority fields and zero usable confirm control; after subscription require the original operation and a single active lifecycle listener. The fixture's green branch must establish listener-before-form ordering, not merely observe both eventually.
2. In the same hydrated document, require the armed pagehide handler to run and the authority to detach within the unchanged 15-second criterion. Preserve the pending-command/late-response control, blocked state, conflict, unavailable retry, response-loss retry and committed canonical refresh.
3. Exercise StrictMode replay, actual unmount/remount and relevant router/effect replacement. Show that re-arming neither leaves preparation stuck nor revives a retired generation. Confirm no hydration warnings/errors or unexpected requests.
4. Observe the preparing-to-ready UI on desktop and mobile, including keyboard focus, 44 px action size, text scaling, stable layout and slow hydration. Verify no autofocus, premature success, accidental command or new infinite retry loop.
5. Run the real exact-source Attention matrix and preserve the original cloud failures. Correlated cloud/application evidence is still needed to assign the original WebKit 1024 failure to this mechanism. The separate earlier WebKit 390 unavailable-alert cause remains unresolved even if both new checks pass.

The test harness currently reports “passed” through a broad branch when no early authority is present. Reviewers should also require the preparing semantics, listener-before-form ordering, hydration-error handling and actual app workflow evidence above; the branch alone is not complete UI acceptance.

## Artifacts and custody

Reviewed evidence: `engineering/attention-ssr-red-r3/ssr-lifecycle-report.json`; harness: `engineering/attention-ssr-lifecycle-control.mjs`. Source and evidence hashes: `ui-attention-readiness-design/custody.json`. No new runtime PASS is claimed, no source file changed, no runtime closure is pending from this reviewer.
