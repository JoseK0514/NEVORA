// Serial external priority/scoped pass. Preparation alone starts no runtime.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createWriteStream} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
assert.equal(process.env.BROWSER_HOLD_RELEASED,'yes');
const source=process.env.VERIFY_SOURCE,sha=process.env.VERIFY_SHA,report=process.env.VERIFY_REPORT_ROOT;
const tools='/workspace/nevora-inspection-runtime/final-verification';
assert.equal(sha,'15a0fcd70d49060bb21738de67f4d8feb9b96d58');
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sha);
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'');
await mkdir(report,{recursive:true});const scripts=join(report,'executed-scripts');await mkdir(scripts,{recursive:true});
const files=['scoped-verify-v2.mjs','combined-extra-cases.mjs','read-contract-v2.mjs','checker-guard-v2.mjs','owned-read-barrier.mjs','scoped-wave-b.mjs','scoped-desktop.mjs','cold-timecards.mjs','cold-recorded-time.mjs','home-responsive.mjs','guidance-fonts.mjs','timecards-503.mjs','close.mjs'];
const manifest=[];for(const name of files){const bytes=await readFile(join(tools,name));await writeFile(join(scripts,name),bytes);manifest.push({source:join(tools,name),snapshot:join(scripts,name),sha256:createHash('sha256').update(bytes).digest('hex')});}
await writeFile(join(report,'executed-script-lineage.json'),JSON.stringify({checkpoint:sha,preparedAt:new Date().toISOString(),scripts:manifest},null,2)+'\n');
const stages={
 priority:{script:'scoped-verify-v2.mjs',env:{VERIFY_ONLY:'scoped-wb-rules-enter,scoped-desktop-inbox-natural-eight,scoped-desktop-inbox-native-four',VERIFY_SCOPED_ONLY:'yes',VERIFY_RESULT_PREFIX:'targeted-priority',VERIFY_SCOPED_MODULES:['scoped-wave-b.mjs','scoped-desktop.mjs'].map(n=>join(scripts,n)).join(',')}},
 recorded:{script:'cold-recorded-time.mjs',guard:true},
 cold:{script:'cold-timecards.mjs',guard:true},
 home:{script:'home-responsive.mjs',guard:true},
 payroll:{script:'guidance-fonts.mjs',guard:true},
 timecards:{script:'timecards-503.mjs',guard:true,env:{TIMECARDS_EXPECT_RETRY:'yes'}},
};
const selected=(process.env.VERIFY_STAGES??'priority,recorded,cold,home,payroll,timecards').split(',');assert(selected.every(k=>Object.hasOwn(stages,k)));
const ledger={checkpoint:sha,scope:'Source-exact bounded Rules/Inbox priority and scoped/cold evidence; no full exit certification',jobs:[]};
const save=()=>writeFile(join(report,'inspection-stage-ledger.json'),JSON.stringify(ledger,null,2)+'\n');
const run=async(definition,name)=>{const env={...process.env,...definition.env,VERIFY_GUARD_PURPOSE:name};for(const key of ['VERIFY_ONLY','VERIFY_SCOPED_ONLY','VERIFY_SCOPED_MODULES','VERIFY_BASE_ONLY','VERIFY_RESUME','HOME_FAIL_FAST'])if(!Object.hasOwn(definition.env??{},key))delete env[key];const args=[...(definition.guard?['--import',join(scripts,'checker-guard-v2.mjs')]:[]),join(scripts,definition.script)],log=createWriteStream(join(report,name+'.log'));const child=spawn(process.execPath,args,{cwd:source,env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});const code=await new Promise(resolve=>{child.once('error',error=>{log.write(String(error));resolve(null)});child.once('close',resolve)});log.end();return code;};
try{for(const name of selected){assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sha);assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'');const entry={stage:name,startedAt:new Date().toISOString(),script:join(scripts,stages[name].script)};ledger.jobs.push(entry);await save();entry.exitCode=await run(stages[name],name);entry.completedAt=new Date().toISOString();await save();console.log(JSON.stringify(entry));}}
finally{ledger.closureExitCode=await run({script:'close.mjs'},'closure');await save();assert.equal(ledger.closureExitCode,0,'Owned source/mirror/PG closure failed');}
process.exitCode=ledger.jobs.every(j=>j.exitCode===0)?0:1;
