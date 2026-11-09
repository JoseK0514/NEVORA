import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';

// The DB boundary is deliberately unreachable for invalid source. Filesystem
// and Git are real; no provider, PostgreSQL or application process is launched.
vi.mock('./integration/local-postgres', () => ({ createDisposableExchangeDatabase: async () => { throw Error('Database allocation reached'); } }));
import { createOwnedNextApp } from './integration/owned-next-app';
const original = process.cwd();
const roots: string[] = [];
function source() {
  const root = mkdtempSync(join(tmpdir(), 'nevora-source-custody-'));
  roots.push(root); mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src', 'example.ts'), 'export const value = 1;\n');
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['-C', root, 'add', '.']);
  execFileSync('git', ['-C', root, '-c', 'user.name=Fictional QA', '-c', 'user.email=qa@example.invalid', 'commit', '-qm', 'fixture']);
  process.chdir(root); return root;
}
afterEach(() => { process.chdir(original); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
it('refuses untracked application input before allocating a database', async () => {
  const root = source(); writeFileSync(join(root, 'src', 'untracked.ts'), 'export const injected = true;');
  await expect(createOwnedNextApp(join(root, '..', 'evidence-unused'))).rejects.toThrow(/Untracked application source/);
});
it('refuses changed tracked application input before allocating a database', async () => {
  const root = source(); writeFileSync(join(root, 'src', 'example.ts'), 'export const value = 2;');
  await expect(createOwnedNextApp(join(root, '..', 'evidence-unused'))).rejects.toThrow(/Tracked application source differs/);
});
it('refuses login observation without an explicit owned process marker before any database allocation',async()=>{
 await expect(createOwnedNextApp(join(original,'unused-evidence'),{loginDiagnostics:true})).rejects.toThrow('Login diagnostics require the owned process marker');
});
