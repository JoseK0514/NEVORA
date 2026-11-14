import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureSource,assertSourceUnchanged,externalEvidence,safeEnvironment} from './phase-e-owned.mjs';
import {readCentralBillingEvidence,verifyCentralBillingEvidence} from './central-billing-local-evidence.mjs';
const source=resolve(fileURLToPath(new URL('..',import.meta.url)));assert.equal(resolve('.'),source);
const custody=captureSource(source,process.env.NEVORA_CENTRAL_BILLING_EXPECTED_SHA),root=externalEvidence(source,process.env.NEVORA_CENTRAL_BILLING_EVIDENCE);
assert.deepEqual(readdirSync(root),[],'Central billing evidence must be a fresh directory');
const write=(name,value)=>writeFileSync(join(root,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});write('source-custody.json',custody);
let passed=false,exitCode=null,sourceUnchanged=false,verified;
try{
 const child=spawnSync(process.execPath,['scripts/onboarding-owned.mjs','--suite','central-billing'],{cwd:source,env:{...safeEnvironment(),NEVORA_CENTRAL_BILLING_EVIDENCE:root},encoding:'utf8',maxBuffer:12*1024*1024});
 writeFileSync(join(root,'owned-run.log'),(child.stdout??'')+(child.stderr??''),{flag:'wx'});exitCode=child.status;
 assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.equal(exitCode,0,'Central billing failed; inspect retained browser evidence');
 verified=verifyCentralBillingEvidence(readCentralBillingEvidence(root,source,custody));assertSourceUnchanged(source,custody);sourceUnchanged=true;passed=true;
}finally{write('acceptance.json',{schema:1,checkpoint:custody.checkpoint,tree:custody.tree,source,sourceClean:custody.sourceClean,sourceUnchanged,exitCode,status:passed?'passed':'failed',...verified,hosted:'not_run',production:'not_authorized'});}
process.stdout.write(JSON.stringify({status:'passed',checkpoint:custody.checkpoint,...verified})+'\n');
