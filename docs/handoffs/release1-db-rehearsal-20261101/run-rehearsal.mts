/** Non-production only. Read the isolated Neon URL from stdin; never log it. */
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import assert from 'node:assert/strict';

const SHA = '83397510a83d82420a3b6526c787f43a3092a839';
const source = process.cwd();
const evidence = dirname(fileURLToPath(import.meta.url));
const pgBin = process.env.NEVORA_TEST_PG_BIN;
assert(pgBin, 'Explicit owned local PostgreSQL binaries required');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), SHA);
assert.equal(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(), '');
assert(!process.env.DATABASE_URL, 'Do not inherit an application database credential');
const mod = (file: string) => import(pathToFileURL(join(source, file)).href);
const { BASE_MIGRATIONS, FINAL_MIGRATIONS } = await mod('db/migrations/order.ts');
const files: string[] = [...BASE_MIGRATIONS, ...FINAL_MIGRATIONS];
assert.equal(files.length, 50);
assert.equal(new Set(files).size, 50);
assert.equal(BASE_MIGRATIONS.at(-1), '0043_schedule_pending_edits.sql');
assert(!files.some(x => /004[45]_|tenant_ownership/.test(x)));
const naked = new Set(['0019_payroll_export_mappings.sql', '0033_management_alert_preferences.sql', '0038_read_path_indexes.sql', '0038_clocker_pin_operation_reference.sql', '0039_clocker_review_requests.sql']);
const manifest = files.map((file, i) => {
  const sql = readFileSync(join(source, 'db/migrations', file), 'utf8');
  const begins = [...sql.matchAll(/^BEGIN;\s*$/gm)].length;
  const commits = [...sql.matchAll(/^COMMIT;\s*$/gm)].length;
  assert.equal(begins, naked.has(file) ? 0 : 1, file);
  assert.equal(commits, begins, file);
  return { ordinal: i + 1, file, sha256: createHash('sha256').update(sql).digest('hex'), wrapper: naked.has(file), sql };
});
mkdirSync(evidence, { recursive: true });
const save = (name: string, value: unknown) => writeFileSync(join(evidence, name), JSON.stringify(value, null, 2) + '\n');
save('manifest.json', manifest.map(({ sql, ...rest }) => rest));
console.log('Awaiting isolated rehearsal credential via stdin (never echoed).');
const rl = createInterface({ input: process.stdin, terminal: false });
const secret = await new Promise<string>(resolve => rl.once('line', resolve));
rl.close(); process.stdin.pause();
const remoteUrl = new URL(secret.trim());
assert.equal(decodeURIComponent(remoteUrl.pathname.slice(1)), 'nevora_release1_rehearsal');
assert(remoteUrl.hostname.endsWith('.us-east-1.aws.neon.tech'));
assert.equal(remoteUrl.username, 'rehearsal_owner');
// Custody: this URL is obtained from Neon project frosty-frog-31490398,
// branch br-falling-morning-b8lkw1f9, not a preview or production environment.
const pg = (await mod('node_modules/pg/lib/index.js')).default;
remoteUrl.searchParams.delete('sslmode');
remoteUrl.searchParams.delete('channel_binding');
const remote = new pg.Client({ connectionString: remoteUrl.href, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 15000 });
const owned = mkdtempSync(join(tmpdir(), 'nevora-release1-rehearsal-'));
writeFileSync(join(owned, 'ownership.json'), JSON.stringify({ sha: SHA, purpose: 'release1-rehearsal', createdAt: new Date().toISOString() }), { mode: 0o600 });
const runPg = (binary: string, args: string[]) => {
  const result = spawnSync(join(pgBin!, binary), args, { encoding: 'utf8', timeout: 45000 });
  if (result.status !== 0) throw Error(`Owned ${binary} failed; inspect private local runtime logs.`);
};
const port = await new Promise<number>((resolve, reject) => {
  const server = createServer(); server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const address = server.address() as { port: number }; server.close(() => resolve(address.port)); });
});
runPg('initdb', ['-D', join(owned, 'data'), '-U', 'rehearsal_owner', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--no-locale']);
runPg('pg_ctl', ['-D', join(owned, 'data'), '-l', join(owned, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ${owned}`]);
const local = new pg.Client({ host: '127.0.0.1', port, user: 'rehearsal_owner', database: 'postgres' });
const results: any = { sha: SHA, project: 'frosty-frog-31490398', branch: 'br-falling-morning-b8lkw1f9', database: 'nevora_release1_rehearsal', region: 'aws-us-east-1', startedAt: new Date().toISOString(), ownedRuntime: owned, targets: {}, status: 'RUNNING' };
save('results.json', results);
const ledgerDdl = `CREATE SCHEMA release_operations;
CREATE TABLE release_operations.migration_ledger (
 ordinal integer PRIMARY KEY, filename text NOT NULL UNIQUE, sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 frozen_sha text NOT NULL, operator text NOT NULL, explicit_wrapper boolean NOT NULL,
 execution_ms integer NOT NULL, applied_at timestamptz NOT NULL DEFAULT clock_timestamp());`;
const stable = (v: any): any => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
const hash = (v: any) => createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
// All application objects, excluding provider roles/ACLs/OIDs and physical storage.
// Both targets have the same separately verified operator-ledger schema.
const catalogSql = readFileSync(join(evidence, 'schema-catalog.sql'), 'utf8');
try {
  await remote.connect(); await local.connect();
  const localVersion = (await local.query('SHOW server_version')).rows[0].server_version;
  const remoteVersion = (await remote.query('SHOW server_version')).rows[0].server_version;
  results.versions = { local: localVersion, hosted: remoteVersion };
  const { hashPassword } = await mod('src/lib/auth/password.ts');
  const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
  for (const [name, client] of [['hosted', remote], ['local', local]] as const) {
    const steps: any[] = []; results.targets[name] = { steps };
    await client.query("SET lock_timeout='5s'; SET statement_timeout='60s'; SET idle_in_transaction_session_timeout='90s'; SET application_name='nevora-release1-rehearsal'; SET timezone='UTC'");
    const existing = await client.query("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','release_operations')");
    assert.equal(existing.rows[0].count, '0', `${name} must start empty; never reset or replay`);
    await client.query(ledgerDdl);
    for (const step of manifest) {
      if (step.ordinal === BASE_MIGRATIONS.length + 1) {
        // Same seed replacement and Owner inserts as scripts/company-setup.ts,
        // before FINAL_MIGRATIONS. This is synthetic non-production setup only.
        await client.query('BEGIN');
        try {
          await client.query('DELETE FROM location_staffing_settings; DELETE FROM locations; DELETE FROM workspaces');
          await client.query("INSERT INTO workspaces(id,name,time_zone) VALUES('workspace-rehearsal','NEVORA Release 1 Rehearsal','America/Puerto_Rico')");
          await client.query("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES('location-rehearsal','workspace-rehearsal','rehearsal','Rehearsal location','Rehearsal')");
          await client.query("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES('REHEARSAL-OWNER','Rehearsal','Operator','2025550100','rehearsal@example.invalid','OWNER','location-rehearsal')");
          await client.query("INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('REHEARSAL-OWNER','location-rehearsal')");
          await client.query("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES('REHEARSAL-OWNER',$1,false)", [passwordHash]);
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      }
      const start = performance.now();
      try {
        if (step.wrapper) await client.query('BEGIN');
        // Preserve the existing BEGIN and suppress only its final COMMIT so the
        // checksum receipt commits atomically with the original file's effects.
        await client.query(step.wrapper ? step.sql : step.sql.replace(/^COMMIT;\s*$/m, ''));
        const executionMs = Math.round(performance.now() - start);
        await client.query('INSERT INTO release_operations.migration_ledger(ordinal,filename,sha256,frozen_sha,operator,explicit_wrapper,execution_ms) VALUES($1,$2,$3,$4,$5,$6,$7)', [step.ordinal, step.file, step.sha256, SHA, 'Codex / Jose-authorized Phase 2', step.wrapper, executionMs]);
        await client.query('COMMIT');
        steps.push({ ordinal: step.ordinal, filename: step.file, executionMs, elapsedMs: Math.round(performance.now() - start), status: 'COMMITTED' });
        save('results.json', results);
        console.log(`${name} ${step.ordinal}/50 ${step.file}: committed`);
      } catch (error: any) {
        await client.query('ROLLBACK').catch(() => {});
        steps.push({ ordinal: step.ordinal, filename: step.file, status: 'FAILED', sqlstate: error?.code ?? 'unknown' });
        throw Error(`${name} migration ${step.ordinal} failed (${error?.code ?? 'unknown'}); stopped, no automatic retry.`);
      }
    }
    const ledger = (await client.query('SELECT * FROM release_operations.migration_ledger ORDER BY ordinal')).rows;
    assert.equal(ledger.length, 50);
    ledger.forEach((row: any, index: number) => {
      assert.equal(row.filename, manifest[index].file); assert.equal(row.sha256, manifest[index].sha256); assert.equal(row.frozen_sha, SHA);
    });
    save(`${name}-ledger.json`, ledger);
    await client.query('BEGIN READ ONLY');
    const catalog = (await client.query(catalogSql)).rows;
    const checks = (await client.query(`SELECT (SELECT count(*) FROM company_access_adoption WHERE state='ENFORCED') AS adoptions,
      (SELECT count(*) FROM employees) AS synthetic_users,(SELECT count(*) FROM schedules) AS schedules,
      (SELECT count(*) FROM time_entries) AS time_entries,(SELECT count(*) FROM payroll_runs) AS payroll_runs,
      (SELECT count(*) FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND (NOT i.indisvalid OR NOT i.indisready)) AS invalid_indexes,
      to_regclass('public.schedule_pending_edits')::text AS held_edits,
      to_regclass('public.owner_advisor_notebook')::text AS excluded_0044,
      to_regclass('public.owner_coverage_actions')::text AS excluded_0045`)).rows[0];
    await client.query('COMMIT');
    assert.equal(checks.adoptions, '1'); assert.equal(checks.invalid_indexes, '0'); assert.equal(checks.time_entries, '0'); assert.equal(checks.payroll_runs, '0');
    results.targets[name].verification = checks;
    results.targets[name].schemaHash = hash(catalog); results.targets[name].schemaObjects = catalog.length;
    save(`${name}-schema.json`, catalog);
  }
  const hosted = JSON.parse(readFileSync(join(evidence, 'hosted-schema.json'), 'utf8'));
  const reference = JSON.parse(readFileSync(join(evidence, 'local-schema.json'), 'utf8'));
  assert.deepEqual(stable(hosted), stable(reference), 'Application schema mismatch');
  results.schemaDiff = 0;
  const { getWorkspace } = await mod('src/lib/data/workspaces.ts');
  const { listEmployees } = await mod('src/lib/data/employees.ts');
  const { listLocations, findActiveLocationByClockerKey } = await mod('src/lib/data/locations.ts');
  const { listPositions } = await mod('src/lib/data/positions.ts');
  const smoke = async (executor: any) => {
    assert.equal((await getWorkspace(executor)).id, 'workspace-rehearsal');
    assert.equal((await listEmployees(executor)).length, 1);
    assert.equal((await listLocations({}, executor)).length, 1);
    assert.equal((await findActiveLocationByClockerKey('rehearsal', executor)).id, 'location-rehearsal');
    assert.equal(await findActiveLocationByClockerKey('missing-rehearsal', executor), null);
    assert.equal((await listPositions({}, executor)).length, 0);
  };
  await local.query('BEGIN READ ONLY');
  const localExecutor = { query: async (s: any) => (await local.query(s.text, s.values)).rows, transaction: async () => { throw Error('Smoke cannot write'); } };
  await smoke(localExecutor); await local.query('COMMIT');
  process.env.DATABASE_URL = secret.trim();
  const { neonNotificationExecutor } = await mod('src/lib/data/notification-transactions.ts');
  await smoke(neonNotificationExecutor());
  delete process.env.DATABASE_URL;
  results.smoke = { local: '6 source application reads passed in READ ONLY transaction', hosted: '6 source application reads passed via actual Neon HTTP transport', notifications: 'No dispatch/reminder/payroll worker invoked; no real users or delivery credentials' };
  results.status = 'PASS'; results.completedAt = new Date().toISOString();
  console.log('PASS: 50 hosted + 50 local migrations, exact ledger checks, schema diff 0, application smoke reads.');
} catch (error: any) {
  results.status = 'FAILED'; results.error = /^.+migration \d+ failed/.test(error?.message ?? '') ? error.message : { name: error?.name, sqlstate: error?.code ?? null, stage: 'See last committed step; no secret-bearing error text recorded' };
  console.error('Rehearsal stopped; inspect redacted results. No production changes performed.'); process.exitCode = 1;
} finally {
  save('results.json', results);
  await remote.end().catch(() => {}); await local.end().catch(() => {});
  runPg('pg_ctl', ['-D', join(owned, 'data'), '-w', 'stop', '-m', 'fast']);
  console.log('Owned local database stopped and retained; hosted rehearsal retained. Nothing deleted.');
}
