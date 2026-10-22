// UNUSED source candidate. Future location: scripts/portal-build-binding.mjs.
// Direct opt-in extraction only: never invokes npm/build/start, DB, providers or
// arbitrary modules. Existing scripts/release-build.mjs remains the sole build.
import { createHash } from 'node:crypto';
import { constants, closeSync, fstatSync, openSync, readFileSync, lstatSync, realpathSync,
  readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { types as nodeTypes } from 'node:util';
import { parseLosslessJsonWire, toExistingJsonValue } from '../src/lib/tenancy/migrations/lossless-json.ts';
// Invoke future script with existing installed `node --import tsx`; no new runner.

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imagePath = 'src/lib/tenancy/runtime/portal-source-image.generated.ts';
const installationPath = 'src/lib/tenancy/runtime/portal-native-installation.generated.json';
const bindingRoot = resolve(root, '../portal-build-bindings');
// Fixed co-located inputs require root source adoption before generation/build.
// No runtime Documents lookup, environment path, caller hash or disk selector.
export const PORTAL_SOURCE_SLOTS = Object.freeze({
  resolverSource: 'src/lib/tenancy/resolve.server.ts',
  rootSourceInspectorSource: 'src/lib/tenancy/runtime/portal-root-source-observation.ts',
  portalBindingSource: 'src/lib/tenancy/runtime/portal-source-binding.ts',
  installedPolicyInspectorSource: 'src/lib/tenancy/runtime/installed-policy-observation.ts',
  canonicalPolicySource: 'src/lib/capabilities/policy.ts',
  vocabularySource: 'src/lib/capabilities/types.ts',
  approvedPRDSource: 'docs/architecture/phase-f-approved-prd.md',
  auditedRoleGuardSource: 'src/lib/tenancy/runtime/audited-role-guard.sql',
  originalRuntimeLoginSource: 'src/lib/tenancy/runtime/original-runtime-login.sql',
  nativeGraphPlanSource: 'src/lib/tenancy/runtime/portal-runtime-startup-graph.sql',
});
const approvedPRDSha256 = '35e4084c2c365777c78f0d1e2e65533b06758c1f3062cf1b10feb539af8bf7a7';
const requiredMetadata = Object.freeze(['.next/BUILD_ID', '.next/required-server-files.json',
  '.next/server/app-paths-manifest.json', '.next/server/server-reference-manifest.json',
  '.next/server/server-reference-manifest.js', '.next/next-server.js.nft.json']);
const launcherPaths = Object.freeze(['node_modules/next/package.json','node_modules/next/dist/bin/next',
  'node_modules/next/dist/server/lib/start-server.js','node_modules/next/dist/server/next-server.js',
  'node_modules/next/dist/server/require-hook.js','node_modules/react/package.json','node_modules/react-dom/package.json']);
const packageInputs = Object.freeze(['package.json', 'package-lock.json', 'next.config.ts', 'tsconfig.json',
  'scripts/release-build.mjs', 'scripts/phase-e-owned.mjs', 'scripts/portal-build-binding.mjs',
  imagePath, installationPath, 'src/lib/tenancy/runtime/portal-runtime-build-install-bootstrap.server.ts',
  'src/lib/tenancy/runtime/portal-runtime-startup-loader.ts',
  'src/lib/tenancy/runtime/portal-native-installation-producer.server.ts',
  'src/lib/tenancy/runtime/portal-native-installation-capture.server.ts']);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = () => { throw new Error('portal_build_binding_unavailable'); };
function freeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}
function plain(value) {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return fail();
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail();
  const descriptors = Object.getOwnPropertyDescriptors(value), copy = Object.create(null);
  for (const key of Reflect.ownKeys(descriptors)) {
    const d = descriptors[key];
    if (typeof key !== 'string' || !Object.hasOwn(d, 'value') || !d.enumerable) return fail();
    copy[key] = d.value;
  }
  return copy;
}
function exact(value, keys) {
  const copy = plain(value), actual = Object.keys(copy);
  if (actual.length !== keys.length || actual.some(key => !keys.includes(key))) return fail();
  return copy;
}
function denseStrings(value) {
  if (!Array.isArray(value) || nodeTypes.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) return fail();
  const ds = Object.getOwnPropertyDescriptors(value);
  if (!Object.hasOwn(ds, 'length') || !Object.hasOwn(ds.length, 'value') ||
    Reflect.ownKeys(ds).length !== ds.length.value + 1) return fail();
  const out = [];
  for (let i = 0; i < ds.length.value; i++) {
    const d = Object.hasOwn(ds, String(i)) ? ds[String(i)] : undefined;
    if (!d || !Object.hasOwn(d, 'value') || !d.enumerable || typeof d.value !== 'string' || d.value.includes('\0')) return fail();
    out.push(d.value);
  }
  return out;
}
function pathKey(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') || value.includes('\\') || value.startsWith('/') ||
    value.split('/').some(part => !part || part === '.' || part === '..' || (part.startsWith('.env') && part !== '.env.example'))) return fail();
  return value;
}
function within(base, target) {
  const part = relative(base, target);
  if (!part || part === '..' || part.startsWith('..' + sep) || part.startsWith(sep)) return fail();
  return part.split(sep).join('/');
}
function digestMap(value) {
  const result = plain(value);
  if (!Object.keys(result).length) return fail();
  for (const [path, digest] of Object.entries(result)) if (pathKey(path) !== path || typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)) return fail();
  return result;
}
function utf8(bytes) {
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  if (!Buffer.from(text, 'utf8').equals(bytes) || text.includes('\0')) return fail();
  return text;
}
function noSymlinkPath(base, file) {
  const key = within(base, file);
  let current = base;
  if (lstatSync(base).isSymbolicLink() || realpathSync(base) !== base) return fail();
  const parts = key.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]); const stat = lstatSync(current);
    if (stat.isSymbolicLink() || (i !== parts.length - 1 && !stat.isDirectory())) return fail();
  }
}
function readStable(base, path) {
  const file = join(base, pathKey(path)); noSymlinkPath(base, file);
  const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(fd); if (!before.isFile()) return fail();
    const bytes = readFileSync(fd), after = fstatSync(fd), final = lstatSync(file);
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs ||
      before.ctimeMs !== after.ctimeMs || bytes.length !== after.size || final.dev !== after.dev || final.ino !== after.ino || final.isSymbolicLink()) return fail();
    return bytes;
  } finally { closeSync(fd); }
}
function inventory(base, directory) {
  const out = [];
  function visit(path) {
    noSymlinkPath(base, join(base, path));
    for (const entry of readdirSync(join(base, path), { withFileTypes: true }).sort((a,b) => Buffer.compare(Buffer.from(a.name), Buffer.from(b.name)))) {
      const next = pathKey(path + '/' + entry.name);
      if (entry.isSymbolicLink()) return fail();
      if (entry.isDirectory()) visit(next); else if (entry.isFile()) out.push(next); else return fail();
    }
  }
  visit(directory); return out;
}
function imageSource(input) {
  // Ten static full byte preimages in canonical base64 keep the generated TS
  // AST small. Decoding creates immutable dense bytes for the existing loader;
  // the extractor reads the inert marker JSON and never imports/evaluates it.
  const record = {format:'PORTAL_RUNTIME_SOURCE_IMAGE_BASE64_V1'};
  for(const name of Object.keys(PORTAL_SOURCE_SLOTS))record[name]=Buffer.from(input[name]).toString('base64');
  return '// Generated from fixed retained inputs BEFORE existing clean release build.\n' +
    '// Exact preimages/source binding only; no install/reviewer/tenant authority.\n' +
    'const PORTAL_SOURCE_IMAGE_BASE64 = /* PORTAL_IMAGE_BEGIN */' + JSON.stringify(record) + '/* PORTAL_IMAGE_END */ as const;\n' +
    'export const PORTAL_SOURCE_IMAGE_BYTES = Object.freeze(Object.fromEntries(Object.entries(PORTAL_SOURCE_IMAGE_BASE64).map(([name,value]) =>\n' +
    '  name === "format" ? [name,"PORTAL_RUNTIME_SOURCE_IMAGE_INPUT_V1"] : [name,Object.freeze([...Buffer.from(value,"base64")])])));\n';
}
function parseGeneratedImage(bytes) {
  const text = utf8(bytes), begin = '/* PORTAL_IMAGE_BEGIN */', end = '/* PORTAL_IMAGE_END */';
  if (text.split(begin).length !== 2 || text.split(end).length !== 2) return fail();
  const result = metadataJson(Buffer.from(text.slice(text.indexOf(begin) + begin.length, text.indexOf(end))));
  const row = exact(result, ['format', ...Object.keys(PORTAL_SOURCE_SLOTS)]);
  if (row.format !== 'PORTAL_RUNTIME_SOURCE_IMAGE_BASE64_V1') return fail();
  const image = {format:'PORTAL_RUNTIME_SOURCE_IMAGE_INPUT_V1'};
  for (const name of Object.keys(PORTAL_SOURCE_SLOTS)) {
    if(typeof row[name] !== 'string'||!row[name])return fail();
    const raw=Buffer.from(row[name],'base64');
    if(!raw.length||raw.toString('base64')!==row[name])return fail();utf8(raw);image[name]=[...raw];
  }
  // The full generated source, not only a marker data fragment, must match the
  // fixed generator. Unknown code appended to generated source is rejected.
  if(!Buffer.from(imageSource(image)).equals(bytes))return fail();
  return image;
}
function metadataJson(bytes) {
  const parsed = parseLosslessJsonWire(utf8(bytes));
  if (parsed.status !== 'PARSED') return fail();
  const converted = toExistingJsonValue(parsed.envelope);
  if (converted.status !== 'CONVERTED' || converted.origin !== 'JSON') return fail();
  return converted.value;
}
function createOnly(file, bytes, mode = 0o600) {
  const fd = openSync(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, mode);
  try { writeFileSync(fd, bytes); } finally { closeSync(fd); }
}
/** Source preparation, not a build. Root must retain/review/commit this generated
 * tracked file before invoking unchanged release-build. Existing unequal image
 * is never overwritten. No source-image hash recursively includes itself. */
export function generatePortalSourceImage() {
  const input = { format: 'PORTAL_RUNTIME_SOURCE_IMAGE_INPUT_V1' };
  for (const [name,path] of Object.entries(PORTAL_SOURCE_SLOTS)) {
    const bytes = readStable(root,path); utf8(bytes);
    if (!bytes.length || (name === 'approvedPRDSource' && sha(bytes) !== approvedPRDSha256)) return fail();
    input[name] = [...bytes];
  }
  const output = Buffer.from(imageSource(input));
  try { createOnly(join(root,imagePath),output); }
  catch (error) {
    if (error?.code !== 'EEXIST' || !readStable(root,imagePath).equals(output)) return fail();
  }
  return freeze({ status:'SOURCE_IMAGE_GENERATED_NOT_BUILT', sourceImageSha256:sha(output), file:imagePath });
}
/** Exposed structural trace parser for future regression tests, NOT issuer or
 * arbitrary path reader. Caller values here cannot create a retained build. */
export function inspectNextTrace(value, tracePath) {
  const trace = exact(value, ['version','files']);
  if (trace.version !== 1) return fail();
  const paths = denseStrings(trace.files), seen = new Set(), output = [];
  for (const file of paths) {
    if (!file || file.startsWith('/') || file.includes('\\')) return fail();
    const key = within(root, resolve(root, dirname(pathKey(tracePath)), file)); pathKey(key);
    if (seen.has(key)) return fail(); seen.add(key); output.push(key);
  }
  return Object.freeze(output.sort((a,b) => Buffer.compare(Buffer.from(a),Buffer.from(b))));
}
/** Consumes ONLY the existing default sibling release receipt. A custom
 * NEVORA_BUILD_RECEIPT build requires a root-reviewed fixed-slot amendment;
 * this producer never follows an environment/user-selected receipt path. */
export function retainPortalBuildBinding() {
  const receiptRoot = dirname(root), receiptBytes = readStable(receiptRoot,'build-source.json');
  const receipt = exact(metadataJson(receiptBytes), ['checkpoint','tree','sourceClean','hashes','node','npm',
    'platform','architecture','lockSha256','exitCode','files','sourceUnchanged','limitations']);
  if (typeof receipt.checkpoint !== 'string' || typeof receipt.tree !== 'string' ||
    !/^[a-f0-9]{40}$/.test(receipt.checkpoint) || !/^[a-f0-9]{40}$/.test(receipt.tree) || receipt.sourceClean !== true ||
    receipt.sourceUnchanged !== true || receipt.exitCode !== 0 || receipt.node !== process.version ||
    receipt.platform !== process.platform || receipt.architecture !== process.arch || typeof receipt.npm !== 'string' || !receipt.npm) return fail();
  denseStrings(receipt.limitations);
  const sourceHashes = digestMap(receipt.hashes), artifactHashes = digestMap(receipt.files);
  // Reuse source custody without executing repository code or a new Git helper:
  // exact files captured by existing guard are re-read. New/untracked-source and
  // exact current commit/tree must be independently recaptured by root operator.
  for (const [path,hash] of Object.entries(sourceHashes)) if (sha(readStable(root,path)) !== hash) return fail();
  const artifactPaths = inventory(root,'.next');
  if (artifactPaths.length !== Object.keys(artifactHashes).length || artifactPaths.some(path => artifactHashes[path] === undefined)) return fail();
  for (const path of artifactPaths) if (sha(readStable(root,path)) !== artifactHashes[path]) return fail();
  for (const path of [...requiredMetadata,...packageInputs]) if (!(path in (path.startsWith('.next/') ? artifactHashes : sourceHashes))) return fail();
  if (receipt.lockSha256 !== sourceHashes['package-lock.json']) return fail();
  const packageJson = metadataJson(readStable(root,'package.json'));
  if (packageJson.scripts?.build !== 'next build' || packageJson.scripts?.start !== 'next start' || packageJson.dependencies?.next !== '16.4.2') return fail();
  const installedNext = metadataJson(readStable(root,'node_modules/next/package.json'));
  if (installedNext.version !== packageJson.dependencies.next) return fail();
  const lock = metadataJson(readStable(root,'package-lock.json'));
  if (lock.packages?.['node_modules/next']?.version !== installedNext.version) return fail();
  const serverFiles = metadataJson(readStable(root,'.next/required-server-files.json'));
  if (serverFiles.version !== 1 || serverFiles.appDir !== root || serverFiles.config?.distDir !== '.next' ||
    serverFiles.config?.output !== undefined || serverFiles.relativeAppDir !== '') return fail();
  if(denseStrings(serverFiles.ignore).length!==0)return fail();
  const requiredFiles = denseStrings(serverFiles.files);
  if (new Set(requiredFiles).size !== requiredFiles.length || requiredFiles.some(path => artifactHashes[pathKey(path)] === undefined)) return fail();
  const appPaths = plain(metadataJson(readStable(root,'.next/server/app-paths-manifest.json')));
  if (!Object.keys(appPaths).length) return fail();
  const entries = Object.entries(appPaths).map(([route,path]) => {
    if (!route.startsWith('/') || typeof path !== 'string' || !path.endsWith('.js')) return fail();
    const entry = pathKey('.next/server/' + path), trace = entry + '.nft.json';
    if (artifactHashes[entry] === undefined || artifactHashes[trace] === undefined) return fail();
    return { route,entry,trace };
  }).sort((a,b) => Buffer.compare(Buffer.from(a.route),Buffer.from(b.route)));
  const tracePaths = artifactPaths.filter(path => path.endsWith('.nft.json'));
  const traceEdges = tracePaths.map(path => ({ trace:path,files:inspectNextTrace(metadataJson(readStable(root,path)),path) }));
  const dependencyPaths = [...new Set([...launcherPaths,...traceEdges.flatMap(trace => trace.files)])].filter(path => !path.startsWith('.next/')).sort();
  // The published NFT trace omits bundled modules. It supplies traced file
  // dependencies, NOT a source-to-chunk/callgraph/actual-import certificate.
  const dependencies = dependencyPaths.map(path => {
    const bytes = readStable(root,path);
    if (!path.startsWith('node_modules/') && sourceHashes[path] !== sha(bytes)) return fail();
    return { path,sha256:sha(bytes),byteLength:bytes.length };
  });
  const image = parseGeneratedImage(readStable(root,imagePath));
  for (const [name,path] of Object.entries(PORTAL_SOURCE_SLOTS)) if (!sourceHashes[path] ||
    !Buffer.from(image[name]).equals(readStable(root,path))) return fail();
  const installBytes = readStable(root,installationPath), installation = metadataJson(installBytes);
  // Closed independent producer format is validated by fixed bootstrap, not an
  // approval boolean. This step retains exact full bytes as source/build input.
  if (installation.format !== 'PORTAL_NATIVE_INSTALLATION_RETAINED_V1') return fail();
  const buildId = utf8(readStable(root,'.next/BUILD_ID'));
  if (!buildId || /[\r\n]/.test(buildId)) return fail();
  const nextLauncher = readStable(root,'node_modules/next/dist/bin/next');
  const body = { format:'PORTAL_BUILD_INSTALL_INPUT_RETENTION_V1',checkpoint:receipt.checkpoint,tree:receipt.tree,
    releaseReceipt:{sha256:sha(receiptBytes),bytes:[...receiptBytes]},runtime:{node:receipt.node,npm:receipt.npm,platform:receipt.platform,
      architecture:receipt.architecture,next:installedNext.version,packageSha256:sourceHashes['package.json'],lockSha256:receipt.lockSha256},
    buildId,sourceHashes,artifactHashes,requiredFiles,entries,traceEdges,dependencies,image,
    launcher:{path:'node_modules/next/dist/bin/next',sha256:sha(nextLauncher),command:'next start',
      nodeOptions:'ABSENT',nodePath:'ABSENT',standaloneConfig:'ABSENT'},
    installationBytes:[...installBytes],generatedImageSourceSha256:sourceHashes[imagePath],installationSourceSha256:sourceHashes[installationPath],
    verification:'RETAINED_BUILD_INPUTS_ARTIFACTS_AND_DECLARED_TRACES_NOT_INSTALLER_OR_EXECUTING_IMPORT_AUTHENTICATION',
    remainingGates:['CONTROLLED_RELEASE_RECEIPT_SOURCE_RECAPTURE','CONTROLLED_NATIVE_INSTALL_ENROLLMENT_PRODUCER',
      'FIXED_BOOTSTRAP_IMPORT_AND_RUNTIME_ARTIFACT_CUSTODY','CURRENT_NATIVE_GRAPH_PRIVATE_ENROLLMENT_RECHECK',
      'PROTECTED_ROOT_CURRENT_PROOF_PRIVATE_RLS_RECOVERY_AND_NEON'] };
  const canonical = Buffer.from(JSON.stringify(body)), bindingDigest = sha(canonical), output = join(bindingRoot,bindingDigest);
  // Fixed external retention, create-only. No current pointer is selected here.
  // Root-controlled installer/deployment chooses the reviewed immutable binding
  // by tracked source; the runtime never trusts a caller/env-selected digest.
  if (lstatSync(receiptRoot).isSymbolicLink() || realpathSync(receiptRoot) !== receiptRoot) return fail();
  try { mkdirSync(bindingRoot,{mode:0o700}); } catch (error) { if (error?.code !== 'EEXIST') return fail(); }
  const parent = lstatSync(bindingRoot);
  if (!parent.isDirectory() || parent.isSymbolicLink() || parent.uid !== process.getuid?.() || (parent.mode & 0o077) !== 0) return fail();
  mkdirSync(output,{mode:0o700});
  createOnly(join(output,'binding.json'),canonical);
  // A native Next BUILD_ID is an existing build identity, not a new operation
  // ID. Hashing it closes path syntax; it does not authenticate the build.
  const lookupRoot = join(bindingRoot,'by-build-id');
  try { mkdirSync(lookupRoot,{mode:0o700}); } catch (error) { if(error?.code !== 'EEXIST') return fail(); }
  const lookupStat = lstatSync(lookupRoot);
  if(!lookupStat.isDirectory() || lookupStat.isSymbolicLink() || lookupStat.uid !== process.getuid?.() || (lookupStat.mode & 0o077) !== 0) return fail();
  // Re-read entire captured sets and traced dependencies before retention. A
  // torn namespace/mutation is a failure, never a coherent receipt rewrite.
  if(JSON.stringify(inventory(root,'.next')) !== JSON.stringify(artifactPaths)) return fail();
  for(const [path,hash] of Object.entries(sourceHashes)) if(sha(readStable(root,path)) !== hash) return fail();
  for(const [path,hash] of Object.entries(artifactHashes)) if(sha(readStable(root,path)) !== hash) return fail();
  for(const entry of dependencies) if(sha(readStable(root,entry.path)) !== entry.sha256) return fail();
  const lookup = Buffer.from(JSON.stringify({format:'PORTAL_BUILD_BINDING_SLOT_V1',buildId,bindingDigest}));
  createOnly(join(lookupRoot,sha(Buffer.from(buildId)) + '.json'),lookup);
  // Static tracked selector is prepared separately by root from these retained
  // bytes. Producer prints/returns only digest, not keys/source/native capsules.
  return freeze({ status:'BUILD_INPUTS_AND_CLOSURE_RETAINED',bindingDigest,byteLength:canonical.length,
    verification:body.verification });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3 || !['--generate-source-image','--retain-build-binding'].includes(process.argv[2])) fail();
    const result = process.argv[2] === '--generate-source-image' ? generatePortalSourceImage() : retainPortalBuildBinding();
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch {
    // Fixed source-only diagnostic; never dump private receipt/source bytes,
    // native capsule data, file paths or raw filesystem errors to the terminal.
    process.stderr.write('PORTAL_BUILD_BINDING_UNAVAILABLE\n');
    process.exitCode = 1;
  }
}
