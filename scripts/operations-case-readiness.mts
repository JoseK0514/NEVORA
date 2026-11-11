#!/usr/bin/env node
/** Offline operator-record review only. No database/provider/authentication access. */
import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { reviewOperationsCase, type CaseBinding } from '../src/lib/operations/case-readiness';

function readJson(path: string): unknown {
  const fd = openSync(path, 'r');
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > 65_536) throw Error('invalid');
    const bytes = Buffer.alloc(65_537); let length = 0;
    while (length < bytes.length) {
      const count = readSync(fd, bytes, length, bytes.length - length, null);
      if (!count) break;
      length += count;
    }
    if (length > 65_536) throw Error('invalid');
    return JSON.parse(bytes.subarray(0, length).toString('utf8'));
  } finally { closeSync(fd); }
}

try {
  const args = process.argv.slice(2), options = new Map<string, string>();
  if (args.length % 2) throw Error('invalid');
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index], value = args[index + 1];
    if (!['--manifest', '--expected', '--as-of'].includes(key) || options.has(key) || !value || value.startsWith('--')) throw Error('invalid');
    options.set(key, value);
  }
  if (!options.has('--manifest') || !options.has('--expected')) throw Error('invalid');
  const expected = readJson(options.get('--expected')!);
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)) throw Error('invalid');
  if ((expected as {environment?: unknown}).environment === 'production' && options.has('--as-of')) throw Error('invalid');
  const result = reviewOperationsCase(readJson(options.get('--manifest')!), expected as CaseBinding, options.get('--as-of') ?? new Date().toISOString());
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.decision === 'review_ready' ? 0 : 1;
} catch {
  process.stdout.write('{"error":"INVALID_INPUT"}\n');
  process.exitCode = 2;
}
