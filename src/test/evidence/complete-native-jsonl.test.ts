import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { verifyCompleteNativeJsonl } from './complete-native-jsonl';

// Source-only prepared fixtures. Root alone executes these bounded temp files.
const bytesFor = (records: readonly unknown[]) => Buffer.from(records.map(record => JSON.stringify(record) + '\n').join(''), 'utf8');
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
async function fixture<T>(bytes: Buffer, body: (path: string) => Promise<T>): Promise<T> {
  const folder = await mkdtemp(join(tmpdir(), 'nevora-jsonl-evidence-'));
  const path = join(folder, 'operations.jsonl');
  try { await writeFile(path, bytes, { flag: 'wx', mode: 0o600 }); return await body(path); }
  finally { await rm(folder, { recursive: true, force: true }); }
}

it.each([1, 2, 3, 7, 64])('streams Unicode and record boundaries correctly at chunkBytes=%i', async chunkBytes => {
  const records = [{ text: 'Café 😀 東京', own: true }, { code: '42501', count: 2 }, null, ['fictional', 'é']];
  const bytes = bytesFor(records);
  const receipt = await fixture(bytes, path => verifyCompleteNativeJsonl(path, records, { chunkBytes, requireCanonicalLines: true }));
  expect(receipt).toEqual({ filename: 'operations.jsonl', count: records.length, bytes: bytes.length, SHA256: digest(bytes), completeUTF8JSONL: true });
  expect(Object.isFrozen(receipt)).toBe(true);
});

it('accepts an exactly empty file for zero captured records', async () => {
  const bytes = Buffer.alloc(0);
  expect(await fixture(bytes, path => verifyCompleteNativeJsonl(path, []))).toEqual({ filename: 'operations.jsonl', count: 0, bytes: 0, SHA256: digest(bytes), completeUTF8JSONL: true });
});

it('rejects an empty file when a captured record is missing', async () => {
  await expect(fixture(Buffer.alloc(0), path => verifyCompleteNativeJsonl(path, [{}]))).rejects.toMatchObject({ code: 'RECORD_COUNT_MISMATCH' });
});

it('rejects missing terminal LF even when the last JSON is otherwise complete', async () => {
  await expect(fixture(Buffer.from('{"x":1}'), path => verifyCompleteNativeJsonl(path, [{ x: 1 }], { chunkBytes: 1 }))).rejects.toMatchObject({ code: 'MISSING_TERMINAL_LF' });
});

it('rejects truncated JSON with LF', async () => {
  await expect(fixture(Buffer.from('{"x":\n'), path => verifyCompleteNativeJsonl(path, [{ x: 1 }], { chunkBytes: 2 }))).rejects.toMatchObject({ code: 'INVALID_JSON' });
});

it('rejects trailing non-JSON data rather than claiming the first valid record complete', async () => {
  await expect(fixture(Buffer.from('{"x":1} garbage\n'), path => verifyCompleteNativeJsonl(path, [{ x: 1 }], { chunkBytes: 2 }))).rejects.toMatchObject({ code: 'INVALID_JSON' });
});

it('rejects trailing unframed data after a complete record', async () => {
  await expect(fixture(Buffer.from('{"x":1}\nextra'), path => verifyCompleteNativeJsonl(path, [{ x: 1 }]))).rejects.toMatchObject({ code: 'MISSING_TERMINAL_LF' });
});

it.each([
  Buffer.from([0x22, 0xc3, 0x28, 0x22, 0x0a]),
  Buffer.from([0x22, 0xed, 0xa0, 0x80, 0x22, 0x0a]),
  Buffer.from([0x22, 0xc0, 0xaf, 0x22, 0x0a]),
  Buffer.from([0x22, 0xf4, 0x90, 0x80, 0x80, 0x22, 0x0a]),
  Buffer.from([0x22, 0xe2, 0x82]),
])('rejects malformed UTF8 across one-byte chunk boundaries %j', async bytes => {
  await expect(fixture(bytes, path => verifyCompleteNativeJsonl(path, ['fictional'], { chunkBytes: 1 }))).rejects.toMatchObject({ code: 'INVALID_UTF8' });
});

it('preserves the exact parsed snapshot check for changed payload', async () => {
  await expect(fixture(bytesFor([{ x: 2 }]), path => verifyCompleteNativeJsonl(path, [{ x: 1 }]))).rejects.toMatchObject({ code: 'RECORD_MISMATCH', recordIndex: 0 });
});

it('rejects record reordering', async () => {
  await expect(fixture(bytesFor([{ id: 2 }, { id: 1 }]), path => verifyCompleteNativeJsonl(path, [{ id: 1 }, { id: 2 }]))).rejects.toMatchObject({ code: 'RECORD_MISMATCH', recordIndex: 0 });
});

it('retains JSON.stringify property-order equality rather than treating it as canonical JSON authority', async () => {
  await expect(fixture(Buffer.from('{"b":2,"a":1}\n'), path => verifyCompleteNativeJsonl(path, [{ a: 1, b: 2 }]))).rejects.toMatchObject({ code: 'RECORD_MISMATCH' });
});

it('rejects fewer records than the retained snapshots', async () => {
  await expect(fixture(bytesFor([{ id: 1 }]), path => verifyCompleteNativeJsonl(path, [{ id: 1 }, { id: 2 }]))).rejects.toMatchObject({ code: 'RECORD_COUNT_MISMATCH' });
});

it('rejects an additional record without silently ignoring it', async () => {
  await expect(fixture(bytesFor([{ id: 1 }, { id: 2 }]), path => verifyCompleteNativeJsonl(path, [{ id: 1 }], { chunkBytes: 1 }))).rejects.toMatchObject({ code: 'ADDITIONAL_RECORD', recordIndex: 1 });
});

it('rejects an empty extra line', async () => {
  await expect(fixture(Buffer.from('{"id":1}\n\n'), path => verifyCompleteNativeJsonl(path, [{ id: 1 }]))).rejects.toMatchObject({ code: 'EMPTY_RECORD' });
});

it('keeps complete byte hash when JSON whitespace is allowed by the preserved parsed-record check', async () => {
  const bytes = Buffer.from(' { "id" : 1 } \n', 'utf8');
  const receipt = await fixture(bytes, path => verifyCompleteNativeJsonl(path, [{ id: 1 }], { chunkBytes: 1 }));
  expect(receipt.bytes).toBe(bytes.length); expect(receipt.SHA256).toBe(digest(bytes)); expect(receipt.count).toBe(1);
});

it('optionally rejects noncanonical line spelling without weakening snapshot equality', async () => {
  await expect(fixture(Buffer.from(' {"id":1}\n'), path => verifyCompleteNativeJsonl(path, [{ id: 1 }], { requireCanonicalLines: true }))).rejects.toMatchObject({ code: 'NONCANONICAL_LINE' });
});

it('canonical mode rejects repeated object keys even when JSON.parse would retain the last', async () => {
  await expect(fixture(Buffer.from('{"id":0,"id":1}\n'), path => verifyCompleteNativeJsonl(path, [{ id: 1 }], { requireCanonicalLines: true }))).rejects.toMatchObject({ code: 'NONCANONICAL_LINE' });
});

it('rejects an initial UTF8 BOM instead of silently dropping source bytes', async () => {
  await expect(fixture(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytesFor([{ id: 1 }])]), path => verifyCompleteNativeJsonl(path, [{ id: 1 }], { chunkBytes: 1 }))).rejects.toMatchObject({ code: 'INVALID_JSON' });
});

it('does not mutate original root-captured snapshots', async () => {
  const snapshot = Object.freeze({ identity: Object.freeze({ id: 'literal padded ' }), flags: Object.freeze([false, true]) });
  const records = Object.freeze([snapshot]);
  await fixture(bytesFor(records), path => verifyCompleteNativeJsonl(path, records));
  expect(records[0]).toBe(snapshot); expect(records[0].identity.id).toBe('literal padded '); expect(records[0].flags).toEqual([false, true]);
});

it.each([0, -1, NaN, Infinity, 1.5])('rejects an invalid stream chunk option %j before file access', async chunkBytes => {
  await expect(verifyCompleteNativeJsonl('fictional-file-never-opened', [], { chunkBytes })).rejects.toMatchObject({ code: 'INVALID_OPTIONS' });
});

it('rejects a record that is not representable as captured JSON', async () => {
  await expect(fixture(bytesFor([null]), path => verifyCompleteNativeJsonl(path, [undefined]))).rejects.toMatchObject({ code: 'INVALID_EXPECTED_RECORD' });
});

it('reports an inaccessible file using a fixed evidence failure', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'nevora-jsonl-evidence-'));
  try { await expect(verifyCompleteNativeJsonl(join(folder, 'not-created.jsonl'), [])).rejects.toMatchObject({ code: 'READ_FAILED' }); }
  finally { await rm(folder, { recursive: true, force: true }); }
});

it('streams many bounded fictional records through one-byte reads and returns the full digest/count', async () => {
  const records = Array.from({ length: 64 }, (_, index) => ({ index, text: 'é😀' + index }));
  const bytes = bytesFor(records);
  const receipt = await fixture(bytes, path => verifyCompleteNativeJsonl(path, records, { chunkBytes: 1, requireCanonicalLines: true }));
  expect(receipt).toMatchObject({ count: 64, bytes: bytes.length, SHA256: digest(bytes), completeUTF8JSONL: true });
});
