// Serial continuation at the exact end of the already released core+nav worker.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir,cp} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const source=process.env.VERIFY_SOURCE,sha=process.env.VERIFY_SHA,report=process.env.VERIFY_REPORT_ROOT,outer=288613;
assert.equal(sha,'a21650de50374683d52e32b883d7f419d7344f22');assert.equal(process.env.READY_REVIEW_RELEASED_SHA,sha);assert.equal(process.env.BROWSER_HOLD_RELEASED,'yes');
const scripts=join(report,'executed-scripts'),optional=join(report,'executed-optional-p3'),diagnostics=join(report,'executed-diagnostics'),archive=join(report,'attempts/002-priority-continuation'),wr=join(report,'executed-wr17');
await mkdir(archive,{recursive:true});await mkdir(wr,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),wait=ms=>new Promise(r=>setTimeout(r,ms));
const guard=()=>{assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sha);assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'');};
const state=async pid=>{try{return(await readFile('/proc/'+pid+'/stat','utf8')).split(') ')[1].split(' ')[0];}catch(e){if(e.code==='ENOENT')return null;throw e;}};
const command=async pid=>(await readFile('/proc/'+pid+'/cmdline')).toString().split('\0');
const ledger={checkpoint:sha,scope:'Continuation after required AL/checker+Payroll+TC3 and passive nav4. WBcontrast3 prioritized before remaining optional Mark16/ACK16/Updates1/WR17prerequisite4. All scopes separate; no full exit credit.',preparedAt:new Date().toISOString(),jobs:[],oneBrowserWorker:true};
const save=()=>writeFile(join(report,'priority-continuation-v5.json'),JSON.stringify(ledger,null,2)+'\n');await save();guard();
const expected={'wr17-mytime-diagnostic-a216.mjs':'bd7c3e17ad9d7d72c8ecf06e1e9f550c5565f4f97a096e948bfad3f01a37eb5d','wr17-mytime-diagnostic-a216.json':'9225b7e82d7b2982745fa3a61ec3fa65b77d73d10ac908a8e7bf446efab52579'};
for(const[name,digest]of Object.entries(expected)){const src='/workspace/nevora-inspections/premium-phase-3/round-5-cd764f6-full/manual-harness/'+name,b=await readFile(src);assert.equal(hash(b),digest);await writeFile(join(wr,name),b);}
await writeFile(join(report,'executed-priority-continuation-v5.mjs'),await readFile(new URL(import.meta.url)));
let old;
for(;;){old=JSON.parse(await readFile(join(report,'repair-stage-ledger.json'),'utf8'));const stage=old.jobs.at(-1)?.stage;if(stage==='nav-badge4')break;assert(!['mark-read-chromium','mark-read-webkit','ack-pause-chromium','ack-pause-webkit','wb-contrast-attribution3','updates-scrollport-attribution1'].includes(stage),'Priority checkpoint already passed; no coordinator mutation');assert(!old.closureExitCode,'Original preview already closed');await wait(500);}
guard();assert.equal((await command(outer))[1],'/workspace/nevora-inspection-runtime/final-verification/candidate-repairs-preparation/repair-stage-a216-v4.mjs');
const direct=[];for(const entry of await readdir('/proc')){if(!/^\d+$/.test(entry))continue;try{const stat=(await readFile('/proc/'+entry+'/stat','utf8')).split(') ')[1].split(' ');if(Number(stat[1])===outer&&![null,'Z'].includes(await state(entry)))direct.push(Number(entry));}catch(e){if(e.code!=='ENOENT'&&e.code!=='ESRCH')throw e;}}
assert.equal(direct.length,1);const child=direct[0];assert.equal((await command(child))[1],join(scripts,'scoped-verify-v2.mjs'));process.kill(outer,'SIGSTOP');assert.equal(await state(outer),'T');
ledger.handoff={outer,child,pausedAt:new Date().toISOString(),requestedPriority:'Actual nav/people attribution then WBcontrast3 before remaining optional state proofs'};await save();
while(![null,'Z'].includes(await state(child)))await wait(500);
ledger.handoff.childClosedAt=new Date().toISOString();guard();
const rowFile=async(name,expected)=>{const value=JSON.parse(await readFile(join(report,name),'utf8'));assert.equal(value.checkpoint,sha);assert.equal(value.cases.length,expected);return{required:expected,completed:value.cases.filter(r=>r.completed).length,passed:value.cases.filter(r=>r.passed).length};};
ledger.completedBeforeHandoff={AL:await rowFile('targeted-al24-states.json',24),Payroll:await rowFile('targeted-payroll-states.json',4),PayrollPaint:await rowFile('pending-colour-attribution.json',6),TC3:await rowFile('targeted-tc3-states.json',16),Nav:await rowFile('targeted-navbadge-states.json',4)};
for(const[name,data]of Object.entries(ledger.completedBeforeHandoff))assert.equal(data.completed,data.required,name+' setup gaps require triage before handoff');
const checker=JSON.parse(await readFile(join(report,'checker24/completion.json'),'utf8'));assert(checker.complete&&checker.recorded===24&&checker.loadGaps===0);ledger.completedBeforeHandoff.unchangedChecker=checker;
await cp(join(report,'repair-stage-ledger.json'),join(archive,'original-stage-ledger.json'));await cp(join(report,'nav-badge4.log'),join(archive,'nav-progress-log-before-drain.log'));ledger.handoff.originalNavStdoutQualification='Outer paused while child finished; complete structured nav rows retained, stdout tail may not have drained';
let ownsClosure=false;
const run=async(name,only,module,engines,scoped='yes')=>{guard();const env={...process.env,VERIFY_RESULT_PREFIX:'targeted-'+name,VERIFY_ONLY:only,VERIFY_SCOPED_MODULES:module,VERIFY_SCOPED_ONLY:scoped,VERIFY_ENGINES:engines};for(const key of['VERIFY_RESUME','VERIFY_RETRY_KEYS','VERIFY_BASE_ONLY'])delete env[key];const log=createWriteStream(join(report,name+'.log')),entry={stage:name,startedAt:new Date().toISOString(),script:join(scripts,'scoped-verify-v2.mjs'),module,moduleSha256:hash(await readFile(module))};ledger.jobs.push(entry);await save();const c=spawn(process.execPath,[entry.script],{cwd:source,env,stdio:['ignore','pipe','pipe']});c.stdout.pipe(log,{end:false});c.stderr.pipe(log,{end:false});entry.exitCode=await new Promise(resolve=>{c.once('error',e=>{log.write(String(e));resolve(null)});c.once('close',resolve)});log.end();entry.completedAt=new Date().toISOString();await save();console.log(JSON.stringify(entry));};
try{
 assert.equal(await state(outer),'T');ownsClosure=true;process.kill(outer,'SIGTERM');process.kill(outer,'SIGCONT');
 const limit=Date.now()+5000;while(![null,'Z'].includes(await state(outer))&&Date.now()<limit)await wait(50);assert([null,'Z'].includes(await state(outer)),'Original owned coordinator did not exit');ledger.handoff.originalOuterTerminatedAfterBrowserChildClosed=true;ledger.handoff.newContinuationOwnsFinallyClosure=true;await save();
 await run('wb-contrast','diag-wb-contrast-templates-320-200,diag-wb-contrast-rules-360-100,diag-wb-contrast-rules-430-125',join(diagnostics,'wave-b-contrast-a216.mjs'),'chromium','no');
 await run('markread-chromium','scoped-p3-management-mark-read-pending-failure',join(optional,'management-mark-read-a216.mjs'),'chromium');
 await run('markread-webkit','scoped-p3-management-mark-read-pending-failure',join(optional,'management-mark-read-a216.mjs'),'webkit');
 await run('ackpause-chromium','scoped-p3-ack-unknown-private-pause-a216-v2',join(optional,'ack-pause-recovery-a216-v2.mjs'),'chromium');
 await run('ackpause-webkit','scoped-p3-ack-unknown-private-pause-a216-v2',join(optional,'ack-pause-recovery-a216-v2.mjs'),'webkit');
 await run('updates-scrollport','scoped-p3-updates-scrollport-attribution-a216',join(diagnostics,'updates-scrollport-diagnostic-a216.mjs'),'chromium');
 await run('wr17-chromium','scoped-p3-wr17-mytime-completed-attribution-a216',join(wr,'wr17-mytime-diagnostic-a216.mjs'),'chromium');
 await run('wr17-webkit','scoped-p3-wr17-mytime-completed-attribution-a216',join(wr,'wr17-mytime-diagnostic-a216.mjs'),'webkit');
}finally{if(ownsClosure){const log=createWriteStream(join(report,'continuation-closure.log')),c=spawn(process.execPath,[join(scripts,'close.mjs')],{cwd:source,env:process.env,stdio:['ignore','pipe','pipe']});c.stdout.pipe(log,{end:false});c.stderr.pipe(log,{end:false});ledger.closureExitCode=await new Promise(resolve=>c.once('close',resolve));log.end();ledger.completedAt=new Date().toISOString();await save();assert.equal(ledger.closureExitCode,0,'Owned closure failed');}}
process.exitCode=ledger.jobs.every(j=>j.exitCode===0)?0:1;
