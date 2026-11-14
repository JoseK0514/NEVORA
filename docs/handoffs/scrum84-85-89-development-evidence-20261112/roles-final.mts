import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@neondatabase/serverless';
import { PDFDocument } from 'pdf-lib';
import { setupCompany, readCompanyInput } from '/workspace/nevora-scrum-84-85-89/scripts/company-setup';
import { hashPassword, verifyPassword } from '/workspace/nevora-scrum-84-85-89/src/lib/auth/password';
import { prepareSession } from '/workspace/nevora-scrum-84-85-89/src/lib/auth/session-issuance';
import { readOperationalAuthority, assignOperationalScope, assertOperationalAccess } from '/workspace/nevora-scrum-84-85-89/src/lib/company-access/operational-scope.server';
import { nativeProfiles, saveNativeProfile } from '/workspace/nevora-scrum-84-85-89/src/lib/payroll/native/profiles.server';
import { payrollObjectScopeSql } from '/workspace/nevora-scrum-84-85-89/src/lib/payroll/native/scope';
import { input as nativeInput } from '/workspace/nevora-scrum-84-85-89/src/lib/payroll/native/fixtures.test-support';
import { calculateNativePayroll } from '/workspace/nevora-scrum-84-85-89/src/lib/payroll/native/calculate';
import { newRun, runs } from '/workspace/nevora-scrum-84-85-89/src/lib/payroll/service';
import { PasskeyService } from '/workspace/nevora-scrum-84-85-89/src/lib/auth/passkeys/service.server';
import { fictionalAuthenticator } from '/workspace/nevora-scrum-84-85-89/src/test/integration/passkey-authenticator.test-support';
import type { SqlExecutor, SqlStatement } from '/workspace/nevora-scrum-84-85-89/src/lib/notifications/types';
import type { SessionMutationProof } from '/workspace/nevora-scrum-84-85-89/src/lib/shift-changes/types';
import { requireSafeEnvironment, requireCandidate, requireOwned, requireLocalPort } from '/workspace/nevora-scrum-84-85-89/scripts/rehearsal/guards.mts';
import { readMigrationPlan } from '/workspace/nevora-scrum-84-85-89/scripts/rehearsal/migration-plan.mts';
import type { SqlTraceReport } from '/workspace/nevora-scrum-84-85-89/scripts/rehearsal/sql-diagnostics.mts';
function executor(client: Client): SqlExecutor {
  const query = async <T,>(statement: SqlStatement) => (await client.query(statement.text, [...statement.values])).rows as T[];
  return { query, async transaction(statements) {
    await client.query('BEGIN');
    try { const results: unknown[][] = []; for (const s of statements) results.push(await query(s)); await client.query('COMMIT'); return results; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
  } };
}
async function check(scenario: string, name: string, fn: () => Promise<void> | void) {
  try { await fn(); checks.push({ scenario, name, status: 'PASS' }); console.log(`PASS ${scenario}: ${name}`); }
  catch (error) { const detail = error instanceof Error ? error.message.slice(0, 1400) : String(error);
    checks.push({ scenario, name, status: 'FAIL', detail }); throw error; }
}
async function migrations(client: Client, files: string[]) {
  for (const name of files) {
    try { await client.query(readFileSync(join('db/migrations', name), 'utf8')); }
    catch (error) { await client.query('ROLLBACK'); throw Error(`Migration ${name} failed: ${(error as Error).message}`); }
  }
}
type RowDigest = { columns: string[]; count: string; digest: string };
async function tableState(client: Client, projection?: Record<string, RowDigest>) {
  const result: Record<string, RowDigest> = {};
  const names = projection ? Object.keys(projection) : (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r => String(r.tablename));
  for (const name of names) {
    const columns = projection?.[name]?.columns ?? (await client.query("SELECT attname FROM pg_attribute WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum", ['public.' + qid(name)])).rows.map(r => String(r.attname));
    const r = await client.query(`SELECT count(*)::text AS count, encode(sha256(convert_to(COALESCE(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex') AS digest FROM (SELECT ${columns.map(qid).join(',')} FROM public.${qid(name)}) t`);
    result[name] = { columns, ...r.rows[0] };
  }
  return result;
}
async function sequenceState(client: Client) {
  return (await client.query("SELECT schemaname,sequencename,sequenceowner,data_type,start_value,min_value,max_value,increment_by,cycle,cache_size,last_value FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename")).rows;
}
const password = 'Fictional-database-rehearsal-only!';
const ids = { owner: 'REHEARSAL-OWNER', manager: 'REHEARSAL-MANAGER', employee: 'REHEARSAL-EMPLOYEE', inactive: 'REHEARSAL-INACTIVE' };
const config = readCompanyInput({ COMPANY_NAME: 'Compañía Ficticia Rehearsal', COMPANY_TIME_ZONE: 'America/Puerto_Rico', COMPANY_LOCATION_NAME: 'Fictional Harbor', COMPANY_LOCATION_SHORT_NAME: 'Harbor', COMPANY_LOCATION_KEY: 'fictional-harbor',
  BOOTSTRAP_EMPLOYEE_ID: ids.owner, BOOTSTRAP_FIRST_NAME: 'Fictional', BOOTSTRAP_LAST_NAME: 'Owner', BOOTSTRAP_PHONE: '2025550100', BOOTSTRAP_EMAIL: 'owner@example.invalid', BOOTSTRAP_PASSWORD: password });
type Fixture = { location: string; other: string; workspace: string; owner: SessionMutationProof; manager: SessionMutationProof; employee: SessionMutationProof;
  authenticator?: ReturnType<typeof fictionalAuthenticator>; handle?: string; runId?: string; documentId?: string };
async function seedPeople(client: Client, fresh = false): Promise<Fixture> {
  const first = (await client.query('SELECT id FROM locations ORDER BY id LIMIT 1')).rows[0].id;
  if (fresh) await client.query("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) SELECT 'rehearsal-other',workspace_id,'fictional-other','Fictional Other','Other' FROM locations WHERE id=$1", [first]);
  const other = (await client.query('SELECT id FROM locations WHERE id<>$1 ORDER BY id LIMIT 1', [first])).rows[0].id;
  const encoded = await hashPassword(password);
  for (const [index, [key, id]] of Object.entries(ids).entries()) {
    if (!(fresh && key === 'owner')) {
      await client.query('INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [id, 'Fictional ' + key, 'Rehearsal José', `202555010${index}`, key + '@example.invalid', key === 'owner' ? 'OWNER' : key === 'employee' ? 'EMPLOYEE' : 'MANAGER', first, key !== 'inactive']);
      await client.query('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)', [id, encoded]);
      await client.query('INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES($1,$2)', [id, first]);
    }
    await client.query("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,'2040-01-01T00:00:00Z')", [String(index + 1).repeat(64), id]);
  }
  await client.query("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('f',64),$1,'2000-01-01T00:00:00Z')", [ids.owner]);
  const proof = (key: 'owner' | 'manager' | 'employee', n: number): SessionMutationProof => ({ employee: { id: ids[key], firstName: 'Fictional', lastName: 'Rehearsal', role: key === 'owner' ? 'OWNER' : key === 'manager' ? 'MANAGER' : 'EMPLOYEE', primaryLocationId: first }, sessionTokenHash: String(n).repeat(64) });
  return { location: first, other, workspace: '', owner: proof('owner', 1), manager: proof('manager', 2), employee: proof('employee', 3) };
}
async function enrich(client: Client, f: Fixture) {
  const ex = executor(client);
  f.workspace = (await client.query('SELECT id FROM workspaces WHERE singleton')).rows[0].id;
  const [subject] = (await client.query('SELECT e.updated_at::text AS version,v.generation::text AS generation,COALESCE(s.revision,0) AS revision FROM employees e JOIN operational_subject_versions v ON v.employee_id=e.id LEFT JOIN operational_scopes_current s ON s.employee_id=e.id WHERE e.id=$1', [ids.manager])).rows;
  const assigned = await assignOperationalScope(f.owner, ids.manager, { action: 'ASSIGN', operationId: randomUUID(), expectedEmployeeVersion: subject.version, expectedRoleGeneration: subject.generation, expectedScopeRevision: subject.revision, scope: { mode: 'LOCATIONS', locationIds: [f.location] } }, ex);
  assert.equal(assigned.state, 'saved');
  const input = nativeInput(); input.employeeId = ids.employee; input.timecards[0].employeeId = ids.employee;
  input.timecards[0].entries.forEach(e => { e.locationId = f.location; });
  input.wages[0].locationIds = [f.location]; input.wages[0].workweekPolicy!.employeeId = ids.employee;
  await saveNativeProfile(f.owner, { action: 'SAVE_NATIVE_PROFILE', operationId: randomUUID(), reason: 'Fictional rehearsal', expectedRevision: 0,
    configuration: { schema: 'NEVORA_NATIVE_CONFIGURATION_V1', employeeId: ids.employee, wages: input.wages, tax: input.tax, deductions: input.deductions } }, ex);
  await saveNativeProfile(f.owner, { action: 'ATTEST_OPENING_YTD', operationId: randomUUID(), reason: 'Fictional opening zero', expectedRevision: 0, employeeId: ids.employee, ytd: input.ytd }, ex);
  await saveNativeProfile(f.owner, { action: 'SET_MANAGER_SCOPE', operationId: randomUUID(), reason: 'Fictional finite review permission', expectedRevision: 0, employeeId: ids.manager, review: true, approve: false, locationIds: [f.location] }, ex);
  const calculated = calculateNativePayroll(input); assert.equal(calculated.state, 'ready');
  const id = randomUUID(); f.runId = id;
  const payload = { ...newRun(id, input.period, input.payday, null), sourceAuthority: 'NATIVE_RECORDED_TIME', status: 'APPROVED', approvedBy: ids.owner, approvedAt: new Date().toISOString(),
    nativeCalculation: { version: 'NATIVE_RUN_V1', state: 'ready', ruleRevision: 1, templateVersion: 'NEVORA_NATIVE_PAYSTUB_PDF_V1', employees: [calculated] } };
  await client.query('INSERT INTO payroll_runs(workspace_id,id,start_date,end_date) VALUES($1,$2,$3,$4)', [f.workspace, id, input.period.startDate, input.period.endDate]);
  await client.query('INSERT INTO payroll_run_revisions(workspace_id,run_id,revision,payload) VALUES($1,$2,1,$3)', [f.workspace, id, payload]);
  await client.query('INSERT INTO native_payroll_ledger(workspace_id,employee_id,tax_year,run_id,opening_revision,start_date,end_date,payday,payload) VALUES($1,$2,2026,$3,1,$4,$5,$6,$7)', [f.workspace, ids.employee, id, input.period.startDate, input.period.endDate, input.payday, { result: calculated }]);
  const pdf = await PDFDocument.create(); pdf.addPage().drawText('Fictional payroll restore rehearsal'); const bytes = Buffer.from(await pdf.save());
  const doc = randomUUID(); f.documentId = doc;
  await client.query("INSERT INTO payroll_documents(workspace_id,id,run_id,employee_id,kind,filename,sha256,content,payload) VALUES($1,$2,$3,$4,'EMPLOYEE_STATEMENT','fictional-paystub.pdf',$5,$6,$7)", [f.workspace, doc, id, ids.employee, sha(bytes), bytes, { fictional: true }]);
  await client.query('INSERT INTO native_payroll_document_manifests VALUES($1,$2,$3)', [f.workspace, id, { fictional: true, documentId: doc, sha256: sha(bytes) }]);
  if ((await client.query("SELECT to_regclass('auth_passkey_users') AS present")).rows[0].present) await enroll(client, f);
}
async function enroll(client: Client, f: Fixture) {
  const service = new PasskeyService({ rpID: 'localhost', origin: 'http://localhost:3000' }, executor(client));
  const device = fictionalAuthenticator(), flow = randomBytes(32).toString('base64url');
  const options = await service.registrationOptions(f.employee, flow);
  await service.register(f.employee, flow, device.register(options.challenge), 'Fictional restore device');
  f.authenticator = device; f.handle = options.user.id;
}
async function verifyBehavior(client: Client, f: Fixture, scenario: string) {
  const ex = executor(client);
  await check(scenario, 'Company Access preserves finite scope and denies another location/company access', async () => {
    const owner = await readOperationalAuthority(f.owner, ex), manager = await readOperationalAuthority(f.manager, ex);
    assert.equal(owner.state, 'ready'); if (owner.state === 'ready') assert.equal(owner.scope?.mode, 'COMPANY');
    assert.equal(manager.state, 'ready'); if (manager.state === 'ready') assert.deepEqual(manager.scope, { mode: 'LOCATIONS', locationIds: [f.location] });
    await assertOperationalAccess(f.manager, { kind: 'LOCATIONS', locationIds: [f.location] }, ex);
    await assert.rejects(() => assertOperationalAccess(f.manager, { kind: 'LOCATIONS', locationIds: [f.other] }, ex));
    await assert.rejects(() => assertOperationalAccess(f.manager, { kind: 'COMPANY' }, ex));
    await assert.rejects(() => assertOperationalAccess({ ...f.owner, sessionTokenHash: 'f'.repeat(64) }, { kind: 'COMPANY' }, ex));
  });
  await check(scenario, 'payroll revisions/approved ledger and exact document bytes are available', async () => {
    const profiles = await nativeProfiles(f.owner, ex); assert.equal(profiles.configurations.length, 1); assert.equal(profiles.openingYtd.length, 1); assert.equal(profiles.managerScopes.length, 1);
    assert.ok((await runs(f.owner, ex)).runs.some(r => r.id === f.runId));
    const [doc] = (await client.query('SELECT sha256,content FROM payroll_documents WHERE id=$1', [f.documentId])).rows; assert.equal(sha(doc.content), doc.sha256);
    assert.equal((await client.query('SELECT count(*)::int n FROM native_payroll_ledger')).rows[0].n, 1);
  });
  await check(scenario, 'operational permission cannot widen independent payroll permission', async () => {
    const allowed = async (locations: string[], permission: 'review' | 'approve') => (await client.query(`SELECT ${payrollObjectScopeSql(f.manager, '$1::jsonb', 'w.id', permission)} AS ok FROM workspaces w WHERE singleton`, [JSON.stringify({ complete: true, locationIds: locations })])).rows[0].ok;
    assert.equal(await allowed([f.location], 'review'), true); assert.equal(await allowed([f.location], 'approve'), false); assert.equal(await allowed([f.other], 'review'), false);
  });
  await check(scenario, 'password verification, existing session and guarded new session work', async () => {
    const [credential] = (await client.query('SELECT e.updated_at::text,c.password_hash,c.password_updated_at::text FROM employees e JOIN employee_credentials c ON c.employee_id=e.id WHERE e.id=$1', [ids.employee])).rows;
    assert.equal(await verifyPassword(password, credential.password_hash), true); assert.equal(await verifyPassword('Wrong-fictional-password', credential.password_hash), false);
    const prepared = prepareSession(ids.employee, credential); await ex.transaction([...prepared.guards, prepared.insert]);
    assert.equal((await client.query('SELECT employee_id FROM employee_sessions WHERE token_hash=$1', [prepared.tokenHash])).rows[0].employee_id, ids.employee);
    const [inactive] = (await client.query('SELECT e.updated_at::text,c.password_hash,c.password_updated_at::text FROM employees e JOIN employee_credentials c ON c.employee_id=e.id WHERE e.id=$1', [ids.inactive])).rows;
    const denied = prepareSession(ids.inactive, inactive); await assert.rejects(() => ex.transaction([...denied.guards, denied.insert]), /session_login_changed/);
  });
  await check(scenario, 'signed passkey authentication survives and replay stays rejected', async () => {
    assert.ok(f.authenticator && f.handle);
    const service = new PasskeyService({ rpID: 'localhost', origin: 'http://localhost:3000' }, ex);
    const counter = Number((await client.query('SELECT sign_counter FROM employee_passkeys WHERE credential_id=$1', [f.authenticator.id])).rows[0].sign_counter) + 1;
    const flow = randomBytes(32).toString('base64url'), options = await service.loginOptions(flow);
    const response = f.authenticator.authenticate(options.challenge, f.handle, counter);
    const session = await service.login(flow, response);
    assert.equal((await client.query('SELECT employee_id FROM employee_sessions WHERE token_hash=$1', [session.tokenHash])).rows[0].employee_id, ids.employee);
    await assert.rejects(() => service.login(flow, response));
  });
  await check(scenario, 'append-only payroll/access/passkey audit controls still reject mutation', async () => {
    for (const table of ['native_payroll_ledger', 'company_access_adoption', 'auth_passkey_audit']) await assert.rejects(() => client.query(`DELETE FROM ${qid(table)}`), /immutable/i);
  });
}import {readFile} from 'node:fs/promises';const candidate='roles-diagnostic';const checks:any[]=[];const report:any={};const sha=(v:any)=>createHash('sha256').update(v).digest('hex');const qid=(v:string)=>'\"'+v+'\"';const baseUrl=new URL((await readFile('/workspace/scratch/scrum-completion-private/database-url','utf8')).trim());const clients:any[]=[];const connectUrl=async(url:URL)=>{const c=new Client({connectionString:url.href});c.on('error',()=>{});await c.connect();clients.push(c);return c;};let fresh=await connectUrl(baseUrl);
try{
 const wsid=randomUUID(),dbname='nv_app_'+wsid.replaceAll('-',''),role='nv_provision_'+randomBytes(12).toString('hex'),rp=randomBytes(32).toString('base64url');
 await fresh.query(`CREATE ROLE ${role} LOGIN CREATEROLE NOCREATEDB NOINHERIT NOSUPERUSER NOBYPASSRLS PASSWORD '${rp}'`);
 await fresh.query(`GRANT ${role} TO scrum84_operator WITH SET TRUE`);await fresh.query(`CREATE DATABASE ${dbname} OWNER ${role}`);
 const u=new URL(baseUrl);u.pathname='/'+dbname;u.username=role;u.password=rp;const provisioner=await connectUrl(u);
 const spec={operationId:randomUUID(),workspaceId:wsid,registrationId:randomUUID(),environment:'test' as const,incarnation:'1',providerProjectId:'morning-salad-93941233',resourceName:'nv-t-'+wsid.replaceAll('-','')+'-'+randomBytes(8).toString('hex'),commandHash:randomBytes(32).toString('hex'),verifiedEmail:'owner@example.invalid',databaseName:dbname,provisionerRole:role,app:{name:'nv_app_'+randomBytes(12).toString('hex'),password:randomBytes(32).toString('base64url')},worker:{name:'nv_worker_'+randomBytes(12).toString('hex'),password:randomBytes(32).toString('base64url')},payload:{businessName:'Fictional Hosted Roles',timeZone:'America/Puerto_Rico',requestedSlug:'fictional-hosted-roles',initialLocation:{name:'Fictional Harbor',shortName:'Harbor',key:'harbor'},ownerProfile:{id:'OWNER-1',firstName:'Fictional',lastName:'Owner',phone:'7875550101'}}};
 const {bootstrapPendingCompany,canonicalCompanyManifest}=await import('/workspace/nevora-scrum-84-85-89/src/lib/company-bootstrap/server.ts');
 await check('roles','actual pending bootstrap creates restricted APP and WORKER roles on hosted Neon',async()=>{writeFileSync('/workspace/scratch/scrum-completion-private/role-fixture.json',JSON.stringify(spec),{mode:0o600});await bootstrapPendingCompany(provisioner as any,spec,await canonicalCompanyManifest());const rows=(await provisioner.query('SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,rolinherit FROM pg_roles WHERE rolname=ANY($1::text[])',[[spec.app.name,spec.worker.name]])).rows;assert.equal(rows.length,2);assert.ok(rows.every(r=>!r.rolsuper&&!r.rolcreatedb&&!r.rolcreaterole&&!r.rolbypassrls&&!r.rolinherit));report.runtimeRoles=rows;});
 for(const [kind,r] of [['APP',spec.app],['WORKER',spec.worker]] as const){const url=new URL(u);url.username=r.name;url.password=r.password;const c=await connectUrl(url);await check('roles',kind+' connects with its own identity and cannot obtain DDL or bootstrap authority',async()=>{assert.equal((await c.query('SELECT current_user AS name')).rows[0].name,r.name);await assert.rejects(()=>c.query('CREATE TABLE forbidden_probe(id int)'),{code:'42501'});assert.equal((await c.query('SELECT workspace_id FROM onboarding_workspace_identity')).rows[0].workspace_id,spec.workspaceId);await assert.rejects(()=>c.query('SELECT * FROM onboarding_provision_receipts'),{code:'42501'});await assert.rejects(()=>c.query('SET ROLE '+role),{code:'42501'});});}
report.status='PASS';}catch(e:any){report.status='FAIL';report.error={code:e?.code??null,message:e?.message??null};console.log(JSON.stringify(report.error));}finally{writeFileSync('.omo/evidence/scrum84-hosted-20261112/roles-report.json',JSON.stringify({...report,checks},null,2)+'\n',{mode:0o600});for(const c of clients)try{await c.end();}catch{}}
