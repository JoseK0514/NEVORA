import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';

if (process.env.DATABASE_URL) {
  throw new Error('Unset DATABASE_URL before running owned D1.3 attendance UI tests.');
}

const bin = process.env.NEVORA_TEST_PG_BIN;
if (!bin || !existsSync(join(bin, 'initdb')) || !existsSync(join(bin, 'pg_ctl'))) {
  throw new Error('NEVORA_TEST_PG_BIN must identify an existing local PostgreSQL bin directory.');
}

const port = await new Promise((resolvePort, reject) => {
  const socket = createServer();
  socket.once('error', reject);
  socket.listen(0, '127.0.0.1', () => {
    const address = socket.address();
    socket.close(() => resolvePort(address.port));
  });
});

const owned = mkdtempSync(join(tmpdir(), 'nevora-d13-ui-owned-'));
const data = join(owned, 'data');
const marker = randomBytes(16).toString('hex');
writeFileSync(join(owned, 'owner'), marker, { mode: 0o600 });

const run = (name, args) => {
  const result = spawnSync(join(bin, name), args, {
    encoding: 'utf8',
    timeout: 45000,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${name} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  }
};

let started = false;
let exitCode = 1;
try {
  run('initdb', [
    '-D',
    data,
    '-U',
    'nevora_d13',
    '--auth-local=trust',
    '--auth-host=trust',
    '--encoding=UTF8',
    '--no-locale',
  ]);
  run('pg_ctl', [
    '-D',
    data,
    '-l',
    join(owned, 'postgres.log'),
    '-w',
    'start',
    '-o',
    `-h 127.0.0.1 -p ${port} -k ${owned}`,
  ]);
  started = true;
  console.log('[D1.3 PostgreSQL] New owned loopback cluster started; no existing databases used.');

  const env = {
    ...process.env,
    FUEL_TEST_DATABASE_URL:
      `postgresql://nevora_d13@127.0.0.1:${port}/nevora_exchange_test_d13_${marker.slice(0, 12)}`,
    FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN: 'yes',
  };
  delete env.DATABASE_URL;

  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/phase-d-attendance-ui-qa.mjs'],
    { env, stdio: 'inherit' },
  );
  exitCode = result.status ?? 1;
} finally {
  if (started || existsSync(join(data, 'postmaster.pid'))) {
    run('pg_ctl', ['-D', data, '-w', 'stop', '-m', 'fast']);
    console.log('[D1.3 PostgreSQL] Owned cluster stopped.');
  }
  rmSync(owned, { recursive: true, force: true });
}

process.exitCode = exitCode;
