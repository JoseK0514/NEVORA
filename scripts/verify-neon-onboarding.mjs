import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,cp,rm} from 'node:fs/promises';
import {resolve,join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {extractNeonArchive} from './neon-archive.mjs';
import {BASE_MIGRATIONS,FINAL_MIGRATIONS} from '../db/migrations/order.ts';

const args=process.argv.slice(2),allowDirty=args.includes('--allow-dirty'),monitorOnly=args.includes('--workforce-monitor-only'),provisionerOnly=args.includes('--provisioner-only'),paths=args.filter(x=>!['--allow-dirty','--workforce-monitor-only','--provisioner-only'].includes(x));
assert(!(monitorOnly&&provisionerOnly),'Select one artifact group');
assert.equal(paths.length,1,'Supply the owned bundle directory');
const output=resolve(paths[0]),receipt=JSON.parse(await readFile(join(output,'receipt.json'),'utf8'));
assert.equal(receipt.sourceUnchanged,true);
if(!allowDirty)assert.equal(receipt.deployable,true,'Only clean source bundles are deployable');
// This child process never inherits an application capability for artifact checks.
for(const key of Object.keys(process.env))if(!['PATH','HOME','HOSTNAME','NODE_ENV','NODE_OPTIONS','NODE_VERSION','LANG','LC_ALL','PWD','SHLVL','_','TZ','TERM'].includes(key))delete process.env[key];
Object.assign(process.env,{PGDATABASE:'disabled',PGHOST:'disabled.invalid',PGHOST_UNPOOLED:'disabled.invalid',PGPASSWORD:'disabled',PGUSER:'disabled',AWS_ACCESS_KEY_ID:'disabled',AWS_SECRET_ACCESS_KEY:'disabled',AWS_REGION:'us-east-1',AWS_ENDPOINT_URL_S3:'https://disabled.invalid',NEON_AI_GATEWAY_TOKEN:'disabled',NEON_AI_GATEWAY_BASE_URL:'https://disabled.invalid',NEVORA_NEON_HOST_ENABLED:'false',NEVORA_NEON_BRANCH_ID:'br-owned-local',NEON_BRANCH_ID:'br-owned-local',NEVORA_COMMERCE_ENVIRONMENT:'staging',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_WORKSPACE_MODE:'isolated',DATABASE_URL:'postgresql://disabled.invalid/disabled',DATABASE_URL_UNPOOLED:'postgresql://disabled.invalid/disabled'});
const expected=monitorOnly?['workforcemonitor']:provisionerOnly?['provisioner']:['stripewebhook','commercequeue','commercereconcile','provisioner','commerceauthority','commerceapi'];
assert.deepEqual(receipt.artifacts.map(x=>x.slug),expected);
let verifiedFiles=0;
const extracted=await mkdtemp(join(tmpdir(),'nv-neon-archive-verified-'));
try{
for(const artifact of receipt.artifacts){
 const dir=join(extracted,artifact.slug),archivePath=join(output,artifact.slug+'.zip'),archive=await readFile(archivePath);
 assert.equal(createHash('sha256').update(archive).digest('hex'),artifact.zipSha256);
 const expectedFiles=['index.mjs','src/lib/company-bootstrap/bundle.mjs',...(artifact.slug==='provisioner'?[...BASE_MIGRATIONS,...FINAL_MIGRATIONS].map(x=>'db/migrations/'+x):[])];
 assert.deepEqual(artifact.files.map(f=>f.path).sort(),expectedFiles.sort(),'archive manifest inventory mismatch');
 extractNeonArchive(archivePath,expectedFiles,dir);
 for(const file of artifact.files){
  assert(!isAbsolute(file.path)&&!file.path.split(/[\\/]/).includes('..'),'Unsafe artifact path');
  assert.equal(createHash('sha256').update(await readFile(join(dir,file.path))).digest('hex'),file.sha256);verifiedFiles++;
 }
 const artifactModule=await import(pathToFileURL(join(dir,'index.mjs')).href);
 assert.equal(artifactModule.compiledHostedSourceSha(),receipt.deployable?receipt.source.commit:'','build SHA must be compiled into every ZIP');
 process.env.NEVORA_NEON_SOURCE_SHA=receipt.source.commit;
 const h=artifactModule.default.fetch;
 assert.equal((await h(new Request('https://owned.invalid/other?private=fictional-private-value',{headers:{authorization:'Bearer fictional-private-value'}}))).status,404);
 if(artifact.slug==='stripewebhook')assert.equal((await h(new Request('https://owned.invalid/webhooks/stripe',{method:'POST'}))).status,503);
 else if(['commerceauthority','commerceapi'].includes(artifact.slug)){
  const path=artifact.slug==='commerceauthority'?'/api/commerce/facts':'/v1/plans';
  assert.equal((await h(new Request('https://owned.invalid'+path))).status,503);
  assert.equal((await h(new Request('https://owned.invalid/run',{method:'POST'}))).status,404);
 }else{
  assert.equal((await h(new Request('https://owned.invalid/run',{method:'POST'}))).status,401);
  const envelope={version:1,invocation_id:'owned-fixture',trigger:{type:'schedule',id:'trigger-owned',name:'nevora-staging-'+artifact.slug},data:{scheduled_at:'2026-11-08T12:00:00Z'}};
  for(const label of [undefined,'e'.repeat(40)]){if(label===undefined)delete process.env.NEVORA_NEON_SOURCE_SHA;else process.env.NEVORA_NEON_SOURCE_SHA=label;const rejected=await h(new Request('https://owned.invalid/run',{method:'POST',headers:{'x-neon-trigger-invocation-id':'owned-fixture'},body:JSON.stringify(envelope)}));assert.equal(rejected.status,503,'extracted ZIP must reject missing/wrong source label');}
  process.env.NEVORA_NEON_SOURCE_SHA=receipt.source.commit;
  const accepted=await h(new Request('https://owned.invalid/run',{method:'POST',headers:{'x-neon-trigger-invocation-id':'owned-fixture'},body:JSON.stringify(envelope)}));
  assert.equal(accepted.status,receipt.deployable?200:503);if(receipt.deployable)assert.deepEqual(await accepted.json(),{state:'disabled'});
 }
 if(artifact.slug==='provisioner'){
  assert.equal(artifactModule.workerEnrollmentMode(process.env,receipt.source.commit),'normal');
  process.env.NEVORA_WORKFORCE_ENROLLMENT_ENABLED='invalid';
  assert.throws(()=>artifactModule.workerEnrollmentMode(process.env,receipt.source.commit),/worker_enrollment_invalid/);
  process.env.NEVORA_WORKFORCE_ENROLLMENT_ENABLED='true';
  assert.equal(artifactModule.workerEnrollmentMode(process.env,receipt.source.commit),'enroll');
  delete process.env.NEVORA_WORKFORCE_ENROLLMENT_ENABLED;
  const manifest=await artifactModule.verifyProvisionerBundle();assert(manifest.files>0);
  const owned=await mkdtemp(join(tmpdir(),'nv-neon-bundle-probe-'));
  try{
   const copied=join(owned,'provisioner');await cp(dir,copied,{recursive:true});
   const modified=join(copied,'db/migrations/0001_initial.sql');await writeFile(modified,(await readFile(modified,'utf8'))+'\n-- owned fixture modification\n');
   const tampered=await import(pathToFileURL(join(copied,'index.mjs')).href);
   await assert.rejects(tampered.verifyProvisionerBundle(),/provisioner_source_manifest_mismatch/);
  }finally{await rm(owned,{recursive:true,force:true});}
 }
}
}finally{await rm(extracted,{recursive:true,force:true});}
console.log(JSON.stringify({state:'passed',source:receipt.source,verifiedFiles,functions:expected,actualZipExtractionVerified:true,enrollmentModeClosedVerified:!monitorOnly,canonicalSqlTamperingRejected:!monitorOnly,localTriggerSimulationOnly:true}));
