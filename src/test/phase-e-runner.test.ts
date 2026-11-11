import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';

const runner = resolve('scripts/phase-e-owned.mjs');
const browserRunner = resolve('scripts/phase-e-browser-qa.mjs');
const scratch: string[] = [];
const sqlSuites = ['assignments', 'attention', 'communications-schema', 'communications', 'communication-ack', 'communication-notifications', 'home', 'calendar-tokens', 'calendar-feed', 'employee-navigation'];
const browserSuites = ['home', 'communications', 'calendar', 'navigation', 'attention'];
const widths = [320, 375, 390, 430, 768, 1024, 1440];
afterEach(() => { for (const root of scratch.splice(0)) rmSync(root, { recursive: true, force: true }); });
function directory() { const root = mkdtempSync(join(tmpdir(), 'nevora-e-runner-test-')); scratch.push(root); return root; }
function put(root: string, name: string, content: string, executable = false) {
  mkdirSync(dirname(join(root, name)), { recursive: true });
  writeFileSync(join(root, name), content, { mode: executable ? 0o700 : 0o600 });
}
function approvedAdapterFixture() {
  const original = 'export function queryRows() { return []; }\n';
  // Hand-reviewed bytes of the approved adapter, independently of its verifier.
  const adapter = `import { createOwnedPgTransport } from '../test/integration/owned-pg-transport';\nimport { ownedAppBarriers } from '../test/integration/owned-app-barriers';\nlet sql: ReturnType<typeof createOwnedPgTransport> | undefined;\nexport function getDb() {\n if (!sql) {\n  const url=process.env.NEVORA_OWNED_APP_DATABASE;\n  const identity=process.env.NEVORA_OWNED_APP_IDENTITY;\n  const directory=process.env.NEVORA_OWNED_APP_BARRIERS;\n  if(!url||!identity||!directory) throw new Error('Owned application test setup missing');\n  sql=createOwnedPgTransport(url,JSON.parse(identity),ownedAppBarriers(directory));\n }\n return sql;\n}\n${original}`;
  return { original, adapter };
}
function environment(extra: Partial<NodeJS.ProcessEnv> = {}) {
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'test', ...extra };
  return env;
}
function invoke(args: string[], env = environment(), cwd = process.cwd()) {
  return spawnSync(process.execPath, [runner, ...args], { cwd, env, encoding: 'utf8', timeout: 15_000 });
}
function evaluate(module: string, expression: string, args: string[] = []) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', `const api=await import(${JSON.stringify(module)}); ${expression}`, ...args], {
    env: environment(), encoding: 'utf8', timeout: 10_000,
  });
}
function fixture(childExit = 0) {
  const root = directory(), evidence = directory(), bin = directory(), trace = join(evidence, 'trace');
  put(root, '.gitignore', 'node_modules/\n');
  put(root, 'vitest.phase-e-integration.config.mts', 'export default {};\n');
  for (const suite of sqlSuites) put(root, `src/test/integration/phase-e-${suite === 'assignments' ? 'published-assignments' : suite}.integration.ts`, '/* fictional runner boundary fixture */\n');
  // This executable boundary verifies dispatch, env and lifecycle, not feature acceptance.
  put(root, 'node_modules/vitest/vitest.mjs', `import fs from 'node:fs';import {resolve} from 'node:path';
const a=process.argv.slice(2), output=a[a.indexOf('--outputFile')+1];
fs.appendFileSync(${JSON.stringify(trace)},JSON.stringify({args:a,suite:process.env.PHASE_E_SQL_SUITE,url:process.env.FUEL_TEST_DATABASE_URL,owner:process.env.PHASE_E_OWNER_ID,provider:process.env.PUSH_DELIVERY_ENABLED,database:process.env.DATABASE_URL})+'\\n');
if(${childExit})process.exit(${childExit});
fs.writeFileSync(output,JSON.stringify({success:true,numTotalTests:1,numPassedTests:1,numFailedTests:0,numPendingTests:0,numTodoTests:0,testResults:[{name:resolve(a.find(value=>value.endsWith('.integration.ts'))),status:'passed',assertionResults:[{status:'passed',fullName:'fictional subprocess case'}]}]}));\n`);
  put(bin, 'initdb', `#!${process.execPath}\nconst fs=require('node:fs');const a=process.argv;fs.mkdirSync(a[a.indexOf('-D')+1],{recursive:true});\n`, true);
  put(bin, 'pg_ctl', `#!${process.execPath}\nconst fs=require('node:fs'),p=require('node:path'),a=process.argv,d=a[a.indexOf('-D')+1];if(a.includes('start')){fs.writeFileSync(p.join(d,'postmaster.pid'),'fictional');fs.appendFileSync(${JSON.stringify(trace)},'START='+d+'\\n');}else if(a.includes('stop')){fs.appendFileSync(${JSON.stringify(trace)},'STOP\\n');fs.rmSync(p.join(d,'postmaster.pid'));}else process.exit(3);\n`, true);
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fictional QA', '-c', 'user.email=qa@example.invalid', 'commit', '-qm', 'fixture'], { cwd: root });
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  return { root, evidence, trace, env: environment({ NEVORA_TEST_PG_BIN: bin, PHASE_E_EXPECTED_SHA: sha, PHASE_E_EVIDENCE_DIR: evidence }) };
}

it('rejects_DATABASE_URL before starting any owned process', () => {
  const result = invoke(['sql', '--suite', 'assignments'], environment({ DATABASE_URL: 'postgresql://fixture.invalid/forbidden' }));
  expect(result.status).not.toBe(0); expect(result.stderr).toContain('Unset DATABASE_URL');
});
it('rejects an inherited test database rather than reusing it', () => {
  const result = invoke(['sql', '--suite', 'assignments'], environment({ FUEL_TEST_DATABASE_URL: 'postgresql://127.0.0.1/existing' }));
  expect(result.status).not.toBe(0); expect(result.stderr).toContain('inherited');
});
it('rejects_unowned_non_loopback_fixture before browser/runtime access', () => {
  const result = spawnSync(process.execPath, [browserRunner, '--suite', 'home'], { encoding: 'utf8', env: environment({ FUEL_TEST_DATABASE_URL: 'postgresql://fixture.invalid/nevora_exchange_test_fake' }) });
  expect(result.status).not.toBe(0); expect(result.stderr).toContain('unowned or non-loopback');
});
it('ownership_marker_required even for a loopback fixture', () => {
  const result = spawnSync(process.execPath, [browserRunner, '--suite', 'home'], { encoding: 'utf8', env: environment({ FUEL_TEST_DATABASE_URL: 'postgresql://nevora_e@127.0.0.1:5432/nevora_exchange_test_fake' }) });
  expect(result.status).not.toBe(0); expect(result.stderr).toContain('ownership marker');
});
it('propagates_child_failure and stops the invocation-owned cluster', () => {
  const f = fixture(23), result = invoke(['sql', '--suite', 'assignments'], f.env, f.root);
  expect(result.status, result.stderr).toBe(23);
  const trace = readFileSync(f.trace, 'utf8'); expect(trace).toContain('STOP');
  expect(existsSync(trace.split('\n').find(line => line.startsWith('START='))!.slice(6))).toBe(false);
  const report = JSON.parse(readFileSync(join(f.evidence, 'sql-report.json'), 'utf8'));
  expect(report.errors.length).toBeGreaterThan(0); expect(report.status).toBe('failed');
});
it.each(sqlSuites)('supports_each_allowlisted_suite: SQL %s executes only its exact config/fixture', suite => {
  const f = fixture(), result = invoke(['sql', '--suite', suite], f.env, f.root);
  expect(result.status, result.stderr).toBe(0);
  const lines = readFileSync(f.trace, 'utf8').split('\n').filter(line => line.startsWith('{')).map(line => JSON.parse(line));
  expect(lines).toHaveLength(1);
  expect(lines[0].args).toContain('vitest.phase-e-integration.config.mts');
  expect(lines[0].args).toContain(`src/test/integration/phase-e-${suite === 'assignments' ? 'published-assignments' : suite}.integration.ts`);
  expect(lines[0].suite).toBe(suite); expect(lines[0].provider).toBe('false'); expect(lines[0].database).toBeUndefined();
  expect(new URL(lines[0].url).hostname).toBe('127.0.0.1'); expect(lines[0].owner).toMatch(/^[a-f0-9]{32}$/);
  expect(new URL(lines[0].url).pathname).toMatch(suite === 'communication-notifications' ? /^\/fuel_phase3_test_/ : /^\/nevora_foundation_test_/);
});
it.each([
  ['employee-navigation', 'nevora_foundation_test_', 0],
  ['employee-navigation', 'fuel_phase3_test_', 1],
  ['assignments', 'nevora_foundation_test_', 0],
  ['assignments', 'fuel_phase3_test_', 1],
  ['communication-notifications', 'fuel_phase3_test_', 0],
  ['communication-notifications', 'nevora_foundation_test_', 1],
])('binds SQL selector %s to its owned database prefix %s', (suite, prefix, status) => {
  const root = directory(), ownerId = 'a'.repeat(32), sha = 'b'.repeat(40), marker = join(root, 'ownership.json');
  writeFileSync(marker, JSON.stringify({ ownerId, checkpoint: sha, source: process.cwd(), root, port: 54321, started: true, closed: false, mode: 'sql', suites: [suite] }));
  const env = { PHASE_E_OWNER_ID: ownerId, PHASE_E_OWNERSHIP_FILE: marker, PHASE_E_EXPECTED_SHA: sha, PHASE_E_MODE: 'sql', PHASE_E_SQL_SUITE: suite, FUEL_TEST_DATABASE_URL: `postgresql://nevora_e@127.0.0.1:54321/${prefix}e_${ownerId.slice(0, 12)}_s0` };
  expect(evaluate(runner, `api.assertOwnedFixture(${JSON.stringify(env)});`).status).toBe(status);
});
it('all dispatches all ten SQL suites without accepting unknown arguments', () => {
  const f = fixture(), result = invoke(['sql', '--suite', 'all'], f.env, f.root);
  expect(result.status, result.stderr).toBe(0);
  const suites = readFileSync(f.trace, 'utf8').split('\n').filter(line => line.startsWith('{')).map(line => JSON.parse(line).suite);
  expect(suites).toEqual(sqlSuites);
  for (const args of [['sql', '--suite', '../remote'], ['sql', '--url', 'postgresql://fixture.invalid'], ['sql', '--suite', 'home', '--ignore-no-tests']]) {
    expect(invoke(args, f.env, f.root).status).not.toBe(0);
  }
});
it.each(browserSuites)('supports_each_allowlisted_suite: browser %s fails closed while its fixture is absent', suite => {
  const f = fixture(), result = invoke(['browser', '--suite', suite], f.env, f.root);
  expect(result.status).not.toBe(0); expect(result.stderr).toContain(`phase-e-${suite}-browser-scenarios.mjs`);
  expect(existsSync(f.trace)).toBe(false);
});
it.each([...browserSuites, 'all'])('dispatches browser %s through the owned child and propagates its exit', suite => {
  const f = fixture();
  put(f.root, 'node_modules/tsx/package.json', '{"type":"module","exports":"./index.mjs"}');
  put(f.root, 'node_modules/tsx/index.mjs', '/* Loader boundary: fixture child contains no TypeScript. */');
  for (const item of browserSuites) put(f.root, `scripts/phase-e-${item}-browser-scenarios.mjs`, '/* fictional subprocess boundary only */');
  put(f.root, 'scripts/phase-e-browser-qa.mjs', `import fs from 'node:fs';import {assertOwnedFixture} from ${JSON.stringify(runner)};assertOwnedFixture();const args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(f.trace)},JSON.stringify({args,url:process.env.FUEL_TEST_DATABASE_URL,owner:process.env.PHASE_E_OWNER_ID})+'\\n');process.exit(31);`);
  execFileSync('git', ['add', '.'], { cwd: f.root });
  execFileSync('git', ['-c', 'user.name=Fictional QA', '-c', 'user.email=qa@example.invalid', 'commit', '-qm', 'browser process boundary'], { cwd: f.root });
  f.env.PHASE_E_EXPECTED_SHA = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: f.root, encoding: 'utf8' }).trim();
  const result = invoke(['browser', '--suite', suite], f.env, f.root);
  expect(result.status).toBe(31);
  const record = JSON.parse(readFileSync(f.trace, 'utf8').split('\n').find(line => line.startsWith('{'))!);
  expect(record.args).toEqual(['--suite', suite]); expect(new URL(record.url).hostname).toBe('127.0.0.1'); expect(record.owner).toMatch(/^[a-f0-9]{32}$/);
  expect(readFileSync(f.trace, 'utf8')).toContain('STOP');
});
it('absent SQL suites fail before PostgreSQL setup', () => {
  const f = fixture(); rmSync(join(f.root, 'src/test/integration/phase-e-home.integration.ts'));
  execFileSync('git', ['add', '-u'], { cwd: f.root });
  execFileSync('git', ['-c', 'user.name=Fictional QA', '-c', 'user.email=qa@example.invalid', 'commit', '-qm', 'fixture without Home'], { cwd: f.root });
  f.env.PHASE_E_EXPECTED_SHA = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: f.root, encoding: 'utf8' }).trim();
  const result = invoke(['sql', '--suite', 'home'], f.env, f.root);
  expect(result.status).not.toBe(0); expect(result.stderr).toContain('Missing required'); expect(existsSync(f.trace)).toBe(false);
});
it('refuses teardown if the invocation ownership marker is replaced', () => {
  const f = fixture();
  put(f.root, 'node_modules/vitest/vitest.mjs', `import fs from 'node:fs';const owner=JSON.parse(fs.readFileSync(process.env.PHASE_E_OWNERSHIP_FILE));owner.ownerId='0'.repeat(32);fs.writeFileSync(process.env.PHASE_E_OWNERSHIP_FILE,JSON.stringify(owner));process.exit(17);`);
  const result = invoke(['sql', '--suite', 'assignments'], f.env, f.root);
  expect(result.status).toBe(17); expect(result.stderr).toContain('refusing teardown');
  expect(readFileSync(f.trace, 'utf8')).not.toContain('STOP');
});
it('stops a partially started owned PostgreSQL process after a startup failure', () => {
  const f = fixture();
  put(f.env.NEVORA_TEST_PG_BIN!, 'pg_ctl', `#!${process.execPath}\nconst fs=require('node:fs'),p=require('node:path'),a=process.argv,d=a[a.indexOf('-D')+1];if(a.includes('start')){fs.writeFileSync(p.join(d,'postmaster.pid'),'fictional');fs.appendFileSync(${JSON.stringify(f.trace)},'START='+d+'\\n');process.exit(11);}if(a.includes('stop')){fs.appendFileSync(${JSON.stringify(f.trace)},'STOP\\n');fs.rmSync(p.join(d,'postmaster.pid'));}\n`, true);
  const result = invoke(['sql', '--suite', 'assignments'], f.env, f.root);
  expect(result.status).not.toBe(0); expect(readFileSync(f.trace, 'utf8')).toContain('STOP');
});
it('rejects zero executed tests and skipped SQL tests even when the child exits zero', () => {
  for (const report of [
    { success: true, numTotalTests: 0, numPassedTests: 0, numPendingTests: 0, testResults: [] },
    { success: true, numTotalTests: 1, numPassedTests: 0, numPendingTests: 1, testResults: [{ assertionResults: [{ status: 'pending' }] }] },
  ]) {
    const f = fixture(); put(f.root, 'node_modules/vitest/vitest.mjs', `import fs from 'node:fs';const a=process.argv;fs.writeFileSync(a[a.indexOf('--outputFile')+1],JSON.stringify(${JSON.stringify(report)}));`);
    const result = invoke(['sql', '--suite', 'assignments'], f.env, f.root);
    expect(result.status).not.toBe(0); expect(result.stderr).toContain('executed');
  }
});
it('requires exact clean source and external evidence before resource acquisition', () => {
  const f = fixture();
  for (const env of [{ ...f.env, PHASE_E_EXPECTED_SHA: '0'.repeat(40) }, { ...f.env, PHASE_E_EVIDENCE_DIR: join(f.root, 'evidence') }]) {
    expect(invoke(['sql', '--suite', 'assignments'], env, f.root).status).not.toBe(0);
  }
  put(f.root, 'untracked-source.ts', 'changed');
  expect(invoke(['sql', '--suite', 'assignments'], f.env, f.root).status).not.toBe(0);
  expect(existsSync(f.trace)).toBe(false);
});
it('accepts a tracked environment template while never forwarding application credentials', () => {
  const f = fixture(); put(f.root, '.env.example', 'DATABASE_URL=\n');
  execFileSync('git', ['add', '.env.example'], { cwd: f.root });
  execFileSync('git', ['-c', 'user.name=Fictional QA', '-c', 'user.email=qa@example.invalid', 'commit', '-qm', 'approved environment template'], { cwd: f.root });
  f.env.PHASE_E_EXPECTED_SHA = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: f.root, encoding: 'utf8' }).trim();
  const result = invoke(['sql', '--suite', 'assignments'], f.env, f.root);
  expect(result.status, result.stderr).toBe(0);
  const record = JSON.parse(readFileSync(f.trace, 'utf8').split('\n').find(line => line.startsWith('{'))!);
  expect(record.database).toBeUndefined();
});
it('source_manifest_mismatch_fails for modified source or an unapproved mirror substitution', () => {
  const source = directory(), root = directory(); execFileSync('git', ['init', '-q', source]);
  const { original, adapter } = approvedAdapterFixture();
  put(source, 'src/lib/db.ts', original); put(root, 'app/src/lib/db.ts', adapter);
  const setup = `import {createHash} from 'node:crypto';import fs from 'node:fs';const h=s=>createHash('sha256').update(s).digest('hex');const [source,root]=process.argv.slice(1);const manifest={checkpoint:'a'.repeat(40),hashes:{'src/lib/db.ts':h(${JSON.stringify(original)})},originalDbHash:h(${JSON.stringify(original)}),substitutedDbHash:h(${JSON.stringify(adapter)}),substitutedFiles:['src/lib/db.ts']};fs.writeFileSync(root+'/source-manifest.json',JSON.stringify(manifest));api.verifySourceManifest(source,root,'a'.repeat(40));`;
  expect(evaluate(runner, setup, [source, root]).status).toBe(0);
  const result = evaluate(runner, `import fs from 'node:fs';const [source,root]=process.argv.slice(1);fs.writeFileSync(root+'/app/src/lib/db.ts','tampered');api.verifySourceManifest(source,root,'a'.repeat(40));`, [source, root]);
  expect(result.status).not.toBe(0); expect(result.stderr).toContain('manifest mismatch');
});
it.each(['services/commerce/fixture.ts','db/migrations/fixture.sql'])('runtime custody rejects an omitted root input and changed mirror bytes: %s', path => {
 const source=directory(),root=directory();execFileSync('git',['init','-q',source]);const {original,adapter}=approvedAdapterFixture();
 put(source,'src/lib/db.ts',original);put(root,'app/src/lib/db.ts',adapter);put(source,path,'canonical runtime dependency');put(root,'app/'+path,'canonical runtime dependency');
 const setup=`import {createHash} from 'node:crypto';import fs from 'node:fs';const h=s=>createHash('sha256').update(s).digest('hex');const [source,root]=process.argv.slice(1);const manifest={checkpoint:'a'.repeat(40),hashes:{'src/lib/db.ts':h(${JSON.stringify(original)})},originalDbHash:h(${JSON.stringify(original)}),substitutedDbHash:h(${JSON.stringify(adapter)}),substitutedFiles:['src/lib/db.ts']};`;
 const missing=evaluate(runner,setup+`fs.writeFileSync(root+'/source-manifest.json',JSON.stringify(manifest));api.verifySourceManifest(source,root,'a'.repeat(40));`,[source,root]);expect(missing.status).not.toBe(0);expect(missing.stderr).toContain('missing runtime source');
 const complete=setup+`manifest.hashes[${JSON.stringify(path)}]=h('canonical runtime dependency');fs.writeFileSync(root+'/source-manifest.json',JSON.stringify(manifest));api.verifySourceManifest(source,root,'a'.repeat(40));`;
 expect(evaluate(runner,complete,[source,root]).status).toBe(0);
 const changed=evaluate(runner,complete+`fs.writeFileSync(root+'/app/'+${JSON.stringify(path)},'tampered');api.verifySourceManifest(source,root,'a'.repeat(40));`,[source,root]);expect(changed.status).not.toBe(0);expect(changed.stderr).toContain('manifest mismatch');
});
it('executed_engine_width_requirement_check rejects missing, skipped or failed browser executions', () => {
  const executions = ['chromium', 'webkit'].flatMap(engine => widths.map(width => ({ suite: 'home', engine, width, status: 'passed', checks: ['fictional exercised case'] })));
  for (const records of [executions, executions.slice(1), executions.map((record, index) => index ? record : { ...record, status: 'skipped' }), executions.map((record, index) => index ? record : { ...record, checks: [] })]) {
    const result = evaluate(runner, `api.verifyBrowserExecutions(${JSON.stringify(records)},['home']);`);
    expect(result.status).toBe(records === executions ? 0 : 1);
  }
});
it('a skipped required E or D job fails CI evidence acceptance on the exact candidate', () => {
  const jobs: Record<string, { result: string }> = Object.fromEntries(['validate', 'clocker-postgres', 'release-postgres', 'phase-d-attendance-ui', 'management-review-ui', 'phase-e-postgres', 'phase-e-ui'].map(name => [name, { result: 'success' }]));
  expect(evaluate(runner, `api.verifyRequiredJobs(${JSON.stringify(jobs)});`).status).toBe(0);
  for (const name of ['phase-d-attendance-ui', 'management-review-ui', 'phase-e-postgres', 'phase-e-ui']) {
    const skipped = { ...jobs, [name]: { result: 'skipped' } };
    expect(evaluate(runner, `api.verifyRequiredJobs(${JSON.stringify(skipped)});`).status).not.toBe(0);
  }
});
it.each(['manifest', 'ownership'])('evidence acceptance rejects modified %s custody', mutation => {
  const f = fixture(); expect(invoke(['sql', '--suite', 'all'], f.env, f.root).status).toBe(0);
  const report = JSON.parse(readFileSync(join(f.evidence, 'sql-report.json'), 'utf8'));
  if (mutation === 'manifest') writeFileSync(join(f.evidence, 'source-manifest.json'), '{}');
  else rmSync(report.ownershipFile);
  const result = invoke(['verify-evidence', '--suite', 'sql'], f.env, f.root);
  expect(result.status).not.toBe(0);
});
it('rejects a successful unrelated SQL fixture during execution', () => {
  const f = fixture();
  const child = readFileSync(join(f.root, 'node_modules/vitest/vitest.mjs'), 'utf8').replace("a.find(value=>value.endsWith('.integration.ts'))", "'src/test/integration/phase-e-home.integration.ts'");
  put(f.root, 'node_modules/vitest/vitest.mjs', child);
  const result = invoke(['sql', '--suite', 'assignments'], f.env, f.root);
  expect(result.status).not.toBe(0); expect(result.stderr).toContain('owning fixture');
});
it.each(['fixture', 'duplicate-selector', 'command', 'case-identity'])('later SQL evidence rejects %s substitution', mutation => {
  const f = fixture(); expect(invoke(['sql', '--suite', 'all'], f.env, f.root).status).toBe(0);
  const path = join(f.evidence, 'sql-report.json'), report = JSON.parse(readFileSync(path, 'utf8'));
  if (mutation === 'fixture') {
    writeFileSync(join(f.evidence, 'sql-assignments.json'), readFileSync(join(f.evidence, 'sql-home.json')));
  } else if (mutation === 'duplicate-selector') report.results[1].suite = report.results[0].suite;
  else if (mutation === 'command') report.results[0].command[5] = 'src/test/integration/phase-e-home.integration.ts';
  else report.results[0].checks = ['unexecuted copied case'];
  writeFileSync(path, JSON.stringify(report));
  const result = invoke(['verify-evidence', '--suite', 'sql'], f.env, f.root);
  expect(result.status).not.toBe(0);
});
it('rejects changing both the mirror DB adapter and its declared manifest hash', () => {
  const source = directory(), root = directory(); execFileSync('git', ['init', '-q', source]);
  const { original, adapter } = approvedAdapterFixture();
  put(source, 'src/lib/db.ts', original); put(root, 'app/src/lib/db.ts', adapter);
  const setup = `import {createHash} from 'node:crypto';import fs from 'node:fs';const h=s=>createHash('sha256').update(s).digest('hex');const [source,root]=process.argv.slice(1);const manifest={checkpoint:'a'.repeat(40),hashes:{'src/lib/db.ts':h(${JSON.stringify(original)})},originalDbHash:h(${JSON.stringify(original)}),substitutedDbHash:h(${JSON.stringify(adapter)}),substitutedFiles:['src/lib/db.ts']};fs.writeFileSync(root+'/source-manifest.json',JSON.stringify(manifest));api.verifySourceManifest(source,root,'a'.repeat(40));`;
  expect(evaluate(runner, setup, [source, root]).status).toBe(0);
  const result = evaluate(runner, `import {createHash} from 'node:crypto';import fs from 'node:fs';const [source,root]=process.argv.slice(1);const m=JSON.parse(fs.readFileSync(root+'/source-manifest.json'));fs.writeFileSync(root+'/app/src/lib/db.ts','unapproved adapter');m.substitutedDbHash=createHash('sha256').update('unapproved adapter').digest('hex');fs.writeFileSync(root+'/source-manifest.json',JSON.stringify(m));api.verifySourceManifest(source,root,'a'.repeat(40));`, [source, root]);
  expect(result.status).not.toBe(0); expect(result.stderr).toContain('approved DB adapter');
});

it.each(['mirror-only', 'mirror-and-hash', 'third-line', 'extra-import'])('pins complete generated next-env bytes and rejects %s alteration', mutation => {
  const source = directory(), root = directory(); execFileSync('git', ['init', '-q', source]);
  const { original, adapter } = approvedAdapterFixture();
  const originalTypes = '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\nimport "./.next/types/routes.d.ts";\nimport "./.next/types/root-params.d.ts";\n\n// exact source-pinned notice\n';
  const devTypes = '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\nimport "./.next/dev/types/routes.d.ts";\nimport "./.next/dev/types/root-params.d.ts";\n\n// exact source-pinned notice\n';
  put(source, 'src/lib/db.ts', original); put(root, 'app/src/lib/db.ts', adapter);
  put(source, 'next-env.d.ts', originalTypes); put(root, 'app/next-env.d.ts', devTypes);
  const setup = `import {createHash} from 'node:crypto';import fs from 'node:fs';const h=s=>createHash('sha256').update(s).digest('hex');const [source,root]=process.argv.slice(1);const m={checkpoint:'a'.repeat(40),hashes:{'src/lib/db.ts':h(${JSON.stringify(original)}),'next-env.d.ts':h(${JSON.stringify(originalTypes)})},originalDbHash:h(${JSON.stringify(original)}),substitutedDbHash:h(${JSON.stringify(adapter)}),substitutedFiles:['src/lib/db.ts','next-env.d.ts'],generatedTypeReferences:{originalHash:h(${JSON.stringify(originalTypes)}),derivedHash:h(${JSON.stringify(devTypes)}),reason:'Next 16.4.2 dev generated type-reference paths'}};fs.writeFileSync(root+'/source-manifest.json',JSON.stringify(m));api.verifySourceManifest(source,root,'a'.repeat(40));`;
  expect(evaluate(runner, setup, [source, root]).status).toBe(0);
  const changed = mutation === 'third-line' ? devTypes.replace('types/routes.d.ts', 'types/unapproved.d.ts') : mutation === 'extra-import' ? devTypes+'import "unsafe-source";\n' : devTypes.replace('exact source-pinned notice', 'changed notice');
  put(root, 'app/next-env.d.ts', changed);
  const expression = `import {createHash} from 'node:crypto';import fs from 'node:fs';const [source,root]=process.argv.slice(1);${mutation !== 'mirror-only' ? `const m=JSON.parse(fs.readFileSync(root+'/source-manifest.json'));m.generatedTypeReferences.derivedHash=createHash('sha256').update(fs.readFileSync(root+'/app/next-env.d.ts')).digest('hex');fs.writeFileSync(root+'/source-manifest.json',JSON.stringify(m));` : ''}api.verifySourceManifest(source,root,'a'.repeat(40));`;
  const result = evaluate(runner, expression, [source, root]);
  expect(result.status).not.toBe(0); expect(result.stderr).toContain('generated type references');
});

it.each(['adapter-and-hash', 'next-env-and-hash'])('later browser evidence rejects %s substitution', mutation => {
  const source = directory(), evidence = directory(), root = join(evidence, 'owned-next-fixture');
  execFileSync('git', ['init', '-q', source]);
  const { original, adapter } = approvedAdapterFixture();
  const originalTypes = `import "./.next/types/routes.d.ts";
import "./.next/types/root-params.d.ts";
// preserved source notice
`;
  const devTypes = `import "./.next/dev/types/routes.d.ts";
import "./.next/dev/types/root-params.d.ts";
// preserved source notice
`;
  put(source, 'src/lib/db.ts', original); put(root, 'app/src/lib/db.ts', adapter);
  put(source, 'next-env.d.ts', originalTypes); put(root, 'app/next-env.d.ts', devTypes);
  const executions = browserSuites.flatMap(suite => ['chromium', 'webkit'].flatMap(engine => widths.map(width => ({ suite, engine, width, status: 'passed', checks: ['fictional evidence-verifier boundary only'] }))));
  const setup = `import {createHash} from 'node:crypto';import fs from 'node:fs';import {join,resolve} from 'node:path';const h=s=>createHash('sha256').update(s).digest('hex');const [sourceArgument,evidence,root]=process.argv.slice(1);process.chdir(sourceArgument);const source=resolve(process.cwd());const checkpoint='a'.repeat(40),tree='b'.repeat(40),hashes={'src/lib/db.ts':h(${JSON.stringify(original)}),'next-env.d.ts':h(${JSON.stringify(originalTypes)})};const custody={checkpoint,tree,sourceClean:true,hashes};fs.writeFileSync(join(evidence,'source-manifest.json'),JSON.stringify(custody));const pgRoot=join(evidence,'owned-postgres-fixture');fs.mkdirSync(pgRoot);const ownershipFile=join(pgRoot,'ownership.json'),ownerId='c'.repeat(32);fs.writeFileSync(ownershipFile,JSON.stringify({ownerId,checkpoint,source,root:pgRoot,started:true,closed:true}));fs.writeFileSync(join(root,'ownership.json'),JSON.stringify({ownerId:'app-owner',source,closed:true}));const m={checkpoint,hashes,originalDbHash:hashes['src/lib/db.ts'],substitutedDbHash:h(${JSON.stringify(adapter)}),substitutedFiles:['src/lib/db.ts','next-env.d.ts'],generatedTypeReferences:{originalHash:hashes['next-env.d.ts'],derivedHash:h(${JSON.stringify(devTypes)}),reason:'Next 16.4.2 dev generated type-reference paths'}};fs.writeFileSync(join(root,'source-manifest.json'),JSON.stringify(m));fs.writeFileSync(join(evidence,'browser-report.json'),JSON.stringify({checkpoint,tree,sourceClean:true,status:'passed',errors:[],ownershipClosed:true,suites:${JSON.stringify(browserSuites)},ownerId,ownershipFile,appRoot:root,appOwnerId:'app-owner',executions:${JSON.stringify(executions)}}));api.verifyEvidence(evidence,'browser',custody);`;
  const alteration = mutation === 'adapter-and-hash' ? `fs.writeFileSync(join(root,'app/src/lib/db.ts'),'unapproved adapter');m.substitutedDbHash=h('unapproved adapter');` : `fs.writeFileSync(join(root,'app/next-env.d.ts'),${JSON.stringify(devTypes.replace('preserved', 'changed'))});m.generatedTypeReferences.derivedHash=h(fs.readFileSync(join(root,'app/next-env.d.ts')));`;
  const result = evaluate(runner, setup+alteration+`fs.writeFileSync(join(root,'source-manifest.json'),JSON.stringify(m));api.verifyEvidence(evidence,'browser',custody);`, [source, evidence, root]);
  expect(result.status).not.toBe(0); expect(result.stderr).toContain(mutation === 'adapter-and-hash' ? 'approved DB adapter' : 'generated type references');
});

it.each(['missing', 'duplicate'])('refuses a %s original Next type import when deriving the allowed dev bytes', mutation => {
  const source = directory(), root = directory(); execFileSync('git', ['init', '-q', source]);
  const { original, adapter } = approvedAdapterFixture();
  const types = mutation === 'missing' ? 'import "./.next/types/routes.d.ts";\n' : 'import "./.next/types/routes.d.ts";\nimport "./.next/types/routes.d.ts";\nimport "./.next/types/root-params.d.ts";\n';
  put(source, 'src/lib/db.ts', original); put(root, 'app/src/lib/db.ts', adapter);
  put(source, 'next-env.d.ts', types); put(root, 'app/next-env.d.ts', types);
  const result = evaluate(runner, `import {createHash} from 'node:crypto';import fs from 'node:fs';const h=s=>createHash('sha256').update(s).digest('hex');const [source,root]=process.argv.slice(1);fs.writeFileSync(root+'/source-manifest.json',JSON.stringify({checkpoint:'a'.repeat(40),hashes:{'src/lib/db.ts':h(${JSON.stringify(original)}),'next-env.d.ts':h(${JSON.stringify(types)})},originalDbHash:h(${JSON.stringify(original)}),substitutedDbHash:h(${JSON.stringify(adapter)}),substitutedFiles:['src/lib/db.ts','next-env.d.ts']}));api.verifySourceManifest(source,root,'a'.repeat(40));`, [source, root]);
  expect(result.status).not.toBe(0); expect(result.stderr).toContain('generated type references source imports');
});

const require = createRequire(resolve('package.json'));
type Job = { if?: string; needs?: string[]; steps: { run?: string; uses?: string; with?: Record<string, string> }[] };
const workflow = require('js-yaml').load(readFileSync('.github/workflows/ci.yml', 'utf8')) as { on: Record<string, { branches: string[] }>; jobs: Record<string, Job> };
function eventMatches(event: string, branch: string) {
  return workflow.on[event].branches.some(pattern => require('minimatch')(branch, pattern));
}
function jobMatches(job: string, ref: string, head = '', base = '') {
  const values: Record<string, string> = { 'github.ref': ref, 'github.head_ref': head, 'github.base_ref': base };
  const condition = workflow.jobs[job]?.if;
  if (!condition) return true;
  if (condition === '${{ always() }}') return true;
  return condition.split(' || ').some(part => {
    const equality = part.match(/^(github\.(?:ref|head_ref|base_ref)) == '([^']+)'$/);
    if (equality) return values[equality[1]] === equality[2];
    const prefix = part.match(/^startsWith\((github\.(?:ref|head_ref|base_ref)), '([^']+)'\)$/);
    if (prefix) return values[prefix[1]].startsWith(prefix[2]);
    throw new Error('Unsupported predicate in event test: ' + part);
  });
}
it.each(['development', 'main'])('workflow verifies integrated push ref %s', branch => {
  expect(eventMatches('push', branch)).toBe(true);
});
it.each(['phase-c/punch', 'phase-d/timecards', 'codex/phase-d-audit', 'fix/authority', 'release/candidate', 'phase-e/employee', 'codex/phase-e-employee-experience-20261008', 'phase-f/tenancy', 'codex/phase-f-inventory', 'codex/par-001-remediation-20261008'])('candidate %s runs every mandatory gate through its PR without a duplicate push', branch => {
  expect(eventMatches('push', branch)).toBe(false);
  expect(eventMatches('pull_request', 'development')).toBe(true);
  for (const job of ['validate', 'clocker-postgres', 'release-postgres', 'phase-d-attendance-ui', 'management-review-ui', 'phase-e-postgres', 'phase-e-ui']) {
    expect(jobMatches(job, 'refs/pull/23/merge', branch, 'development'), job).toBe(true);
  }
});
it('workflow ignores unrelated pushes and schedules every E/D/regression job for E push and E PR', () => {
  expect(eventMatches('push', 'feature/unrelated')).toBe(false); expect(eventMatches('pull_request', 'development')).toBe(true);
  for (const [ref, head, base] of [['refs/heads/codex/phase-e-employee-experience-20261008', '', ''], ['refs/heads/phase-e/employee', '', ''], ['refs/pull/12/merge', 'codex/phase-e-employee-experience-20261008', 'development']]) {
    for (const job of ['validate', 'clocker-postgres', 'release-postgres', 'phase-d-attendance-ui', 'management-review-ui', 'phase-e-postgres', 'phase-e-ui']) expect(jobMatches(job, ref, head, base), job).toBe(true);
  }
  expect(jobMatches('phase-e-ui', 'refs/heads/fix/unrelated')).toBe(true);
});
it.each([
  ['refs/heads/development', '', ''],
  ['refs/heads/main', '', ''],
  ['refs/heads/phase-c/punch', '', ''],
  ['refs/heads/phase-d/timecards', '', ''],
  ['refs/heads/codex/phase-d-audit', '', ''],
  ['refs/heads/fix/authority', '', ''],
  ['refs/heads/release/candidate', '', ''],
  ['refs/pull/12/merge', 'feature/unrelated', 'development'],
  ['refs/pull/12/merge', 'codex/phase-e-example', 'development'],
  ['refs/pull/13/merge', 'codex/phase-f-inventory', 'main'],
])('requires every SQL/browser regression for triggered %s head=%s base=%s', (ref, head, base) => {
  for (const name of ['validate', 'clocker-postgres', 'clocker-postgres-suite', 'release-postgres', 'phase-d-attendance-ui', 'management-review-ui', 'phase-e-postgres', 'phase-e-ui', 'phase-e-ui-suite']) {
    expect(workflow.jobs[name].if, name+' must not skip branches').toBe(['phase-e-ui','clocker-postgres'].includes(name) ? '${{ always() }}' : undefined);
    expect(jobMatches(name, ref, head, base), name).toBe(true);
  }
});
it('all jobs checkout the exact candidate (the PR head, else github.sha) and acceptance depends on every required E/D job', () => {
  for (const name of Object.keys(workflow.jobs)) {
    const checkout = workflow.jobs[name].steps.find(step => step.uses?.startsWith('actions/checkout@'));
    expect(checkout?.with?.ref, name).toBe('${{ github.event.pull_request.head.sha || github.sha }}');
    expect(checkout?.with?.['persist-credentials'], name).toBe(false);
  }
  expect(workflow.jobs['phase-e-evidence'].if).toBe('${{ always() }}');
  expect(workflow.jobs['phase-e-evidence'].needs).toEqual(['validate', 'clocker-postgres', 'release-postgres', 'phase-d-attendance-ui', 'management-review-ui', 'phase-e-postgres', 'phase-e-ui']);
});
it('source safeguards hold all Git deployments through quarantine and integration', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  // Global false also holds development, main and future branch names.
  // Branch maps enable unspecified branches by default.
  expect(config.git?.deploymentEnabled).toBe(false);
});

it.each(['omitted-suite', 'budget', 'skip-aggregate', 'missing-verifier', 'duplicate-artifact', 'merge-artifacts', 'ignore-failure'])('workflow contract rejects %s', mutation => {
  const changed = require('js-yaml').load(readFileSync('.github/workflows/ci.yml', 'utf8'));
  const leaf = changed.jobs['phase-e-ui-suite'], aggregate = changed.jobs['phase-e-ui'];
  if (mutation === 'omitted-suite') leaf.strategy.matrix.suite.pop();
  if (mutation === 'budget') leaf['timeout-minutes'] = 60;
  if (mutation === 'skip-aggregate') aggregate.if = "${{ github.ref == 'refs/heads/main' }}";
  if (mutation === 'missing-verifier') leaf.steps = leaf.steps.filter((step: { run?: string }) => !step.run?.includes('phase-e-browser-evidence.mjs leaf'));
  if (mutation === 'duplicate-artifact') leaf.steps.find((step: { uses?: string }) => step.uses?.startsWith('actions/upload-artifact@')).with.name = 'phase-e-browser-${{ github.event.pull_request.head.sha || github.sha }}';
  if (mutation === 'merge-artifacts') aggregate.steps.find((step: { uses?: string }) => step.uses?.startsWith('actions/download-artifact@')).with['merge-multiple'] = true;
  if (mutation === 'ignore-failure') leaf['continue-on-error'] = true;
  const root = directory();
  put(root, '.github/workflows/ci.yml', require('js-yaml').dump(changed));
  put(root, '.github/workflows/mobile-access.yml', readFileSync('.github/workflows/mobile-access.yml','utf8'));
  put(root, 'vercel.json', readFileSync('vercel.json', 'utf8'));
  // Keep the unrelated Clocker contract baseline complete while mutating E.
  put(root, 'vitest.clocker-integration.config.mts', readFileSync('vitest.clocker-integration.config.mts', 'utf8'));
  put(root, 'scripts/clocker-sql-shards.json', readFileSync('scripts/clocker-sql-shards.json', 'utf8'));
  const clockerDirectory=join(process.cwd(),'src/test/integration');
  const clockerFiles=readdirSync(clockerDirectory).filter(name=>/^clocker-.*\.integration\.ts$/.test(name));
  for(const name of [...clockerFiles,'phase-c-release-migrations.integration.ts'])put(root,'src/test/integration/'+name,readFileSync(join(clockerDirectory,name),'utf8'));
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', resolve('scripts/release-ci-contract.check.mjs')], { cwd: root, env: environment(), encoding: 'utf8', timeout: 15_000 });
  expect(result.status, mutation).not.toBe(0);
  const rejectedControls = [...result.stdout.matchAll(/^not ok \d+ - (.+)$/gm)].map(match => match[1]);
  const suiteControl = 'five bounded leaves retain strict current-source aggregation and unique raw artifacts';
  const expectedControls = mutation === 'budget' ? ['all-browser budget fits the existing job while single-suite and SQL budgets stay bounded']
    : mutation === 'skip-aggregate' ? ['all triggered candidate branches receive mandatory SQL and browser gates', suiteControl] : [suiteControl];
  expect(rejectedControls).toEqual(expectedControls);
});
