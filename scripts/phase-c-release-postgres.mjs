import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';

if (process.env.DATABASE_URL) throw new Error('Unset DATABASE_URL before running release PostgreSQL tests.');

const bin = process.env.NEVORA_TEST_PG_BIN;
if (!bin || !existsSync(join(bin, 'initdb')) || !existsSync(join(bin, 'pg_ctl'))) {
  throw new Error('NEVORA_TEST_PG_BIN must identify an existing local PostgreSQL bin directory.');
}

const suites = [
  { label: 'foundation', prefix: 'nevora_foundation_test_', command: ['npm', 'run', 'test:foundation:integration'] },
  { label: 'phase-b-authority', prefix: 'nevora_foundation_test_', command: [process.execPath, 'node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.phase-b-c-authority.config.mts'] },
  { label: 'generation', prefix: 'nevora_generation_test_', command: ['npm', 'run', 'test:generation:integration'] },
  { label: 'exchanges', prefix: 'nevora_exchange_test_', command: ['npm', 'run', 'test:exchanges:integration'] },
  { label: 'notifications', prefix: 'fuel_phase3_test_', command: ['npm', 'run', 'test:notifications:integration'] },
];

const port = await new Promise((resolvePort, reject) => {
  const socket = createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const address = socket.address();
    socket.close(() => resolvePort(address.port));
  });
});

const owned = mkdtempSync(join(tmpdir(), 'nevora-release-postgres-'));
const data = join(owned, 'data');
const marker = randomBytes(12).toString('hex');
writeFileSync(join(owned, 'owner'), marker, { mode: 0o600 });

const baseEnv = {
  ...process.env,
  CI: '1',
  NEXT_TELEMETRY_DISABLED: '1',
  PUSH_FEATURE_ENABLED: 'false',
  PUSH_DELIVERY_ENABLED: 'false',
  PUSH_TEST_DELIVERY_ENABLED: 'false',
};
delete baseEnv.DATABASE_URL;

function runPg(name, args) {
  const result = spawnSync(join(bin, name), args, { env: baseEnv, encoding: 'utf8', timeout: 45_000 });
  if (result.error || result.status !== 0) {
    throw new Error(`${name} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  }
}

let started = false;
let exitCode = 0;
try {
  runPg('initdb', ['-D', data, '-U', 'nevora_release', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--no-locale']);
  runPg('pg_ctl', ['-D', data, '-l', join(owned, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ${owned}`]);
  started = true;
  console.log('[Release PostgreSQL] New owned loopback cluster started; no existing database selected.');

  for (const [index, suite] of suites.entries()) {
    const env = {
      ...baseEnv,
      FUEL_TEST_DATABASE_URL: `postgresql://nevora_release@127.0.0.1:${port}/${suite.prefix}release_${index}_${marker.slice(0, 10)}`,
      FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN: 'yes',
    };
    console.log(`[Release PostgreSQL ${index + 1}/${suites.length}] ${suite.label}`);
    const result = spawnSync(suite.command[0], suite.command.slice(1), {
      env,
      stdio: 'inherit',
      timeout: 480_000,
    });
    if (result.error || result.status !== 0) {
      console.error(`[Release PostgreSQL] ${suite.label} failed.`);
      exitCode = result.status ?? 1;
      break;
    }
  }

} finally {
  if (started || existsSync(join(data, 'postmaster.pid'))) {
    runPg('pg_ctl', ['-D', data, '-w', 'stop', '-m', 'fast']);
    console.log('[Release PostgreSQL] Owned cluster stopped.');
  }
  rmSync(owned, { recursive: true, force: true });
}

process.exitCode = exitCode;
