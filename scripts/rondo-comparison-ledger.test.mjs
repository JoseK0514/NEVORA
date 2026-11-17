import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { persistComparisonSnapshot } from './rondo-comparison-ledger.mjs';
const roots = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
it('retains all prior uncertain reservations when a later ledger write is interrupted', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rondo-ledger-test-')); roots.push(root);
  const path = join(root, 'ledger.json');
  const previous = { reservedMicrousd: '100', attempts: [{ outcome: 'reserved' }] };
  await writeFile(path, JSON.stringify(previous));
  const brokenWrite = async target => { await writeFile(target, '{"reservedMicrousd":'); throw new Error('simulated_ENOSPC'); };
  await expect(persistComparisonSnapshot(path, { reservedMicrousd: '100', attempts: [{ outcome: 'received' }] }, brokenWrite)).rejects.toThrow('simulated_ENOSPC');
  expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(previous);
});
it('records a complete acknowledged snapshot for the next dispatch', async () => {
  const root = await mkdtemp(join(tmpdir(), 'rondo-ledger-test-')); roots.push(root);
  const path = join(root, 'ledger.json');
  const next = { reservedMicrousd: '200', attempts: [{ outcome: 'reserved' }, { outcome: 'reserved' }] };
  await persistComparisonSnapshot(path, next);
  expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(next);
});
