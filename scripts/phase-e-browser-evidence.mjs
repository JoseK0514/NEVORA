import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, normalize, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertSourceUnchanged, BROWSER_SUITES, captureSource, externalEvidence, parseSuiteArguments, selectSuites, selectedBrowserEngines, verifyBrowserExecutions, verifyEvidence, verifySourceManifestMetadata } from './phase-e-owned.mjs';

const suites = Object.keys(BROWSER_SUITES);
const leaves = [
  { suite: 'home', browserEngine: 'chromium', key: 'home-chromium' },
  { suite: 'home', browserEngine: 'webkit', key: 'home-webkit' },
  ...suites.filter(suite => suite !== 'home').map(suite => ({ suite, browserEngine: undefined, key: suite })),
];
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
function absolute(value) {
  assert(typeof value === 'string' && isAbsolute(value) && normalize(value) === value && !value.includes('\\'), 'Unsafe receipt path');
  return value;
}
function passed(report, custody, suite, browserEngine) {
  assert.equal(report.checkpoint, custody.checkpoint, 'Receipt checkpoint mismatch');
  assert.equal(report.tree, custody.tree, 'Receipt tree mismatch');
  assert.equal(report.sourceClean, true, 'Missing clean source proof');
  assert.equal(report.status, 'passed', 'Failed receipt');
  assert.deepEqual(report.errors, [], 'Runtime errors');
  assert.equal(report.ownershipClosed, true, 'Unclosed ownership');
  assert.deepEqual(report.suites, [suite], 'Suite mismatch');
  assert.equal(report.browserEngine, browserEngine, 'Browser engine report mismatch');
}
function validateReceipts(root, custody, suite, browserEngine) {
  const engines = selectedBrowserEngines([suite], browserEngine);
  const browser = json(join(root, 'browser-report.json'));
  const owned = json(join(root, 'owned-browser-report.json'));
  passed(browser, custody, suite, browserEngine); passed(owned, custody, suite, browserEngine);
  assert.deepEqual(json(join(root, 'source-manifest.json')), custody, 'Checkout source mismatch');
  verifyBrowserExecutions(browser.executions, [suite], browserEngine);
  const pgRoot = dirname(absolute(browser.ownershipFile));
  const originalRoot = dirname(pgRoot), appRoot = absolute(browser.appRoot);
  assert.match(basename(pgRoot), /^owned-postgres-[A-Za-z0-9]+$/);
  assert.match(basename(appRoot), /^owned-next-[A-Za-z0-9]+$/);
  assert.equal(dirname(appRoot), originalRoot, 'Unrelated app root');
  assert.equal(browser.ownershipFile, join(pgRoot, 'ownership.json'));
  assert.equal(browser.sourceManifest, join(appRoot, 'source-manifest.json'));
  assert.equal(owned.ownershipFile, browser.ownershipFile);
  assert.equal(owned.ownerId, browser.ownerId);
  assert.equal(owned.mode, 'browser');
  const pgFile = join(basename(pgRoot), 'ownership.json');
  const appFile = join(basename(appRoot), 'ownership.json');
  const mirrorFile = join(basename(appRoot), 'source-manifest.json');
  const pg = json(join(root, pgFile)), app = json(join(root, appFile));
  assert.equal(pg.root, pgRoot); assert.equal(pg.data, join(pgRoot, 'data'));
  assert.equal(pg.ownerId, browser.ownerId); assert.match(pg.ownerId, /^[a-f0-9]{32}$/);
  assert.equal(pg.checkpoint, custody.checkpoint); assert.equal(pg.mode, 'browser');
  assert.deepEqual(pg.suites, [suite]);
  assert.equal(pg.browserEngine, browserEngine, 'Browser engine ownership mismatch');
  assert.equal(app.root, appRoot); assert.equal(app.ownerId, browser.appOwnerId);
  assert.equal(app.source, absolute(pg.source));
  for (const owner of [pg, app]) {
    assert.equal(owner.started, true); assert.equal(owner.closed, true);
    assert(Number.isSafeInteger(owner.port) && owner.port > 0 && owner.port < 65536, 'Missing owned port');
  }
  assert.equal(app.sourceVerified, true); assert.equal(app.mirrorVerified, true);
  assert(Array.isArray(owned.results) && owned.results.length === 1, 'Missing/duplicate command result');
  const result = owned.results[0];
  assert.equal(result.suite, suite); assert.equal(result.exitCode, 0);
  assert.equal(result.observationFailure, undefined, 'Resource observation failure');
  assert(Array.isArray(result.command) && result.command.length === 8);
  absolute(result.command[0]);
  assert.deepEqual(result.command.slice(1), ['--import', join(pg.source,'scripts/qa-server-context.mjs'), '--import', 'tsx', 'scripts/phase-e-browser-qa.mjs', '--suite', suite]);
  assert.deepEqual(result.checks, browser.executions.flatMap(row => row.checks), 'Partial command checks');
  assert(Array.isArray(result.resources) && result.resources.length > 0, 'Missing resource closure proof');
  assert.equal(new Set(result.resources.map(item => item.pid)).size, result.resources.length, 'Duplicate resource');
  for (const resource of result.resources) {
    assert.equal(resource.stopped, true, 'Unclosed resource');
    assert(Number.isSafeInteger(resource.pid) && resource.pid > 1);
    assert(Number.isSafeInteger(resource.pgid) && resource.pgid > 1);
    assert(Number.isSafeInteger(resource.ppid) && resource.ppid > 1);
    assert(typeof resource.started === 'string' && resource.started.length > 0);
    assert.match(resource.commandHash, /^[a-f0-9]{64}$/);
  }
  for (const kind of ['next', ...engines.map(engine => 'browser-' + engine)]) assert(result.resources.some(item => item.kind === kind), 'Missing runtime kind: ' + kind);
  assert(result.resources.every(item => !item.kind?.startsWith('browser-') || engines.some(engine => item.kind === 'browser-' + engine)), 'Unexpected browser runtime');
  assert(result.resources.some(item => item.kind === 'next' && item.pid === app.pid), 'Next process mismatch');
  const files = ['browser-report.json', 'owned-browser-report.json', 'source-manifest.json', pgFile, appFile, mirrorFile];
  return { browser, originalRoot, mirror: json(join(root, mirrorFile)), receipts: Object.fromEntries(files.map(file => [file, digest(join(root, file))])) };
}
function rejectLinks(root) {
  for (const name of readdirSync(root)) {
    const path = join(root, name), stat = lstatSync(path);
    assert(!stat.isSymbolicLink(), 'Artifact symlinks are forbidden');
    assert(stat.isFile() || stat.isDirectory(), 'Unsupported artifact entry');
    if (stat.isDirectory()) rejectLinks(path);
  }
}
function downloadedRoot(artifact) {
  rejectLinks(artifact);
  const entries = readdirSync(artifact);
  if (entries.includes('nevora-phase-e-browser-evidence')) {
    assert(entries.every(name => ['nevora-phase-e-browser-evidence', 'nevora-phase-e-home-readiness-evidence'].includes(name)), 'Duplicate/extra artifact layout');
    return join(artifact, 'nevora-phase-e-browser-evidence');
  }
  return artifact;
}
function validateLeafProof(root, custody, suite, validated, browserEngine) {
  const leaf = json(join(root, 'suite-verification-report.json'));
  assert.equal(leaf.suite, suite); assert.equal(leaf.status, 'passed');
  assert.equal(leaf.browserEngine, browserEngine, 'Browser engine leaf mismatch');
  assert.equal(leaf.checkpoint, custody.checkpoint); assert.equal(leaf.tree, custody.tree);
  assert.equal(leaf.localMirrorVerified, true); assert.equal(leaf.sourceUnchanged, true);
  assert.equal(leaf.evidenceRoot, validated.originalRoot);
  assert.deepEqual(leaf.receipts, validated.receipts, 'Leaf receipt hashes changed');
  const expectedOwners = [basename(dirname(validated.browser.ownershipFile)), basename(validated.browser.appRoot)].sort();
  assert.deepEqual(readdirSync(root).filter(name => name.startsWith('owned-') && lstatSync(join(root, name)).isDirectory()).sort(), expectedOwners, 'Extra or missing owner receipts');
}
function leaf(source, custody, evidence, suite, browserEngine) {
  selectSuites('browser', suite); assert.notEqual(suite, 'all', 'Leaf requires exactly one suite');
  selectedBrowserEngines([suite], browserEngine);
  verifyEvidence(evidence, 'browser', custody, suite, browserEngine);
  const validated = validateReceipts(evidence, custody, suite, browserEngine);
  assert.equal(validated.originalRoot, evidence);
  assertSourceUnchanged(source, custody);
  writeFileSync(join(evidence, 'suite-verification-report.json'), JSON.stringify({
    suite, ...(browserEngine === undefined ? {} : { browserEngine }), checkpoint: custody.checkpoint, tree: custody.tree, status: 'passed',
    localMirrorVerified: true, sourceUnchanged: true, evidenceRoot: evidence, receipts: validated.receipts,
  }, null, 2));
}
function aggregate(source, custody, evidence) {
  const needs = JSON.parse(process.env.PHASE_E_CI_NEEDS_JSON ?? 'null');
  assert(needs && typeof needs === 'object');
  assert.deepEqual(Object.keys(needs), ['phase-e-ui-suite'], 'Missing/extra matrix dependency');
  assert.equal(needs['phase-e-ui-suite'].result, 'success', 'Matrix did not succeed');
  const artifacts = externalEvidence(source, process.env.PHASE_E_ARTIFACTS_DIR);
  assert.notEqual(artifacts, evidence, 'Aggregate output must be separate');
  rejectLinks(artifacts);
  const names = leaves.map(leaf => `phase-e-browser-${custody.checkpoint}-${leaf.key}`);
  assert.deepEqual(readdirSync(artifacts).sort(), [...names].sort(), 'Missing/extra suite artifacts');
  const executions = [], verifiedLeaves = [];
  for (const [index, { suite, browserEngine }] of leaves.entries()) {
    const root = downloadedRoot(join(artifacts, names[index]));
    const validated = validateReceipts(root, custody, suite, browserEngine);
    validateLeafProof(root, custody, suite, validated, browserEngine);
    verifySourceManifestMetadata(source, validated.mirror, custody.checkpoint);
    executions.push(...validated.browser.executions);
    verifiedLeaves.push({ suite, ...(browserEngine === undefined ? {} : { browserEngine }), artifact: names[index], receipts: validated.receipts });
  }
  verifyBrowserExecutions(executions, suites);
  assertSourceUnchanged(source, custody);
  writeFileSync(join(evidence, 'browser-aggregate-report.json'), JSON.stringify({
    checkpoint: custody.checkpoint, tree: custody.tree, sourceClean: true, sourceUnchanged: true,
    status: 'passed', errors: [], suites, executions, leaves: verifiedLeaves,
    verification: 'Downloaded receipt and source completeness; local mirror bytes and runtime closure were verified by each leaf.',
  }, null, 2));
}
function main() {
  const [mode, ...args] = process.argv.slice(2);
  assert(['leaf', 'aggregate'].includes(mode), 'Unknown browser evidence mode');
  if (mode === 'aggregate') assert.equal(args.length, 0, 'Aggregate takes no arguments');
  const suite = mode === 'leaf' ? parseSuiteArguments(args) : undefined;
  const browserEngine = process.env.PHASE_E_BROWSER_ENGINE || undefined;
  if (mode === 'aggregate') assert.equal(browserEngine, undefined, 'Aggregate cannot select a browser engine');
  const source = resolve(process.cwd()), custody = captureSource(source, process.env.PHASE_E_EXPECTED_SHA);
  const evidence = externalEvidence(source, process.env.PHASE_E_EVIDENCE_DIR);
  rmSync(join(evidence, mode === 'leaf' ? 'suite-verification-report.json' : 'browser-aggregate-report.json'), { force: true });
  if (mode === 'leaf') leaf(source, custody, evidence, suite, browserEngine);
  else aggregate(source, custody, evidence);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch { console.error('PHASE_E_BROWSER_EVIDENCE_INVALID'); process.exitCode = 1; }
}
