import { createHash } from 'node:crypto';
import { lexSql } from './sql-lexer';
import type { PinnedMigrations } from './types';

/** Canonical output excludes clocks and host paths. Status describes lexing only. */
export function serializeJournal(input: PinnedMigrations): string {
  if (input.migrations.length === 0) throw new Error('Refusing an empty migration capture');
  if (!/^[a-f0-9]{40}$/.test(input.source) || !/^[a-f0-9]{40}$/.test(input.tree)) throw new Error('Invalid source or tree object ID');
  const seen = new Set<string>();
  for (const blob of input.migrations) {
    if (!/^db\/migrations\/[0-9]{4}_[A-Za-z0-9_-]+\.sql$/.test(blob.path)) throw new Error('Unsupported migration path');
    if (seen.has(blob.path)) throw new Error('Duplicate migration path');
    seen.add(blob.path);
    if (!/^[a-f0-9]{40}$/.test(blob.gitBlobId)) throw new Error('Invalid migration blob object ID');
    if (createHash('sha256').update(blob.text, 'utf8').digest('hex') !== blob.sha256) throw new Error('Raw migration hash mismatch');
    if (Buffer.byteLength(blob.text, 'utf8') !== blob.byteLength) throw new Error('Raw migration byteLength mismatch');
  }
  const migrations = [...input.migrations].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0).map(blob => {
    const result = lexSql(blob.text);
    return {
      path: blob.path, gitBlobId: blob.gitBlobId, sha256: blob.sha256, byteLength: blob.byteLength,
      parts: result.parts, diagnostics: result.diagnostics, lexicalComplete: result.complete,
      semanticAnalysis: result.semanticAnalysis,
    };
  });
  const schemaDigest = createHash('sha256').update(JSON.stringify(migrations.map(blob => ({
    path: blob.path, gitBlobId: blob.gitBlobId, sha256: blob.sha256, byteLength: blob.byteLength,
  })))).digest('hex');
  return JSON.stringify({
    formatVersion: 1,
    status: migrations.every(blob => blob.lexicalComplete) ? 'LEXICAL_JOURNAL_COMPLETE' : 'LEXICAL_JOURNAL_BLOCKED',
    source: { commit: input.source, tree: input.tree },
    schemaDigest,
    readiness: { semanticOwnership: 'NOT_IMPLEMENTED', rowMapping: 'NOT_RUN', runtimeIsolation: 'NOT_RUN', F10: 'NOT_VERIFIED' },
    migrations,
  }, null, 2) + '\n';
}
