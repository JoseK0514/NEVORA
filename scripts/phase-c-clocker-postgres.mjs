import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import {beginClockerShard,finishClockerShard,parseClockerArguments} from './clocker-sql-shards.mjs';

// This runner never connects to an existing application or test server.
if (process.env.DATABASE_URL) throw new Error('Unset DATABASE_URL before running owned Clocker tests.');
const {selection,shard}=parseClockerArguments(process.argv.slice(2));
const punchUi = selection === '--punch-ui';
const pinUi = selection === '--pins-ui';
const punchHttp = selection === '--punches-http';
const companySetup = selection === '--company-setup';
const breaksUi = selection === '--breaks-ui';
const ui = selection === '--ui' || pinUi || punchHttp || breaksUi || punchUi || companySetup;
const bin = process.env.NEVORA_TEST_PG_BIN;
if (!bin || !existsSync(join(bin, 'initdb')) || !existsSync(join(bin, 'pg_ctl'))) {
  throw new Error('NEVORA_TEST_PG_BIN must identify an existing local PostgreSQL bin directory.');
}
const shardContext=shard?beginClockerShard(shard):undefined;
const port = await new Promise((resolvePort, reject) => {
  const socket = createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const address = socket.address();
    socket.close(() => resolvePort(address.port));
  });
});
const owned = mkdtempSync(join(tmpdir(), 'nevora-clocker-owned-'));
const data = join(owned, 'data');
const marker = randomBytes(16).toString('hex');
writeFileSync(join(owned, 'owner'), marker, { mode: 0o600 });
const evidence = resolve('.superpowers/sdd/2026-10-05-nevora-phase-c-live-operations');
mkdirSync(evidence, { recursive: true });
const run = (name, args) => {
  const result = spawnSync(join(bin, name), args, { encoding: 'utf8', timeout: 45000 });
  if (result.error || result.status !== 0) throw new Error(`${name} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
};
let exitCode = 1;
let started = false;
try {
  run('initdb', ['-D', data, '-U', 'nevora_test', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--no-locale']);
  run('pg_ctl', ['-D', data, '-l', join(owned, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ${owned}`]);
  started = true;
  console.log('[C1 PostgreSQL] New owned loopback cluster started; no existing databases used.');
  const env = { ...process.env,
    NODE_ENV: 'test',
    FUEL_TEST_DATABASE_URL: `postgresql://nevora_test@127.0.0.1:${port}/${ui ? 'nevora_exchange_test_' : 'nevora_foundation_test_'}c1_${marker.slice(0, 12)}`,
    FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN: 'yes',
  };
  delete env.DATABASE_URL;
  const config = selection ?? 'vitest.clocker-integration.config.mts';
  const args = ui ? ['--import','./scripts/qa-server-context.mjs','--import','tsx',companySetup ? 'scripts/company-setup-qa.mjs' : punchUi ? 'scripts/phase-c-punch-ui-qa.mjs' : breaksUi ? 'scripts/phase-c-breaks-ui-qa.mjs' : punchHttp ? 'scripts/phase-c-punch-http-qa.mjs' : pinUi ? 'scripts/phase-c-pins-ui-qa.mjs' : 'scripts/phase-c-devices-ui-qa.mjs'] : ['node_modules/vitest/vitest.mjs', 'run', '--config', config];
  if(shardContext)args.push('--shard='+shard,'--reporter=default','--reporter=json','--outputFile',shardContext.reportPath);
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  exitCode = result.status ?? 1;
} finally {
  // pg_ctl may report failure after postmaster has already created its PID file.
  if (started || existsSync(join(data, 'postmaster.pid'))) {
    run('pg_ctl', ['-D', data, '-w', 'stop', '-m', 'fast']);
    console.log('[C1 PostgreSQL] Owned cluster stopped.');
  }
  // mkdtemp-created directory belongs exclusively to this invocation.
  rmSync(owned, { recursive: true, force: true });
  if(shardContext)finishClockerShard(shardContext,exitCode,started);
}
process.exitCode = exitCode;
