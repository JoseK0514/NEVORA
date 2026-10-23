# Independent SSR lifecycle mechanism reproduction — 32882297

**QA recommendation: GO for a narrowly scoped readiness-invariant correction and verification; NO-GO for release or cloud finding closure at this stage.** The component's pre-armed SSR exposure is independently reproduced. The historical cloud listener timing is still unproved, and QA-AT01 is not linked to this cause.

I audited the external harness and implementation-owner clean r3 report, then executed **one fresh independent replay** on clean `328822972cc600b1b0af5759406fc3528561cb93`, tree `1297ccd9d6a9705dbfe2aba41ce887a881b64922`. Component SHA256 `a8f618b4a550860c2a0ff0401fc7f11500459708036ed0518f9918ab10126e69`; React 19.3.0 and pinned Playwright 1.62.1. The execution used actual Chromium and WebKit, actual component SSR/hydrateRoot/StrictMode, a controlled MessageChannel scheduler delay, and fictional router/action boundaries. No Next, PostgreSQL, live provider or real action execution occurred.

## VERIFIED — causal mechanism inside this control

Both browsers initially render one authority input with the same operation while active pagehide listeners are zero. Hydration is started with one actual React scheduler task held. The early pagehide invokes **zero** handlers. Releasing hydration produces StrictMode's two installs/one removal/one active listener, but the same intent remains in the DOM. Waiting with the original 15-second detachment helper times out. The same-document armed positive event invokes the actual callback once and clears the form quickly:

| Browser | Early clearance wait | Armed clearance | Runtime errors | Browser closed |
|---|---:|---:|---|---|
| Chromium |15,004ms, timeout |10ms |none |yes |
| WebKit |15,000ms, timeout |5ms |none |yes |

The process exits 1 and reports `unguarded-SSR-mechanism-reproduced`; this is intentional RED evidence, not a release pass. The positive event is explicitly a second, separate control after recording the full failure; it does not rescue or erase the failed early event.

The listener observer preserves native add/remove registration, callback arguments and `this`. This leaf fixture has only the component's pagehide listener. The scheduler intervention is explicit and permits a deterministic listener-unarmed interval; its timing is not represented as a measurement of normal cloud hydration. UTF-8 HTTP headers/meta and unfiltered pageerror assertions were inspected. This run has empty runtime-error arrays and passes the zero-external-request assertion. Earlier implementation-owner r1/r2 encoding-confounded runs remain preserved and were not used as clean reproduction evidence.

## ISSUE — readiness invariant versus driver readiness

There is a concrete component-level mismatch: **a private confirmation form can be exposed before the lifecycle effect that retires it exists**. That is more specific than “React is slow,” and it is now evidenced independently of the original cloud report. Merely making the driver wait for a generic history event or longer interval would not correct that exposure invariant.

The proposed invariant—expose the confirmation form only after its real lifecycle listeners are armed—is a justified narrow correction target. It could also give the existing authority-attached precondition a meaningful relationship to readiness. The correction must establish the invariant in the component, not set an unrelated QA-ready flag or suppress the clearance assertion. Informational schedule content can retain its loading/readiness treatment; no assertion should be weakened.

The invariant is **narrower than remembering every event before hydration**. With no listener present, an early pagehide cannot be retrospectively observed by this component. A fix that initially withholds the form and later arms/exposes it would satisfy “exposed implies armed,” but would not by itself prove that a pre-hydration real navigation invalidates all future intent or that browser restoration performs a fresh authority read. Do not claim those stronger privacy or native-navigation guarantees from this control. Authority also remains a server-validated capability; DOM readiness gating is not a claim about secrecy of all serialized props.

Minimum correction acceptance should prove: SSR/initial hydration do not expose the private form or actionable confirmation while unarmed; listeners are installed before the ready form commit; StrictMode setup/cleanup and actual remounts cannot leave an exposed unprotected form; armed pagehide still clears within the unchanged 15 seconds and fences late results; ordinary confirmation, exact-operation retry, conflicts and session revocation retain their behavior. Readiness must not permanently hide the form after legitimate setup, change operation identity merely to make the test pass, or replace real authorization checks.

## RISK — historical and application limits

This control causally proves the unarmed mechanism **in the controlled actual-component setup**. It does not prove the original cloud WebKit 1024 event happened before listener installation; the retained cloud trace has no effect marker. A targeted real Next observation/regression remains needed to connect that sequence or establish an independently justified invariant correction, followed by full 14-cell Attention and required cloud verification. No product fix has yet been independently reviewed or rerun here. QA-AT02 is not closed by RED mechanism evidence.

The distinct QA-AT01 lock/unavailable timeout has no demonstrated connection to this pre-armed pagehide mechanism. Its later successful 390 cases and this SSR control do not explain its historical missing alert. Its evidence and disposition remain separate.

## VERIFIED — custody closed

All 5,214 tracked source hashes remain unchanged, the checkout is clean and the external harness hash is unchanged. Both browser-close receipts are true. I independently observed the harness and five descendants during execution and verified all six PIDs absent afterward; the loopback server port 64546 is closed. The recorded descendant sample was taken during Chromium; WebKit closure is supported by the harness's awaited close/isConnected receipt, not a separate WebKit PID inventory. No database runtime existed. Source freeze may release.

Evidence: [manual QA matrix](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-ssr-red/owner-ai-attention-ssr-manual-qa.md), [machine matrix](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-ssr-red/manualQa.json), [independent raw report](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-ssr-red/ssr-lifecycle-report.json), [transcript](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-ssr-red/run.log), [executed harness snapshot](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-ssr-red/executed-harness.mjs), [custody closure](/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/qa/attention-ssr-red/custody-close.json).
