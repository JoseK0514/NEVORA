import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {copyFileSync, existsSync, globSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname, isAbsolute, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {captureSource, externalEvidence} from './phase-e-owned.mjs';

export const GROUP_NAMESPACES = {
  attendance: ['nevora-phase-d-browser-evidence', 'nevora-phase-d-remediation-evidence'],
  corrections: ['nevora-d2-browser-evidence'],
  clocker: ['nevora-clocker-browser-evidence'],
};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const ordered = values => [...values].sort((a, b) => a.path.localeCompare(b.path, 'en'));
function allowed(group, path) {
  if (typeof path !== 'string' || path.includes('\\') || isAbsolute(path) || path.split('/').some(part => !part || part === '.' || part === '..')) return false;
  const [namespace, ...parts] = path.split('/');
  if (!GROUP_NAMESPACES[group]?.includes(namespace) || !parts.length) return false;
  const name = parts.at(-1);
  if (['source-manifest.json', 'ownership.json'].includes(name)) return true;
  if (namespace === 'nevora-phase-d-remediation-evidence') return name === 'report.json' || parts.length === 1 && name.endsWith('.png');
  return parts.length === 1 && (namespace === 'nevora-phase-d-browser-evidence' ? /\.(json|png|csv|pdf)$/ : /\.(json|png)$/).test(name);
}
function safeFile(root, path) {
  let current = root;
  assert(lstatSync(current).isDirectory() && !lstatSync(current).isSymbolicLink(), 'Evidence root must be a directory');
  for (const part of path.split('/')) {
    current = join(current, part);
    assert(!lstatSync(current).isSymbolicLink(), 'Evidence symlinks are forbidden');
  }
  const stat = lstatSync(current);
  assert(stat.isFile() && stat.size <= 128 * 1024 * 1024, 'Evidence file is invalid or too large');
  const bytes = readFileSync(current);
  return {path, bytes: bytes.length, sha256: digest(bytes)};
}
function allFiles(root, prefix = '') {
  const paths = [];
  for (const entry of readdirSync(join(root, prefix), {withFileTypes: true})) {
    const path = prefix ? prefix + '/' + entry.name : entry.name;
    assert(!entry.isSymbolicLink(), 'Evidence symlinks are forbidden');
    if (entry.isDirectory()) paths.push(...allFiles(root, path));
    else { assert(entry.isFile(), 'Unexpected evidence file type'); paths.push(path); }
  }
  return paths.sort();
}
function inventory(root, paths) {
  assert(paths.length <= 20_000 && new Set(paths).size === paths.length, 'Excessive or duplicate evidence inventory');
  const files = ordered(paths.map(path => safeFile(root, path)));
  assert(files.reduce((total, file) => total + file.bytes, 0) <= 512 * 1024 * 1024, 'Evidence package is too large');
  return files;
}
function verifyIdentity(custody) {
  assert(custody?.sourceClean === true && /^[a-f0-9]{40}$/.test(custody.checkpoint) && /^[a-f0-9]{40}$/.test(custody.tree), 'Invalid exact-source custody');
}
function copyInventory(source, output, files) {
  assert(!existsSync(output), 'Evidence destination already exists');
  mkdirSync(output, {recursive: true});
  for (const file of files) {
    const destination = join(output, file.path);
    mkdirSync(dirname(destination), {recursive: true});
    copyFileSync(join(source, file.path), destination);
  }
  assert.deepEqual(inventory(output, files.map(file => file.path)), files, 'Copied evidence changed');
}
export function stageGroup({group, source, output, custody}) {
  verifyIdentity(custody);
  assert(GROUP_NAMESPACES[group], 'Unexpected browser group');
  const paths = new Set();
  for (const namespace of GROUP_NAMESPACES[group]) {
    const patterns = namespace === 'nevora-phase-d-remediation-evidence'
      ? ['**/report.json', '*.png', '**/source-manifest.json', '**/ownership.json']
      : ['*.json', '*.png', ...(namespace === 'nevora-phase-d-browser-evidence' ? ['*.csv', '*.pdf'] : []), '**/source-manifest.json', '**/ownership.json'];
    for (const suffix of patterns) for (const path of globSync(namespace + '/' + suffix, {cwd: source})) paths.add(path);
  }
  for (const path of paths) assert(allowed(group, path), 'Unexpected staged evidence path');
  const files = inventory(source, [...paths]);
  copyInventory(source, output, files);
  const manifest = {schema: 1, group, checkpoint: custody.checkpoint, tree: custody.tree, sourceClean: true, files};
  writeFileSync(join(output, 'group-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', {flag: 'wx'});
  return manifest;
}
export function verifyGroupNeeds(needs) {
  assert(needs && Object.keys(needs).length === 1 && needs['phase-d-browser-suite']?.result === 'success', 'Every Phase D browser group must succeed');
}
export function verifyGroupSet({groups, custody, needs, output}) {
  verifyIdentity(custody);
  assert(Object.keys(groups).every(group => Object.hasOwn(GROUP_NAMESPACES, group)), 'Unexpected evidence group');
  const combined = [], seen = new Set();
  for (const [group, root] of Object.entries(groups)) {
    const paths = allFiles(root);
    const manifest = JSON.parse(readFileSync(join(root, 'group-manifest.json'), 'utf8'));
    assert(manifest.schema === 1 && manifest.group === group && manifest.checkpoint === custody.checkpoint && manifest.tree === custody.tree && manifest.sourceClean === true, 'Stale or invalid group custody');
    assert(Array.isArray(manifest.files), 'Missing group inventory');
    for (const file of manifest.files) {
      assert(allowed(group, file.path) && !seen.has(file.path), 'Unexpected or duplicate evidence destination');
      seen.add(file.path);
    }
    assert.deepEqual(paths, [...manifest.files.map(file => file.path), 'group-manifest.json'].sort(), 'Group file set changed');
    assert.deepEqual(inventory(root, manifest.files.map(file => file.path)), manifest.files, 'Group evidence bytes changed');
    combined.push(...manifest.files.map(file => ({...file, source: root})));
  }
  assert(!existsSync(output), 'Aggregate destination already exists');
  mkdirSync(output, {recursive: true});
  for (const file of combined) {
    const destination = join(output, file.path);
    mkdirSync(dirname(destination), {recursive: true});
    copyFileSync(join(file.source, file.path), destination);
  }
  const files = ordered(combined.map(({source: _source, ...file}) => file));
  assert.deepEqual(inventory(output, allFiles(output)), files, 'Aggregate evidence changed');
  // Retain valid diagnostics before checking execution completeness. The always()
  // uploader must still publish available evidence when a browser group failed.
  assert.deepEqual(Object.keys(groups).sort(), Object.keys(GROUP_NAMESPACES).sort(), 'All three evidence groups are required');
  verifyGroupNeeds(needs);
  for (const namespaces of Object.values(GROUP_NAMESPACES)) for (const namespace of namespaces) {
    assert(seen.has(namespace + '/report.json'), 'Group omitted a mandatory report');
  }
  return {schema: 1, checkpoint: custody.checkpoint, tree: custody.tree, sourceClean: true, groups: Object.keys(groups).sort(), files};
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [mode, group] = process.argv.slice(2);
  const source = process.cwd(), custody = captureSource(source, process.env.PHASE_D_EXPECTED_SHA);
  const output = process.env.PHASE_D_GROUP_OUTPUT;
  assert(output && isAbsolute(output), 'Explicit group output is required');
  externalEvidence(source, dirname(output));
  if (mode === 'stage' && process.argv.length === 4) {
    const input = externalEvidence(source, process.env.PHASE_D_GROUP_SOURCE);
    stageGroup({group, source: input, output, custody});
  } else if (mode === 'aggregate' && process.argv.length === 3) {
    const input = externalEvidence(source, process.env.PHASE_D_GROUP_ARTIFACTS);
    const expected = Object.keys(GROUP_NAMESPACES).map(name => 'phase-d-partial-' + custody.checkpoint + '-' + name);
    assert(readdirSync(input).every(name => expected.includes(name)), 'Unexpected partial artifact');
    const groups = Object.fromEntries(Object.keys(GROUP_NAMESPACES).map(name => [name, join(input, 'phase-d-partial-' + custody.checkpoint + '-' + name)]).filter(([, path]) => existsSync(path)));
    const receipt = verifyGroupSet({groups, custody, output, needs: JSON.parse(process.env.PHASE_D_GROUP_NEEDS_JSON ?? '{}')});
    console.log(JSON.stringify(receipt));
  } else throw Error('Use stage <attendance|corrections|clocker> or aggregate');
}
