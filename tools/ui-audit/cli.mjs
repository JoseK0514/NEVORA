#!/usr/bin/env node
// NEVORA UI audit: one command over the whole app's UI. See tools/ui-audit/README.md.
//   npm run ui:audit -- [--roles owner,manager,...] [--routes /app,/app/schedule] [--widths 320,390,768,1024,1440]
//     [--text 100,200] [--browsers chromium,webkit] [--lang en,es] [--build production|dev] [--out <dir>]
//     [--baseline <dir>] [--workers 2] [--focus-stops 60] [--max-views N] [--selftest] [--report-only]
// Starts a throwaway local PostgreSQL, builds the owned test app once from the committed tree, audits every selected
// view on fictional data and writes <out>/report.json, <out>/summary.md, a screenshot per view and a crop per finding.
// Exits 1 when any fail-severity finding remains (so it can gate merges), 2 on a setup error.
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, rmSync, existsSync, chownSync, readdirSync, statSync} from 'node:fs';
import {tmpdir, userInfo} from 'node:os';
import {join, resolve, dirname, relative, isAbsolute} from 'node:path';
import {createServer} from 'node:net';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ROLE_GROUPS, DEFAULT_WIDTHS} from './routes.mjs';
import {writeReport} from './report.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes('--' + name);
const value = (name, fallback) => { const i = argv.findIndex(a => a === '--' + name || a.startsWith('--' + name + '=')); if (i < 0) return fallback; const a = argv[i]; return a.includes('=') ? a.slice(a.indexOf('=') + 1) : argv[i + 1]; };
const list = (name, fallback) => String(value(name, fallback)).split(',').map(s => s.trim()).filter(Boolean);
const fail = (message) => { console.error('ui-audit: ' + message); process.exit(2); };

if (flag('help') || flag('h')) {
  console.log(`Usage: npm run ui:audit -- [options]   (tools/ui-audit/README.md)
  --roles     ${ROLE_GROUPS.join(',')} (default: all)
  --routes    paths or substrings, comma separated (default: every route of each role, tools/ui-audit/routes.mjs)
  --widths    default ${DEFAULT_WIDTHS.join(',')}
  --text      100,200 (200% sets the root font size)        --browsers  chromium,webkit
  --lang      en (default) or en,es                          --build     production (default, https proxy) | dev
  --out       output folder outside the repository (default /tmp/nevora-ui-audit/<UTC time>)
  --baseline  an earlier --out folder: pixel diffs against its screenshots
  --workers   contexts per browser (default 2)   --focus-stops  default 60   --max-views  cap for a quick look
  --selftest  audit the injected defects in selftest/injections.mjs and check every rule catches its own
  --report-only  rebuild report.json and summary.md from an existing --out`);
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const options = {
  roles: list('roles', ROLE_GROUPS.join(',')),
  routes: list('routes', ''),
  widths: list('widths', DEFAULT_WIDTHS.join(',')).map(Number),
  text: list('text', '100,200').map(Number),
  browsers: list('browsers', 'chromium,webkit'),
  lang: list('lang', 'en'),
  build: value('build', 'production'),
  out: resolve(value('out', join(tmpdir(), 'nevora-ui-audit', stamp))),
  baseline: value('baseline', '') ? resolve(value('baseline', '')) : '',
  workers: Number(value('workers', '2')),
  focusStops: Number(value('focus-stops', '60')),
  maxViews: Number(value('max-views', '0')),
  selftest: flag('selftest'),
};
for (const r of options.roles) if (!ROLE_GROUPS.includes(r)) fail(`unknown role "${r}" (roles: ${ROLE_GROUPS.join(', ')})`);
for (const b of options.browsers) if (!['chromium', 'webkit'].includes(b)) fail(`unknown browser "${b}"`);
for (const l of options.lang) if (!['en', 'es'].includes(l)) fail(`unknown language "${l}"`);
for (const t of options.text) if (![100, 200].includes(t)) fail(`text must be 100 or 200, not ${t}`);
for (const w of options.widths) if (!(w >= 280 && w <= 2560)) fail(`width ${w} is out of range`);
if (!['production', 'dev'].includes(options.build)) fail('build must be production or dev');
const rel = relative(root, options.out);
if (!rel.startsWith('..') && !isAbsolute(rel)) fail('--out must be outside the repository (the owned app refuses evidence inside the checkout)');
if (options.baseline && !existsSync(options.baseline)) fail('--baseline folder not found');

if (flag('report-only')) process.exit(await writeReport(options.out, options));

// The owned app and PostgreSQL refuse to run as root: re-run as SCAN_USER (default postgres), as tools/ui-scan does.
if (userInfo().uid === 0) {
  const user = process.env.SCAN_USER || 'postgres';
  const uid = Number(spawnSync('id', ['-u', user], {encoding: 'utf8'}).stdout.trim());
  const gid = Number(spawnSync('id', ['-g', user], {encoding: 'utf8'}).stdout.trim());
  if (!uid) fail(`run as a non-root user, or set SCAN_USER to one (user "${user}" not found)`);
  mkdirSync(options.out, {recursive: true});
  const own = (p) => { if (!existsSync(p)) mkdirSync(p, {recursive: true}); spawnSync('chown', ['-R', `${uid}:${gid}`, p]); };
  own(options.out); own(join(root, 'node_modules/.vitest-cache')); own(join(root, '.omo/evidence'));
  for (const f of ['tsconfig.tsbuildinfo']) if (existsSync(join(root, f))) chownSync(join(root, f), uid, gid);
  const env = Object.entries(process.env).filter(([k]) => /^(NEVORA_|PLAYWRIGHT_|PATH$|LANG$)/.test(k)).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ');
  const args = process.argv.slice(2).map(a => JSON.stringify(a)).join(' ');
  const home = mkdtempSync(join(tmpdir(), 'nevora-ui-audit-home-')); spawnSync('chown', [`${uid}:${gid}`, home]);
  const cmd = `cd ${JSON.stringify(root)} && unset DATABASE_URL && export HOME=${home} GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*' ${env} && ${JSON.stringify(process.execPath)} tools/ui-audit/cli.mjs ${args} --out ${JSON.stringify(options.out)}`;
  const r = spawnSync('su', [user, '-s', '/bin/bash', '-c', cmd], {stdio: 'inherit'});
  rmSync(home, {recursive: true, force: true});
  process.exit(r.status ?? 2);
}

if (process.env.DATABASE_URL) fail('unset DATABASE_URL: the audit only uses its own throwaway database');
const bin = process.env.NEVORA_TEST_PG_BIN || '/usr/lib/postgresql/16/bin';
if (!existsSync(join(bin, 'initdb'))) fail(`PostgreSQL binaries not found at ${bin} (set NEVORA_TEST_PG_BIN)`);
mkdirSync(options.out, {recursive: true});
const port = await new Promise((ok, no) => { const s = createServer(); s.once('error', no); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const pg = mkdtempSync(join(tmpdir(), 'nevora-ui-audit-pg-'));
const run = (name, args) => { const r = spawnSync(join(bin, name), args, {encoding: 'utf8', timeout: 60000}); if (r.error || r.status !== 0) throw Error(`${name} failed: ${r.error?.message ?? r.stderr}`); };
const t0 = Date.now();
let code = 2, started = false;
try {
  run('initdb', ['-D', join(pg, 'data'), '-U', 'nevora_test', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--no-locale']);
  run('pg_ctl', ['-D', join(pg, 'data'), '-l', join(pg, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ${pg}`]);
  started = true;
  const runtime = process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE || join(root, 'tools/ci-browser-runtime/package.json');
  const env = {
    ...process.env,
    NEVORA_UI_AUDIT_OPTIONS: JSON.stringify(options),
    NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE: runtime,
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || (existsSync('/opt/pw-webkit') ? '/opt/pw-webkit' : ''),
    FUEL_TEST_DATABASE_URL: `postgresql://nevora_test@127.0.0.1:${port}/nevora_exchange_test_c1_${randomBytes(6).toString('hex')}`,
    FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN: 'yes',
  };
  if (!env.PLAYWRIGHT_BROWSERS_PATH) delete env.PLAYWRIGHT_BROWSERS_PATH;
  delete env.DATABASE_URL;
  console.log(`ui-audit: out ${options.out}`);
  const r = spawnSync(process.execPath, ['scripts/run-rstest.mjs', 'run', '--config', 'vitest.ui-audit.config.mts'], {cwd: root, env, stdio: 'inherit'});
  if (r.status !== 0) console.error(`ui-audit: the audit run exited ${r.status}; writing the report from what it recorded`);
  code = await writeReport(options.out, {...options, totalSeconds: Math.round((Date.now() - t0) / 1000)});
  if (r.status !== 0 && code === 0) code = 2;
} catch (e) {
  console.error('ui-audit: ' + (e?.message ?? e));
  code = 2;
} finally {
  if (started || existsSync(join(pg, 'data/postmaster.pid'))) { try { run('pg_ctl', ['-D', join(pg, 'data'), '-w', 'stop', '-m', 'fast']); } catch { /* already stopped */ } }
  rmSync(pg, {recursive: true, force: true});
  // The owned app's mirror is large; keep only the audit output.
  const appDir = join(options.out, 'app');
  if (existsSync(appDir)) for (const d of readdirSync(appDir)) { const p = join(appDir, d); if (statSync(p).isDirectory()) rmSync(join(p, 'app'), {recursive: true, force: true}); }
}
console.log(`ui-audit: total ${Math.round((Date.now() - t0) / 1000)}s, exit ${code}`);
process.exit(code);
