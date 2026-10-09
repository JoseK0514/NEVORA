import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isAbsolute } from 'node:path';
import { TextDecoder } from 'node:util';
import type { GitReader, PinnedMigrations, SourceRequest } from './types';

const objectId = /^[a-f0-9]{40}$/;
const migrationPath = /^db\/migrations\/[0-9]{4}_[A-Za-z0-9_-]+\.sql$/;
const comparePaths = (a: { path: string }, b: { path: string }) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
const decode = (bytes: Buffer): string => {
  try {
    // ignoreBOM=true retains an initial BOM rather than stripping source bytes.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch { throw new Error('Source blob is not valid UTF-8'); }
};

export function gitReadEnvironment(ambient: Readonly<Record<string, string | undefined>> = process.env): NodeJS.ProcessEnv {
  // An allowlist prevents GIT_DIR/WORK_TREE/INDEX, config injection, credential
  // helpers, replace refs and transport commands from redirecting this read.
  return {
    PATH: ambient.PATH ?? '/usr/bin:/bin', NODE_ENV: 'test', LANG: 'C', LC_ALL: 'C',
    GIT_OPTIONAL_LOCKS: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0',
  };
}

const readGit: GitReader = (repo, args) => execFileSync('git', ['--no-pager', '-c', 'protocol.allow=never', '-C', repo, ...args], {
  env: gitReadEnvironment(),
  stdio: ['ignore', 'pipe', 'pipe'], timeout: 15_000, maxBuffer: 16 * 1024 * 1024,
});

/** Reads only exact committed migration blobs. Never reads mutable working SQL. */
export function loadPinnedMigrations(request: SourceRequest, read: GitReader = readGit): PinnedMigrations {
  if (!objectId.test(request.source) || !objectId.test(request.tree)) {
    throw new Error('source and tree must be explicit lowercase 40-character Git object IDs');
  }
  if (!isAbsolute(request.repo)) throw new Error('repo must be an absolute custody path');
  // Plumbing reads the commit object as inert bytes, without signature helpers.
  const commit = decode(read(request.repo, ['cat-file', 'commit', request.source]));
  const identity = commit.slice(0, commit.indexOf('\n'));
  if (identity !== 'tree ' + request.tree || !commit.includes('\n\n')) {
    throw new Error('Pinned source commit or expected tree mismatch');
  }
  const listing = decode(read(request.repo, ['ls-tree', '-r', '-z', '--full-tree', request.source, '--', 'db/migrations']));
  if (listing && !listing.endsWith('\0')) throw new Error('Incomplete NUL-delimited migration listing');
  const seen = new Set<string>();
  const entries = listing.split('\0').filter(Boolean).map(entry => {
    const match = entry.match(/^([0-9]{6}) (\S+) ([a-f0-9]{40})\t([\s\S]+)$/);
    if (!match) throw new Error('Malformed migration tree entry');
    const [, mode, type, gitBlobId, path] = match;
    if (type !== 'blob' || (mode !== '100644' && mode !== '100755')) throw new Error('Migration must be a regular committed file');
    if (!migrationPath.test(path)) throw new Error('Unsupported migration path in pinned tree');
    if (seen.has(path)) throw new Error('Duplicate migration path in pinned tree');
    seen.add(path);
    return { path, gitBlobId };
  }).sort(comparePaths);
  if (entries.length === 0) throw new Error('Pinned tree has no migrations; refusing an empty completeness result');
  const migrations = entries.map(entry => {
    const raw = read(request.repo, ['cat-file', 'blob', entry.gitBlobId]);
    const text = decode(raw);
    return { ...entry, text, sha256: createHash('sha256').update(raw).digest('hex'), byteLength: raw.length };
  });
  return { source: request.source, tree: request.tree, migrations };
}
