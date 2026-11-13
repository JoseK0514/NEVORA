/** Disposable PostgreSQL rehearsal. Adds no runtime/migration/CI behavior. */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';
import { PDFDocument } from 'pdf-lib';
import { setupCompany, readCompanyInput } from '../company-setup';
import { hashPassword, verifyPassword } from '../../src/lib/auth/password';
import { prepareSession } from '../../src/lib/auth/session-issuance';
import { readOperationalAuthority, assignOperationalScope, assertOperationalAccess } from '../../src/lib/company-access/operational-scope.server';
import { nativeProfiles, saveNativeProfile } from '../../src/lib/payroll/native/profiles.server';
import { payrollObjectScopeSql } from '../../src/lib/payroll/native/scope';
import { input as nativeInput } from '../../src/lib/payroll/native/fixtures.test-support';
import { calculateNativePayroll } from '../../src/lib/payroll/native/calculate';
import { newRun, runs } from '../../src/lib/payroll/service';
import { PasskeyService } from '../../src/lib/auth/passkeys/service.server';
import { fictionalAuthenticator } from '../../src/test/integration/passkey-authenticator.test-support';
import type { SqlExecutor, SqlStatement } from '../../src/lib/notifications/types';
import type { SessionMutationProof } from '../../src/lib/shift-changes/types';
import { requireSafeEnvironment, requireCandidate, requireOwned, requireLocalPort } from './guards.mts';
import { readMigrationPlan } from './migration-plan.mts';
import type { SqlTraceReport } from './sql-diagnostics.mts';

const args = process.argv.slice(2);
const option = (name: string) => { const i = args.indexOf(name); return i < 0 ? '' : args[i + 1] ?? ''; };
requireSafeEnvironment(process.env);
process.env.NEVORA_PAYROLL_ENABLED = 'true';
process.env.PUSH_DELIVERY_ENABLED = 'false';
const candidate = requireCandidate(option('--candidate'));
const image = 'postgres@sha256:0ea6700a3b4f0ae6ce746519073558aed4d88a79d8d07622a9a644946c7319c4';
const output = resolve(option('--output') || '.omo/evidence/database-rehearsal/' + new Date().toISOString().replaceAll(':', '-'));
assert.ok(!existsSync(output), 'Select a new output directory; previous evidence must not be overwritten.');
mkdirSync(output, { recursive: true, mode: 0o700 });
const git = (...args: string[]) => {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
};
assert.equal(git('rev-parse', 'HEAD'), candidate, 'Run from a detached checkout of the pinned candidate.');
assert.equal(git('diff', '--name-only', candidate), '', 'Tracked candidate files must be unchanged.');
assert.equal(git('diff', '--cached', '--name-only'), '', 'Staged changes are not an immutable candidate.');
const plan = readMigrationPlan(process.cwd());
const { base, current, held } = plan;
const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const manifests = current.map(name => ({ name, sha256: sha(readFileSync(join('db/migrations', name))) }));
const marker = randomBytes(16).toString('hex');
type Check = { scenario: string; name: string; status: 'PASS' | 'FAIL'; detail?: string };
const checks: Check[] = [];
const harnessFiles = ['database-rehearsal.mts', 'guards.mts', 'guards.check.mts', 'migration-plan.mts', 'migration-plan.check.mts', 'sql-diagnostics.mts',
  'sql-diagnostics.check.mts', 'fixture-diagnostics.setup.ts', 'fixture-diagnostics.integration.ts', 'vitest.fixture-diagnostics.config.mts', 'tsconfig.json'];
const harnessHashes = () => Object.fromEntries(harnessFiles.map(name => [name, sha(readFileSync(join('scripts/rehearsal', name)))]));
const report = { candidate, historicalHarnessOriginPr: 'https://github.com/JoseK0514/NEVORA/pull/16', startedAt: new Date().toISOString(), completedAt: '', node: process.version, image,
  ownedConnectionTimeoutMillis: 15000,
  harnessSha256: harnessHashes(), dependencyLockSha256: sha(readFileSync('package-lock.json')),
  migrationPlanSource: plan.source, migrationPlanInputs: plan.inputs,
  fixtureDiagnostics: null as null | { exitCode: number | null; passed: number; failed: number; traces: SqlTraceReport[] },
  postgres: '', migrationManifest: manifests, excludedHeldMigrations: held, checks,
  clusterStartup: [] as { attempts: number; elapsedMs: number; ready: boolean; lastErrorCode: string }[],
  scenarios: {} as Record<string, { status: string; error?: string }>, backups: [] as Record<string, unknown>[],
  historicalBrowserEvidence: { commit: '6c56f504', passed: 42, artifactCommit: 'f3a1a7c4b8d10ca76094f7c819f1fa59615998c2', executedByThisRehearsal: false },
  interruptedBy: null as 'SIGINT' | 'SIGTERM' | null, resourceCreationUncertain: false, sourceUnchanged: false, cleanup: false, status: 'RUNNING' };
function docker(args: string[], input?: string | Buffer, tolerateFailure = false): Buffer {
  const env = { ...process.env };
  for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
  // vfs storage can take minutes copying an image. A timed-out CLI does not cancel
  // the daemon's create request: never claim completed cleanup in that case.
  const r = spawnSync('docker', ['--host=unix:///var/run/docker.sock', ...args], { env, input, maxBuffer: 64 * 1024 * 1024, timeout: args[0] === 'run' ? 600000 : 120000 });
  if (args[0] === 'run' && r.error) report.resourceCreationUncertain = true;
  if (!tolerateFailure && (r.error || r.status !== 0)) throw Error(`docker ${args[0]}: ${r.error?.message || r.stderr?.toString().slice(0, 1500)}`);
  return r.stdout ?? Buffer.alloc(0);
}
type Cluster = { id: string; user: string; port: number };
const clusters: Cluster[] = [];
let fixtureProcessGroup: number | undefined;
function lifecycle(sourceReady = false) {
  writeFileSync(join(output, 'lifecycle.json'), JSON.stringify({ candidate, runnerPid: process.pid, sourceReady,
    fixtureProcessGroup, ownershipLabel: marker, containerIds: clusters.map(c => c.id) }) + '\n', { mode: 0o600 });
}
function assertCluster(c: Cluster) {
  const labels = JSON.parse(docker(['inspect', '--format', '{{json .Config.Labels}}', c.id]).toString());
  requireOwned(labels, marker);
}
async function cluster(user: string): Promise<Cluster> {
  const id = docker(['run', '--detach', '--pull=never', '--label', `nevora.database-rehearsal=${marker}`, '--memory=1g', '--cpus=2',
    '--tmpfs', '/var/lib/postgresql/data:rw,size=536870912', '--publish', '127.0.0.1::5432',
    '--env', `POSTGRES_USER=${user}`, '--env', 'POSTGRES_DB=postgres', '--env', 'POSTGRES_HOST_AUTH_METHOD=trust',
    '--env', 'POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=C', image]).toString().trim();
  const c = { id, user, port: 0 }; clusters.push(c); assertCluster(c);
  c.port = requireLocalPort(docker(['port', id, '5432/tcp']).toString());
  const started = performance.now(); let attempts = 0, lastErrorCode = '';
  while (performance.now() - started < 120000) {
    attempts++;
    try { const client = new Client({ host: '127.0.0.1', port: c.port, user, database: 'postgres', connectionTimeoutMillis: 3000, statement_timeout: 3000 });
      try {
        await client.connect(); await client.query('SELECT 1');
        report.clusterStartup.push({ attempts, elapsedMs: Math.round(performance.now() - started), ready: true, lastErrorCode });
        return c;
      } finally { await client.end(); }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? '';
      lastErrorCode = /^[A-Z0-9_]{1,30}$/.test(code) ? code : 'unknown';
      await delay(250);
    }
  }
  report.clusterStartup.push({ attempts, elapsedMs: Math.round(performance.now() - started), ready: false, lastErrorCode });
  writeFileSync(join(output, `postgres-startup-${clusters.length}.log`), docker(['logs', '--tail', '100', c.id], undefined, true), { mode: 0o600 });
  throw Error('Owned PostgreSQL startup timed out.');
}
function finish(interruptedBy: 'SIGINT' | 'SIGTERM' | null = null) {
  let cleanup = !report.resourceCreationUncertain;
  // A detached fixture has its own process group; stop it before removing its database.
  if (fixtureProcessGroup) {
    try { process.kill(-fixtureProcessGroup, 'SIGKILL'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') cleanup = false; }
    fixtureProcessGroup = undefined;
  }
  // Discover a partially created container too, if docker run failed after create.
  let discovered: string[] = [];
  try { discovered = docker(['ps', '--all', '--no-trunc', '--filter', `label=nevora.database-rehearsal=${marker}`, '--format', '{{.ID}}']).toString().trim().split('\n').filter(Boolean); }
  catch (error) { cleanup = false; console.error('Owned container discovery failed:', (error as Error).message); }
  const ownedIds = [...new Set([...clusters.map(c => c.id), ...discovered])];
  for (const id of ownedIds.reverse()) { try { assertCluster({ id, user: '', port: 0 }); docker(['rm', '--force', '--volumes', id]); } catch (error) { cleanup = false; console.error('Owned cleanup failed:', (error as Error).message); } }
  try { if (docker(['ps', '--all', '--filter', `label=nevora.database-rehearsal=${marker}`, '--format', '{{.ID}}']).toString().trim()) cleanup = false; }
  catch { cleanup = false; }
  let immutable = false;
  try { immutable = git('rev-parse', 'HEAD') === candidate && git('diff', '--name-only', candidate) === '' && git('diff', '--cached', '--name-only') === ''
    && JSON.stringify(harnessHashes()) === JSON.stringify(report.harnessSha256); }
  catch { /* A failed integrity check must still leave a final failure receipt. */ }
  report.interruptedBy = interruptedBy; report.sourceUnchanged = immutable;
  report.cleanup = cleanup; report.completedAt = new Date().toISOString();
  report.status = !interruptedBy && cleanup && immutable && checks.length > 0 && checks.every(c => c.status === 'PASS') && report.fixtureDiagnostics?.exitCode === 0
    && Object.keys(report.scenarios).length === 4 && Object.values(report.scenarios).every(s => s.status === 'PASS') ? 'PASS' : 'FAIL';
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(`${report.status}: ${checks.filter(c => c.status === 'PASS').length}/${checks.length} executed checks; cleanup=${cleanup}; evidence=${output}`);
  process.exitCode = report.status === 'PASS' ? 0 : 1;
}
// Node's default signal termination skips finally. Perform synchronous, label-checked
// cleanup and exit explicitly so the interrupted async scenario cannot resume.
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
  try { finish(signal); } finally { process.exit(signal === 'SIGINT' ? 130 : 143); }
});
lifecycle();
async function connect(c: Cluster, name: string) {
  assertCluster(c); assert.ok(name === 'postgres' || new RegExp(`^nevora_rehearsal_${marker.slice(0, 8)}_(fresh|legacy|prepasskeys|rollback|schema_[a-f0-9]{8})$`).test(name), 'Refusing a database outside this invocation.');
  const client = new Client({ host: '127.0.0.1', port: c.port, user: c.user, database: name, connectionTimeoutMillis: report.ownedConnectionTimeoutMillis, statement_timeout: 15000 });
  await client.connect(); await client.query("SET TIME ZONE 'UTC'; SET datestyle TO ISO,YMD");
  if (name !== 'postgres') assert.equal((await client.query("SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0].marker, `nevora-rehearsal:${marker}`, 'Database ownership marker changed.');
  return client;
}
const qid = (name: string) => '"' + name.replaceAll('"', '""') + '"';
async function database(c: Cluster, suffix: string) {
  const name = `nevora_rehearsal_${marker.slice(0, 8)}_${suffix}`;
  const admin = await connect(c, 'postgres');
  try {
    assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount, 0);
    await admin.query(`CREATE DATABASE ${qid(name)}`);
    await admin.query(`COMMENT ON DATABASE ${qid(name)} IS 'nevora-rehearsal:${marker}'`);
  } finally { await admin.end(); }
  return { name, client: await connect(c, name) };
}
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
function schemaState(c: Cluster, name: string) {
  assertCluster(c);
  return docker(['exec', c.id, 'pg_dump', '-U', c.user, '--schema-only', '--no-comments', name]).toString()
    .split('\n').filter(l => !l.startsWith('--') && !l.startsWith('\\restrict ') && !l.startsWith('\\unrestrict ') && l.trim()).join('\n');
}
async function sequenceState(client: Client) {
  return (await client.query("SELECT schemaname,sequencename,sequenceowner,data_type,start_value,min_value,max_value,increment_by,cycle,cache_size,last_value FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename")).rows;
}
/** Anchor schema equivalence to the LIVE source schema, independently of the
 * backup archive. PostgreSQL flattens associative AND CHECK nodes on reparse.
 * Reparse every original DDL statement in an empty owned database; retain all
 * functions, constraints, ACLs, ownership, policies and triggers in the compare. */
async function canonicalSchema(c: Cluster, original: string) {
  const { name, client } = await database(c, 'schema_' + randomBytes(4).toString('hex'));
  try {
    assert.equal((await client.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'")).rows[0].n, 0);
    if (/^CREATE SCHEMA public;/m.test(original)) await client.query('DROP SCHEMA public CASCADE');
    docker(['exec', '--interactive', c.id, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', c.user, '-d', name], original);
    return schemaState(c, name);
  } finally { await client.end(); }
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
}
async function restore(source: Cluster, name: string, client: Client, f: Fixture, scenario: string, upgradeLegacy = false) {
  assertCluster(source);
  const before = await tableState(client), sequences = await sequenceState(client), schema = schemaState(source, name);
  const canonical = await canonicalSchema(source, schema);
  const globals = docker(['exec', source.id, 'pg_dumpall', '-U', source.user, '--globals-only', '--no-role-passwords']);
  const dump = docker(['exec', source.id, 'pg_dump', '-U', source.user, '--format=custom', '--create', name]);
  writeFileSync(join(output, `${scenario}.dump`), dump, { mode: 0o600 });
  writeFileSync(join(output, `${scenario}.globals.sql`), globals, { mode: 0o600 });
  const target = await cluster('rehearsal_restore_' + marker.slice(0, 8));
  await check(scenario, 'backup restores roles, ownership, schema, data and sequences into a different cluster', async () => {
    assert.notEqual(target.id, source.id); assertCluster(target);
    docker(['exec', '--interactive', target.id, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', target.user, '-d', 'postgres'], globals);
    docker(['exec', '--interactive', target.id, 'pg_restore', '--exit-on-error', '--create', '-U', target.user, '--dbname=postgres'], dump);
    const restored = await connect(target, name);
    try {
      assert.deepEqual(await tableState(restored), before); assert.deepEqual(await sequenceState(restored), sequences);
      const restoredSchema = schemaState(target, name);
      writeFileSync(join(output, `${scenario}.schema-before.sql`), schema, { mode: 0o600 });
      writeFileSync(join(output, `${scenario}.schema-canonical.sql`), canonical, { mode: 0o600 });
      writeFileSync(join(output, `${scenario}.schema-restored.sql`), restoredSchema, { mode: 0o600 });
      assert.equal(sha(restoredSchema), sha(canonical), 'Restored schema differs from independently reparsed live source DDL; inspect retained schema artifacts.');
      await restored.query('SET ROLE rehearsal_reader');
      try { await restored.query('SELECT id FROM employees LIMIT 1'); await assert.rejects(() => restored.query('SELECT password_hash FROM employee_credentials'), { code: '42501' }); }
      finally { await restored.query('RESET ROLE'); }
      await check(scenario, 'logical data comparison detects a changed employee record', async () => {
        await restored.query('BEGIN');
        try {
          await restored.query("UPDATE employees SET phone='2025550199' WHERE id=$1", [ids.employee]);
          assert.notDeepEqual(await tableState(restored), before);
        } finally { await restored.query('ROLLBACK'); }
        assert.deepEqual(await tableState(restored), before);
      });
      await check(scenario, 'schema comparison detects a missing CHECK constraint', async () => {
        const constraint = (await restored.query("SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='employees'::regclass AND contype='c' AND convalidated ORDER BY conname LIMIT 1")).rows[0];
        assert.ok(constraint);
        await restored.query(`ALTER TABLE employees DROP CONSTRAINT ${qid(constraint.conname)}`);
        try { assert.notEqual(sha(schemaState(target, name)), sha(canonical)); }
        finally { await restored.query(`ALTER TABLE employees ADD CONSTRAINT ${qid(constraint.conname)} ${constraint.definition}`); }
        assert.equal(sha(schemaState(target, name)), sha(canonical));
      });
    } finally { await restored.end(); }
  });
  report.backups.push({ scenario, archiveSha256: sha(dump), archiveBytes: dump.length, globalsSha256: sha(globals), tableCount: Object.keys(before).length,
    populatedTableCount: Object.values(before).filter(v => Number(v.count) > 0).length, logicalDataSha256: sha(JSON.stringify(before)), originalSchemaSha256: sha(schema), canonicalSchemaSha256: sha(canonical), tableDigests: before });
  const restored = await connect(target, name);
  try {
    const restoredFixture = { ...f };
    if (upgradeLegacy) {
      await check(scenario, 'restored pre-upgrade backup can be upgraded without losing legacy records', async () => {
        await migrations(restored, current.slice(2)); assert.deepEqual(await tableState(restored, before), before);
      });
      await enrich(restored, restoredFixture);
    }
    await verifyBehavior(restored, restoredFixture, scenario + '-restored');
  } finally { await restored.end(); }
}
async function scenario(name: string, fn: () => Promise<void>) {
  try { await fn(); report.scenarios[name] = { status: 'PASS' }; }
  catch (error) { const message = (error as Error).message.slice(0, 1500); report.scenarios[name] = { status: 'FAIL', error: message }; console.error(`FAIL ${name}: ${message}`); }
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
async function fixtureDiagnostics(c: Cluster) {
  assertCluster(c);
  const name = `nevora_foundation_test_rehearsal_${marker.slice(0, 12)}`;
  const env = { ...process.env };
  // No inherited DB principal, SMTP account, or push credential reaches this SQL-only child.
  for (const key of Object.keys(env)) if (/DATABASE_URL|^PG(?:HOST|HOSTADDR|PORT|USER|PASSWORD|DATABASE|SERVICE|SERVICEFILE|PASSFILE)$|SMTP|VAPID|^PUSH_/.test(key)) delete env[key];
  Object.assign(env, { FUEL_TEST_DATABASE_URL: `postgresql://${c.user}@127.0.0.1:${c.port}/${name}`, FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN: 'yes',
    NEVORA_REHEARSAL_CANDIDATE: candidate, NEVORA_REHEARSAL_FIXTURE_OUTPUT: output, PUSH_DELIVERY_ENABLED: 'false' });
  const child = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--config', 'scripts/rehearsal/vitest.fixture-diagnostics.config.mts',
    '--reporter=json', '--outputFile=' + join(output, 'fixture-tests.json')], { env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  fixtureProcessGroup = child.pid; lifecycle(true);
  const result = await new Promise<{ status: number | null; error?: Error; stdout: string; stderr: string }>(done => {
    let stdout = '', stderr = '', error: Error | undefined, stopping = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      if (stopping) return;
      stopping = true;
      if (child.pid) { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already exited */ } }
      killTimer = setTimeout(() => { if (child.pid) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already exited */ } } }, 2000);
    };
    const timer = setTimeout(() => { error = Error('Fixture child exceeded its five-minute deadline.'); stop(); }, 300000);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', text => { if (stopping) return; stdout += text; if (stdout.length + stderr.length > 8 * 1024 * 1024) { error = Error('Fixture log exceeded its evidence limit.'); stop(); } });
    child.stderr.on('data', text => { if (stopping) return; stderr += text; if (stdout.length + stderr.length > 8 * 1024 * 1024) { error = Error('Fixture log exceeded its evidence limit.'); stop(); } });
    child.once('error', value => { error = value; });
    child.once('exit', status => { if (status !== 0) stop(); });
    child.once('close', status => { clearTimeout(timer); clearTimeout(killTimer); fixtureProcessGroup = undefined; done({ status, error, stdout, stderr }); });
  });
  writeFileSync(join(output, 'fixture-run.log'), (result.stdout ?? '') + (result.stderr ?? ''), { mode: 0o600 });
  const tests = existsSync(join(output, 'fixture-tests.json')) ? JSON.parse(readFileSync(join(output, 'fixture-tests.json'), 'utf8')) : {};
  const traces = readdirSync(output).filter(file => /^fixture-sql-[0-9]+\.json$/.test(file)).map(file => JSON.parse(readFileSync(join(output, file), 'utf8')) as SqlTraceReport);
  report.fixtureDiagnostics = { exitCode: result.status, passed: tests.numPassedTests ?? 0, failed: tests.numFailedTests ?? 0, traces };
  await check('fixture-diagnostics', 'two actual Clocker/Company Access fixtures initialize and dispose without hidden SQL failures', async () => {
    assert.equal(result.status, 0, `Fixture child failed (${result.error?.message ?? result.status}); inspect fixture-run.log and SQLSTATE traces.`);
    assert.equal(result.error, undefined);
    assert.equal(tests.numTotalTests, 2); assert.equal(tests.numPassedTests, 2); assert.equal(tests.numFailedTests, 0);
    assert.ok(traces.length > 0 && traces.every(trace => trace.candidate === candidate && trace.queries > 0));
    assert.deepEqual(traces.flatMap(trace => trace.failures.filter(failure => !failure.expected)), []);
    const admin = await connect(c, 'postgres');
    try { assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount, 0, 'Fixture left its database behind.'); }
    finally { await admin.end(); }
  });
  await check('fixture-diagnostics', 'controlled statement timeout retains SQLSTATE before the PIN layer masks it', () => {
    assert.ok(traces.some(trace => trace.failures.some(failure => failure.expected && failure.code === '57014')));
  });
}
let source: Cluster;
try {
  docker(['image', 'inspect', image]);
  source = await cluster('rehearsal_source_' + marker.slice(0, 8));
  report.postgres = docker(['exec', source.id, 'postgres', '--version']).toString().trim();
  lifecycle(true);
  const admin = await connect(source, 'postgres');
  try { await admin.query('CREATE ROLE rehearsal_reader NOLOGIN'); } finally { await admin.end(); }
  await scenario('fresh-install', async () => {
    const { name, client } = await database(source, 'fresh');
    try {
      await check('fresh-install', 'actual company installer configures current schema and Owner atomically', async () => {
        const created = await setupCompany(client, config);
        assert.equal((await client.query('SELECT name FROM workspaces')).rows[0].name, config.name);
        assert.equal((await client.query('SELECT workspace_id FROM company_access_adoption')).rows[0].workspace_id, created.workspaceId);
        assert.equal((await client.query('SELECT id FROM employees')).rows[0].id, ids.owner);
        assert.equal((await client.query('SELECT count(*)::int n FROM native_payroll_ledger')).rows[0].n, 0);
      });
      await check('fresh-install', 'second install refuses populated schema without altering it', async () => {
        const before = await tableState(client); await assert.rejects(() => setupCompany(client, config), /empty public schema/); assert.deepEqual(await tableState(client), before);
      });
      const f = await seedPeople(client, true);
      await check('fresh-install', 'post-adoption Manager receives no automatic Company scope', async () => { const view = await readOperationalAuthority(f.manager, executor(client)); assert.equal(view.state, 'ready'); if (view.state === 'ready') assert.equal(view.scope, null); });
      await enrich(client, f); await client.query('GRANT SELECT ON employees TO rehearsal_reader');
      await verifyBehavior(client, f, 'fresh-install'); await restore(source, name, client, f, 'fresh-install');
    } finally { await client.end(); }
  });
  await scenario('upgrade-from-0002', async () => {
    const { name, client } = await database(source, 'legacy');
    try {
      await migrations(client, base.slice(0, 2)); const f = await seedPeople(client);
      await client.query('UPDATE location_staffing_settings SET minimum_staff_per_shift=9');
      await client.query('GRANT SELECT ON employees TO rehearsal_reader');
      const before = await tableState(client);
      await restore(source, name, client, f, 'pre-upgrade-0002-backup', true);
      await check('upgrade-from-0002', 'remaining declared migrations preserve all original columns/rows and custom staffing', async () => {
        await migrations(client, current.slice(2)); assert.deepEqual(await tableState(client, before), before);
        assert.equal((await client.query('SELECT min(minimum_staff_per_shift)::int n FROM location_staffing_settings')).rows[0].n, 9);
      });
      await check('upgrade-from-0002', 'Company adoption captures only the pre-existing active Manager', async () => {
        assert.deepEqual((await client.query('SELECT employee_id FROM operational_scope_revisions ORDER BY employee_id')).rows, [{ employee_id: ids.manager }]);
      });
      await enrich(client, f); await client.query('GRANT SELECT ON employees TO rehearsal_reader');
      await verifyBehavior(client, f, 'upgrade-from-0002'); await restore(source, name, client, f, 'upgrade-from-0002');
    } finally { await client.end(); }
  });
  await scenario('upgrade-pre-passkeys', async () => {
    const { name, client } = await database(source, 'prepasskeys');
    try {
      // 0060 replaces the function introduced by 0035. Applying it to the
      // pre-passkey fixture manufactures an impossible dependency state. Keep
      // both unapplied, then upgrade every missing full filename in canonical
      // order, including the later final conversations migration.
      const priorBase = base.filter(name => !['0035_passkeys.sql', '0060_monotonic_login_fence.sql'].includes(name));
      const priorFinal = ['0031_native_payroll.sql', '0032_company_access_invitations.sql', '0042_company_invitation_lifetime.sql'];
      const missing = readMigrationPlan(process.cwd(), [...priorBase, ...priorFinal]).missing;
      assert.deepEqual(missing, ['0035_passkeys.sql', '0060_monotonic_login_fence.sql', '0062_conversations.sql'], 'Review the pre-passkey upgrade dependency chain.');
      await migrations(client, priorBase); const f = await seedPeople(client);
      await migrations(client, priorFinal); await enrich(client, f);
      const before = await tableState(client);
      await check('upgrade-pre-passkeys', 'missing passkey/login-fence/conversations chain preserves populated payroll, Company Access, credentials and sessions', async () => {
        await migrations(client, missing); assert.deepEqual(await tableState(client, before), before);
        assert.equal((await client.query('SELECT count(*)::int n FROM employee_passkeys')).rows[0].n, 0);
      });
      await enroll(client, f); await verifyBehavior(client, f, 'upgrade-pre-passkeys');
    } finally { await client.end(); }
  });
  await scenario('failed-upgrade-rollback', async () => {
    const { client } = await database(source, 'rollback');
    try {
      await migrations(client, base); await seedPeople(client); await migrations(client, ['0031_native_payroll.sql']);
      const before = await tableState(client);
      await client.query(`CREATE FUNCTION rehearsal_fail_access() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM pg_event_trigger_ddl_commands() WHERE object_identity='public.company_invitation_claim_counters') THEN RAISE EXCEPTION 'fictional_upgrade_interrupt'; END IF; END $$;
        CREATE EVENT TRIGGER rehearsal_interrupt ON ddl_command_end WHEN TAG IN ('CREATE TABLE') EXECUTE FUNCTION rehearsal_fail_access()`);
      await check('failed-upgrade-rollback', 'interrupted adoption rolls back all new access objects and preserves data', async () => {
        await assert.rejects(() => migrations(client, ['0032_company_access_invitations.sql']), /fictional_upgrade_interrupt/);
        assert.equal((await client.query("SELECT to_regclass('operational_subject_versions') AS object")).rows[0].object, null);
        assert.deepEqual(await tableState(client), before);
      });
      await client.query('DROP EVENT TRIGGER rehearsal_interrupt; DROP FUNCTION rehearsal_fail_access()');
      await check('failed-upgrade-rollback', 'clean retry succeeds after interruption is removed', async () => {
        await migrations(client, ['0032_company_access_invitations.sql']); assert.equal((await client.query('SELECT state FROM company_access_adoption')).rows[0].state, 'ENFORCED');
      });
    } finally { await client.end(); }
  });
  // Shared fixtures keep their existing 5-second SQL timeout; only this diagnostic suite gets a 120-second test budget.
  await fixtureDiagnostics(source);
} finally {
  finish();
}
