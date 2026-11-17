import { open, rename, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
async function writeSynced(path, data) {
  const file = await open(path, 'wx', 0o600);
  try { await file.writeFile(data); await file.sync(); } finally { await file.close(); }
}
/** A failed post-dispatch update leaves the preceding reserved/unknown snapshot
 * intact. The caller's exclusive initial claim still forbids automatic reruns. */
export async function persistComparisonSnapshot(path, value, write = writeSynced) {
  const target = path instanceof URL ? fileURLToPath(path) : path;
  const temporary = join(dirname(target), '.' + basename(target) + '.' + randomUUID() + '.pending');
  try {
    await write(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
    await rename(temporary, target);
  } finally { await rm(temporary, { force: true }).catch(() => {}); }
}
