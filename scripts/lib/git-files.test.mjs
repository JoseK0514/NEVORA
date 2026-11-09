import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { gitFileList } from './git-files.mjs';

// A throwaway repository whose untracked listing is larger than Node's default 1 MiB buffer (HARN-1).
let root;
const count = 9000, name = index => `${String(index).padStart(5, '0')}-${'x'.repeat(120)}.txt`;
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'nevora-git-files-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  for (let index = 0; index < count; index++) writeFileSync(join(root, name(index)), '');
});
afterAll(() => { if (root) rmSync(root, { recursive: true, force: true }); });

it('lists more than 1 MiB of file names, where the default buffer fails', () => {
  const args = ['ls-files', '-c', '-o', '--exclude-standard', '-z'];
  expect(() => execFileSync('git', args, { cwd: root, encoding: 'utf8' })).toThrow(expect.objectContaining({ code: 'ENOBUFS' }));
  const files = gitFileList(args, { cwd: root });
  expect(files).toHaveLength(count);
  expect(files[0]).toBe(name(0));
  expect(files.join('\0').length).toBeGreaterThan(1024 * 1024);
});

it('captures every committed source hash above 1 MiB and still rejects later source changes', async () => {
  const { captureSource, assertSourceUnchanged } = await import('../phase-e-owned.mjs');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fictional QA', '-c', 'user.email=qa@example.invalid', 'commit', '-qm', 'large source inventory'], { cwd: root });
  const checkpoint=execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root,encoding:'utf8'}).trim();
  let custody, failure;
  try { custody=captureSource(root,checkpoint); } catch(error) { failure=error.code??error.message; }
  expect(failure).toBeUndefined();
  expect(Object.keys(custody.hashes)).toHaveLength(count);
  expect(custody.hashes[name(count-1)]).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  expect(()=>assertSourceUnchanged(root,custody)).not.toThrow();
  writeFileSync(join(root,name(count-1)),'changed');
  expect(()=>assertSourceUnchanged(root,custody)).toThrow(/clean worktree/);
});
