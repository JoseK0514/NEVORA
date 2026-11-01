/** Supplementary synthetic-session reads on the retained Phase 2 targets only. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { createServer } from 'node:net';
const evidence = dirname(fileURLToPath(import.meta.url));
const results = JSON.parse(readFileSync(join(evidence, 'results.json'), 'utf8'));
assert.equal(results.status, 'PASS');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), results.sha);
assert(!process.env.DATABASE_URL);
const mod = (file: string) => import(pathToFileURL(join(process.cwd(), file)).href);
const rl = createInterface({ input: process.stdin, terminal: false });
console.log('Awaiting isolated rehearsal credential via stdin (never echoed).');
const secret = await new Promise<string>(resolve => rl.once('line', resolve));
rl.close(); process.stdin.pause();
const url = new URL(secret.trim());
assert.equal(url.pathname, '/nevora_release1_rehearsal');
assert.equal(url.username, 'rehearsal_owner');
assert(url.hostname.endsWith('.us-east-1.aws.neon.tech'));
url.searchParams.delete('sslmode'); url.searchParams.delete('channel_binding');
const pg = (await mod('node_modules/pg/lib/index.js')).default;
const remote = new pg.Client({ connectionString: url.href, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 15000 });
const port = await new Promise<number>((resolve,reject)=>{
 const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{
  const address=server.address() as {port:number};server.close(()=>resolve(address.port));
 });
});
const ctl = (...args: string[]) => {
  const result = spawnSync(join(process.env.NEVORA_TEST_PG_BIN!, 'pg_ctl'), args, { encoding: 'utf8', timeout: 45000 });
  assert.equal(result.status, 0, 'Owned local pg_ctl failed; inspect private logs');
};
ctl('-D', join(results.ownedRuntime, 'data'), '-l', join(results.ownedRuntime, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ${results.ownedRuntime}`);
const local = new pg.Client({ host: '127.0.0.1', port, user: 'rehearsal_owner', database: 'postgres' });
const report: any = { sha: results.sha, project: results.project, branch: results.branch, startedAt: new Date().toISOString(), status: 'RUNNING', targets: {} };
try {
 await local.connect(); await remote.connect();
 const tokenHash = randomBytes(32).toString('hex');
 for (const client of [local, remote]) {
  await client.query("SET statement_timeout='60s'; SET lock_timeout='5s'");
  assert.equal((await client.query("SELECT count(*) FROM workspaces WHERE id='workspace-rehearsal' AND name='NEVORA Release 1 Rehearsal'")).rows[0].count, '1');
  await client.query("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'REHEARSAL-OWNER',clock_timestamp()+interval '2 hours')", [tokenHash]);
 }
 process.env.DATABASE_URL = secret.trim(); process.env.NEVORA_PAYROLL_ENABLED = 'true';
 const { neonNotificationExecutor } = await mod('src/lib/data/notification-transactions.ts');
 const { listClockerDevices } = await mod('src/lib/clocker/devices.server.ts');
 const { readPayrollCapabilities, settings, runs } = await mod('src/lib/payroll/service.ts');
 const { statements, portalStatements } = await mod('src/lib/payroll/access.ts');
 // The Clocker brand imports Next UI modules. Its assertion is run in a real
 // Next server by smoke-pages.mjs, rather than importing UI into standalone Node.
 const localExecutor = {
  query: async (s: any) => (await local.query(s.text, s.values)).rows,
  transaction: async (ss: any[]) => {
   await local.query('BEGIN');
   try { const rows = []; for (const s of ss) rows.push((await local.query(s.text, s.values)).rows); await local.query('COMMIT'); return rows; }
   catch (e) { await local.query('ROLLBACK'); throw e; }
  },
 };
 const proof = { employee: { id: 'REHEARSAL-OWNER', firstName: 'Rehearsal', lastName: 'Operator', role: 'OWNER', primaryLocationId: 'location-rehearsal' }, sessionTokenHash: tokenHash };
 for (const [name, executor] of [['local', localExecutor], ['hosted', neonNotificationExecutor()]] as const) {
  assert.equal((await listClockerDevices({ employeeId: proof.employee.id, sessionTokenHash: tokenHash }, executor)).length, 0);
  const caps = await readPayrollCapabilities(proof, executor);
  assert(caps.enabled && caps.canConfigure && caps.canReview && caps.canApprove && caps.internalCalculatorAvailable);
  const config = await settings(proof, executor); assert(config);
  const history = await runs(proof, executor); assert(history);
  assert.equal((await statements(proof, executor)).statements.length, 0);
  assert.equal((await portalStatements(proof, executor)).statements.length, 0);
  report.targets[name] = { clockerDevices: 0, payrollCapabilities: 'PASS', payrollSettings: 'PASS', payrollRuns: 'PASS', employeeStatements: 0, managementStatements: 0, reads: 6 };
 }
 const sql = readFileSync(join(evidence, 'schema-catalog.sql'), 'utf8').replaceAll("'public'", "'release_operations'");
 const a = (await local.query(sql)).rows, b = (await remote.query(sql)).rows;
 assert.deepEqual(a,b); report.operatorSchemaDiff = 0; report.operatorSchemaObjects = a.length;
 report.status = 'PASS'; report.completedAt = new Date().toISOString();
 console.log('PASS: 12 protected source reads, operator schema diff 0. Clocker brand is checked by the real page smoke.');
} catch (e: any) {
 report.status = 'FAILED'; report.error = { name: e?.name, sqlstate: e?.code ?? null, ...(e?.code==='ERR_MODULE_NOT_FOUND'?{moduleError:e.message}:{}) };
 console.error('Protected smoke stopped; inspect redacted evidence.'); process.exitCode = 1;
} finally {
 delete process.env.DATABASE_URL;
 writeFileSync(join(evidence, 'protected-smoke.json'), JSON.stringify(report,null,2)+'\n');
 await remote.end().catch(()=>{}); await local.end().catch(()=>{});
 ctl('-D', join(results.ownedRuntime, 'data'), '-w', 'stop', '-m', 'fast');
 console.log('Both rehearsal databases retained; owned runtime stopped.');
}
