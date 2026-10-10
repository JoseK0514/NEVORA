import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { TextDecoder } from 'node:util';

export type NativeJsonlEvidenceFailureCode =
  | 'INVALID_OPTIONS' | 'READ_FAILED' | 'INVALID_UTF8' | 'EMPTY_RECORD'
  | 'INVALID_JSON' | 'INVALID_EXPECTED_RECORD' | 'RECORD_MISMATCH'
  | 'NONCANONICAL_LINE' | 'ADDITIONAL_RECORD' | 'RECORD_COUNT_MISMATCH'
  | 'MISSING_TERMINAL_LF' | 'EVIDENCE_SIZE_UNREPRESENTABLE' | 'RECORD_SIZE_UNREPRESENTABLE';

/** Fixed QA diagnostics contain no record payload, path, SQL, or credentials. */
export class NativeJsonlEvidenceError extends Error {
  readonly code: NativeJsonlEvidenceFailureCode;
  readonly recordIndex?: number;
  constructor(code: NativeJsonlEvidenceFailureCode, recordIndex?: number) {
    super(code);
    this.name = 'NativeJsonlEvidenceError';
    this.code = code;
    if (recordIndex !== undefined) this.recordIndex = recordIndex;
  }
}

export type CompleteNativeJsonlReceipt = Readonly<{
  filename: string;
  count: number;
  bytes: number;
  SHA256: string;
  completeUTF8JSONL: true;
}>;

export type CompleteNativeJsonlOptions = Readonly<{
  /** QA read-buffer size; this does not select a business or native statement limit. */
  chunkBytes?: number;
  /** Require each original append spelling to equal JSON.stringify(parsedRecord). */
  requireCanonicalLines?: boolean;
}>;

/**
 * Verify the entire byte stream beside ordered, already detached plain root snapshots.
 * This preserves the old JSON.stringify(parsed) === JSON.stringify(snapshot) check.
 * No whole-log Buffer/string or second parsed-record array is retained. Memory beyond
 * the supplied snapshots is bounded by a read chunk plus the current JSON record and
 * its parsed/serialized representations. A single record must still fit native JS
 * string/JSON limits; this verifier fails closed rather than truncating that record.
 *
 * This is QA evidence comparison, never product, proof, operator, or source authority.
 * The caller owns the path and known-plain snapshots; no hostile-object authentication
 * or concurrent file mutation protection is implied by this receipt. The caller must
 * close evidence appends and keep the supplied snapshots stable throughout the read.
 */
export async function verifyCompleteNativeJsonl(
  path: string,
  expectedRecords: readonly unknown[],
  options: CompleteNativeJsonlOptions = {},
): Promise<CompleteNativeJsonlReceipt> {
  const chunkBytes = options.chunkBytes ?? 64 * 1024;
  if (!Number.isSafeInteger(chunkBytes) || chunkBytes <= 0 ||
      (options.requireCanonicalLines !== undefined && typeof options.requireCanonicalLines !== 'boolean') ||
      !Array.isArray(expectedRecords)) {
    throw new NativeJsonlEvidenceError('INVALID_OPTIONS');
  }
  const hash = createHash('sha256');
  // ignoreBOM:true preserves a source BOM as U+FEFF, so JSON.parse rejects it.
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  const stream = createReadStream(path, { highWaterMark: chunkBytes });
  let bytes = 0;
  let count = 0;
  let pending = '';

  function decode(chunk?: Buffer): string {
    try { return chunk === undefined ? decoder.decode() : decoder.decode(chunk, { stream: true }); }
    catch { throw new NativeJsonlEvidenceError('INVALID_UTF8', count); }
  }

  function verifyLine(line: string): void {
    if (line.length === 0) throw new NativeJsonlEvidenceError('EMPTY_RECORD', count);
    if (count >= expectedRecords.length) throw new NativeJsonlEvidenceError('ADDITIONAL_RECORD', count);
    let parsed: unknown;
    try { parsed = JSON.parse(line) as unknown; }
    catch (error) {
      throw new NativeJsonlEvidenceError(error instanceof RangeError ? 'RECORD_SIZE_UNREPRESENTABLE' : 'INVALID_JSON', count);
    }
    let actual: string | undefined;
    let expected: string | undefined;
    try { actual = JSON.stringify(parsed); expected = JSON.stringify(expectedRecords[count]); }
    catch (error) {
      throw new NativeJsonlEvidenceError(error instanceof RangeError ? 'RECORD_SIZE_UNREPRESENTABLE' : 'INVALID_EXPECTED_RECORD', count);
    }
    if (actual === undefined || expected === undefined) throw new NativeJsonlEvidenceError('INVALID_EXPECTED_RECORD', count);
    if (actual !== expected) throw new NativeJsonlEvidenceError('RECORD_MISMATCH', count);
    if (options.requireCanonicalLines === true && line !== actual) throw new NativeJsonlEvidenceError('NONCANONICAL_LINE', count);
    count += 1;
  }

  function append(fragment: string): void {
    try { pending += fragment; }
    catch { throw new NativeJsonlEvidenceError('RECORD_SIZE_UNREPRESENTABLE', count); }
  }

  function acceptText(text: string): void {
    let start = 0;
    for (let end = text.indexOf('\n'); end !== -1; end = text.indexOf('\n', start)) {
      append(text.slice(start, end));
      verifyLine(pending);
      pending = '';
      start = end + 1;
    }
    append(text.slice(start));
  }

  try {
    for await (const chunk of stream) {
      if (!Buffer.isBuffer(chunk)) throw new NativeJsonlEvidenceError('READ_FAILED');
      if (!Number.isSafeInteger(bytes + chunk.length)) throw new NativeJsonlEvidenceError('EVIDENCE_SIZE_UNREPRESENTABLE');
      bytes += chunk.length;
      hash.update(chunk);
      acceptText(decode(chunk));
    }
    acceptText(decode());
    if (pending.length !== 0) throw new NativeJsonlEvidenceError('MISSING_TERMINAL_LF', count);
    if (count !== expectedRecords.length) throw new NativeJsonlEvidenceError('RECORD_COUNT_MISMATCH', count);
    return Object.freeze({ filename: basename(path), count, bytes, SHA256: hash.digest('hex'), completeUTF8JSONL: true });
  } catch (error) {
    if (error instanceof NativeJsonlEvidenceError) throw error;
    throw new NativeJsonlEvidenceError('READ_FAILED');
  } finally {
    stream.destroy();
  }
}
