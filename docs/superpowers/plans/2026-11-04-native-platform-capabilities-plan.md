# Native platform capabilities — Phase 2

Approved scope: `../specs/2026-11-01-native-employee-owner-design.md`; Jose's November 4 instruction to finish Phases 1–2. Continue inline with tests before behavior; one fresh whole-change review. No repeat design approval. Phase 3 owns hosted/physical/account/real delivery evidence.

## Interfaces and preflight

The browser issues `/api/mobile/v1/notifications/challenge` with its HttpOnly session, native public SPKI and operation ID. It never receives the provider token. Native validates the returned v1 challenge against its configured origin/environment/app/provider/key, signs the canonical tuple in `native/contracts/registration-v1.json`, and POSTs to fixed `complete` without cookies. The server rechecks session/generation/expiry atomically. Native rotation/detach uses fixed cookie-free maintenance endpoints. Public permission/status is not proof of enrollment.

Ruling: retain direct WKWebView/Android WebView architecture and existing UI. Do not adopt the unrelated Capacitor localStorage fixture as application storage. Its restart assertion remains a separate prototype result.

## Task 1 — Policy and platform entry points

Write failing Swift/JVM tests for exact-origin HTTPS links, bounded approved portal/auth paths, ambiguous paths/query keys, notification locator parsing, main-frame/lifecycle/nonce/message-size/replay rejection, and production-used document browser-destination policy. Ruling: use the approved explicit browser reauthentication fallback rather than native private-file storage; speculative unused file validators are removed. Implement shared native policy cores and wire incoming links only after fresh session navigation; pending links remain memory-only. Association templates need real domain/team/package/certificate values and are not deployed here.

## Task 2 — Constrained capability channel and public metadata

Add WKScriptMessageHandlerWithReply and origin-scoped AndroidX WebMessageListener; check native sender origin and main frame, browser/page/lifecycle generation and bounded closed messages before native work. No generic eval/network/file operation. Replies stay with their issuing document. Suspend retires the channel. A capability handshake returns public metadata and permission state only. Test same/foreign-origin iframe, stale callbacks, duplicate IDs and malformed requests. Keep current backend/session authority and CSP.

## Task 3 — Native notification enrollment and lifecycle

Store nonexportable P-256 keys in Keychain/Android Keystore. Execute public golden vectors in both native cores. Native owns provider tokens and cookie-free bounded fixed-endpoint completion; page receives sanitized state/generation only. OS permissions start in context. A permission dialog that retires the document does not authorize enrollment for a later account: the current document must explicitly request a fresh challenge. Prepare APNs callbacks and optional explicitly configured FCM integration with auto-init/analytics off; no account, actual enrollment or provider call in tests. Test cancellation/rebind/rotation/revocation and request bounds with fake local IO. Reuse the current notification preferences UI through a native-aware adapter; do not replace Web Push.

## Task 4 — Documents, taps and local role acceptance

Use the approved deliberate browser reauthentication fallback from authenticated browser-owned document requests and native navigation/download delegates. Bound destinations to known portal paths and exact configured origin. Native private-file preview/storage is deferred. Never export cookies or invent URL bearer credentials. Require deliberate sharing; clean files on completion/suspension/account lifecycle. If Android cannot preserve a browser-owned POST download safely, route the existing authorized request to an explicit browser reauthentication flow rather than copying cookies. Implement generic notification taps through the server's existing authorized open route. Run full Next/PostgreSQL Employee/Owner journeys, native policy/build/fixture matrix, typecheck/lint and repository tests on the recorded candidate; preserve any red checks. Final review must assess cross-origin/frame replay, key/token leaks, permission focus retirement, account-switch/download races and fail-closed release configuration.

## Completion boundary

Implemented, automated verification, physical-device verification, signed, uploaded and released are separate. No merge/push, production data, DNS/association deployment, real messages, paid service, signing credential or store upload is authorized by this local implementation. Keep the source-inventory gate open until reconciled. No supported-OS reduction or accessibility waiver.
