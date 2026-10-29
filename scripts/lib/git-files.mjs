import { execFileSync } from 'node:child_process';

/** Git's NUL-separated file listing. The repository's own listing already exceeds Node's default 1 MiB
 * execFileSync buffer (ENOBUFS), so every owned-runtime source copy reads it through this one helper. */
export const GIT_LIST_MAX_BUFFER = 64 * 1024 * 1024;

export function gitFileList(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: GIT_LIST_MAX_BUFFER, ...options }).split('\0').filter(Boolean);
}
