import assert from 'node:assert/strict';
import { realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute, dirname, basename, join, sep } from 'node:path';

export function matrixPlan(mode = 'all') {
  if (!['all', 'protected', 'setup', 'states'].includes(mode)) throw Error(`Unknown browser mode: ${mode}`);
  return Object.fromEntries(Object.entries({ protected: 448, setup: 56, states: 504 }).map(([key, count]) => [key, mode === 'all' || mode === key ? count : 0]));
}
async function canonicalPath(path) {
  try { return await realpath(path); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return join(await canonicalPath(dirname(path)), basename(path));
  }
}
export async function validateOutput(output, worktree) {
  const message = 'FUEL_PHASE3_QA_OUTPUT must be an absolute external evidence directory.';
  if (!output || !isAbsolute(output)) throw Error(message);
  const rel = relative(await realpath(worktree), await canonicalPath(resolve(output)));
  if (!rel || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep))) throw Error(message);
}
export function assertMatrixCounts(results, plan) {
  for (const key of Object.keys(plan)) assert.equal(results[key].length, plan[key], `${key} count`);
}
