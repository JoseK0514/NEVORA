import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// Suite owners add real fixtures at these paths. Absence never means success.
export const SQL_SUITES = Object.freeze({
  assignments: 'src/test/integration/phase-e-published-assignments.integration.ts',
  attention: 'src/test/integration/phase-e-attention.integration.ts',
  'communications-schema': 'src/test/integration/phase-e-communications-schema.integration.ts',
  communications: 'src/test/integration/phase-e-communications.integration.ts',
  'communication-ack': 'src/test/integration/phase-e-communication-ack.integration.ts',
  'communication-notifications': 'src/test/integration/phase-e-communication-notifications.integration.ts',
  home: 'src/test/integration/phase-e-home.integration.ts',
  'calendar-tokens': 'src/test/integration/phase-e-calendar-tokens.integration.ts',
  'calendar-feed': 'src/test/integration/phase-e-calendar-feed.integration.ts',
});
export const SQL_DATABASE_PREFIXES = Object.freeze({
  assignments: 'nevora_foundation_test_',
  attention: 'nevora_foundation_test_',
  'communications-schema': 'nevora_foundation_test_',
  communications: 'nevora_foundation_test_',
  'communication-ack': 'nevora_foundation_test_',
  'communication-notifications': 'fuel_phase3_test_',
  home: 'nevora_foundation_test_',
  'calendar-tokens': 'nevora_foundation_test_',
  'calendar-feed': 'nevora_foundation_test_',
});
export const BROWSER_SUITES = Object.freeze(Object.fromEntries(['home', 'communications', 'calendar', 'navigation'].map(suite => [suite, `scripts/phase-e-${suite}-browser-scenarios.mjs`])));
export const ENGINES = Object.freeze(['chromium', 'webkit']);
export const WIDTHS = Object.freeze([320, 375, 390, 430, 768, 1024, 1440]);
const REQUIRED_JOBS = ['validate', 'clocker-postgres', 'release-postgres', 'phase-d-attendance-ui', 'phase-e-postgres', 'phase-e-ui'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
export function selectSuites(mode, suite) {
  const allowed = mode === 'sql' ? SQL_SUITES : mode === 'browser' ? BROWSER_SUITES : undefined;
  if (!allowed || (suite !== 'all' && !Object.hasOwn(allowed, suite))) throw Error('Unknown Phase E mode/suite');
  return suite === 'all' ? Object.keys(allowed) : [suite];
}
export function parseSuiteArguments(args) {
  if (args.length !== 2 || args[0] !== '--suite') throw Error('Use an explicit --suite; arbitrary configs, URLs and arguments are refused');
  return args[1];
}
export function assertSuitesPresent(source, mode, suites) {
  for (const suite of suites) {
    const file = (mode === 'sql' ? SQL_SUITES : BROWSER_SUITES)[suite];
    if (!existsSync(join(source, file))) throw Error('Missing required Phase E fixture: ' + file);
  }
  if (mode === 'sql' && !existsSync(join(source, 'vitest.phase-e-integration.config.mts'))) throw Error('Missing required Phase E integration config');
}
function canonical(path) {
  if (existsSync(path)) return realpathSync(path);
  return join(canonical(dirname(path)), basename(path));
}
export function externalEvidence(source, value) {
  const outside = (base, path) => { const distance = relative(base, path); return distance === '..' || distance.startsWith('..' + sep) || isAbsolute(distance); };
  if (!value || !isAbsolute(value) || !outside(resolve(source), resolve(value)) || !outside(realpathSync(source), canonical(value))) throw Error('PHASE_E_EVIDENCE_DIR must be explicit and outside the repository');
  mkdirSync(value, { recursive: true });
  return resolve(value);
}
export function captureSource(source, expectedSha) {
  if (!/^[a-f0-9]{40}$/.test(expectedSha ?? '')) throw Error('PHASE_E_EXPECTED_SHA must identify the exact candidate');
  const git = args => execFileSync('git', args, { cwd: source, encoding: 'utf8' }).trim();
  const checkpoint = git(['rev-parse', 'HEAD']), tree = git(['rev-parse', 'HEAD^{tree}']);
  assert.equal(checkpoint, expectedSha, 'Phase E source SHA mismatch');
  assert.equal(git(['status', '--porcelain=v1']), '', 'Phase E verification requires a clean worktree');
  const files = git(['ls-files', '-z']).split('\0').filter(Boolean);
  // The repository's checked-in empty template is source custody, never a
  // runtime environment file. Owned children receive only the explicit allowlist.
  if (files.some(file => file.split('/').some(part => part.startsWith('.env') && part !== '.env.example'))) throw Error('Refusing tracked environment files in verification source');
  return { checkpoint, tree, sourceClean: true, hashes: Object.fromEntries(files.map(file => [file, hash(readFileSync(join(source, file)))])) };
}
export function assertSourceUnchanged(source, custody) {
  const current = captureSource(source, custody.checkpoint);
  assert.deepEqual(current, custody, 'Phase E source manifest mismatch after execution');
}
export function safeEnvironment(env = process.env) {
  const keys = ['PATH', 'HOME', 'TMPDIR', 'USER', 'LOGNAME', 'NEVORA_TEST_PG_BIN', 'NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE', 'NEVORA_AXE_RUNTIME_FILE', 'PLAYWRIGHT_BROWSERS_PATH'];
  return { ...Object.fromEntries(keys.filter(key => env[key] !== undefined).map(key => [key, env[key]])), CI: '1', NEXT_TELEMETRY_DISABLED: '1', PUSH_FEATURE_ENABLED: 'false', PUSH_DELIVERY_ENABLED: 'false', PUSH_TEST_DELIVERY_ENABLED: 'false' };
}
export function assertOwnedFixture(env = process.env) {
  if (env.DATABASE_URL !== undefined) throw Error('Unset DATABASE_URL before owned Phase E verification');
  let target;
  try { target = new URL(env.FUEL_TEST_DATABASE_URL); } catch { throw Error('Refusing unowned or non-loopback fixture'); }
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || target.hostname !== '127.0.0.1' || !target.port || target.search || target.hash || target.password || target.username !== 'nevora_e') throw Error('Refusing unowned or non-loopback fixture');
  if (!env.PHASE_E_OWNERSHIP_FILE || !env.PHASE_E_OWNER_ID || !existsSync(env.PHASE_E_OWNERSHIP_FILE)) throw Error('Phase E ownership marker required');
  const owner = json(env.PHASE_E_OWNERSHIP_FILE);
  const mode = env.PHASE_E_MODE;
  const prefix = mode === 'sql' && Object.hasOwn(SQL_DATABASE_PREFIXES, env.PHASE_E_SQL_SUITE ?? '') ? SQL_DATABASE_PREFIXES[env.PHASE_E_SQL_SUITE] : mode === 'browser' ? 'nevora_exchange_test_' : undefined;
  const index = mode === 'sql' && Array.isArray(owner.suites) ? owner.suites.indexOf(env.PHASE_E_SQL_SUITE) : 0;
  if (!prefix || index < 0 || owner.mode !== mode || !/^[a-f0-9]{32}$/.test(env.PHASE_E_OWNER_ID) || owner.ownerId !== env.PHASE_E_OWNER_ID || owner.started !== true || owner.closed !== false || owner.port !== Number(target.port) || owner.checkpoint !== env.PHASE_E_EXPECTED_SHA || owner.source !== resolve(process.cwd()) || decodeURIComponent(target.pathname.slice(1)) !== `${prefix}e_${owner.ownerId.slice(0, 12)}_s${index}` || resolve(env.PHASE_E_OWNERSHIP_FILE) !== join(owner.root, 'ownership.json')) throw Error('Phase E ownership marker mismatch');
  return owner;
}
export function verifySourceManifest(source, root, checkpoint) {
  const manifest = json(join(root, 'source-manifest.json'));
  if (manifest.checkpoint !== checkpoint || JSON.stringify(manifest.substitutedFiles) !== '["src/lib/db.ts"]' || !manifest.hashes || !Object.keys(manifest.hashes).length) throw Error('Source manifest mismatch');
  for (const [file, originalHash] of Object.entries(manifest.hashes)) {
    if (isAbsolute(file) || file.split('/').some(part => part === '..' || part.startsWith('.env')) || !/^[a-f0-9]{64}$/.test(originalHash)) throw Error('Source manifest mismatch: unsafe entry');
    const sourceHash = hash(readFileSync(join(source, file))), mirrorHash = hash(readFileSync(join(root, 'app', file)));
    if (sourceHash !== originalHash || mirrorHash !== (file === 'src/lib/db.ts' ? manifest.substitutedDbHash : originalHash)) throw Error('Source manifest mismatch: ' + file);
  }
  if (manifest.originalDbHash !== manifest.hashes['src/lib/db.ts']) throw Error('Source manifest mismatch: original DB');
  const files = execFileSync('git', ['ls-files', '-c', '-o', '--exclude-standard', '-z'], { cwd: source, encoding: 'utf8' }).split('\0').filter(Boolean)
    .filter(file => ['src/', 'public/'].some(prefix => file.startsWith(prefix)) || ['package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts'].includes(file))
    .filter(file => existsSync(join(source, file))).sort();
  assert.deepEqual(Object.keys(manifest.hashes).sort(), [...new Set(files)], 'Source manifest mismatch: missing runtime source');
  return manifest;
}
export function verifyBrowserExecutions(executions, suites) {
  if (!Array.isArray(executions)) throw Error('Missing executed browser evidence');
  for (const suite of suites) for (const engine of ENGINES) for (const width of WIDTHS) {
    const records = executions.filter(item => item.suite === suite && item.engine === engine && item.width === width);
    if (records.length !== 1 || records[0].status !== 'passed' || !Array.isArray(records[0].checks) || !records[0].checks.length || records[0].checks.some(check => typeof check !== 'string' || !check.trim())) throw Error(`Missing/failed executed evidence: ${suite} ${engine} ${width}`);
  }
  if (executions.length !== suites.length * ENGINES.length * WIDTHS.length) throw Error('Unexpected browser execution evidence');
}
export function verifyRequiredJobs(jobs) {
  for (const job of REQUIRED_JOBS) if (jobs?.[job]?.result !== 'success') throw Error('Required Phase E/D CI job did not pass: ' + job);
}
function verifySqlExecution(report) {
  const cases = report.testResults?.flatMap(item => item.assertionResults ?? []) ?? [];
  if (report.success !== true || !Number.isSafeInteger(report.numTotalTests) || report.numTotalTests < 1 || report.numPassedTests !== report.numTotalTests || report.numPendingTests || report.numTodoTests || report.numFailedTests || cases.length !== report.numTotalTests || cases.some(item => item.status !== 'passed')) throw Error('Required SQL suite has missing/failed/skipped executed tests');
  if (cases.some(item => typeof item.fullName !== 'string' || !item.fullName.trim())) throw Error('Missing executed SQL case identity');
  return cases.map(item => item.fullName);
}
export function verifyEvidence(evidence, kind, source) {
  const report = json(join(evidence, kind + '-report.json'));
  if (report.checkpoint !== source.checkpoint || report.tree !== source.tree || report.sourceClean !== true || report.status !== 'passed' || !Array.isArray(report.errors) || report.errors.length || report.ownershipClosed !== true) throw Error('Invalid Phase E source/clean/error/ownership evidence');
  const suites = kind === 'sql' ? Object.keys(SQL_SUITES) : Object.keys(BROWSER_SUITES);
  assert.deepEqual(report.suites, suites, 'Mandatory Phase E suites missing');
  assert.deepEqual(json(join(evidence, 'source-manifest.json')), source, 'Phase E source manifest mismatch');
  const owner = json(report.ownershipFile);
  if (owner.ownerId !== report.ownerId || owner.checkpoint !== source.checkpoint || owner.source !== resolve(process.cwd()) || owner.started !== true || owner.closed !== true || dirname(report.ownershipFile) !== owner.root || dirname(owner.root) !== evidence || !basename(owner.root).startsWith('owned-postgres-')) throw Error('Invalid Phase E ownership receipt');
  if (kind === 'browser') {
    verifyBrowserExecutions(report.executions, suites);
    verifySourceManifest(owner.source, report.appRoot, source.checkpoint);
    const appOwner = json(join(report.appRoot, 'ownership.json'));
    if (appOwner.ownerId !== report.appOwnerId || appOwner.source !== owner.source || appOwner.closed !== true || dirname(report.appRoot) !== evidence || !basename(report.appRoot).startsWith('owned-next-')) throw Error('Invalid Phase E application ownership receipt');
  }
  else {
    for (const suite of suites) verifySqlExecution(json(join(evidence, 'sql-' + suite + '.json')));
    if (report.results?.length !== suites.length || report.results.some(item => item.exitCode !== 0 || !item.checks?.length)) throw Error('Missing SQL command evidence');
  }
  return report;
}
async function availablePort() {
  return new Promise((ready, reject) => { const socket = createServer(); socket.once('error', reject); socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(error => error ? reject(error) : ready(port)); }); });
}
async function runOwned(mode, suite, source, custody, evidence) {
  const suites = selectSuites(mode, suite);
  assertSuitesPresent(source, mode, suites);
  const bin = process.env.NEVORA_TEST_PG_BIN;
  if (!bin || !existsSync(join(bin, 'initdb')) || !existsSync(join(bin, 'pg_ctl'))) throw Error('Select an existing local PostgreSQL runtime with NEVORA_TEST_PG_BIN');
  const root = mkdtempSync(join(evidence, 'owned-postgres-')), data = join(root, 'data'), ownerId = randomBytes(16).toString('hex'), port = await availablePort();
  const ownerPath = join(root, 'ownership.json');
  const owner = { ownerId, source, root, data, port, checkpoint: custody.checkpoint, mode, suites, started: false, closed: false };
  const writeOwner = () => writeFileSync(ownerPath, JSON.stringify(owner, null, 2), { mode: 0o600 });
  const assertOwner = () => assert.deepEqual(json(ownerPath), owner, 'Phase E ownership marker changed; refusing teardown');
  writeOwner(); writeFileSync(join(evidence, 'source-manifest.json'), JSON.stringify(custody, null, 2));
  const env = { ...safeEnvironment(), PHASE_E_EXPECTED_SHA: custody.checkpoint, PHASE_E_EVIDENCE_DIR: evidence, PHASE_E_OWNERSHIP_FILE: ownerPath, PHASE_E_OWNER_ID: ownerId, PHASE_E_MODE: mode, FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN: 'yes' };
  const report = { checkpoint: custody.checkpoint, tree: custody.tree, sourceClean: true, ownerId, ownershipFile: ownerPath, ownershipClosed: false, suites, mode, status: 'failed', results: [], errors: [], limitations: ['Owned local foundation verification is not hosted, client or independent phase acceptance.'] };
  let exitCode = 0;
  const runPg = (name, args) => {
    assertOwner();
    const result = spawnSync(join(bin, name), args, { env, encoding: 'utf8', timeout: 45_000 });
    writeFileSync(join(root, name + '-' + (args.includes('stop') ? 'stop' : args.includes('start') ? 'start' : 'init') + '.log'), (result.stdout ?? '') + (result.stderr ?? ''));
    if (result.error || result.status !== 0) throw Error(`${name} failed (see owned runtime log): ${result.error?.message ?? result.status}`);
  };
  try {
    runPg('initdb', ['-D', data, '-U', 'nevora_e', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--no-locale']);
    runPg('pg_ctl', ['-D', data, '-l', join(root, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ${root}`]);
    owner.started = true; writeOwner();
    for (const item of mode === 'sql' ? suites : [suite]) {
      const prefix = mode === 'sql' ? SQL_DATABASE_PREFIXES[item] : 'nevora_exchange_test_';
      const childEnv = { ...env, FUEL_TEST_DATABASE_URL: `postgresql://nevora_e@127.0.0.1:${port}/${prefix}e_${ownerId.slice(0, 12)}_s${mode === 'sql' ? suites.indexOf(item) : 0}`, PHASE_E_SQL_SUITE: item };
      const output = join(evidence, 'sql-' + item + '.json');
      rmSync(mode === 'sql' ? output : join(evidence, 'browser-report.json'), { force: true });
      const args = mode === 'sql' ? ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.phase-e-integration.config.mts', SQL_SUITES[item], '--reporter=default', '--reporter=json', '--outputFile', output] : ['--import', 'tsx', 'scripts/phase-e-browser-qa.mjs', '--suite', item];
      const result = spawnSync(process.execPath, args, { cwd: source, env: childEnv, stdio: 'inherit', timeout: mode === 'sql' ? 480_000 : 1_800_000 });
      const record = { suite: item, command: [process.execPath, ...args], exitCode: result.status ?? 1, checks: [] }; report.results.push(record);
      if (result.error || result.status !== 0) { exitCode = result.status ?? 1; throw Error(`Phase E child failed: ${item} (exit ${exitCode})`); }
      if (mode === 'sql') record.checks = verifySqlExecution(json(output));
      else {
        const browser = json(join(evidence, 'browser-report.json'));
        if (browser.checkpoint !== custody.checkpoint || browser.tree !== custody.tree || browser.sourceClean !== true || browser.ownerId !== ownerId || browser.errors.length || browser.status !== 'passed' || browser.ownershipClosed !== true) throw Error('Invalid Phase E browser child evidence');
        verifyBrowserExecutions(browser.executions, suites); record.checks = browser.executions.flatMap(item => item.checks);
      }
      assertOwner(); assertSourceUnchanged(source, custody);
    }
    report.status = 'passed';
  } catch (error) { report.errors.push(error.message); console.error(error.message); exitCode ||= 1; }
  finally {
    try {
      assertOwner();
      if (owner.started || existsSync(join(data, 'postmaster.pid'))) runPg('pg_ctl', ['-D', data, '-w', 'stop', '-m', 'fast']);
      rmSync(data, { recursive: true, force: true }); owner.closed = true; writeOwner(); report.ownershipClosed = true;
      assertSourceUnchanged(source, custody);
    } catch (error) { report.errors.push(error.message); console.error(error.message); exitCode ||= 1; report.status = 'failed'; }
    writeFileSync(join(evidence, mode === 'sql' ? 'sql-report.json' : 'owned-browser-report.json'), JSON.stringify(report, null, 2));
  }
  return exitCode;
}
async function main() {
  if (process.env.DATABASE_URL !== undefined) throw Error('Unset DATABASE_URL before owned Phase E verification');
  if (process.env.FUEL_TEST_DATABASE_URL !== undefined) throw Error('Refusing inherited FUEL_TEST_DATABASE_URL; Phase E creates its own fixture');
  const [mode, ...args] = process.argv.slice(2), source = resolve(process.cwd());
  if (!['sql', 'browser', 'verify-evidence', 'verify-ci'].includes(mode)) throw Error('Unknown Phase E mode');
  const suite = mode === 'verify-ci' ? (args.length ? (() => { throw Error('verify-ci accepts no arbitrary arguments'); })() : undefined) : parseSuiteArguments(args);
  if (['sql', 'browser'].includes(mode)) selectSuites(mode, suite);
  if (mode === 'verify-evidence' && !['sql', 'browser'].includes(suite)) throw Error('verify-evidence requires --suite sql|browser');
  const custody = captureSource(source, process.env.PHASE_E_EXPECTED_SHA), evidence = externalEvidence(source, process.env.PHASE_E_EVIDENCE_DIR);
  if (mode === 'verify-ci') {
    verifyRequiredJobs(JSON.parse(process.env.PHASE_E_CI_NEEDS_JSON ?? 'null'));
    writeFileSync(join(evidence, 'ci-report.json'), JSON.stringify({ ...custody, status: 'passed', requiredJobs: REQUIRED_JOBS }, null, 2));
  } else if (mode === 'verify-evidence') verifyEvidence(evidence, suite, custody);
  else process.exitCode = await runOwned(mode, suite, source, custody, evidence);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
