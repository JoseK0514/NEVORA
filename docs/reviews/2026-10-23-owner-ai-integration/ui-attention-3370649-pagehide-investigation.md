# Independent UI causality review — WebKit 1024 pagehide failure

**UI recommendation: NO-GO for closing this failure.** A pagehide event occurring before the confirmation component's passive effect registers its listener is a source-supported hypothesis. It is not yet a demonstrated cause of workflow 40005779835. No new runtime, source edit, or HEAD movement was performed. Clean checkout remains `328822972cc600b1b0af5759406fc3528561cb93`.

This is distinct from the prior WebKit 390 unavailable-alert failure (QA-AT01). The new cloud WebKit 390 report records the lock-timeout/retry check completing, but that green execution does not identify or fix the earlier failure.

## Verified evidence

I read raw `attention-webkit-1024-report.json`, `browser-failure-report.json`, the readiness-control custody report, the WebKit 390 report, and relevant installed framework/component source.

The failing 1024 cell records six prior checks, then fails at `leave-and-revoke`. The original 15-second detach wait resolved a hidden authority input 33 times. No runtime error is recorded. The relevant timeline (Node-side observation milliseconds) is:

| ms | retained event |
|---:|---|
| 27195 | new schedule document request, sequence 5 |
| 27507 / 27512 | prior document pagehide / hidden visibility |
| 27537 | frame navigation/history event |
| 28535 | DOMContentLoaded |
| 28733 / 28740 | load / pageshow |
| 29296 | synthetic pagehide; document still visible and focused |
| 29466 | subsequent frame navigation/history event |

The failure proves the original DOM criterion was not met, not whether the listener was absent, its state update was delayed, or another render replaced the retired form. There is no direct listener-registration/invocation, component-generation or original-intent-identity trace for this failure.

The current component hash is `a8f618b4a550860c2a0ff0401fc7f11500459708036ed0518f9918ab10126e69`, matching the cloud readiness-control artifact. That control reports both engines passed and closed. It is narrower than the newly suspected mechanism: it uses `createRoot` into an empty root, waits for form rendering, submits a command, and only then holds React scheduler delivery and fires pagehide. It proves its recorded already-active lifecycle handler can fence a late result and remove the form after rendering resumes. It cannot prove behavior when a form exists from SSR before hydration or listener setup.

## Source analysis

**VERIFIED:** `employee-weekly-confirmation.tsx:16–23` registers native `blur`/`pagehide`/visibility listeners inside `useEffect`. Its `clear` handler increments the generation and sets blocked state; blocked state removes the form. Setup does not replay an earlier pagehide or check whether such an event already occurred. An event fired before registration is therefore not caught by this listener. The scenario's synthetic event does not actually hide or unload the page; later setup has no persistent hidden visibility state from which to infer it.

**VERIFIED:** scenario `phase-e-attention-browser-scenarios.mjs:43,85` navigates, waits for `networkidle`, confirms authority input attachment, dispatches pagehide, and then waits for detachment. SSR input attachment and network quiet do not establish passive-effect installation. The wait-after-event fixes a delayed DOM commit only if a handler actually received the event. It cannot repair an event missed before subscription. Calling the present failure merely a too-early DOM snapshot would be inaccurate: it is a full 15-second wait.

**VERIFIED:** installed Next `app-index.js:289–294` starts `hydrateRoot` within `React.startTransition`. `HistoryUpdater` in `app-router.js:73–116` uses `useInsertionEffect` and normally performs initial `history.replaceState`; it also has an explicit missed-traversal branch that skips that write. `HistoryUpdater` is a sibling before page content (`app-router.js:434–456`). Installed React executes insertion effects in its mutation phase and passive effects separately (`react-dom-client.development.js:15820–15828`, `19551–19561`, `20062`). A positively attributed initial history write would be evidence of that commit boundary; it would still not prove every child passive effect is armed, especially across deferred hydration boundaries. It is not an adequate standalone readiness marker.

**RISK / evidence limit:** the 29466 event is named `document-history-or-commit` by a generic Playwright `framenavigated` listener, not by `HistoryUpdater`. The diagnostic's `same-url` branch leaves `pending=null`; `sourceHistoryEvents:0` in this branch cannot identify an initial hydration history write or count all same-document commits. Both browser-binding lifecycle events and frame events receive Node-side timestamps, not a shared in-page event clock. Their observed 170 ms ordering is suggestive but cannot establish the component had not committed before pagehide. Do not promote “FIRST same-document history commit” to a measured React milestone without instrumentation.

**VERIFIED:** the confirmation listener is a native listener, not a React JSX event handler. Installed React's discrete replay list (`react-dom-client.development.js:31012`) excludes pagehide. Neither the component nor the inspected React event machinery supplies an earlier synthetic-pagehide replay for this listener. A green ordinary hydration run cannot rule out the hypothesized subscription gap.

## Controlled reproduction design — not executed

Use a new external evidence folder and the exact unchanged confirmation component, real React/ReactDOM and fictional stable router/action boundaries. Preserve component hashes; record recoverable hydration errors, page errors, external requests and runtime closure. Do not use production data, fake clocks, a replacement confirmation component, or direct state/generation changes.

1. **SSR, with hydration scheduling held.** Render the actual component to HTML with matching fictional props via server rendering, then hydrate that same HTML with `hydrateRoot`. Install the existing MessageChannel hold before loading the browser bundle, with hold initially enabled. Require proof of queued React tasks and zero component pagehide-listener registrations while the SSR form already contains exactly one fictional authority input. Require local bundle/network completion as well. If hydration executes synchronously or the listener is already armed, fail the control setup instead of claiming the desired precondition.
2. **Instrument native listener boundaries without changing behavior.** In this isolated fixture, transparently observe registration, removal and invocation of the component's native pagehide listener. Retain callback identity, options, receiver and removeEventListener semantics. Use in-page `performance.now()` for event dispatch, listener registration/invocation, hydration milestones and MutationObserver form-removal records. The independent event logger must be distinguishable from the component listener. Do not log the authority value.
3. **Dispatch before registration, then release.** With one SSR form and no registered component listener, fire the exact synthetic pagehide used by the scenario. Record that the logger received it but the component did not. Release actual scheduler tasks, wait for component listener registration and scheduler progress, and observe the original form after the original 15-second criterion. A form that persists here demonstrates the proposed missed-event mechanism in the actual component; it does not alone prove this cloud occurrence took that path.
4. **Positive armed-event control in the same hydrated document.** After measured registration, dispatch a second pagehide. Require actual component-listener invocation, blocked alert and authority detachment within 15 seconds. This discriminates absent subscription from a handler/rendering defect. Also retain the existing pending-command/late-response control: after an armed event, resolving a prior command must not refresh or restore private intent.
5. **Unheld hydration control and framework confirmation.** Run ordinary matching SSR/hydration with no hold; require zero hydration errors and normal armed behavior in Chromium and WebKit. A fixture uses mocked router/action boundaries and cannot attribute Next history events or reproduce cloud load conditions. For application attribution, add observation before scripts to distinguish document navigation, history writes, listener registration/invocation and component/intent replacement with one in-page clock; never use generic history events as proof the listener is armed. Reproduce the original failing path on the exact candidate with unchanged 15-second limits.

If the intended scenario is specifically “an already-interactive confirmation handles leaving,” wait for measured component readiness before its synthetic event and retain a separate adversarial pre-hydration test. Do not silently narrow a product requirement that expects privacy retirement during genuine early page hiding. Synthetic pagehide while remaining visible is not physical navigation/BFCache restoration; those require their own real lifecycle evidence before claiming privacy acceptance. No readiness gate or product change is prescribed as a verified fix by this report.

## Closure boundary

A controlled lost-before-subscription reproduction plus an armed positive control would establish a mechanism. Correlated application evidence is still needed to attribute this cloud failure. If an armed listener ran before the failed detach wait, investigate state commit or replacement intent instead; if it did not exist at dispatch, the hydration/readiness hypothesis gains direct support. Preserve both this failed cell and the earlier QA-AT01 artifacts. Neither finding is closed by this review or by an unrelated green cell.

Artifacts: `ui-attention-hydration-readonly/source-custody.json`, `cloud-timeline-extract.json`, and `pagehide-manual-qa.md`. Original cloud files remain unchanged under `cloud-attention-diagnostic/phase-e-browser-3370649db7e0d5f87f24a5d8cb4965dff7f03887-attention/nevora-phase-e-browser-evidence/`.
