import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,lstatSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureSource,assertSourceUnchanged,externalEvidence,safeEnvironment} from './phase-e-owned.mjs';
import {verifyStep4Evidence} from './step4-local-evidence.mjs';

const source=resolve(fileURLToPath(new URL('..',import.meta.url)));
assert.equal(resolve('.'),source,'Step4 must execute at its source root');
const custody=captureSource(source,process.env.NEVORA_STEP4_EXPECTED_SHA);
const root=externalEvidence(source,process.env.NEVORA_STEP4_EVIDENCE);
assert.deepEqual(readdirSync(root),[],'Step4 evidence must be a fresh directory');
const write=(name,value)=>writeFileSync(join(root,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
write('source-custody.json',custody);
let passed=false,exitCode=null,sourceUnchanged=false,verified;
try{
 const child=spawnSync(process.execPath,['scripts/onboarding-owned.mjs','--suite','step4-local'],{cwd:source,env:{...safeEnvironment(),NEVORA_STEP4_EVIDENCE:root},encoding:'utf8',maxBuffer:12*1024*1024});
 writeFileSync(join(root,'owned-run.log'),(child.stdout??'')+(child.stderr??''),{flag:'wx'});exitCode=child.status;
 assert.equal(child.error,undefined,'Owned Step4 child failed to execute');assert.equal(child.signal,null,'Owned Step4 child was interrupted');assert.equal(exitCode,0,'Owned Step4 lifecycle failed; inspect retained local evidence');
 const json=name=>JSON.parse(readFileSync(join(root,name),'utf8'));
 const inventory=new Map();const scan=(dir,prefix='')=>{for(const entry of readdirSync(dir,{withFileTypes:true})){assert(!entry.isSymbolicLink(),'Symbolic Step4 evidence refused');const name=prefix+entry.name,path=join(dir,entry.name);if(entry.isDirectory())scan(path,name+'/');else{assert(entry.isFile());inventory.set(name,lstatSync(path).size);}}};scan(root);
 const packets=['app','second-app'].map(kind=>{const directories=readdirSync(join(root,kind),{withFileTypes:true}).filter(entry=>entry.isDirectory()&&/^owned-next-[A-Za-z0-9]+$/.test(entry.name));assert.equal(directories.length,1);const prefix=kind+'/'+directories[0].name;return {kind,manifest:json(prefix+'/source-manifest.json'),ownership:json(prefix+'/ownership.json')};});
 verified=verifyStep4Evidence({custody,source,report:json('report.json'),vitest:json('vitest.json'),cluster:json('owned-cluster.json'),packets,inventory,transportSource:readFileSync(join(source,'src/lib/workspace-routing/transport.server.ts'),'utf8'),typesSource:readFileSync(join(source,'next-env.d.ts'),'utf8')});
 assertSourceUnchanged(source,custody);sourceUnchanged=true;passed=true;
}finally{
 write('acceptance.json',{schema:1,checkpoint:custody.checkpoint,tree:custody.tree,source,sourceClean:custody.sourceClean,sourceUnchanged,exitCode,status:passed?'passed':'failed',...verified,hosted:'not_run',production:'not_authorized'});
}
process.stdout.write(JSON.stringify({status:'passed',checkpoint:custody.checkpoint,...verified})+'\n');
