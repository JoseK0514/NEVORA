import {execFileSync, spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const dispositions = new Set(['included', 'superseded', 'reference', 'held', 'protected', 'target']);
const fullSha = /^[a-f0-9]{40}$/;

export function validateInventory(inventory) {
  if (inventory?.schema !== 1 || inventory.target !== 'development' ||
      typeof inventory.assemblyBranch !== 'string' || !inventory.assemblyBranch.startsWith('codex/') ||
      !Array.isArray(inventory.sources)) throw Error('Invalid development source inventory');
  const branches = new Set();
  for (const source of inventory.sources) {
    if (typeof source.branch !== 'string' || !source.branch || branches.has(source.branch) ||
        !fullSha.test(source.sha) || !dispositions.has(source.disposition) ||
        typeof source.reason !== 'string' || !source.reason.trim()) throw Error('Invalid or duplicate source entry');
    branches.add(source.branch);
    if ((source.branch === 'main') !== (source.disposition === 'protected') ||
        (source.branch === 'development') !== (source.disposition === 'target')) throw Error('Invalid protected/target disposition');
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

export function compareSources(inventory, heads, isAncestor) {
  validateInventory(inventory);
  const failures = [];
  const known = new Set(inventory.sources.map(source => source.branch));
  for (const source of inventory.sources) {
    const actual = heads.get(source.branch);
    if (!actual) failures.push(`Missing branch: ${source.branch}`);
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
  return failures;
}

function main() {
  const inventory = JSON.parse(readFileSync(new URL('../docs/handoffs/2026-10-21-development-assembly-sources.json', import.meta.url), 'utf8'));
  validateInventory(inventory);
  const heads = parseHeads(execFileSync('git', ['ls-remote', '--heads', 'origin'], {encoding:'utf8', timeout:30000}));
  const isAncestor = sha => {
    const result = spawnSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], {encoding:'utf8'});
    if (result.error || ![0,1].includes(result.status)) throw Error('Fetch origin before checking source ancestry');
    return result.status === 0;
  };
  const failures = compareSources(inventory, heads, isAncestor);
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  else console.log(`PASS: ${inventory.sources.length} classified branch heads; included sources and current development are in this checkout.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
