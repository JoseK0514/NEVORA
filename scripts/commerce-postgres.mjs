import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
if (process.env.DATABASE_URL || process.env.NEVORA_COMMERCE_DATABASE_URL) throw Error('Unset all application/catalog database URLs for owned tests');
const bin = process.env.NEVORA_TEST_PG_BIN;
if (!bin || !existsSync(join(bin, 'initdb'))) throw Error('NEVORA_TEST_PG_BIN must point to local PostgreSQL binaries');
const owned = mkdtempSync(join(tmpdir(), 'nevora-commerce-owned-'));
const data = join(owned, 'data');
const port = await new Promise((resolve, reject) => { const s = createServer(); s.on('error', reject); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const run = (command, args) => { const r = spawnSync(join(bin, command), args, { encoding: 'utf8', timeout: 45000 }); if (r.error || r.status !== 0) throw Error(`${command} failed: ${r.error?.message ?? r.stderr}`); };
let started = false;
try {
  run('initdb', ['-D', data, '-U', 'commerce_test', '--auth=trust', '--encoding=UTF8', '--no-locale']);
  run('pg_ctl', ['-D', data, '-l', join(owned, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ${owned}`]); started = true;
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'services/commerce', ...process.argv.slice(2)], { env: { ...process.env, NEVORA_COMMERCE_TEST_URL: `postgresql://commerce_test@127.0.0.1:${port}/postgres` }, stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  if (started || existsSync(join(data, 'postmaster.pid'))) run('pg_ctl', ['-D', data, '-w', 'stop', '-m', 'fast']);
  rmSync(owned, { recursive: true, force: true });
}
