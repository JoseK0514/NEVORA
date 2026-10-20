import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';

const cli = resolve('scripts/phase-e-browser-evidence.mjs');
const owned = resolve('scripts/phase-e-owned.mjs');
const suites = ['home', 'communications', 'calendar', 'navigation', 'attention'];
const widths = [320, 375, 390, 430, 768, 1024, 1440];
const scratch: string[] = [];
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const original = 'export function queryRows() { return []; }\n';
const adapter = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
  `import {createOwnedDbAdapter} from './src/test/integration/owned-next-app.ts';process.stdout.write(createOwnedDbAdapter(${JSON.stringify(original)}));`], { encoding: 'utf8' });
function directory() { const path = realpathSync(mkdtempSync(join(tmpdir(), 'nevora-suite-evidence-'))); scratch.push(path); return path; }
function put(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value));
}
function read(path: string) { return JSON.parse(readFileSync(path, 'utf8')); }
afterEach(() => { for (const path of scratch.splice(0)) rmSync(path, { recursive: true, force: true }); });
function fixture() {
  const source = directory(), artifacts = directory(), output = directory();
  put(join(source, 'src/lib/db.ts'), original);
  execFileSync('git', ['init', '-q', source]);
  execFileSync('git', ['add', '.'], { cwd: source });
  execFileSync('git', ['-c', 'user.name=Fictional QA', '-c', 'user.email=qa@example.invalid', 'commit', '-qm', 'fixture'], { cwd: source });
  const git = (ref: string) => execFileSync('git', ['rev-parse', ref], { cwd: source, encoding: 'utf8' }).trim();
  const checkpoint = git('HEAD'), tree = git('HEAD^{tree}');
  const custody = { checkpoint, tree, sourceClean: true, hashes: { 'src/lib/db.ts': hash(original) } };
  const roots = suites.map((suite, index) => {
    const evidence = directory(), pg = join(evidence, 'owned-postgres-fixture'), app = join(evidence, 'owned-next-fixture');
    const ownerId = String(index + 1).repeat(32), appOwnerId = `app-${suite}`;
    const executions = ['chromium', 'webkit'].flatMap(engine => widths.map(width => ({
      suite, engine, width, status: 'passed', checks: [`fixture ${suite} ${engine} ${width}`],
    })));
    const ownershipFile = join(pg, 'ownership.json');
    put(ownershipFile, { ownerId, source, root: pg, data: join(pg, 'data'), checkpoint, mode: 'browser', suites: [suite], started: true, closed: true, port: 54321 });
    put(join(app, 'ownership.json'), { ownerId: appOwnerId, source, root: app, started: true, closed: true, sourceVerified: true, mirrorVerified: true, pid: 12345, port: 54322 });
    put(join(app, 'app/src/lib/db.ts'), adapter);
    put(join(app, 'source-manifest.json'), { checkpoint, hashes: custody.hashes, originalDbHash: hash(original), substitutedDbHash: hash(adapter), substitutedFiles: ['src/lib/db.ts'] });
    put(join(evidence, 'source-manifest.json'), custody);
    const common = { checkpoint, tree, sourceClean: true, ownerId, ownershipFile, ownershipClosed: true, suites: [suite], status: 'passed', errors: [] };
    put(join(evidence, 'browser-report.json'), { ...common, executions, appRoot: app, appOwnerId, sourceManifest: join(app, 'source-manifest.json') });
    put(join(evidence, 'owned-browser-report.json'), { ...common, mode: 'browser', results: [{
      suite, command: [process.execPath, '--import', 'tsx', 'scripts/phase-e-browser-qa.mjs', '--suite', suite],
      exitCode: 0, checks: executions.flatMap(row => row.checks),
      resources: ['next', 'browser-chromium', 'browser-webkit'].map((kind, i) => ({ kind, pid: 12345 + i, ppid: 12344, pgid: 12345 + i, started: 'fixture', commandHash: 'a'.repeat(64), stopped: true })),
    }] });
    return evidence;
  });
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'test', PHASE_E_EXPECTED_SHA: checkpoint, PHASE_E_ARTIFACTS_DIR: artifacts,
    PHASE_E_EVIDENCE_DIR: output, PHASE_E_CI_NEEDS_JSON: JSON.stringify({ 'phase-e-ui-suite': { result: 'success' } }) };
  const invoke = (args: string[], override = {}) => spawnSync(process.execPath, [cli, ...args], { cwd: source, env: { ...env, ...override }, encoding: 'utf8', timeout: 30_000 });
  function relocate() {
    return roots.map((root, index) => {
      const target = join(artifacts, `phase-e-browser-${checkpoint}-${suites[index]}`);
      // Home's second uploaded directory causes a different GitHub LCA layout.
      const destination = index === 0 ? join(target, 'nevora-phase-e-browser-evidence') : target;
      mkdirSync(destination, { recursive: true });
      for (const file of readdirSync(root)) {
        if (file.startsWith('owned-next-')) {
          put(join(destination, file, 'ownership.json'), read(join(root, file, 'ownership.json')));
          put(join(destination, file, 'source-manifest.json'), read(join(root, file, 'source-manifest.json')));
        } else cpSync(join(root, file), join(destination, file), { recursive: true });
      }
      if (index === 0) put(join(target, 'nevora-phase-e-home-readiness-evidence', 'check-report.json'), { status: 'passed' });
      return destination;
    });
  }
  function leaves() {
    roots.forEach((root, index) => {
      const result = invoke(['leaf', '--suite', suites[index]], { PHASE_E_EVIDENCE_DIR: root });
      expect(result.status, result.stderr).toBe(0);
    });
  }
  return { source, artifacts, output, checkpoint, roots, env, invoke, relocate, leaves };
}

it('accepts five relocated suite artifacts with 70 unique executed cells', () => {
  const f = fixture(); f.leaves(); f.relocate();
  const result = f.invoke(['aggregate']);
  expect(result.status, result.stderr).toBe(0);
  const report = read(join(f.output, 'browser-aggregate-report.json'));
  expect(report.executions).toHaveLength(70);
  expect(new Set(report.executions.map((row: { suite: string; engine: string; width: number }) => `${row.suite}/${row.engine}/${row.width}`)).size).toBe(70);
  expect(report.status).toBe('passed');
});

it('rejects a lone suite through the unchanged default full-browser verifier', () => {
  const f = fixture();
  const result = spawnSync(process.execPath, [owned, 'verify-evidence', '--suite', 'browser'], {
    cwd: f.source, env: { ...f.env, PHASE_E_EVIDENCE_DIR: f.roots[0] }, encoding: 'utf8',
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Mandatory Phase E suites missing');
});

it.each(['failure', 'cancelled', 'skipped', 'neutral', 'missing', 'extra'])('rejects matrix job result %s', state => {
  const f = fixture(); f.leaves(); f.relocate();
  const jobs = state === 'missing' ? {} : { 'phase-e-ui-suite': { result: state === 'extra' ? 'success' : state }, ...(state === 'extra' ? { unexpected: { result: 'success' } } : {}) };
  const result = f.invoke(['aggregate'], { PHASE_E_CI_NEEDS_JSON: JSON.stringify(jobs) });
  expect(result.status).not.toBe(0); expect(existsSync(join(f.output, 'browser-aggregate-report.json'))).toBe(false);
});

it.each(['missing-suite', 'extra-suite', 'duplicate-suite', 'missing-cell', 'duplicate-cell', 'extra-cell', 'failed-cell', 'skipped-cell', 'empty-checks', 'sha', 'tree', 'source-hash', 'mirror-hash', 'runtime-error', 'pg-open', 'next-open', 'resource-open', 'missing-resource', 'observation-failure', 'command', 'partial-command-checks', 'leaf-proof', 'missing-receipt', 'owner-mismatch', 'traversal', 'symlink', 'duplicate-layout'])('rejects relocated %s', mutation => {
  const f = fixture(); f.leaves(); const roots = f.relocate(), root = roots[0];
  const path = join(root, 'browser-report.json'), report = read(path);
  if (mutation === 'missing-suite') rmSync(dirname(root), { recursive: true });
  else if (mutation === 'extra-suite') mkdirSync(join(f.artifacts, `phase-e-browser-${f.checkpoint}-unexpected`));
  else if (mutation === 'duplicate-suite') cpSync(dirname(root), join(f.artifacts, `phase-e-browser-${f.checkpoint}-duplicate`), { recursive: true });
  else if (mutation === 'missing-cell') report.executions.pop();
  else if (mutation === 'duplicate-cell') report.executions[1] = report.executions[0];
  else if (mutation === 'extra-cell') report.executions.push({ ...report.executions[0], width: 999 });
  else if (mutation === 'failed-cell' || mutation === 'skipped-cell') report.executions[0].status = mutation === 'failed-cell' ? 'failed' : 'skipped';
  else if (mutation === 'empty-checks') report.executions[0].checks = [];
  else if (mutation === 'sha') report.checkpoint = 'a'.repeat(40);
  else if (mutation === 'tree') report.tree = 'b'.repeat(40);
  else if (mutation === 'runtime-error') report.errors = ['fixture runtime error'];
  else if (mutation === 'owner-mismatch') report.ownerId = 'f'.repeat(32);
  else if (mutation === 'traversal') report.appRoot += '/../owned-next-fixture';
  else if (mutation === 'source-hash') {
    const manifest = read(join(root, 'source-manifest.json')); manifest.hashes['src/lib/db.ts'] = '0'.repeat(64); put(join(root, 'source-manifest.json'), manifest);
  } else if (mutation === 'mirror-hash') {
    const path = join(root, 'owned-next-fixture/source-manifest.json'), value = read(path); value.substitutedDbHash = '0'.repeat(64); put(path, value);
  } else if (mutation === 'pg-open' || mutation === 'next-open') {
    const path = join(root, mutation === 'pg-open' ? 'owned-postgres-fixture/ownership.json' : 'owned-next-fixture/ownership.json');
    put(path, { ...read(path), closed: false });
  } else if (['resource-open', 'missing-resource', 'observation-failure', 'command', 'partial-command-checks'].includes(mutation)) {
    const path = join(root, 'owned-browser-report.json'), value = read(path);
    if (mutation === 'resource-open') value.results[0].resources[0].stopped = false;
    if (mutation === 'missing-resource') value.results[0].resources = [];
    if (mutation === 'observation-failure') value.results[0].observationFailure = { reason: 'UNKNOWN' };
    if (mutation === 'command') value.results[0].command[5] = 'all';
    if (mutation === 'partial-command-checks') value.results[0].checks.pop();
    put(path, value);
  } else if (mutation === 'leaf-proof') {
    const path = join(root, 'suite-verification-report.json'); put(path, { ...read(path), localMirrorVerified: false });
  } else if (mutation === 'missing-receipt') rmSync(join(root, 'owned-next-fixture/ownership.json'));
  else if (mutation === 'symlink') {
    const path = join(root, 'owned-next-fixture/ownership.json'), outside = join(directory(), 'ownership.json'); renameSync(path, outside); symlinkSync(outside, path);
  } else if (mutation === 'duplicate-layout') cpSync(join(root, 'browser-report.json'), join(dirname(root), 'browser-report.json'));
  if (mutation !== 'missing-suite') put(path, report);
  const leafPath = join(root, 'suite-verification-report.json');
  if (existsSync(leafPath)) {
    const leaf = read(leafPath);
    for (const file of Object.keys(leaf.receipts)) {
      if (existsSync(join(root, file))) leaf.receipts[file] = hash(readFileSync(join(root, file), 'utf8'));
    }
    put(leafPath, leaf);
  }
  const result = f.invoke(['aggregate']);
  expect(result.status, mutation).not.toBe(0);
  expect(existsSync(join(f.output, 'browser-aggregate-report.json'))).toBe(false);
});

it.each(['unknown', 'all'])('rejects non-leaf selector %s', suite => {
  const f = fixture(); expect(f.invoke(['leaf', '--suite', suite]).status).not.toBe(0);
});

it.each(['mirror', 'command', 'resource', 'error', 'next-owner', 'missing-cell'])('rejects local leaf %s failure before attesting mirror proof', mutation => {
  const f = fixture(), root = f.roots[0];
  if (mutation === 'mirror') put(join(root, 'owned-next-fixture/app/src/lib/db.ts'), 'tampered');
  else if (mutation === 'next-owner') {
    const path = join(root, 'owned-next-fixture/ownership.json'); put(path, { ...read(path), closed: false });
  } else if (mutation === 'missing-cell') {
    const path = join(root, 'browser-report.json'), value = read(path); value.executions.pop(); put(path, value);
  } else {
    const path = join(root, 'owned-browser-report.json'), value = read(path);
    if (mutation === 'command') value.results[0].exitCode = 1;
    if (mutation === 'resource') value.results[0].resources[0].stopped = false;
    if (mutation === 'error') value.errors.push('fixture error');
    put(path, value);
  }
  const result = f.invoke(['leaf', '--suite', 'home'], { PHASE_E_EVIDENCE_DIR: root });
  expect(result.status).not.toBe(0);
  expect(existsSync(join(root, 'suite-verification-report.json'))).toBe(false);
});

it.each(['leaf', 'aggregate'])('rejects %s without echoing untrusted artifact text', mode => {
  const f = fixture();
  if (mode === 'aggregate') f.leaves();
  const root = mode === 'leaf' ? f.roots[0] : f.relocate()[0];
  const path = join(root, 'owned-browser-report.json'), value = read(path);
  const privateArtifactText = 'fictional-private-artifact-marker.example.invalid';
  value.errors.push(privateArtifactText); put(path, value);
  const result = mode === 'leaf' ? f.invoke(['leaf', '--suite', 'home'], { PHASE_E_EVIDENCE_DIR: root }) : f.invoke(['aggregate']);
  expect(result.status).not.toBe(0);
  expect(result.stdout + result.stderr).not.toContain(privateArtifactText);
  expect(result.stderr).toBe('PHASE_E_BROWSER_EVIDENCE_INVALID\n');
});
