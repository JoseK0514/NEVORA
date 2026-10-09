import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { gitReadEnvironment, loadPinnedMigrations } from './source';
import type { GitReader } from './types';

const source = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const blobA = 'c'.repeat(40);
const blobB = 'd'.repeat(40);
const req = { repo: '/fictional/owned-f', source, tree };

function reader(overrides: Record<string, Buffer | string> = {}): GitReader {
  const values: Record<string, Buffer | string> = {
    ['cat-file commit ' + source]: 'tree ' + tree + '\nauthor Test <test@example.invalid> 0 +0000\ncommitter Test <test@example.invalid> 0 +0000\n\nfixture\n',
    ['ls-tree -r -z --full-tree ' + source + ' -- db/migrations']: '100644 blob ' + blobB + '\tdb/migrations/0002_second.sql\0' + '100644 blob ' + blobA + '\tdb/migrations/0001_first.sql\0',
    ['cat-file blob ' + blobA]: "SELECT 'é';\r\n",
    ['cat-file blob ' + blobB]: 'SELECT 2;\n',
    ...overrides,
  };
  return (_repo, args) => {
    const key = args.join(' ');
    if (!(key in values)) throw new Error('Unexpected command: ' + key);
    return Buffer.from(values[key]);
  };
}

describe('pinned inert migration source adapter', () => {
  it('isolates ambient repository redirects, command helpers and injected Git config', () => {
    const environment = gitReadEnvironment({ PATH: '/usr/bin:/bin', GIT_DIR: '/wrong', GIT_WORK_TREE: '/wrong-tree', GIT_INDEX_FILE: '/wrong-index', GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'log.showSignature', GIT_CONFIG_VALUE_0: 'true', GIT_EXEC_PATH: '/wrong-helpers', GIT_SSH_COMMAND: 'injected', SECRET_SENTINEL: 'private' });
    expect(environment).toEqual({ PATH: '/usr/bin:/bin', NODE_ENV: 'test', LANG: 'C', LC_ALL: 'C', GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0' });
  });
  it('reads exact committed blobs and sorts paths without using working files', () => {
    const result = loadPinnedMigrations(req, reader());
    expect(result.source).toBe(source);
    expect(result.tree).toBe(tree);
    expect(result.migrations.map(m => m.path)).toEqual(['db/migrations/0001_first.sql', 'db/migrations/0002_second.sql']);
    expect(result.migrations[0]).toMatchObject({
      gitBlobId: blobA, text: "SELECT 'é';\r\n", byteLength: Buffer.byteLength("SELECT 'é';\r\n"),
      sha256: createHash('sha256').update("SELECT 'é';\r\n").digest('hex'),
    });
  });

  it('rejects expected-tree mismatch without reading migration bodies', () => {
    expect(() => loadPinnedMigrations(req, reader({ ['cat-file commit ' + source]: 'tree ' + 'e'.repeat(40) + '\n\nfixture\n' }))).toThrow('tree');
  });

  it.each(['HEAD', 'a'.repeat(39), source + ';touch x'])('rejects non-exact commit %s before any Git command', value => {
    expect(() => loadPinnedMigrations({ ...req, source: value }, () => { throw new Error('Git must not run'); })).toThrow('40');
  });

  it('rejects symbolic-link migration entries', () => {
    expect(() => loadPinnedMigrations(req, reader({ ['ls-tree -r -z --full-tree ' + source + ' -- db/migrations']: '120000 blob ' + blobA + '\tdb/migrations/0001_first.sql\0' }))).toThrow('regular');
  });

  it('rejects invalid UTF-8 instead of silently replacing raw bytes', () => {
    expect(() => loadPinnedMigrations(req, reader({ ['cat-file blob ' + blobA]: Buffer.from([0xff]) }))).toThrow('UTF-8');
  });

  it('retains UTF-8 BOM bytes rather than normalizing committed content', () => {
    const text = '\ufeffSELECT 1;\r\n';
    const result = loadPinnedMigrations(req, reader({ ['cat-file blob ' + blobA]: Buffer.from(text) }));
    expect(result.migrations[0].text).toBe(text);
    expect(result.migrations[0].byteLength).toBe(Buffer.byteLength(text));
    expect(result.migrations[0].sha256).toBe(createHash('sha256').update(Buffer.from(text)).digest('hex'));
  });

  it('rejects missing migration trees rather than reporting vacuous completeness', () => {
    expect(() => loadPinnedMigrations(req, reader({ ['ls-tree -r -z --full-tree ' + source + ' -- db/migrations']: '' }))).toThrow('empty');
  });

  it('rejects path escape or duplicate migration entries', () => {
    const key = 'ls-tree -r -z --full-tree ' + source + ' -- db/migrations';
    expect(() => loadPinnedMigrations(req, reader({ [key]: '100644 blob ' + blobA + '\tdb/migrations/../escape.sql\0' }))).toThrow('path');
    const entry = '100644 blob ' + blobA + '\tdb/migrations/0001_first.sql\0';
    expect(() => loadPinnedMigrations(req, reader({ [key]: entry + entry }))).toThrow('Duplicate');
  });
});
