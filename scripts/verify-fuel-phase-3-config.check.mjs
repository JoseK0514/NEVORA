import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { matrixPlan, validateOutput, assertMatrixCounts } from './verify-fuel-phase-3-config.mjs';
for (const [mode, expected] of Object.entries({ all: { protected: 448, setup: 56, states: 504 }, protected: { protected: 448, setup: 0, states: 0 }, setup: { protected: 0, setup: 56, states: 0 }, states: { protected: 0, setup: 0, states: 504 } })) {
  test(`${mode} selects every expected matrix and rejects empty/truncated evidence`, () => {
    const plan = matrixPlan(mode); assert.deepEqual(plan, expected);
    const results = Object.fromEntries(Object.entries(expected).map(([key, count]) => [key, Array(count)]));
    assertMatrixCounts(results, plan);
    for (const key of Object.keys(plan).filter(key => plan[key])) {
      assert.throws(() => assertMatrixCounts({ ...results, [key]: [] }, plan));
      assert.throws(() => assertMatrixCounts({ ...results, [key]: Array(plan[key] - 1) }, plan));
    }
  });
}
test('unknown mode fails before browser work', () => assert.throws(() => matrixPlan('typo'), /mode/));
test('output excludes the actual worktree and aliases, including nonexistent descendants', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fuel-qa-guard-'));
  try {
    const worktree = join(root, 'worktree'); await mkdir(worktree); await symlink(worktree, join(root, 'alias'));
    for (const path of [worktree, join(worktree, 'new', 'evidence'), join(root, 'alias'), join(root, 'alias', 'new'), 'relative', '']) await assert.rejects(validateOutput(path, worktree), /external/);
    await validateOutput(join(root, 'external', 'new'), worktree);
    await validateOutput(join(root, 'worktree-sibling'), worktree);
  } finally { await rm(root, { recursive: true, force: true }); }
});
