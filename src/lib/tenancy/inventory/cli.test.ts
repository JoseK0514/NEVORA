import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseArguments, writeExclusiveOutput } from './cli';

describe('explicit read-only journal CLI boundary', () => {
 it('requires all explicit parameters and rejects unknown policy/ownership flags', () => {
  const args = ['--repo', '/owned/f', '--source', 'a'.repeat(40), '--tree', 'b'.repeat(40), '--out', '/owned/evidence/journal.json'];
  expect(parseArguments(args)).toEqual({ repo: '/owned/f', source: 'a'.repeat(40), tree: 'b'.repeat(40), out: '/owned/evidence/journal.json' });
  expect(() => parseArguments(args.concat('--assume-fuel', 'yes'))).toThrow('Unknown');
  expect(() => parseArguments(args.slice(0, -2))).toThrow('out');
  expect(() => parseArguments(args.concat('--out', '/second'))).toThrow('Duplicate');
 });
 it('rejects relative source/output custody paths', () => {
  expect(() => parseArguments(['--repo', '.', '--source', 'a'.repeat(40), '--tree', 'b'.repeat(40), '--out', 'out.json'])).toThrow('absolute');
 });
 it('writes only a new external output and refuses existing output or source-tree output', () => {
  const base = mkdtempSync(join(tmpdir(), 'nevora-inventory-cli-'));
  try {
   const output = join(base, 'journal.json');
   writeExclusiveOutput('/fictional/owned-f', output, '{"status":"test"}\n');
   expect(readFileSync(output, 'utf8')).toBe('{"status":"test"}\n');
   expect(() => writeExclusiveOutput('/fictional/owned-f', output, 'replacement')).toThrow();
   expect(readFileSync(output, 'utf8')).toBe('{"status":"test"}\n');
   expect(() => writeExclusiveOutput(base, join(base, 'source.json'), '{}')).toThrow('source');
   const sentinel = join(base, 'sentinel');
   writeFileSync(sentinel, 'preserved');
   expect(readFileSync(sentinel, 'utf8')).toBe('preserved');
  } finally { rmSync(base, { recursive: true, force: true }); }
 });
});
