import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { serializeJournal } from './serialize';
import type { MigrationBlob, PinnedMigrations } from './types';

function blob(path: string, gitBlobId: string, text: string): MigrationBlob {
  return { path, gitBlobId, text, sha256: createHash('sha256').update(text).digest('hex'), byteLength: Buffer.byteLength(text) };
}
const input: PinnedMigrations = {
  source: 'a'.repeat(40), tree: 'b'.repeat(40),
  migrations: [
    blob('db/migrations/0002_b.sql', 'd'.repeat(40), 'SELECT 2;\n'),
    blob('db/migrations/0001_a.sql', 'c'.repeat(40), '/* x */\nSELECT 1;'),
  ],
};
describe('deterministic lexical journal', () => {
  it('makes identical bytes from shuffled blobs and excludes host/time metadata', () => {
    const first = serializeJournal(input);
    const second = serializeJournal({ ...input, migrations: [...input.migrations].reverse() });
    expect(first).toBe(second);
    const parsed = JSON.parse(first);
    expect(parsed.status).toBe('LEXICAL_JOURNAL_COMPLETE');
    expect(parsed.readiness).toEqual({ semanticOwnership: 'NOT_IMPLEMENTED', rowMapping: 'NOT_RUN', runtimeIsolation: 'NOT_RUN', F10: 'NOT_VERIFIED' });
    expect(parsed.migrations[0].parts.map((p: { text: string }) => p.text).join('')).toBe(input.migrations[1].text);
    expect(first).not.toContain('/fictional');
    expect(parsed.generatedAt).toBeUndefined();
  });
  it('changes schema digest for a changed raw byte while retaining semantic-unreviewed status', () => {
    const first = JSON.parse(serializeJournal(input));
    const changed = JSON.parse(serializeJournal({ ...input, migrations: [blob('db/migrations/0002_b.sql', 'd'.repeat(40), 'SELECT 2;\r\n'), input.migrations[1]] }));
    expect(changed.schemaDigest).not.toBe(first.schemaDigest);
    expect(changed.readiness.F10).toBe('NOT_VERIFIED');
  });
  it('marks malformed source blocked while preserving its complete source partition', () => {
    const text = "SELECT 'broken";
    const parsed = JSON.parse(serializeJournal({ ...input, migrations: [blob('db/migrations/0002_b.sql', 'd'.repeat(40), text)] }));
    expect(parsed.status).toBe('LEXICAL_JOURNAL_BLOCKED');
    expect(parsed.migrations[0].parts.map((p: { text: string }) => p.text).join('')).toBe(text);
    expect(parsed.migrations[0].diagnostics[0].code).toBe('UNTERMINATED_STRING');
  });
  it('rejects an empty capture instead of claiming lexical completeness (ROOT-J02)', () => {
    expect(() => serializeJournal({ ...input, migrations: [] })).toThrow('empty');
  });
  it('rejects duplicate paths rather than hashing ambiguous source ancestry', () => {
    expect(() => serializeJournal({ ...input, migrations: [input.migrations[0], input.migrations[0]] })).toThrow('Duplicate');
  });
  it('rejects changed raw text with stale hash metadata', () => {
    expect(() => serializeJournal({ ...input, migrations: [{ ...input.migrations[0], text: 'SELECT 7;\n' }] })).toThrow('hash');
  });
  it('rejects an inconsistent byteLength even if raw hash is correct', () => {
    expect(() => serializeJournal({ ...input, migrations: [{ ...input.migrations[0], byteLength: 0 }] })).toThrow('byteLength');
  });
});
