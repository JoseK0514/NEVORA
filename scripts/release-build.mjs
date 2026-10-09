import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {captureSource, assertSourceUnchanged, safeEnvironment, externalEvidence} from './phase-e-owned.mjs';

// Directly invoked build verification, using the existing E custody guard.
// This script does not publish, promote, deploy or coordinate other work.
const source=resolve(process.cwd());
const custody=captureSource(source,process.env.PHASE_E_EXPECTED_SHA);
const receiptPath=resolve(process.env.NEVORA_BUILD_RECEIPT??'../build-source.json');
externalEvidence(source,resolve(receiptPath,'..'));
const env={...safeEnvironment(),NEXT_TELEMETRY_DISABLED:'1'};
const npmVersion=spawnSync('npm',['--version'],{env,encoding:'utf8'});
if(npmVersion.status!==0)throw Error('Cannot identify build package manager');
const result=spawnSync('npm',['run','build'],{env,stdio:'inherit'});
const receipt={...custody,node:process.version,npm:npmVersion.stdout.trim(),platform:process.platform,architecture:process.arch,lockSha256:createHash('sha256').update(readFileSync('package-lock.json')).digest('hex'),exitCode:result.status??1,files:{},sourceUnchanged:false,limitations:['Next dev browser fixtures use explicitly substituted owned DB transport; this production build does not.','Artifact bytes may differ across builds due to generated IDs and encryption. A receipt proves source custody, not bit-for-bit determinism.']};
try {assertSourceUnchanged(source,custody);receipt.sourceUnchanged=true;}finally{
 if(result.status===0){
  const queue=['.next'];
  for(const directory of queue)for(const entry of readdirSync(directory,{withFileTypes:true})){const path=join(directory,entry.name);if(entry.isDirectory())queue.push(path);else if(entry.isFile())receipt.files[path]=createHash('sha256').update(readFileSync(path)).digest('hex');}
 }
 writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
}
if(result.error)throw result.error;
process.exitCode=receipt.exitCode;
