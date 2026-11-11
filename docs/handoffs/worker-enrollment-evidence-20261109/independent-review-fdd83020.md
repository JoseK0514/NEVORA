# Independent review to Jose — company-specific worker enrollment

**QA recommendation: NO-GO for development integration at `fdd8302099f527eab006245ef951e327b54f123f`.** Six required findings are open. One additional local CLI issue is Minor. Hosted activation and Production have no approval from this review.

## Scope and provenance

Reviewed all 39 changed paths from `0cf26329f3021dbd9744f2427e1c114ccfa62637` to the detached clean candidate, including migration, issuer, codec, readers, runtime, managed host, CLI, callback, artifact scripts, tests, inventory, plan/spec, Rulings and runbook. The diff in the review package after its header is byte-identical to `git diff -U10 0cf26329..fdd83020` (SHA-256 `9a06d68ab8485e1fbe0fb94e7b80b53b302fdbe16a38d6f550596ffac23e1239`). The separate six earlier host/monitor findings closed at `4ff2dee0` retain their original dispositions.

Independent execution used a private `git archive fdd83020` source copy, a private copy of the installed dependencies, Node 24.19.0 and an invocation-owned, loopback-only PostgreSQL cluster. The authenticated company/control SQL used synthetic credentials. The Neon client sent its SQL through the existing owned fixture adapter. All new probes and logs are under `/private/tmp/nevora-independent-enrollment.6aq8yAD9` (abbreviated **scratch** below). No live endpoint was contacted. No implementation, index, branch or service was changed by this review.

## Reproduced findings

1. **Critical — the real company WORKER proof can release an overprivileged login.** At `src/lib/operations/worker-enrollment-company.ts:16` and `src/lib/workspace-routing/transport.server.ts:34`, flags, membership and ownership are checked. PostgreSQL can confer additional authority through table/column ACLs while every one of those checks stays green. In the owned company, grant `SELECT(password_hash) ON public.employee_credentials TO PUBLIC`. The restricted issuer returned `processed`, and the normal enrolled SQL executor successfully evaluated `count(password_hash)=1` against the fictional Owner credential. The second probe primed an existing binding, observed SQLSTATE 42501, applied the grant, and read the protected column using that same binding. No hash was printed. **Required:** verify effective company WORKER capabilities against the expected grants before handing over credentials and at canonical enrolled admission, including direct and PUBLIC ACLs. A drifted database must refuse issuance/use, including a primed transport. Tests must also keep a correctly provisioned company's normal work passing. Evidence: `review-runtime-verbose.log`, Q1/Q1b, scratch runtime test lines 97 and 140.

2. **Critical — a company hash collision defeats the Owner-secret substitution check.** At `src/lib/operations/worker-enrollment-company.ts:22` and `src/lib/commerce/isolated-connection.server.ts:16`, a candidate is accepted if its digest equals the stored WORKER hash. Migration 0055 permits that hash to equal the instance hash. Starting with distinct correct roots and one pending request, set the company's `worker_secret_hash=instance_secret_hash` and pass the original instance/Owner root in the WORKER-root slot. The issuer returned `processed`. The recipient's decrypted commerce secret equaled the actual Owner-derived instance secret, and its digest equaled the stored instance digest. This requires both company-state drift and wrong issuer custody. The observation establishes disclosure of the machine secret; no human Owner session or billing action was exercised. **Required:** enforce positive WORKER and negative instance/Owner digest checks during issuance and subsequent enrolled commerce admission. Keep the original hashes/passwords intact. Verify the request stays pending and yields no envelope. Evidence: `review-runtime-verbose.log`, Q2, scratch runtime test line 109.

3. **Important — entitlement can succeed after an in-flight revocation.** At `src/lib/commerce/isolated-connection.server.ts:18`, the handle's final `assertCurrent` checks only the registry. The canonical `readCommerceAuthority` calls this after the fetch and on its cache path (`src/lib/commerce/access.ts:44,68`). A fixture fetch revoked the exact enrollment via real control SQL before returning a valid entitlement. The public helper returned `operational:true`, although an immediately following material read failed. **Required:** make the enrolled handle's current-authority check revalidate its enrollment and applicable company authority after asynchronous work and on the cache return path. Test concurrent revocation and deadline expiry; demonstrate a valid enrolled result still succeeds. Evidence: `review-runtime-verbose.log`, Q3, scratch runtime test line 119.

4. **Important — broadened issuer privileges evade admission and can erase every immutable receipt.** At `src/lib/operations/worker-enrollment-store.ts:43,78`, the issuer check validates flags/membership and minimum access to the original tables. It does not validate effective rights on the enrollment table. Grant `TRUNCATE ON nevora_onboarding.worker_runtime_enrollments TO PUBLIC`. The actual restricted issuer's `has_table_privilege` became true, processing another pinned request returned `processed`, and `TRUNCATE` as that login removed every row inside an intentionally rolled-back transaction. Forced RLS and the UPDATE trigger do not restrict TRUNCATE. **Required:** fail setup/issuance on effective direct/PUBLIC destructive or excess enrollment privileges, including column grants and grant options; independently check the expected issuer capabilities and table/RLS state at operation time. A failed audit must leave a pending request unissued and surface operator remediation. The application cannot undo a grant already made by a database administrator. Evidence: `review-runtime-verbose.log`, Q4, scratch runtime test line 129.

5. **Important — the managed host accepts mixed custody across profiles and an ambient provider credential.** At `src/lib/operations/managed-host.ts:27,45`, individual profile checks permit one enrolled company alongside another legacy profile carrying both shared roots. The actual host parser returned enabled with both profiles. It also accepted an enrolled-only host with ambient `NEVORA_PROVISIONER_API_KEY`. The child allowlist filters ambient fields, but the parent process already possesses them. This defeats the selected root-free host boundary. **Required:** reject legacy-root sibling profiles on an enrolled host and reject known out-of-scope provider/privileged credentials in its environment. Preserve separate all-legacy behavior and verify the compiled enrolled preflight with reversed profile order, isolated ambient capability, and clean positives. Evidence: `review-host-verbose.log`, Q5/Q5b, scratch routing test lines 39 and 45.

6. **Important — an accepted pg.Pool can apply issuer setup only partially.** At `src/lib/operations/worker-enrollment-store.ts:54`, the exported function accepts any query interface, including a standard pg.Pool. BEGIN, DROP POLICY, CREATE POLICY, GRANT and ROLLBACK can land on separate connections. Configure a real pool with `maxUses:1,max:1`, then simulate a server-side rejection of CREATE POLICY using an owned DDL event trigger. Initial named issuer policy count was 1. The method threw its expected failure, but the policy count became 0. This can also happen when other pool users borrow the transaction connection. **Required:** run the complete setup on one acquired client, or require and enforce a transaction-bound client before the first write. Verify setup via its supported public argument, injected mid-DDL failure and preservation of the original working issuer policy/permissions. Evidence: `review-store-verbose.log`, Q6, scratch store test line 138.

7. **Minor — the operator CLI can hang indefinitely on a private named pipe.** At `scripts/worker-enrollment-operator.mts:17`, opening the input for reading happens before the regular-file check. A 0600 FIFO in an owned 0700 directory and no writer made the documented request command block past the three-second probe deadline. It created no output. Use a nonblocking no-follow open before checking the descriptor, or an equivalent bounded opening sequence that retains the post-open owner/type/link/size checks. Evidence: `review-fifo.log`. Reproduction in scratch: create an owned private directory, `mkfifo -m 600 private-input`, and pass its canonical absolute path and a new sibling output path to the request command below. Expected result is prompt exit 1 with the redacted error. Deferral is acceptable if explicitly tracked.

## Independently verified controls and evidence

These commands run in the private scratch directory. The exact executable probes are retained in the patch appended below. Its SHA-256 is `27134a2b9b1ca7b09352bb8e5d82b2e5c5e4ca389fcc605d1d66103562c565ee`. A passing Q-numbered probe confirms the unsafe observation at this SHA.

| Scenario | Invocation | Binary observation and captured log in scratch |
|---|---|---|
| RSA recipient/AAD, scope, expiry, challenge tampering, strict public request hash and callback selector | `node node_modules/vitest/vitest.mjs run src/lib/operations/worker-enrollment-routing.test.ts src/lib/operations/worker-enrollment.test.ts src/lib/operations/worker-enrollment-store.test.ts services/hosted/neon/provisioner.test.ts --reporter=verbose` | 46/46 on the initial scratch copy (one probe included). Wrong recipient, mutated identities/bytes and malformed payloads failed closed. `review-unit.log` |
| Actual control SQL, one-use recipient, scoped A/B readers, wrong origin/role/source/incarnation, immutable replay, concurrency and interrupted acknowledgement | `env NEVORA_TEST_PG_BIN=/Users/josek0514/.codex/native-runtime/nevora-backend-integration-20261108-0w4zx1gf/pg-tools/bin node scripts/onboarding-owned.mjs --suite worker-enrollment` | Original 22/22 passed; repeating with Q6 produced 23/23. Concurrent requests yielded one processed and one idle; replay preserved the old result. `review-store.log`, `review-store-verbose.log` |
| Real restricted runtime, company/recipient mixups, expiry and revocation with cached SQL, unchanged direct login, adversarial Q1–Q4 and Q1b | Same environment and runner, `--suite worker-enrollment-runtime` | 7 original checks and 5 reviewer probes passed (12/12). Normal SQL denied an already-revoked enrollment; direct login remained usable as documented. `review-runtime-verbose.log` |
| Enrolled host admission, including Q5/Q5b | `node node_modules/vitest/vitest.mjs run src/lib/operations/worker-enrollment-routing.test.ts --reporter=verbose` | 12/12 including the two mixed-custody observations. `review-host-verbose.log` |
| Operator files, private callback dispatch, closed gates and machine capabilities | `node node_modules/vitest/vitest.mjs run src/lib/operations/worker-enrollment-operator.test.ts src/lib/operations/worker-enrollment-issuer.test.ts services/hosted/neon/provisioner.test.ts services/hosted/neon/capabilities.test.ts services/hosted/neon/handlers.test.ts --reporter=verbose` | 120/120. Confirmed local SDK rejects wrong/missing trigger, responses contain only state, actual CLI emits separate restricted files and rejects ordinary symlinks. `review-dispatch.log` |
| FIFO handling | `node --conditions=react-server --import ./scripts/node-server-context.mjs --import tsx scripts/worker-enrollment-operator.mts request ABSOLUTE_FIFO ABSOLUTE_NEW_DIRECTORY` | Bounded external subprocess observed `timeout_after=3s output_directory_created=0`. `review-fifo.log` |

## Gate state

The supplied exact-head default-suite log ends with 15 failures, 11,655 passes and 857 skips across 823 files. The failures are in Phase E browser evidence, root-group process, runner, git-files and tenancy backfill tests. Running concurrently with other verification does not establish their cause. Capture a full serial rerun on the remediated SHA and investigate any residual failures. Full log: `/Users/josek0514/.codex/worker-enrollment-20261109/default-suite-fdd83020.log`.

The candidate's seven-step source-qualified acceptance was still in progress during the independent probes. At report time, recorded steps were inventory-contract=0, manifest=0, owned-onboarding=0. Its final outcome is tracked in `/Users/josek0514/.codex/worker-enrollment-20261109/acceptance-fdd83020.log`. Every material remediation changes the reviewed source and requires fresh exact-head qualification. Historical baseline CI 42731060363 remains reported red, and no new enrollment CI or hosted environment was certified here.

## Declined to judge

- Hosted A/B identities, live ACLs, actual Neon native-proxy header stripping and invocation counts. This was an offline review, and local callback parsing only establishes application behavior.
- Live CLI environment merge, preservation of write-only deployed roots, operator secret transfer, backup restorability and later rotation. These require separately authorized action-time checks.
- Render billing, actual Blueprint application, deployed host health, renewal staffing and continuous operating capacity. The managed service is outside this source review; enrollment expiry remains finite.
- Real notification/reminder delivery, approved recipients, SMS/email/push and model execution. Initial profiles request payroll and the delivery systems were outside scope.
- Native apps, UI/UX, browser/WebKit timing root cause, payroll qualification in 2027, VELANI isolation, deletion operations and unrelated release work. This change does not qualify those surfaces.
- Immediate recall of plaintext credentials already obtained by a compromised recipient. Direct PostgreSQL access survives normal enrollment revocation by design and requires a separately authorized rotation.
- Malicious database superuser, issuer or compromised root/key custodian rewriting all trust anchors. This review examined plausible drift and substitution within the declared custody boundary.
- Measured hosted latency, throughput, fleet-scale cost and independent cryptographic certification. The local runs verify behavior at the bounded fixture size.
- Invalidating otherwise current/enrolled receipts solely because a later host binary was deployed. The design binds the issuing source and runtime expiry; an additional cross-deployment re-enrollment policy would need a product/operator decision.
- Re-adjudicating previously closed host/monitor findings and certifying any exact-source CI run without its own inspected artifacts. No prior verdict was replaced.

**Assessment:** Not ready to merge. The implementation team owns remediation and full-suite reruns. Only independent QA can close the six required findings after replaying the adverse scenarios against the named remediation SHA and checking the corresponding positive paths. Jose retains authority over any material residual risk and hosted/Production authorization.

## Reproducer patch

Apply only in an independent copy of the stated source. This patch appends probes and selects verbose test output. The tests intentionally assert the observed behavior at the reviewed head.


```diff
--- a/src/test/integration/onboarding-worker-enrollment.integration.ts
+++ b/src/test/integration/onboarding-worker-enrollment.integration.ts
@@ -135,3 +135,13 @@
   expect((await f.pool.query('SELECT status,key_envelope,ciphertext FROM nevora_onboarding.worker_runtime_enrollments')).rows).toEqual([{status:'PENDING',key_envelope:null,ciphertext:null}]);
  }finally{await f.close();}
 });
+it('REVIEW-Q6 issuer grant setup accepts pg.Pool but loses the original policy on a failed reconfiguration',async()=>{
+ const f=await fixture();const admin=new Pool({connectionString:f.connectionUrl,maxUses:1,max:1});
+ const q="SELECT count(*)::int AS n FROM pg_catalog.pg_policies WHERE schemaname='nevora_onboarding' AND tablename='worker_runtime_enrollments' AND policyname=$1",values=['enrollment_issuer_'+f.issuer.slice(-24)];
+ try{
+  expect((await f.pool.query(q,values)).rows).toEqual([{n:1}]);
+  await f.pool.query("CREATE FUNCTION public.review_fail_policy() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_reject_policy'; END $$; CREATE EVENT TRIGGER review_fail_policy ON ddl_command_start WHEN TAG IN ('CREATE POLICY') EXECUTE FUNCTION public.review_fail_policy()");
+  await expect(configureWorkerEnrollmentIssuer(admin,f.issuer)).rejects.toThrow('worker_enrollment_invalid');
+  expect((await f.pool.query(q,values)).rows).toEqual([{n:0}]);
+ }finally{await admin.end();await f.close();}
+});
--- a/src/test/integration/onboarding-worker-enrollment-runtime.integration.ts
+++ b/src/test/integration/onboarding-worker-enrollment-runtime.integration.ts
@@ -94,3 +94,53 @@
  await f.db.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='SUSPENDED',revision=revision+1 WHERE id=$1",[e.request.workspaceId]);
  try{await expect(db.query({text:'SELECT 1 AS n',values:[]})).rejects.toThrow('Workspace is unavailable');}finally{await f.db.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='ACTIVE',revision=revision+1 WHERE id=$1",[e.request.workspaceId]);}
 });
+it('REVIEW-Q1 PUBLIC credential-table read leaks a privileged company login through enrollment',async()=>{
+ const e=await enrollment(a,{issue:false}),db=a.c.resource.db.pool;
+ const effective=async()=> (await db.query("SELECT has_column_privilege($1,'public.employee_credentials','password_hash','SELECT') AS allowed",[e.request.loginRole])).rows[0].allowed;
+ expect(await effective()).toBe(false);
+ await db.query('GRANT SELECT(password_hash) ON public.employee_credentials TO PUBLIC');
+ try{
+  expect(await effective()).toBe(true);
+  expect(await processWorkerEnrollmentOnce(f.principals!.pools[1],[e.selected],sha,f.config.encryptionKey,workerRoot,verifyWorkerEnrollmentCompany)).toEqual({state:'processed'});
+  const rows=await getWorkspaceDb(e.binding).query({text:'SELECT count(password_hash)::int AS n FROM public.employee_credentials',values:[]});
+  expect(rows).toEqual([{n:1}]);
+ }finally{await db.query('REVOKE SELECT(password_hash) ON public.employee_credentials FROM PUBLIC');}
+});
+it('REVIEW-Q2 company Worker and Owner hash collision hands the Owner-derived secret to a recipient',async()=>{
+ const e=await enrollment(a,{issue:false}),db=a.c.resource.db.pool,original=(await db.query('SELECT worker_secret_hash FROM public.nevora_commerce_installation')).rows[0].worker_secret_hash;
+ await db.query('UPDATE public.nevora_commerce_installation SET worker_secret_hash=instance_secret_hash');
+ try{
+  expect(await processWorkerEnrollmentOnce(f.principals!.pools[1],[e.selected],sha,f.config.encryptionKey,ownerRoot,verifyWorkerEnrollmentCompany)).toEqual({state:'processed'});
+  const m=await readWorkerEnrollmentMaterial(e.binding);
+  expect(m.commerceWorkerSecret).toBe(workspaceInstanceSecret(ownerRoot,e.request));
+  expect((await db.query('SELECT instance_secret_hash=$1 AS owner_authority FROM public.nevora_commerce_installation',[createHash('sha256').update(m.commerceWorkerSecret).digest('hex')])).rows).toEqual([{owner_authority:true}]);
+ }finally{await db.query('UPDATE public.nevora_commerce_installation SET worker_secret_hash=$1',[original]);}
+});
+it('REVIEW-Q3 stale entitlement is returned after enrollment revocation during a pending fetch',async()=>{
+ const {readCommerceAuthority,resetCommerceAccessCache}=await import('@/lib/commerce/access');resetCommerceAccessCache();
+ const e=await enrollment();
+ vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');vi.stubEnv('NEVORA_COMMERCE_API_ORIGIN','https://fake.invalid');vi.stubEnv('NEVORA_COMMERCE_WORKER_BINDING_KEY',undefined);vi.stubEnv('NEVORA_COMMERCE_BINDING_KEY',undefined);
+ const result=await withWorkspaceBinding(e.binding,()=>readCommerceAuthority(async()=>{
+  await f.db.pool.query('UPDATE nevora_onboarding.worker_runtime_enrollments SET revoked_at=clock_timestamp() WHERE id=$1',[e.request.enrollmentId]);
+  return Response.json({businessId:e.request.workspaceId,installationId:e.request.workspaceId,state:'active',operational:true,validUntil:Date.now()+30000});
+ }));
+ expect(result.operational).toBe(true);await expect(readWorkerEnrollmentMaterial(e.binding)).rejects.toThrow('Workspace is unavailable');resetCommerceAccessCache();
+});
+it('REVIEW-Q4 issuer retains effective PUBLIC truncate of immutable results and still issues',async()=>{
+ const first=await enrollment(),e=await enrollment(a,{issue:false}),issuer=f.principals!.pools[1];
+ await f.db.pool.query('GRANT TRUNCATE ON nevora_onboarding.worker_runtime_enrollments TO PUBLIC');
+ try{
+  expect((await issuer.query("SELECT has_table_privilege(current_user,'nevora_onboarding.worker_runtime_enrollments','TRUNCATE') AS can_erase")).rows).toEqual([{can_erase:true}]);
+  expect(await processWorkerEnrollmentOnce(issuer,[e.selected],sha,f.config.encryptionKey,workerRoot,verifyWorkerEnrollmentCompany)).toEqual({state:'processed'});
+  const client=await issuer.connect();try{await client.query('BEGIN');await client.query('TRUNCATE nevora_onboarding.worker_runtime_enrollments');expect((await client.query('SELECT count(*)::int AS n FROM nevora_onboarding.worker_runtime_enrollments')).rows).toEqual([{n:0}]);}finally{await client.query('ROLLBACK');client.release();}
+  expect((await issuer.query('SELECT status FROM nevora_onboarding.worker_runtime_enrollments WHERE id=$1',[first.selected.id])).rows).toEqual([{status:'COMPLETE'}]);
+ }finally{await f.db.pool.query('REVOKE TRUNCATE ON nevora_onboarding.worker_runtime_enrollments FROM PUBLIC');}
+});
+
+it('REVIEW-Q1b late PUBLIC authority is still usable over a primed canonical enrolled company connection',async()=>{
+ const e=await enrollment(),company=a.c.resource.db.pool,db=getWorkspaceDb(e.binding);
+ await expect(db.query({text:'SELECT count(password_hash) AS n FROM public.employee_credentials',values:[]})).rejects.toMatchObject({code:'42501'});
+ await company.query('GRANT SELECT(password_hash) ON public.employee_credentials TO PUBLIC');
+ try{expect(await db.query({text:'SELECT count(password_hash)::int AS n FROM public.employee_credentials',values:[]})).toEqual([{n:1}]);}
+ finally{await company.query('REVOKE SELECT(password_hash) ON public.employee_credentials FROM PUBLIC');}
+});
--- a/src/lib/operations/worker-enrollment-routing.test.ts
+++ b/src/lib/operations/worker-enrollment-routing.test.ts
@@ -36,3 +36,13 @@
 it.each(['NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY','NEVORA_COMMERCE_WORKER_BINDING_KEY'])('refuses an unnecessary global %s on a managed host',field=>{
  expect(()=>parseManagedHostConfig({...host([profile()]),[field]:Buffer.alloc(32,3).toString('base64url')},sha,managedDestinations)).toThrow('managed_configuration_invalid');
 });
+it('REVIEW-Q5 host accepts a sibling with shared roots and a provider credential alongside enrolled custody',()=>{
+ const legacy=profile(otherScope,otherPrivate);const e:Record<string,string>={...legacy.env};delete e.NEVORA_WORKER_ENROLLMENT_ID;delete e.NEVORA_WORKER_RECIPIENT_PRIVATE_KEY;e.NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY=Buffer.alloc(32,11).toString('base64url');e.NEVORA_COMMERCE_WORKER_BINDING_KEY=Buffer.alloc(32,12).toString('base64url');
+ const cfg=parseManagedHostConfig({...host([profile(),{...legacy,env:e}]),NEVORA_PROVISIONER_API_KEY:'fixture-only'},sha,managedDestinations);
+ expect(cfg.enabled).toBe(true);expect(cfg.profiles).toHaveLength(2);expect(cfg.profiles[1].env.NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY).toBe(e.NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY);
+});
+
+it('REVIEW-Q5b enrolled host alone admits an ambient provisioning API credential',()=>{
+ const cfg=parseManagedHostConfig({...host([profile()]),NEVORA_PROVISIONER_API_KEY:'fixture-only'},sha,managedDestinations);
+ expect(cfg.enabled).toBe(true);expect(cfg.profiles).toHaveLength(1);
+});
--- a/vitest.onboarding-integration.config.mts
+++ b/vitest.onboarding-integration.config.mts
@@ -2,4 +2,4 @@
 import {fileURLToPath} from 'node:url';
 const suite=process.env.NEVORA_ONBOARDING_TEST_SUITE;
 if(!suite)throw Error('Use scripts/onboarding-owned.mjs; existing database targets are not permitted.');
-export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url))}},test:{include:[suite==='all'?'src/test/integration/onboarding-*.integration.ts':`src/test/integration/onboarding-${suite}.integration.ts`],fileParallelism:false,maxWorkers:1,testTimeout:30000,hookTimeout:60000}});
+export default defineConfig({resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url)),'server-only':fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js',import.meta.url))}},test:{reporters:['verbose'],include:[suite==='all'?'src/test/integration/onboarding-*.integration.ts':`src/test/integration/onboarding-${suite}.integration.ts`],fileParallelism:false,maxWorkers:1,testTimeout:30000,hookTimeout:60000}});
```
