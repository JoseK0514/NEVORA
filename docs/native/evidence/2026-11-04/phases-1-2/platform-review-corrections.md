# Platform review correction pass

The single fresh platform review returned BLOCK. Its original report is preserved in native-platform-review.md. These are executor corrections with regression evidence, not a second reviewer approval.

| Finding | Correction | Evidence |
| --- | --- | --- |
| H1: Android fresh permission classified denied | Check requestable API33+ state before notification-manager disabled state; retain answered-denied state | Policy RED/GREEN; real API36 grant and deny instrumentation passed, original OS permission flags restored |
| H2: unsupported static AbortSignal APIs on iOS16 | Use AbortController and owned timer/listener cleanup | Runtime deadline/cancellation tests; full default suite; no static any/timeout in browser adapter |
| H3: detach tombstone revision discarded | Separate active generation from installation revision, persist new inactive receipt | Swift/JVM receipt regressions; browser off→on→off→on check |
| H4: committed response lost | Deliberate current-account reconciliation, captured server revision, fresh installation-key signature, atomic generation fence | PostgreSQL211 tests incl. commit-then-drop enrollment/rotation/detach; explicit UI recovery |
| H5: multiple Android consumers overwrite replies | Shared per-document dispatcher, bounded IDs, individual lifetime cleanup | Two runtime/controller regressions; two live real-component browser controls |
| M1: native IO seam not actual transport | Test real URLSession delegates via URLProtocol and HttpURLConnection via injected connection, fixed endpoints and owned deadlines | Swift5 transport cases and Java transport cases, cancellation/slow-close RED/GREEN |
| M2: unused document validator | Remove speculative file validator; test production-used exact-origin portal destination fallback | Actual route audit; Swift/JVM route tests; Owner export path and Employee/Owner document contexts corrected |

Native-only token rotation now survives page retirement with the same account/session/revision binding; stale callbacks compare against current active native receipt. Enrollment and user detach remain page-bound. Late rotation cannot clear a newer token or overwrite a tombstone. This costs up to two bounded eight-second native requests; server authorization and generation checks remain mandatory.

The low-priority compressed Java/Swift coordinator formatting remains deferred. Cost: slower manual reading; bounded interfaces, closed protocol and regression suites are retained. Physical-device, provider, hosted association, signing and accessibility acceptance are separate gates, not waived minor findings.

## Other rulings and costs

- Continue the approved direct WebView/WKWebView design at the preserved local checkpoint. Development changed only a separate Capacitor feasibility spike and supporting CI/docs/lint, not shared src/db/package/lock. Cost: explicit compatibility reconciliation remains required before integration.
- Use deliberate browser reauthentication for documents. Cost: another browser login and reselection of the document. No copied cookies, URL bearer credentials, generic native fetch or private temporary files.
- Recover lost registration replies only after explicit account review. Ordinary null enrollment semantics remain unchanged. Cost: one confirmation and a conflict if another revision wins.
- Native key material is nonexportable; iOS Release requires Secure Enclave, but physical hardware behavior is not demonstrated by a simulator build.
- The default-off native dispatch worker is distinct from existing Web Push and is not started against any provider/account here.

Phase1's intermittent missing Android accessibility nodes remain open. Passing repetitions alone cannot establish a correction. The separate legacy cold-start CLI crash is corrected by a fresh instrumentation assertion, not acceptance of nonzero CLI output.
