import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';

// Isolated cloud release probes only. Never select an existing application DB.
if (process.env.DATABASE_URL) throw Error('Unset DATABASE_URL before owned release probes.');
const bin = process.env.NEVORA_TEST_PG_BIN;
if (!bin || !existsSync(join(bin, 'initdb')) || !existsSync(join(bin, 'pg_ctl'))) throw Error('NEVORA_TEST_PG_BIN must name local PostgreSQL binaries.');
const port = await new Promise((resolve, reject) => {
  const server = createServer(); server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const address = server.address(); server.close(() => resolve(address.port)); });
});
const owned = mkdtempSync(join(tmpdir(), 'nevora-premium-release-'));
const data = join(owned, 'data'), marker = randomBytes(16).toString('hex');
writeFileSync(join(owned, 'owner'), marker, { mode: 0o600 });
const env = { ...process.env, CI: '1', NEXT_TELEMETRY_DISABLED: '1', PUSH_FEATURE_ENABLED: 'false', PUSH_DELIVERY_ENABLED: 'false', PUSH_TEST_DELIVERY_ENABLED: 'false', FUEL_TEST_DATABASE_URL: `postgresql://nevora_release@127.0.0.1:${port}/nevora_exchange_test_premium_${marker.slice(0, 12)}`, FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN: 'yes', NEVORA_PREMIUM_CLUSTER: owned, NEVORA_PREMIUM_CLUSTER_MARKER: marker };
delete env.DATABASE_URL;
const pg = (name, args) => {
  const result = spawnSync(join(bin, name), args, { env, encoding: 'utf8', timeout: 45000 });
  if (result.error || result.status !== 0) throw Error(`${name} failed: ${result.error?.message ?? result.stderr}`);
};
let started = false;
try {
  pg('initdb', ['-D', data, '-U', 'nevora_release', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--no-locale']);
  pg('pg_ctl', ['-D', data, '-l', join(owned, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ${owned}`]);
  started = true;
  console.log('[Premium release] New owned loopback cluster started.');
  const command = process.argv.slice(2);
  const args = command.length ? command : ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.premium-release-integration.config.mts'];
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
} finally {
  if (started || existsSync(join(data, 'postmaster.pid'))) pg('pg_ctl', ['-D', data, '-w', 'stop', '-m', 'fast']);
  console.log('[Premium release] Owned cluster stopped.');
  rmSync(owned, { recursive: true, force: true });
}
