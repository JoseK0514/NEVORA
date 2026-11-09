// UNEXECUTED candidate, future scripts/portal-build-binding.check.mjs.
// Fictional filesystem/receipt metadata tests, NOT a real Next build, native
// installation, successful executed artifact import or operator authentication.
// Uses existing Node test + installed tsx, no compiler/build/resource runner.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync,
  realpathSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PORTAL_SOURCE_SLOTS, inspectNextTrace } from './portal-build-binding.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const here = dirname(fileURLToPath(import.meta.url));
const app = join(here,'..');
function put(root,path,bytes) {const file=join(root,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,bytes);}
function walk(root,directory='') {
  return readdirSync(join(root,directory),{withFileTypes:true}).flatMap(e=>{
    const path=directory?directory+'/'+e.name:e.name;return e.isDirectory()?walk(root,path):[path];
  });
}
async function fixture(nextVersion='16.4.2') {
  const base=realpathSync(mkdtempSync(join(tmpdir(),'portal-binding-fictional-'))),root=join(base,'project');mkdirSync(root);
  put(root,'scripts/portal-build-binding.mjs',readFileSync(join(here,'portal-build-binding.mjs')));
  put(root,'src/lib/tenancy/migrations/lossless-json.ts',readFileSync(join(app,'src/lib/tenancy/migrations/lossless-json.ts')));
  for(const [slot,path] of Object.entries(PORTAL_SOURCE_SLOTS)) {
    const source=slot==='approvedPRDSource'?readFileSync(join(app,'docs/architecture/phase-f-approved-prd.md')):Buffer.from('// fictional '+slot+'\n');put(root,path,source);
  }
  for(const path of ['scripts/release-build.mjs','scripts/phase-e-owned.mjs',
    'src/lib/tenancy/runtime/portal-runtime-build-install-bootstrap.server.ts','src/lib/tenancy/runtime/portal-runtime-startup-loader.ts','src/lib/tenancy/runtime/portal-native-installation-producer.server.ts','src/lib/tenancy/runtime/portal-native-installation-capture.server.ts'])put(root,path,'// fictional inert source\n');
  put(root,'package.json',JSON.stringify({scripts:{build:'next build',start:'next start'},dependencies:{next:nextVersion}}));
  put(root,'package-lock.json',JSON.stringify({packages:{'node_modules/next':{version:nextVersion}}}));
  put(root,'next.config.ts','export default {};\n');put(root,'tsconfig.json','{}');
  put(root,'src/lib/tenancy/runtime/portal-native-installation.generated.json',JSON.stringify({format:'PORTAL_NATIVE_INSTALLATION_RETAINED_V1'})+'\n');
  for(const path of ['node_modules/next/dist/bin/next','node_modules/next/dist/server/lib/start-server.js',
    'node_modules/next/dist/server/next-server.js','node_modules/next/dist/server/require-hook.js'])put(root,path,'// fictional package file\n');
  put(root,'node_modules/next/package.json',JSON.stringify({version:nextVersion}));
  put(root,'node_modules/react/package.json','{"version":"19.3.0"}');put(root,'node_modules/react-dom/package.json','{"version":"19.3.0"}');
  const producer=await import(pathToFileURL(join(root,'scripts/portal-build-binding.mjs')).href);
  producer.generatePortalSourceImage();
  put(root,'.next/BUILD_ID','fictional-native-build-id');
  put(root,'.next/required-server-files.json',JSON.stringify({version:1,config:{distDir:'.next'},appDir:root,relativeAppDir:'',files:['.next/BUILD_ID'],ignore:[]}));
  put(root,'.next/server/app-paths-manifest.json',JSON.stringify({'/api/fictional/route':'app/api/fictional/route.js'}));
  put(root,'.next/server/server-reference-manifest.json','{"node":{},"edge":{},"encryptionKey":"FICTIONAL_NOT_SECRET"}');
  put(root,'.next/server/server-reference-manifest.js','// fictional action manifest\n');
  put(root,'.next/next-server.js.nft.json','{"version":1,"files":["../node_modules/next/package.json"]}');
  put(root,'.next/server/app/api/fictional/route.js','// fictional compiled output\n');
  put(root,'.next/server/app/api/fictional/route.js.nft.json','{"version":1,"files":[]}');
  const tracked=walk(root).filter(p=>!p.startsWith('.next/')&&!p.startsWith('node_modules/'));
  const hashes=Object.fromEntries(tracked.map(p=>[p,hash(readFileSync(join(root,p)))]));
  const files=Object.fromEntries(walk(root,'.next').map(p=>[p,hash(readFileSync(join(root,p)))]));
  const receipt={checkpoint:'a'.repeat(40),tree:'b'.repeat(40),sourceClean:true,hashes,node:process.version,npm:'fictional-package-manager',
    platform:process.platform,architecture:process.arch,lockSha256:hashes['package-lock.json'],exitCode:0,files,sourceUnchanged:true,limitations:['FICTIONAL_METADATA_ONLY']};
  function receiptWrite(){put(base,'build-source.json',JSON.stringify(receipt,null,2)+'\n');}receiptWrite();
  return {base,root,producer,receipt,receiptWrite,close(){rmSync(base,{recursive:true,force:true});}};
}
test('declared NFT parser preserves sorted in-root relative file closure',()=>assert.deepEqual(
  inspectNextTrace({version:1,files:['../../node_modules/next/package.json','../BUILD_ID']},'.next/server/x.js.nft.json'),
  ['.next/BUILD_ID','node_modules/next/package.json']));
const badTrace=[
  ['unsupported version',{version:2,files:[]}],['unknown key',{version:1,files:[],approved:true}],
  ['duplicate resolved file',{version:1,files:['../BUILD_ID','../BUILD_ID']}],
  ['outside root',{version:1,files:['../../../../../outside']}],['absolute',{version:1,files:['/tmp/outside']}],
  ['backslash',{version:1,files:['..\\BUILD_ID']}],['sparse',{version:1,files:new Array(1)}],
];
for(const [label,value] of badTrace)test('declared NFT parser rejects '+label,()=>assert.throws(()=>inspectNextTrace(value,'.next/server/x.js.nft.json'),/portal_build_binding_unavailable/));
test('NFT parser rejects getter without executing it',()=>{
  let reads=0;const x={version:1};Object.defineProperty(x,'files',{enumerable:true,get(){reads++;return [];}});
  assert.throws(()=>inspectNextTrace(x,'.next/server/x.js.nft.json'));assert.equal(reads,0);
});
test('NFT parser rejects revoked proxy trap-free',()=>{const p=Proxy.revocable({},{});p.revoke();assert.throws(()=>inspectNextTrace(p.proxy,'.next/server/x.js.nft.json'),/portal_build_binding_unavailable/);});
test('fictional complete receipt produces create-only full retention and fixed build-ID slot',async()=>{
  const f=await fixture();try{const result=f.producer.retainPortalBuildBinding();assert.equal(result.status,'BUILD_INPUTS_AND_CLOSURE_RETAINED');
    const bytes=readFileSync(join(f.base,'portal-build-bindings',result.bindingDigest,'binding.json'));assert.equal(hash(bytes),result.bindingDigest);
    const binding=JSON.parse(bytes);assert.equal(binding.image.format,'PORTAL_RUNTIME_SOURCE_IMAGE_INPUT_V1');assert.equal(Object.keys(binding.image).length,11);
    assert.deepEqual(binding.artifactHashes,f.receipt.files);assert.deepEqual(binding.sourceHashes,f.receipt.hashes);
    assert.equal(binding.verification,'RETAINED_BUILD_INPUTS_ARTIFACTS_AND_DECLARED_TRACES_NOT_INSTALLER_OR_EXECUTING_IMPORT_AUTHENTICATION');
    assert.ok(binding.remainingGates.includes('CONTROLLED_NATIVE_INSTALL_ENROLLMENT_PRODUCER'));
    const slot=JSON.parse(readFileSync(join(f.base,'portal-build-bindings/by-build-id',hash(Buffer.from(binding.buildId))+'.json')));assert.equal(slot.bindingDigest,result.bindingDigest);
  }finally{f.close();}
});
for(const [field,value] of [['exitCode',1],['sourceUnchanged',false],['sourceClean',false]])test('receipt rejects '+field,async()=>{
  const f=await fixture();try{f.receipt[field]=value;f.receiptWrite();assert.throws(()=>f.producer.retainPortalBuildBinding(),/portal_build_binding_unavailable/);}finally{f.close();}
});
test('a coherent retained build on vulnerable Next16.3.8 is refused',async()=>{
  const f=await fixture('16.3.8');try{assert.throws(()=>f.producer.retainPortalBuildBinding(),/portal_build_binding_unavailable/);}finally{f.close();}
});
test('changed generated image refuses retention without rewriting it',async()=>{const f=await fixture();try{
  const file='src/lib/tenancy/runtime/portal-source-image.generated.ts';put(f.root,file,'// changed\n');assert.throws(()=>f.producer.retainPortalBuildBinding());
  assert.equal(readFileSync(join(f.root,file),'utf8'),'// changed\n');}finally{f.close();}});
test('changed compiled artifact refuses retention',async()=>{const f=await fixture();try{put(f.root,'.next/server/app/api/fictional/route.js','changed');assert.throws(()=>f.producer.retainPortalBuildBinding());}finally{f.close();}});
test('extra artifact refuses complete capture',async()=>{const f=await fixture();try{put(f.root,'.next/server/unretained.js','changed');assert.throws(()=>f.producer.retainPortalBuildBinding());}finally{f.close();}});
test('malformed duplicate receipt fields fail closed through accepted lossless parser',async()=>{const f=await fixture();try{
  put(f.base,'build-source.json','{"exitCode":0,"exitCode":0}');assert.throws(()=>f.producer.retainPortalBuildBinding());}finally{f.close();}});
test('trace escaping root and symlink dependency are refused, not copied',async()=>{const f=await fixture();try{
  const file='node_modules/next/dist/server/next-server.js';rmSync(join(f.root,file));symlinkSync(join(f.base,'build-source.json'),join(f.root,file));
  assert.throws(()=>f.producer.retainPortalBuildBinding());}finally{f.close();}});
test('same generated source is harmless idempotence; differing source is never overwritten',async()=>{const f=await fixture();try{
  const before=readFileSync(join(f.root,'src/lib/tenancy/runtime/portal-source-image.generated.ts'));
  assert.equal(f.producer.generatePortalSourceImage().status,'SOURCE_IMAGE_GENERATED_NOT_BUILT');
  put(f.root,PORTAL_SOURCE_SLOTS.canonicalPolicySource,'changed-policy\n');assert.throws(()=>f.producer.generatePortalSourceImage());
  assert.deepEqual(readFileSync(join(f.root,'src/lib/tenancy/runtime/portal-source-image.generated.ts')),before);}finally{f.close();}});

// BI01 cause-bearing actual parser/complete fictional receipt controls.
for(const field of ['checkpoint','tree'])test('BI01 receipt rejects coerced array '+field,async()=>{
  const f=await fixture();try{f.receipt[field]=[f.receipt[field]];f.receiptWrite();
    assert.throws(()=>f.producer.retainPortalBuildBinding(),/portal_build_binding_unavailable/);
  }finally{f.close();}
});
