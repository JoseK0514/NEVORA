import {execFileSync, spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const dispositions = new Set(['included', 'superseded', 'reference', 'held', 'protected', 'target']);
const fullSha = /^[a-f0-9]{40}$/;

export function validateInventory(inventory) {
  if (inventory?.schema !== 1 || inventory.target !== 'development' ||
      typeof inventory.assemblyBranch !== 'string' ||
      (!inventory.assemblyBranch.startsWith('codex/') && inventory.assemblyBranch !== 'claude-codex-collab-nevora') ||
      !Array.isArray(inventory.sources)) throw Error('Invalid development source inventory');
  if (inventory.maximumActiveBranches !== undefined &&
      (!Number.isInteger(inventory.maximumActiveBranches) || inventory.maximumActiveBranches < 1 || inventory.maximumActiveBranches > 7)) {
    throw Error('Invalid remote branch ceiling');
  }
  const branches = new Set();
  for (const source of inventory.sources) {
    if (typeof source.branch !== 'string' || !source.branch || branches.has(source.branch) ||
        !fullSha.test(source.sha) || !dispositions.has(source.disposition) ||
        typeof source.reason !== 'string' || !source.reason.trim()) throw Error('Invalid or duplicate source entry');
    branches.add(source.branch);
    if ((source.branch === 'main') !== (source.disposition === 'protected') ||
        (source.branch === 'development') !== (source.disposition === 'target')) throw Error('Invalid protected/target disposition');
    const archiveBranch = typeof source.archiveRef === 'string'
      ? /^refs\/tags\/archive\/branches\/\d{4}-\d{2}-\d{2}\/(.+)$/.exec(source.archiveRef)?.[1] : undefined;
    if (source.archiveRef !== undefined &&
        (source.branch === 'main' || source.branch === 'development' || typeof source.archiveRef !== 'string' ||
         archiveBranch !== source.branch ||
         /\s|\.\.|[~^:?*\[\\]/.test(source.archiveRef))) throw Error('Invalid source archive ref');
  }
  if (!branches.has('main') || !branches.has('development')) throw Error('Missing main/development checkpoint');
  return inventory;
}

export function parseHeads(output) {
  const heads = new Map();
  for (const line of output.trim().split('\n').filter(Boolean)) {
    const match = /^([a-f0-9]{40})\s+refs\/heads\/(\S+)$/.exec(line);
    if (!match || heads.has(match[2])) throw Error('Invalid remote head inventory');
    heads.set(match[2], match[1]);
  }
  return heads;
}

export function parseRemoteRefs(output) {
  const heads = new Map(), archives = new Map();
  const seen = new Set();
  for (const line of output.trim().split('\n').filter(Boolean)) {
    const match = /^([a-f0-9]{40})\s+(refs\/(heads|tags)\/\S+)$/.exec(line);
    if (!match || seen.has(match[2])) throw Error('Invalid remote ref inventory');
    seen.add(match[2]);
    if (match[3] === 'heads') heads.set(match[2].slice('refs/heads/'.length), match[1]);
    else if (match[2].startsWith('refs/tags/archive/branches/')) archives.set(match[2], match[1]);
  }
  return {heads, archives};
}

export function compareSources(inventory, heads, isAncestor, archives = new Map()) {
  validateInventory(inventory);
  const failures = [];
  const known = new Set(inventory.sources.map(source => source.branch));
  for (const source of inventory.sources) {
    const actual = heads.get(source.branch);
    if (source.archiveRef) {
      const archive = archives.get(source.archiveRef);
      if (!archive) failures.push(`Missing archive: ${source.branch}`);
      else if (archive !== source.sha) failures.push(`Archive changed: ${source.branch}`);
      if (actual && actual !== source.sha) failures.push(`Branch advanced: ${source.branch}`);
    } else if (!actual) failures.push(`Missing branch: ${source.branch}`);
    else if (source.disposition === 'target') {
      if (!isAncestor(actual)) failures.push('Remote development has changes absent from this checkout');
    } else if (actual !== source.sha) failures.push(`Branch advanced: ${source.branch}`);
    if (source.disposition === 'included' && !isAncestor(source.sha)) failures.push(`Source absent from checkout: ${source.branch}`);
  }
  for (const [branch, sha] of heads) {
    if (known.has(branch)) continue;
    if (branch === inventory.assemblyBranch) {
      if (!isAncestor(sha)) failures.push('Remote assembly has changes absent from this checkout');
    } else failures.push(`Unclassified branch: ${branch}`);
  }
  if (inventory.maximumActiveBranches && heads.size > inventory.maximumActiveBranches) {
    failures.push(`Remote branch ceiling exceeded: ${heads.size} > ${inventory.maximumActiveBranches}`);
  }
  return failures;
}

function main() {
  const inventory = JSON.parse(readFileSync(new URL('../docs/handoffs/2026-10-21-development-assembly-sources.json', import.meta.url), 'utf8'));
  validateInventory(inventory);
  const {heads, archives} = parseRemoteRefs(execFileSync('git', ['ls-remote', '--heads', '--tags', 'origin'], {encoding:'utf8', timeout:30000}));
  const isAncestor = sha => {
    const result = spawnSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], {encoding:'utf8'});
    if (result.error || ![0,1].includes(result.status)) throw Error('Fetch origin before checking source ancestry');
    return result.status === 0;
  };
  const failures = compareSources(inventory, heads, isAncestor, archives);
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  else console.log(`PASS: ${inventory.sources.length} classified sources, ${heads.size} active branches; exact archives, included sources and current development verified.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
