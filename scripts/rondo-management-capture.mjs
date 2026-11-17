import { writeFile } from 'node:fs/promises';
import { persistComparisonSnapshot } from './rondo-comparison-ledger.mjs';
/** A live writer must exclusively own its export before any paid dispatch.
 * Failed/concurrent admission never returns a writer capable of replacing it. */
export async function openManagementCapture(path, { exclusive = true } = {}) {
  if (exclusive) await writeFile(path, '{}\n', { flag: 'wx', mode: 0o600 });
  let tail = Promise.resolve();
  return { checkpoint(value) {
    const snapshot = structuredClone(value);
    const pending = tail.then(() => persistComparisonSnapshot(path, snapshot));
    tail = pending.catch(() => {});
    return pending;
  } };
}
