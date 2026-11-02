# Native push custody implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:executing-plans inline with TDD. No per-task delegation. Obtain one fresh whole-change review after this plan's implementation.

**Goal:** Add authenticated, generation-bound native notification registrations and separate durable delivery, tested with fictional devices and fake providers.

**Architecture:** Browser HttpOnly sessions remain business authority. A browser-authorized enrollment challenge binds a native installation public key; the native client signs that challenge and uploads its provider token through a fixed endpoint without exporting cookies or exposing tokens to page JavaScript. Current notification intents, source checks, preferences and timing policy remain authoritative; native installations/deliveries are separate from Web Push.

**Tech stack:** Current Next.js/TypeScript, Node crypto/HTTP2/HTTPS, existing SqlExecutor and disposable PostgreSQL. No new npm dependency.

**Spec:** `docs/superpowers/specs/2026-11-01-native-employee-owner-design.md`; wire decisions in `docs/native/native-enrollment-protocol.md`.

## Global constraints

- Employee and Owner only. No native marker, public key or signature grants business access.
- "Do not extract HttpOnly cookies or introduce a second native bearer-session system."
- "Provider credentials stay in approved stores." No real enrollment, messages, provider accounts or production database changes.
- "Delivery rechecks active ownership, preferences/quiet hours, consent, expiry and revocation."
- "Lock-screen payloads are generic and omit names, pay, schedules and private message text by default."
- Keep the old project/worktrees intact; use this detached worktree. No merge/push/new named branch/deployment.
- Foundation Task4 and older-Android accessibility remain open. Local independent server work does not close or waive either gate.
- Implementation owner: root, sole writer here. Preserve every existing correction and recorded failure.
- Public-key possession is installation identity only. Challenge state, current session/account/role and conditional generations are checked again in the database transaction.

## Review focus

1. A stolen/replayed challenge must not enroll a different token/key/account: Task1 signed field tests and Task2 consumed/expired/raced challenge tests.
2. A late retry must not overwrite or invalidate a replacement generation: Task2 receipt/rebind races and Task4 delayed provider completion tests.
3. Logout/access revocation between reads and provider handoff must prevent further authorized sends: Task2 current session lock and Task4 final authority rechecks.
4. Malformed provider responses, redirects, slow streams and cancellation must remain bounded and redacted: Task3 real transport primitives with local fake IO.
5. Web Push must continue to materialize independently when native devices exist or do not exist: Task4 mixed-device tests and existing worker suite.

## File responsibilities

- `src/lib/native-push/types.ts`: versioned public nonsecret protocol types and private server registration types.
- `src/lib/native-push/protocol.ts`: closed-shape validation, deterministic signed bytes and P-256 verification; no IO/authorization claims.
- `src/lib/native-push/material.ts`: purpose-separated authenticated token encryption bound to origin/environment/app/platform/key/generation.
- `src/lib/native-push/enrollment.ts`, `http.ts`, `config.ts`: authority orchestration, bounded HTTP boundary and disabled-by-default explicit environment configuration.
- `src/lib/data/native-installations.ts`, `native-deliveries.ts`: atomic SQL ownership/challenges/receipts and leased native delivery.
- `src/lib/native-push/providers/{apns,fcm,transport}.ts`: provider-specific bounded/redacted adapters behind injected fake IO.
- `src/lib/native-push/worker.ts`: native transport over existing business notification authority.
- `db/migrations/0046_native_push.sql`: append-only isolated native tables; no historical notification backfill.

### Task 1: Native registration proof and protected token material

**Files:** Create types/protocol/material and neighboring `.test.ts` files; create cross-platform public golden vectors in `native/contracts/registration-v1.json`. Never save private signing keys.

**Interfaces:** `NativeChallenge`, `NativeMaterialBinding`, `parseNativeChallenge(unknown)`, `parseNativePublicKey(unknown)`, `nativeTokenDigest(platform, unknown)`, `nativeProofBytes(challenge, token)`, `verifyNativeProof({challenge,spki,token,signature,now})`, `sealNativeToken(token,key,binding)`, `openNativeToken(encrypted,key,binding)`. Exact wire fields and canonical tuple are in the protocol document.

- [ ] Write protocol tests before implementation. A real in-memory P-256 key signs a hand-written literal tuple; verifying it must succeed, changing token/key/origin/platform/provider/app/environment/nonce/generation/operation/expiry must fail. Invalid shape/version/types/key curves/encoding and expired/future challenges must fail without echoing input.
- [ ] Run `node node_modules/vitest/vitest.mjs run src/lib/native-push/protocol.test.ts --maxWorkers=1`; expected RED from the explicit missing export assertion, not a module-resolution exception.
- [ ] Implement closed validation, canonical UTF8 tuple and DER P-256 verification. State explicitly that DB replay/session/ownership authorization is outside this pure boundary.
- [ ] Write material tests before its implementation: real round-trip, randomized ciphertext, tampering, wrong key, every changed binding field, malformed/oversized envelope, and cross-purpose Web Push ciphertext rejection.
- [ ] Run the focused material test RED, implement the distinct HKDF/AES256GCM envelope, then run both new suites plus existing notification installation tests GREEN.
- [ ] Publish only public signed-byte vectors (no token/private key/provider credential); verify the literal tuple/digest independently.
- [ ] Typecheck/changed-source lint. Record proof and a private local checkpoint; no overall phase completion claim.

### Task 2: Atomic enrollment, rotation and detach

**Files:** Create migration, repositories, enrollment/http/config modules and focused tests. Create `/api/mobile/v1/notifications/{status,challenge,complete}` route files. Modify authoritative migration order and its test adapter literal deliberately. Add `src/test/integration/native-push.integration.ts` and an owned integration config/runner over existing isolated PostgreSQL helpers.

**Interfaces:** `NativeInstallationRepository.issueEnrollment({proof,binding,spki,operationId,expectedGeneration})`, `issueMaintenance({keyFingerprint,operation,expectedGeneration})`, `complete({challengeId,nonce,token,signature,now})`, `status({proof,keyFingerprint})`, `cleanupRevoked(limit)`. Completion returns `active {generation}` / `complete {generation}` / `conflict` / `unavailable`, never token/session/profile. Executor is the existing SqlExecutor.

- [ ] Write/run failing isolated SQL/HTTP cases: one-use challenge, expiry/future input, wrong signature/token/key, signed field substitution, two concurrent completions, retry after uncertain commit, stale retry after rebind, native same-key account switch, cross-key token takeover refusal, token rotation, logout/access change and cleanup after session removal. Existing EMPLOYEE/OWNER auth proof is server-only; MANAGER/LEAD and foreign/cross-site requests are denied before writes.
- [ ] Implement native installation/challenge/operation receipt tables and native delivery table, append migration0046 to BASE (never filename-sort or run held tenant migrations). Existing Web Push schema/data remains independent. Encrypt material; DB rows never store plaintext tokens or native private keys.
- [ ] Bind enrollment challenges to actual authenticated session/employee. Maintenance rotation/detach uses existing key/generation proof and cannot change employee/session. Detach may clean an already revoked registration; rotation requires current active authority. Bound challenge issuance/rates; no native auth bearer system.
- [ ] Lock/recheck current session, employee, installation, token uniqueness and generation inside completion transaction. Consume challenge and receipt atomically. An identical retry returns a durable receipt only while its resulting generation remains current; stale receipts never reactivate/rebind.
- [ ] Keep runtime disabled unless explicit native environment/origin/app/provider configuration and server protection key are present. Reject unknown selectors/duplicate fields/oversized bodies and sanitize all failures. No production migrations/config writes.
- [ ] Run new integration and existing migration/session/logout/notification suites; typecheck/lint. Commit only owned files after GREEN.

### Task 3: APNs and FCM adapters with fake providers

**Files:** Create provider modules/tests and runtime provider config tests. Use Node HTTP2 for APNs, bounded HTTPS/OAuth for FCM; inject transport and credentials/token supplier. No server SDK dependency or real request in tests.

**Interfaces:** `NativePushSender.send({installation,payload,ttlSeconds,signal}): Promise<ProviderResult>`; payload is generic text plus opaque notification ID and ownership generation. Factories `createApnsSender(config,transport)` and `createFcmSender(config,transport)` fail closed when unconfigured.

- [ ] Write/run RED tests for exact fixed endpoint/topic/environment, valid authentication format with ephemeral fake keys, generic payload/privacy, TTL, provider acceptance vs device delivery, APNs invalid-token vs auth errors, FCM UNREGISTERED vs INVALID_ARGUMENT, throttling/Retry-After, redirects, oversized/slow bodies and abort before/while IO.
- [ ] Recheck current official provider documentation. Implement explicit sandbox/production APNs separation and FCM HTTPv1, strict endpoint allowlist, short deadlines, bounded bodies/headers and stable redacted outcomes. No arbitrary URLs or raw provider errors escape.
- [ ] Run GREEN with fake IO proving zero real outbound provider connections; test missing configuration. Typecheck/lint and checkpoint.

### Task 4: Separate durable native dispatch and local acceptance

**Files:** Implement native deliveries/worker; extract shared current-intent/source/time authorization from existing notification worker only where needed, retaining all existing tests. Extend worker CLI with an explicitly gated native dispatch mode; keep existing Web Push semantics. Extend owned local integration runner/evidence.

**Interfaces:** `NativeDeliveryRepository.materialize/claim/finish/release/defer` retains intent/key/generation/lease identity; `runNativeWorker(deps)` consumes existing NotificationStateRepository, policy and native sender. Never use the web `push_state` as native delivery completion authority.

- [ ] Write/run RED tests for concurrent workers/idempotent materialization, expired leases/recovery, current account/session/preference/source checks, quiet-hour boundary during IO, cancellation/rebind before send, stale completion after replacement, disabled config and mixed native/Web Push devices.
- [ ] Implement bounded dispatch with existing max-attempt/retry/expiry policy. Recheck source/account/current native generation immediately before provider handoff; invalid provider token invalidates only that claimed generation. Do not promise exactly-once delivery or display.
- [ ] Execute complete owned PostgreSQL/API/fake-provider journeys for Employee and Owner, including revoke/rotation/account switch/outage/retry. Prove no real external messages/DB credentials. Run the default repository suite, Node guards, typecheck/lint and clean-candidate production checks when capacity/source prerequisites hold.
- [ ] Obtain one fresh whole-plan review; correct Important/Critical findings with failing proof and full relevant suite. Archive rulings/evidence and retain open Android/source-inventory/external gates.
- [ ] Write the dependent platform capabilities plan from these actual interfaces: main-frame/origin/lifecycle bridge, native key stores/permission/token handling, generic taps, associations, authorized documents/share cleanup and complete role journeys. StageC readiness/account/device work remains required.

## Execution rulings

The November1 design approval already authorizes this bounded implementation and its dependent plans. Continue the previously selected inline method; do not request duplicate design or execution approval. Jose's "Whats next" is a status/steering request, not an acceptance of Android risk. The builder selects independent server work while preserving the blocked release and open foundation Task4; no changed product policy or deployment is inferred.

The previous debugging run is partial and archived, with no active diagnostic process. This plan resumes implementation; it does not claim the Android investigation completed. Preserve its journal/evidence and original worktree corrections before any checkpoint.
