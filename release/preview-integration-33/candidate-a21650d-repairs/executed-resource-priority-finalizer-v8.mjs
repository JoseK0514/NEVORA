// Root's resource-priority handoff: finish current child, two authorized geometry
// diagnostics and necessary same-key setup replays; always close in finally.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const sha='a21650de50374683d52e32b883d7f419d7344f22',p=process.env.VERIFY_REPORT_ROOT,source=process.env.VERIFY_SOURCE;
assert.equal(process.env.VERIFY_SHA,sha);assert.equal(process.env.READY_REVIEW_RELEASED_SHA,sha);assert.equal(process.env.BROWSER_HOLD_RELEASED,'yes');
const hash=b=>createHash('sha256').update(b).digest('hex'),scripts=join(p,'executed-scripts'),archive=join(p,'attempts/006-resource-priority-finalizer'),optional=join(p,'executed-optional-p3');
await mkdir(archive,{recursive:true});
const guard=()=>{assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sha);assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'');};
const state=async pid=>{try{return(await readFile('/proc/'+pid+'/stat','utf8')).split(') ')[1].split(' ')[0];}catch(e){if(e.code==='ENOENT')return null;throw e;}};
const checkpoint=JSON.parse(await readFile(join(p,'attempts/005-markread-ready-geometry-checkpoint/pause.json'),'utf8'));
assert(checkpoint.safeForSoleSerialFollowup);assert.equal(checkpoint.outerCoordinatorPID,329786);assert([null,'Z'].includes(await state(checkpoint.allowedExistingMarkReadChildPID)));guard();
assert.equal(await state(329786),'T');assert.equal((await readFile('/proc/329786/cmdline')).toString().split('\0')[1],'/workspace/nevora-inspection-runtime/final-verification/candidate-repairs-preparation/repair-priority-continuation-v6.mjs');
const old=JSON.parse(await readFile(join(p,'priority-continuation-v6.json'),'utf8'));assert.equal(old.jobs.at(-1).stage,'markread-chromium');assert(!old.closureExitCode);
const rows=JSON.parse(await readFile(join(p,'targeted-markread-chromium-states.json'),'utf8')).cases;assert.equal(rows.length,12);
const key=r=>[r.name,r.engine,r.account,r.width,r.height,r.text,r.variant].join('|'),gaps=rows.filter(r=>!r.completed);
const allowedGapKeys=new Set(['scoped-p3-management-mark-read-pending-failure|chromium|AUDIT-M|320|844|100|default','scoped-p3-management-mark-read-pending-failure|chromium|QAOWNER|844|390|200|default']);assert(gaps.length<=2);for(const gap of gaps){assert(allowedGapKeys.has(key(gap)));assert(gap.executionError?.startsWith('Error: SETUP GAP: actual own unread row/authorized Mark-read control is absent or ambiguous'));}
const ledger={checkpoint:sha,startedAt:new Date().toISOString(),reason:'Root prioritizes required fifth full exit. Only already prepared short actual-ready replay and requested Timecards geometry2 follow current unchanged Mark-read Chromium12.',currentMarkReadAttempted:12,currentMarkReadCompleted:rows.filter(r=>r.completed).length,jobs:[],deferred:[{scope:'Mark-read WebKit',configurations:4},{scope:'ACK private pause',configurations:16},{scope:'Updates scrollport diagnostic',configurations:1},{scope:'My Time completed-entry prerequisite diagnostic',configurations:4}],deferredExecuted:0,deferredPassCredit:0,oneSerialBrowserWorker:true};
const save=()=>writeFile(join(p,'resource-priority-finalization-v8.json'),JSON.stringify(ledger,null,2)+'\n');await save();await cp(join(p,'priority-continuation-v6.json'),join(archive,'original-continuation-v6.json'));await cp(join(p,'targeted-markread-chromium-states.json'),join(archive,'original-markread-chromium-states.json'));await cp(join(p,'targeted-markread-chromium-summary.json'),join(archive,'original-markread-chromium-summary.json'));
await writeFile(join(p,'executed-resource-priority-finalizer-v8.mjs'),await readFile(new URL(import.meta.url)));
let ownsClosure=false;
const run=async(stage,module,prefix,only,extra={})=>{
 guard();const log=createWriteStream(join(p,stage+'.log')),entry={stage,module,moduleSha256:hash(await readFile(module)),startedAt:new Date().toISOString()};ledger.jobs.push(entry);await save();
 const env={...process.env,VERIFY_SCOPED_MODULES:module,VERIFY_SCOPED_ONLY:'yes',VERIFY_ENGINES:'chromium',VERIFY_ONLY:only,VERIFY_RESULT_PREFIX:prefix};for(const k of['VERIFY_RESUME','VERIFY_RETRY_KEYS','VERIFY_BASE_ONLY'])delete env[k];Object.assign(env,extra);
 const child=spawn(process.execPath,[join(scripts,'scoped-verify-v2.mjs')],{cwd:source,env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});entry.pid=child.pid;await save();entry.exitCode=await new Promise(resolve=>child.once('close',resolve));log.end();entry.completedAt=new Date().toISOString();await save();console.log(JSON.stringify(entry));
};
try{
 ownsClosure=true;process.kill(329786,'SIGTERM');process.kill(329786,'SIGCONT');for(let i=0;i<100&&![null,'Z'].includes(await state(329786));i++)await new Promise(r=>setTimeout(r,50));assert([null,'Z'].includes(await state(329786)));ledger.handoff={previousCoordinatorRetiredAfterItsOnlyBrowserChildClosed:true,newFinallyOwnsClosure:true,previousStdoutMayHaveUndrainedTail:true,completeStructuredMarkReadRowsPreserved:true};await save();
 const geometry=process.env.REPAIR_GEOMETRY_MODULE,expected=process.env.REPAIR_GEOMETRY_MODULE_SHA256;assert(geometry&&expected);assert.equal(hash(await readFile(geometry)),expected);
 await run('timecards-geometry2',geometry,'targeted-timecards-geometry',process.env.REPAIR_GEOMETRY_ONLY);
 if(gaps.length){
  const parent='/workspace/nevora-inspections/premium-phase-3/round-5-cd764f6-full/manual-harness/',files={'management-mark-read-a216-v2.mjs':'d5bbced6e4f18289c96ea5c0a2de0fb1cd4c7d2859f78d81ac26bcbf7a47a394','management-mark-read-a216-v2.json':'c7e038e223438a9e52e3c91933a909b9c30ee104be27b41b4806c6945a595f45'};
  for(const[name,digest]of Object.entries(files)){const b=await readFile(parent+name);assert.equal(hash(b),digest);await writeFile(join(optional,name),b);}
  await run('markread-ready-same-key-replay',join(optional,'management-mark-read-a216-v2.mjs'),'targeted-markread-chromium','scoped-p3-management-mark-read-pending-failure',{VERIFY_RESUME:'yes',VERIFY_RETRY_KEYS:JSON.stringify(gaps.map(key))});
  const after=JSON.parse(await readFile(join(p,'targeted-markread-chromium-states.json'),'utf8')).cases;assert.equal(after.length,12);assert(rows.filter(r=>r.completed).every(before=>JSON.stringify(before)===JSON.stringify(after.find(r=>key(r)===key(before)))));ledger.markReadReplay={sameKeys:gaps.map(key),otherCompletedRowsByteEquivalent:true,extraConfigurationCredit:0,completed:after.filter(r=>r.completed).length};await save();
 }
}finally{if(ownsClosure){const log=createWriteStream(join(p,'finalizer-closure.log')),child=spawn(process.execPath,[join(scripts,'close.mjs')],{cwd:source,env:process.env,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});ledger.closureExitCode=await new Promise(resolve=>child.once('close',resolve));log.end();ledger.closedAt=new Date().toISOString();await save();assert.equal(ledger.closureExitCode,0,'Owned closure failed');}}
process.exitCode=ledger.jobs.every(j=>j.exitCode===0)?0:1;
