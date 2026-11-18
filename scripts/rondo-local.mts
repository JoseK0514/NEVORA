// Provider-free Rondo sandbox for UI integration. PostgreSQL and Next bind to loopback.
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { hashPassword } from '../src/lib/auth/password';
import { assignOperationalScope, readOwnerOperationalScope } from '../src/lib/company-access/operational-scope.server';
import { createOwnedNextApp } from '../src/test/integration/owned-next-app';
import { seedOwnedApp, seedOwnedScenario, TEST_PASSWORD } from '../src/test/integration/owned-app-fixture';
import { fixtureProof } from '../src/test/integration/shift-change-api';

const bin = process.env.NEVORA_TEST_PG_BIN;
const evidence = process.argv[2];
if (!bin || !isAbsolute(bin) || !evidence || !isAbsolute(evidence)) {
  throw Error('Set NEVORA_TEST_PG_BIN to a PostgreSQL bin directory and pass a new absolute evidence directory outside the repository.');
}
if (process.env.DATABASE_URL || process.env.FUEL_TEST_DATABASE_URL) {
  throw Error('Unset DATABASE_URL and FUEL_TEST_DATABASE_URL. The sandbox starts its own cluster.');
}
await Promise.all(['postgres', 'initdb', 'pg_ctl'].map(file => access(join(bin, file))));
const port = await new Promise<number>((resolve, reject) => {
  const socket = createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const address = socket.address();
    socket.close(error => error || !address || typeof address === 'string' ? reject(error ?? Error('No loopback port')) : resolve(address.port));
  });
});

const scratch = await mkdtemp(join(tmpdir(), 'nevora-rondo-pg-'));
const data = join(scratch, 'data');
const passwordFile = join(scratch, 'password');
const password = randomBytes(32).toString('hex');
const stop = new AbortController();
const cancel = () => stop.abort();
process.once('SIGINT', cancel);
process.once('SIGTERM', cancel);
function pg(command: string, args: string[]) {
  const result = spawnSync(join(bin!, command), args, { encoding: 'utf8', timeout: 45_000 });
  if (result.status !== 0) throw Error(command + ' failed: ' + (result.error?.message ?? result.stderr.trim()));
}

let app: Awaited<ReturnType<typeof createOwnedNextApp>> | undefined;
let startupAttempted = false;
try {
  await writeFile(passwordFile, password + '\n', { mode: 0o600 });
  try {
    pg('initdb', ['-D', data, '-U', 'nevora_test', '--auth=scram-sha-256', '--pwfile=' + passwordFile, '--encoding=UTF8', '--no-locale']);
  } finally {
    await rm(passwordFile, { force: true });
  }
  startupAttempted = true;
  pg('pg_ctl', ['-D', data, '-l', join(scratch, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ${scratch}`]);
  process.env.FUEL_TEST_DATABASE_URL = `postgresql://nevora_test:${password}@127.0.0.1:${port}/nevora_exchange_test_rondo_local`;
  process.env.FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN = 'yes';
  app = await createOwnedNextApp(evidence, {
    signal: stop.signal, ownerAdvisorEnabled: true, managerAdvisorEnabled: true,
    ownerAdvisorKnowledgeEnabled: true, ownerAdvisorWeeklyEnabled: true,
    ownerAdvisorBusinessImportsEnabled: true, ownerAdvisorBusinessRetrievalEnabled: false,
  });
  const { executor } = app.database;
  await seedOwnedApp(executor);
  const { week } = await seedOwnedScenario(executor, 'RONDO', 0);
  await executor.query({
    text: `INSERT INTO employees(id, first_name, last_name, phone, role, primary_location_id)
      VALUES ('QARONDOMANAGER', 'Fictional', 'Rondo Manager', '555-0198', 'MANAGER', 'loc-1')`, values: [],
  });
  await executor.query({
    text: `INSERT INTO employee_credentials(employee_id,password_hash,must_change_password)
      VALUES ('QARONDOMANAGER',$1,false)`, values: [await hashPassword(TEST_PASSWORD)],
  });
  const owner = await fixtureProof(executor, 'QAOWNER');
  const manager = await readOwnerOperationalScope(owner, 'QARONDOMANAGER', executor);
  if (manager.state !== 'ready') throw Error('Fictional Manager scope unavailable');
  const current = manager.data.current;
  const grant = await assignOperationalScope(owner, current.employeeId, {
    action: 'ASSIGN', operationId: randomUUID(), expectedEmployeeVersion: current.employeeUpdatedAt,
    expectedRoleGeneration: current.roleGeneration, expectedScopeRevision: current.scopeRevision,
    scope: { mode: 'LOCATIONS', locationIds: ['loc-1'] },
  }, executor);
  if (grant.state !== 'saved') throw Error('Fictional Manager grant was not saved');

  console.log('Rondo sandbox ' + app.url);
  console.log('Fixture sign-in IDs QAOWNER and QARONDOMANAGER. Use TEST_PASSWORD from src/test/integration/owned-app-fixture.ts.');
  console.log('Sample scheduled week ' + week + '. Ctrl-C stops both processes.');
  if (!stop.signal.aborted) await new Promise<void>(resolve => stop.signal.addEventListener('abort', () => resolve(), { once: true }));
} finally {
  try {
    await app?.close();
  } finally {
    delete process.env.FUEL_TEST_DATABASE_URL;
    delete process.env.FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN;
    const active = startupAttempted && await access(join(data, 'postmaster.pid')).then(() => true, () => false);
    if (active) pg('pg_ctl', ['-D', data, '-w', 'stop', '-m', 'fast']);
    await rm(scratch, { recursive: true, force: true });
  }
}
