import { existsSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import type { SourceRequest } from './types';

type CliRequest = SourceRequest & { out: string };
const options = new Set<keyof CliRequest>(['repo', 'source', 'tree', 'out']);

/** Every custody argument is explicit; policy and owner assumptions are rejected. */
export function parseArguments(args: readonly string[]): CliRequest {
  const values: Partial<CliRequest> = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const name = flag.slice(2) as keyof CliRequest;
    if (!flag.startsWith('--') || !options.has(name)) throw new Error('Unknown inventory argument');
    if (Object.hasOwn(values, name)) throw new Error('Duplicate inventory argument: ' + name);
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing inventory argument value: ' + name);
    values[name] = args[i + 1];
  }
  for (const name of options) if (!values[name]) throw new Error('Missing explicit inventory argument: ' + name);
  const { repo, source, tree, out } = values as CliRequest;
  if (!isAbsolute(repo) || !isAbsolute(out)) throw new Error('repo and out must be absolute custody paths');
  if (!/^[a-f0-9]{40}$/.test(source) || !/^[a-f0-9]{40}$/.test(tree)) throw new Error('source and tree must be explicit lowercase 40-character Git object IDs');
  return { repo, source, tree, out };
}

function isInside(root: string, target: string): boolean {
  const difference = relative(root, target);
  return difference === '' || (difference !== '..' && !difference.startsWith('..' + sep) && !isAbsolute(difference));
}

/** Exclusive creation preserves existing outputs and forbids source-tree writes. */
export function writeExclusiveOutput(repo: string, out: string, bytes: string): void {
  if (!isAbsolute(repo) || !isAbsolute(out)) throw new Error('repo and out must be absolute custody paths');
  const sourceRoot = existsSync(repo) ? realpathSync(repo) : resolve(repo);
  const outputPath = resolve(out);
  // The parent must already exist; resolve symlinks before the custody check.
  const realOutput = resolve(realpathSync(dirname(outputPath)), basename(outputPath));
  if (isInside(sourceRoot, outputPath) || isInside(sourceRoot, realOutput)) throw new Error('Refusing output within source checkout');
  writeFileSync(realOutput, bytes, { flag: 'wx', mode: 0o600 });
}
