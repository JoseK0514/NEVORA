import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { safeBrowserFailure } from './release-browser-diagnostics.mjs';

const cell = { suite: 'home', engine: 'webkit', width: 430, status: 'failed' };
const credential = 'A'.repeat(43), digest = 'b'.repeat(64);

test('retains useful timeout detail, failed cell and scrubbed source stage', () => {
  const error = new Error('locator.waitFor: Timeout 15000ms exceeded.\nCall log:\n  waiting for [data-home-state="ready"]');
  error.name = 'TimeoutError';
  error.stack = 'TimeoutError\n at /private/operator/source/scripts/phase-e-home-browser-scenarios.mjs:88:19';
  const result = safeBrowserFailure(error, cell, { stage: 'offline' });
  assert.equal(result.name, 'TimeoutError');
  assert.match(result.summary, /Timeout 15000ms exceeded/);
  assert.match(result.summary, /data-home-state/);
  assert.deepEqual(result.cell, cell);
  assert.equal(result.stage, 'offline');
  assert.equal(result.sourceLocation, 'phase-e-home-browser-scenarios.mjs:88:19');
  assert(!JSON.stringify(result).includes('/private/operator'));
});

test('retains primitive assertion evidence without serializing arbitrary actual values', () => {
  const result = safeBrowserFailure({ name: 'AssertionError', message: 'Expected values to be strictly equal', operator: 'strictEqual', actual: false, expected: true }, cell);
  assert.equal(result.actual, false);
  assert.equal(result.expected, true);
  assert.equal(result.operator, 'strictEqual');
  const privateActual = safeBrowserFailure({ message: 'Assertion failed', actual: { credential }, expected: credential }, cell);
  assert(!('actual' in privateActual));
  assert(!('expected' in privateActual));
  assert(!JSON.stringify(privateActual).includes(credential));
});

for (const [label, message] of [
  ['absolute URL', 'navigation failed at https://owned.invalid/api/calendar/' + credential + '/schedule.ics'],
  ['relative capability', 'navigation failed at /api/calendar/' + credential + '/schedule.ics'],
  ['standalone capability', 'Expected ' + credential + ' to match response'],
  ['digest', 'Expected ' + digest + ' to equal another value'],
  ['escaped URL', 'navigation failed at https:\\/\\/owned.invalid/api/calendar/' + credential],
]) test('redacts ' + label, () => {
  const result = JSON.stringify(safeBrowserFailure(new Error(message), cell));
  assert(!result.includes(credential));
  assert(!result.includes(digest));
  assert(!result.includes('owned.invalid'));
});

test('omits credential-bearing lines while retaining unrelated call-log detail', () => {
  const secrets = ['short-password', 'short-cookie', 'short-session', 'short-authorization'];
  const result = JSON.stringify(safeBrowserFailure(new Error('Timeout 15000ms\npassword: ' + secrets[0] + '\ncookie: ' + secrets[1] + '\nsession: ' + secrets[2] + '\nauthorization: ' + secrets[3] + '\nwaiting for Home'), cell));
  for (const value of secrets) assert(!result.includes(value));
  assert(result.includes('waiting for Home'));
});

test('bounds hostile messages and tolerates unreadable thrown objects', () => {
  assert(safeBrowserFailure({ message: 'ordinary text '.repeat(10000) }, cell).summary.length <= 1000);
  const unreadable = new Proxy({}, { get() { throw Error('unreadable'); } });
  assert.doesNotThrow(() => safeBrowserFailure(unreadable, unreadable, unreadable));
  assert.equal(safeBrowserFailure(unreadable, unreadable, unreadable).cell, null);
});

test('rejects arbitrary error metadata and reads cell identifiers only once', () => {
  const result = safeBrowserFailure({ name: credential, operator: 'short secret', message: 'Browser step failed' }, { suite: credential, engine: credential, width: 430 }, { stage: credential, location: credential });
  assert.equal(result.name, 'Error');
  assert.equal(result.cell, null);
  assert.equal(result.stage, null);
  assert(!('operator' in result));
  assert(!JSON.stringify(result).includes(credential));
  let reads = 0;
  const changingCell = { get suite() { return ++reads === 1 ? 'home' : credential; }, engine: 'webkit', width: 430, status: 'failed' };
  assert.deepEqual(safeBrowserFailure(new Error('Timeout'), changingCell).cell, cell);
  assert.equal(reads, 1);
});

test('new diagnostic report matches the existing artifact selection', () => {
  const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert(workflow.includes('nevora-phase-e-browser-evidence/*-report.json'));
  const harness = readFileSync(new URL('./phase-e-browser-qa.mjs', import.meta.url), 'utf8');
  assert(harness.includes("join(evidence, 'browser-failure-report.json')"));
  assert(harness.includes("report.errors.push('Required browser execution failed')"));
  assert(harness.includes('process.exitCode = 1'));
  assert(harness.includes('verifyBrowserExecutions(report.executions, suites)'));
});

test('cell progress retains bounded identifiers and timings without arbitrary payload',async()=>{
 const {browserCellProgress}=await import('./phase-e-browser-qa.mjs');
 const start=browserCellProgress({...cell,url:'secret',actor:'private'},'start',1000,1000,0,70);
 assert.deepEqual(start,{suite:cell.suite,engine:cell.engine,width:cell.width,event:'start',startedAt:'1970-01-01T00:00:01.000Z',at:'1970-01-01T00:00:01.000Z',durationMs:0,completed:0,total:70});
 const end=browserCellProgress(cell,'failed',1000,1500,0,70);
 assert.equal(end.durationMs,500);assert.equal(end.event,'failed');assert.equal(end.completed,0);
 assert.throws(()=>browserCellProgress({...cell,suite:'private'},'start',1000,1000,0,70));
 assert.throws(()=>browserCellProgress(cell,'secret',1000,1000,0,70));
});
