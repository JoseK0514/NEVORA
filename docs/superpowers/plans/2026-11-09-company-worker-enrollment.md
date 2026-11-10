# Company-specific Worker Enrollment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make staging workforce commands use company-specific sealed credentials while retaining shared roots only inside the existing private issuer.

**Architecture:** An operator creates an immutable public enrollment request. An enrollment-only private scheduled provisioner seals the current WORKER connection and derived commerce secret to a unique RSA recipient. Restricted readers fetch only the current scoped encrypted result; canonical runtime guards and queues remain.

**Tech Stack:** Existing TypeScript/Node24.19, node:crypto RSA3072-OAEP-SHA256 and AES256-GCM, pg, existing Neon SDK/builders, Vitest and invocation-owned PG16/17. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-09-company-worker-enrollment-design.md`.

## Global Constraints

- Native/Production, new companies, paid service application, real delivery and new model calls excluded.
- Keep shared roots, APP credentials and provider credentials off the host and out of logs/artifacts.
- Test only; exact request IDs <=2; request lifetime <=30minutes and runtime admission <=24hours.
- No hosted grant/schema/credential/trigger action until concrete approval. No automatic shared revokes/password resets.
- Preserve original secret references, roles, catalog hashes, receipts and normal provisioning behavior.
- Keep company/source/role/lease checks, destination pins, machine-principal audit and clean-source artifact guards.
- Inline execution selected; Jose explicitly delegated implementation/testing. Do not ask him to approve this plan again. Independent whole-change review remains required.

## Review Focus

- Recipient substitution, ciphertext replay and mixed custody must not produce another company's credentials; task1/3 pin wrong key/scope/source/expiry.
- Concurrent/lost-ack issuance must yield one immutable encrypted result; task2 uses real transactions and replay after completion.
- SQL source/role/epoch drift and effective PUBLIC privilege changes must fail before secret use; task2/3 test both actual logins and late drift.
- Enrollment mode must not awaken provisioning/commerce or expose a public credential response; task4 tests real callback and capability boundaries.
- Runtime expiry/revocation and cached connections must deny normal commands without falsely claiming the old database login is revoked; task3 proves both distinctions.

---

### Task 1: Strict sealed enrollment codec and recipient custody

**Files:** create `src/lib/operations/worker-enrollment.ts` and `.test.ts`.

**Interfaces:** `WorkerEnrollmentIdentity` contains schemaVersion1, enrollmentId/workspaceId UUID, environment test, incarnation/sourceSecretRef/loginRole/canonicalOrigin/providerProjectId/recipientFingerprint/issuerSourceSha/expiresAt. `WorkerEnrollmentMaterial` has databaseUrl and commerceWorkerSecret. `WorkerEnrollmentEnvelope` has schemaVersion1/keyEnvelope/ciphertext. Export `workerRecipientFingerprint(publicOrPrivatePem:string):string`, `sealWorkerEnrollment(identity:unknown,material:unknown,publicPem):WorkerEnrollmentEnvelope`, `openWorkerEnrollment(identity,envelope,privatePem,now?):WorkerEnrollmentMaterial|null`, and strict identity/envelope parsing. The seal boundary validates unknown input before creating typed values. Reject unknown fields; RSA3072 only; constant error messages; payload bounds8KiB; canonical public-key fingerprint and UTC timestamp.

- [ ] Write real round-trip and wrong recipient/scope/bit-tamper/unknown-field/expired/RSA-size regressions. No mocks for crypto.

```ts
expect(openWorkerEnrollment(identity,sealWorkerEnrollment(identity,material,publicKey),privateKey,now)).toEqual(material);
expect(openWorkerEnrollment({...identity,incarnation:'2'},envelope,privateKey,now)).toBeNull();
expect(openWorkerEnrollment(identity,envelope,otherPrivateKey,now)).toBeNull();
```
- [ ] Run `node node_modules/vitest/vitest.mjs run src/lib/operations/worker-enrollment.test.ts` and observe missing implementation RED.
- [ ] Implement with standard Node crypto, existing AES helper, bound AAD and strict company login/TLS validation; never stringify secrets in an error.
- [ ] Rerun focused suite GREEN and commit task1.

### Task 2: Durable issuer and scoped encrypted reader

**Files:** create `db/control-migrations/0007_worker_enrollments.sql`, `src/lib/operations/worker-enrollment-store.ts`, `src/test/integration/onboarding-worker-enrollment.integration.ts`; modify `principal-policy.ts`, `routing-reader.ts`, owned onboarding suite selection and fixtures only as needed.

**Interfaces:** `configureEnrolledWorkerControlReader(admin,role)` grants fixed registry/enrolled-result views only; `configureWorkerEnrollmentIssuer(admin,role)` sets explicit named table policy/grants. `WorkerEnrollmentRequestBinding={id:string,requestHash:string}`. `processWorkerEnrollmentOnce(pool,requests:readonly WorkerEnrollmentRequestBinding[],issuerSourceSha,encryptionRoot,commerceWorkerRoot,now?):Promise<{state:'idle'|'processed'}>` locks request/workspace, verifies the independently pinned canonical request hash, and commits a task1 envelope. `readWorkerEnrollment(binding)` later consumes the exact scoped view columns. Principal audit accepts fixed kind `enrolled-worker-reader`, preserving all previous checks; narrow its SQL-query interface only if needed, never cast a result into validity.

`WorkerEnrollmentRequest` adds registryRevision/recipientPublicKey/requestExpiresAt to task1 identity. Export strict `parseWorkerEnrollmentRequest(value)`, `workerEnrollmentRequestHash(value):string` and operator-only `createWorkerEnrollmentRequest(query,value):Promise<WorkerEnrollmentRequestBinding>`. `EnrollmentQuery` and `EnrollmentDatabase` expose only the actual query/borrowed-client lifecycle used by this module; actual pg pools satisfy them. SQL expiry uses database time, so no client-controlled clock parameter is used for issuance. Runtime issuer identity/flags are checked before custody reads. A unique recipient fingerprint requires a fresh key per operation; source row locks use already held original provisioning rights.

- [ ] Add owned PG regressions: two-company scope/base denial, positive issuer, concurrent issuance and stable result after retry, changed request refusal, source/incarnation/secret/origin/revision drift, expired request, revoked immutable result, no updates to old ciphertext/roles/hashes. Observe RED.

```ts
expect(await processWorkerEnrollmentOnce(pool,[{id:requestId,requestHash}],sha,root,workerRoot)).toEqual({state:'processed'});
expect(await processWorkerEnrollmentOnce(pool,[{id:requestId,requestHash}],sha,root,workerRoot)).toEqual({state:'idle'});
expect((await admin.query('SELECT key_envelope,ciphertext FROM nevora_onboarding.worker_runtime_enrollments WHERE id=$1',[requestId])).rows).toEqual(originalCompletedRows);
```
- [ ] Implement operator-only forced-RLS table and immutable metadata/result trigger; no bootstrap application. Grant issuer only needed columns, no DELETE. View checks current ACTIVE scope and expiry. Use existing registry explicit columns and shared fixed-principal admission.
- [ ] Implement transactional issuer using current original WORKER secret AAD and `workspaceInstanceSecret` derivation; no provider API or company writes, no plaintext responses.
- [ ] Run `node scripts/onboarding-owned.mjs --suite worker-enrollment` with the already approved owned PG tool paths; expect all cases GREEN. Run existing workforce suite to preserve admission positives/negative grants. Commit task2.

### Task 3: Canonical enrolled transport, commerce and host profiles

**Files:** modify workspace `config.server.ts`, `resolver.server.ts`, `transport.server.ts`, `worker.server.ts`; `src/lib/commerce/isolated-connection.server.ts`; `src/lib/operations/managed-host.ts`; add `worker-enrollment-runtime.server.ts` and relevant unit/owned regressions.

**Interfaces:** explicit `WORKER_ENROLLED` routing variant with `{enrollmentId,privateKey}` and no encryption/token root; legacy variants retain their existing key requirements. New env names `NEVORA_WORKER_ENROLLMENT_ID`, `NEVORA_WORKER_RECIPIENT_PRIVATE_KEY`; mixed old-root/enrolled fields fail. New `readWorkerEnrollmentMaterial(binding,now?)` audits actual control principal, fetches current matching envelope and returns task1 material privately. Transport uses its databaseUrl; commerce uses only its derived WORKER secret and validates the existing company hash. No APP/BOOTSTRAP purpose can adopt this config.

- [ ] Write missing/mixed root, wrong role/scope, recipient reuse across companies, current-source/expiry/revocation/cached transport and commerce Owner-authority negatives; observe RED.

```ts
expect(readWorkerRoutingConfig(enrolledEnv).secretScope).toBe('WORKER_ENROLLED');
expect(()=>readWorkerRoutingConfig({...enrolledEnv,NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:root})).toThrow('Workspace is unavailable');
```
- [ ] Add strict mode parser and route only WORKER reads through the new view. Recheck source before each decrypted use and preserve existing company-side transaction guards. Keep legacy/browser behavior.
- [ ] Extend managed profile allowlist/curation and recipient uniqueness. Retain compiled destination pins and no key/env inheritance into unrelated commands.
- [ ] Exercise actual owned WORKER SQL plus existing entitlement contract without shared roots. Explicitly show normal runtime revocation and unchanged underlying login, documenting compromise rotation separately. Run relevant unit/owned suites GREEN and commit task3.

### Task 4: Closed scheduled issuance and private operator files

**Files:** modify `services/hosted/neon/provisioner.entry.ts`, `capabilities.ts` and tests; create `src/lib/operations/worker-enrollment-issuer.ts`, operator request/profile helper under `scripts/`, and CLI regressions.

**Interfaces:** `NEVORA_WORKFORCE_ENROLLMENT_ENABLED` defaults false/absent, with `NEVORA_WORKFORCE_ENROLLMENT_REQUESTS` (JSON <=2 `{id,requestHash}` bindings) admitted only on the existing provisioner. `readWorkerEnrollmentIssuerConfig(env,source)` requires test/selected control target, root separation, named issuer DSN, exact source and closed normal provisioning/onboarding/provider gates. `runWorkerEnrollmentIssuerOnce` calls task2 and closes its pool. Existing native `nevora-staging-provisioner` /run callback dispatches only the selected closed/open mode; no new HTTP path or request selector.

- [ ] RED tests for forged/wrong native trigger, mixed enabled modes, unknown config, wrong target/source, absent gate compatibility and no normal-provisioner invocation in enrollment mode.
- [ ] Implement strict isolated dispatch, opaque responses/logs and bounded shutdown. Do not touch the other five deployed functions.
- [ ] Add private-file operator tooling: separate public request/recipient-key files; canonical scope/fingerprint; bounded input,0700/0600/no symlink; no secret CLI args/output. Fixtures only until hosted authorization.
- [ ] Test actual CLI/file behavior and SDK callback bodies GREEN; commit task4.

### Task 5: Source-qualified artifacts, handoff and independent gate

**Files:** runtime inventory, onboarding suite config/acceptance and builder/verifier tests; runbook and this spec/plan; source-custodied enrollment acceptance script.

- [ ] Classify every new runtime/transport. Require actual clean-source provisioner archive extraction with enrollment mode default closed and actual compiled host profile/HTTP checks, plus owned SQL in required onboarding acceptance.
- [ ] Run focused checks, typecheck, changed lint, complete default suite and source-qualified owned onboarding/company-access/artifact acceptance. Keep output outside source; commit clean candidate before source-guarded checks.
- [ ] Prepare a concrete A/B-only hosted activation packet with exact requests/roles/grants/source/custody, existing-secret preservation, snapshots/drain, one bounded native issuance and rollback. Document runtime versus underlying-login revocation. No actual hosted action.
- [ ] Dispatch ONE fresh whole-change independent reviewer after implementation completes, using base0cf26329 and exact committed HEAD plus Review Focus above. Preserve prior source-review findings, fix Important findings inline RED→GREEN in one pass, and obtain independent closure per QA oversight. Defer Minor findings explicitly.
- [ ] Fresh fetch/source reconciliation before development integration. Observe exact-head CI; update the unapplied Render plan to that source. Present the concrete hosted credential/plan action for approval only after the engineering gate is satisfied.
