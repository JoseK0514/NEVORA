import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { openManagementContinuation, openManagementRepair } from './rondo-management-ledger.mjs';
import { openManagementCapture } from './rondo-management-capture.mjs';

const approval = 'Jose-2026-11-15-USD5-credit-only-fictional-comparison';
const caseId = 'rondo-one-worker-two-sites';
const now = () => Date.parse('2026-11-16T00:30:00Z');
const body = JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 4096, messages: [] });
const fixture = () => ({ mode: 'live-fictional-data', model: 'claude-sonnet-5-5', approval, budgetUsd: 2.5,
  cutoff: '2026-11-18T00:00:00Z', reservedMicrousd: '759830',
  attempts: [{ caseId: 'previous-uncertain', reservationMicrousd: '759830', outcome: 'uncertain_failure', providerUsage: null }],
  results: [{ id: 'previous-case', state: 'failed_or_stopped', scores: null }] });
const fixtureOptions = { fixtureOnly: true, expectedOriginalDigest: createHash('sha256').update(JSON.stringify(fixture())).digest('hex') };
process.env.RONDO_MANAGEMENT_EVALUATION = 'fictional-offline';
async function isolated(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'rondo-management-ledger-'));
  const path = join(dir, 'original.json');
  const original = fixture();
  await writeFile(path, JSON.stringify(original));
  try { await fn({ path, original }); } finally { await rm(dir, { recursive: true, force: true }); }
}

test('continues the original allowance and retains all prior unknown attempts and failed results', () => isolated(async ({ path, original }) => {
  const ledger = await openManagementContinuation(path, { approval, now, sourceHead: 'fictional-source', ...fixtureOptions });
  const id = await ledger.reserve(caseId, body);
  const reserved = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(reserved.attempts[id].outcome, 'reserved');
  assert.ok(BigInt(reserved.reservedMicrousd) > 759830n);
  await ledger.settle(id, { outcome: 'uncertain_failure', stopReason: null });
  await ledger.result({ id: caseId, state: 'failed', assessment: 'not-assessed' });
  const after = JSON.parse(await readFile(path, 'utf8'));
  assert.deepEqual(after.attempts[0], original.attempts[0]);
  assert.deepEqual(after.results, original.results);
  assert.equal(after.management.results[0].state, 'failed');
  assert.equal(after.reservedMicrousd, reserved.reservedMicrousd);
  await assert.rejects(openManagementContinuation(path, { approval, now, ...fixtureOptions }), /claim|exist|continuation|snapshot/i);
}));

test('rejects inconsistent sums, changed approval, changed model, enlarged cap and expired grant before claiming', () => isolated(async ({ path }) => {
  for (const change of [{ reservedMicrousd: '0' }, { approval: 'new-allowance' }, { model: 'different' }, { budgetUsd: 5 }, { cutoff: '2030-01-01' }]) {
    await writeFile(path, JSON.stringify({ ...fixture(), ...change }));
    await assert.rejects(openManagementContinuation(path, { approval, now, ...fixtureOptions }), /binding|ledger|grant/i);
  }
  await writeFile(path, JSON.stringify(fixture()));
  await assert.rejects(openManagementContinuation(path, { approval, now: () => Date.parse('2026-11-18T00:00:00Z'), ...fixtureOptions }), /grant/i);
}));

test('cap exhaustion prevents a new reservation and never refunds an uncertain one', () => isolated(async ({ path }) => {
    const ledger = await openManagementContinuation(path, { approval, now, ...fixtureOptions });
  for (;;) { try { await ledger.reserve(caseId, body); } catch (error) { assert.match(error.message, /allowance/); break; } }
  const before = await readFile(path, 'utf8');
  await assert.rejects(ledger.reserve(caseId, body), /allowance/i);
  assert.equal(await readFile(path, 'utf8'), before);
  const after = JSON.parse(await readFile(path, 'utf8'));
  assert.ok(BigInt(after.reservedMicrousd) <= 2500000n); assert.equal(after.attempts[0].outcome, 'uncertain_failure');
}));

test('external ledger changes are never overwritten and dispatch must wait for successful reservation', () => isolated(async ({ path }) => {
  const ledger = await openManagementContinuation(path, { approval, now, ...fixtureOptions });
  const changed = (await readFile(path, 'utf8')) + ' ';
  await writeFile(path, changed);
  await assert.rejects(ledger.reserve(caseId, body), /changed/i);
  assert.equal(await readFile(path, 'utf8'), changed);
}));

test('allows only reviewed native request shape and keeps previous reservation if the grant expires', () => isolated(async ({ path }) => {
  let current = now();
  const ledger = await openManagementContinuation(path, { approval, now: () => current, ...fixtureOptions });
  for (const bad of ['{}', '{', JSON.stringify({ model: 'other', max_tokens: 4096 }), JSON.stringify({ model: 'claude-sonnet-5-5', max_tokens: 100000 })]) {
    await assert.rejects(ledger.reserve(caseId, bad), /request/i);
  }
  current = Date.parse('2026-11-18T00:00:00Z');
  await assert.rejects(ledger.reserve(caseId, body), /grant/i);
  assert.equal(JSON.parse(await readFile(path, 'utf8')).reservedMicrousd, '759830');
}));

test('serializes competing reservations against the same remaining allowance', () => isolated(async ({ path }) => {
  const ledger = await openManagementContinuation(path, { approval, now, ...fixtureOptions });
  const size = BigInt(Buffer.byteLength(body) + 16384) * 2n + 40960n;
  while (BigInt(JSON.parse(await readFile(path, 'utf8')).reservedMicrousd) + size * 2n <= 2500000n) await ledger.reserve(caseId, body);
  const before = JSON.parse(await readFile(path, 'utf8')).attempts.length;
  const outcomes = await Promise.allSettled([ledger.reserve(caseId, body), ledger.reserve(caseId, body)]);
  assert.equal(outcomes.filter(row => row.status === 'fulfilled').length, 1);
  assert.equal(JSON.parse(await readFile(path, 'utf8')).attempts.length, before + 1);
  await assert.rejects(ledger.settle(0, { outcome: 'http_success' }), /attempt/i);
}));

test('rejects an internally consistent zero or older snapshot rather than refilling the allowance', () => isolated(async ({ path }) => {
  await writeFile(path, JSON.stringify({ ...fixture(), attempts: [], results: [], reservedMicrousd: '0' }));
  await assert.rejects(openManagementContinuation(path, { approval, now, ...fixtureOptions }), /snapshot|digest|binding/i);
}));

test('live admission refuses a copied or cwd-derived ledger', () => isolated(async ({ path }) => {
  await assert.rejects(openManagementContinuation(path, { approval, now }), /canonical|custody/i);
}));

test('old cases cannot enroll and expiry after durable reservation withholds dispatch without refund', () => isolated(async ({ path }) => {
  let current = now();
  const ledger = await openManagementContinuation(path, { approval, now: () => current, ...fixtureOptions });
  await assert.rejects(ledger.reserve('facts-en', body), /case/i);
  const id = await ledger.reserve('rondo-one-worker-two-sites', body);
  current = Date.parse('2026-11-18T00:00:00Z');
  assert.throws(() => ledger.assertDispatch(id), /grant/i);
  await ledger.settle(id, { outcome: 'dispatch_withheld' });
  assert.ok(BigInt(JSON.parse(await readFile(path, 'utf8')).reservedMicrousd) > 759830n);
}));

test('a rejected second live exporter cannot replace already captured paid evidence', () => isolated(async ({ path }) => {
  const output = path + '.capture';
  const owner = await openManagementCapture(output, { exclusive: true });
  await owner.checkpoint({ phase: 'first-turn-captured', answer: 'fictional retained answer' });
  const before = await readFile(output, 'utf8');
  await assert.rejects(openManagementCapture(output, { exclusive: true }), /exist/i);
  assert.equal(await readFile(output, 'utf8'), before);
}));

test('a separately pinned repair keeps the completed pass and its reservations under the same cap', () => isolated(async ({ path }) => {
  const original = fixture();
  original.management = { sourceHead: 'b0a70cf364fd912a5c1d693a8ca93cb84adb245c', results: ['rondo-evidence-reversal-and-restoration', 'rondo-one-worker-two-sites', 'rondo-missing-policy-is-not-policy', 'rondo-identical-facts-new-preference'].map(id => ({ id, state: 'technical-path-completed' })) };
  const bytes = JSON.stringify(original); await writeFile(path, bytes);
  const options = { approval, now, ...fixtureOptions, expectedOriginalDigest: createHash('sha256').update(bytes).digest('hex') };
  const repair = await openManagementRepair(path, options);
  await assert.rejects(repair.reserve(caseId, body), /case/i);
  const id = await repair.reserve('rondo-diagnostic-scope-es', body);
  repair.assertDispatch(id); await repair.settle(id, { outcome: 'http_success' });
  const row = { id: 'rondo-diagnostic-scope-es', state: 'answered' };
  await repair.result(row); row.state = 'changed-after-capture';
  const after = JSON.parse(await readFile(path, 'utf8'));
  assert.deepEqual(after.management, original.management);
  assert.deepEqual(after.attempts[0], original.attempts[0]);
  assert.ok(BigInt(after.reservedMicrousd) > BigInt(original.reservedMicrousd));
  assert.equal(after.managementRepair.results[0].state, 'answered');
  await assert.rejects(repair.result({ id: 'rondo-diagnostic-scope-es', state: 'answered' }), /duplicate/i);
  await assert.rejects(repair.reserve('rondo-diagnostic-scope-es', body), /terminal/i);
  await assert.rejects(openManagementRepair(path, options), /snapshot|continuation/i);
}));
