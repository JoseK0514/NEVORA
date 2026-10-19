// External serial inspection driver. Preparation alone starts no browser.
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createWriteStream} from 'node:fs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
assert.equal(process.env.BROWSER_HOLD_RELEASED,'yes','Coordinator browser release required');
const source=process.env.VERIFY_SOURCE,sha=process.env.VERIFY_SHA,report=process.env.VERIFY_REPORT_ROOT;
assert(source&&sha&&report);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sha);
const root='/workspace/nevora-inspection-runtime/final-verification';
const stages={
 base:{script:'combined-verify.mjs',env:{VERIFY_BASE_ONLY:'yes',VERIFY_RESULT_PREFIX:'targeted-base'}},
 checker:{script:'checks.mjs'},
 home:{script:'home-responsive.mjs',guard:'home-responsive'},
 payroll:{script:'guidance-fonts.mjs',guard:'payroll-focused-fonts'},
 timecards:{script:'timecards-503.mjs',guard:'timecards-503-recovery',env:{TIMECARDS_EXPECT_RETRY:'yes'}},
 cold:{script:'cold-timecards.mjs',guard:'cold-timecards'},
 scoped:{script:'combined-verify.mjs',env:{VERIFY_SCOPED_ONLY:'yes',VERIFY_RESULT_PREFIX:'targeted-scoped',VERIFY_SCOPED_MODULES:['scoped-wave-a.mjs','scoped-wave-b.mjs','scoped-phase3.mjs','scoped-desktop.mjs'].map(n=>join(root,n)).join(',')}},
};
await mkdir(report,{recursive:true});
const requested=(process.env.VERIFY_STAGES??'base,checker').split(',');
assert(requested.every(k=>Object.hasOwn(stages,k)),'Unknown inspection stage');
const ledgerFile=join(report,'inspection-stage-ledger.json');
const ledger=await readFile(ledgerFile,'utf8').then(JSON.parse,()=>({checkpoint:sha,scope:'Combined smoke and bounded scoped inspection; full owner exits remain separately evidenced',jobs:[]}));
assert.equal(ledger.checkpoint,sha);
try{for(const name of requested){
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sha,'Frozen source changed before stage');
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'','Frozen source dirty before stage');
 const definition=stages[name],entry={stage:name,startedAt:new Date().toISOString(),script:join(root,definition.script)};
 ledger.jobs.push(entry);await writeFile(ledgerFile,JSON.stringify(ledger,null,2)+'\n');
 const log=createWriteStream(join(report,name+'-run-'+ledger.jobs.length+'.log'));
 const args=[...(definition.guard?['--import',join(root,'checker-guard.mjs')]:[]),entry.script];
 const env={...process.env,...definition.env,...(definition.guard?{VERIFY_GUARD_PURPOSE:definition.guard}:{})};
 for(const key of ['VERIFY_ONLY','VERIFY_RESUME','VERIFY_BASE_ONLY','VERIFY_SCOPED_ONLY','VERIFY_SCOPED_MODULES','HOME_FAIL_FAST'])if(!Object.hasOwn(definition.env??{},key))delete env[key];
 if(name==='scoped'){
  const snapshots=[];await mkdir(join(report,'scoped-modules'),{recursive:true});
  for(const file of definition.env.VERIFY_SCOPED_MODULES.split(',')){
   const bytes=await readFile(file),sha256=createHash('sha256').update(bytes).digest('hex'),label=file.split('/').at(-1).replace('.mjs','-'+sha256.slice(0,12)+'.mjs'),snapshot=join(report,'scoped-modules',label);
   await writeFile(snapshot,bytes);snapshots.push({source:file,snapshot,sha256});
  }
  env.VERIFY_SCOPED_MODULES=snapshots.map(s=>s.snapshot).join(',');entry.scopedModules=snapshots;
  await writeFile(join(report,'scoped-modules-manifest.json'),JSON.stringify({checkpoint:sha,modules:snapshots},null,2)+'\n');
 }
 const child=spawn(process.execPath,args,{cwd:source,env,stdio:['ignore','pipe','pipe']});
 child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
 entry.exitCode=await new Promise(resolve=>{child.once('error',error=>{entry.spawnError=String(error);resolve(null);});child.once('close',(code,signal)=>{entry.signal=signal;resolve(code);});});
 log.end();entry.completedAt=new Date().toISOString();
 await writeFile(ledgerFile,JSON.stringify(ledger,null,2)+'\n');
 console.log(JSON.stringify({stage:name,exitCode:entry.exitCode,signal:entry.signal,completedAt:entry.completedAt}));
}
}finally{
// Test failures do not suppress subsequent requested stages. Every completed
// requested batch ends with the ownership/source/mirror/PG closure check.
const close=spawn(process.execPath,[join(root,'close.mjs')],{cwd:source,env:process.env,stdio:['ignore','pipe','pipe']});
const closeLog=createWriteStream(join(report,'closure.log'));
close.stdout.pipe(closeLog,{end:false});close.stderr.pipe(closeLog,{end:false});
ledger.closureExitCode=await new Promise(resolve=>{close.once('error',error=>{ledger.closureError=String(error);resolve(null);});close.once('close',resolve);});
closeLog.end();await writeFile(ledgerFile,JSON.stringify(ledger,null,2)+'\n');
assert.equal(ledger.closureExitCode,0,'Owned preview closure failed; stop judgment and inspect ownership evidence');
}
process.exitCode=ledger.jobs.slice(-requested.length).every(j=>j.exitCode===0)?0:1;
