import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {expect,it} from 'vitest';

const runner=resolve('scripts/phase-e-owned.mjs');
type Mode='exit-23'|'exit-0'|'failed-observer'|'missing-marker'|'observer-stderr'|'zombie-stderr';

/** Gate a real child exit before its first native identity read. Negative cases
 * inject an observer error or omit the actual child marker, never fake a PID. */
function earlyRootExit(mode:Mode){
 const root=mkdtempSync(join(tmpdir(),'nevora-e-root-exit-'));
 try{
  const gate=join(root,'exit'),ready=join(root,'ready'),childPath=join(root,'child.mjs'),driver=join(root,'driver.mjs');
  writeFileSync(childPath,`import fs from 'node:fs';process.on('SIGTERM',()=>process.exit(23));fs.writeFileSync(${JSON.stringify(ready)},'ready');${mode==='observer-stderr'?'setTimeout(()=>process.exit(23),1000);':''}setInterval(()=>{if(fs.existsSync(${JSON.stringify(gate)}))process.exit(${mode==='exit-0'?0:23});},5);`);
  writeFileSync(driver,`import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';
const nativeSpawn=cp.spawn,nativeRead=cp.spawnSync,ownerId='e'.repeat(32),mode=${JSON.stringify(mode)};let created,actualExit,intercepted=false,gone;const fallbackSignals=[],nativeKill=process.kill.bind(process);
cp.spawn=function(command,args,options){if(args[0]!==${JSON.stringify(childPath)})return nativeSpawn(command,args,options);const env={...options.env};if(mode==='missing-marker')delete env.NEVORA_OWNED_PROCESS_OWNER;created=nativeSpawn(command,args,{...options,env});created.once('exit',(status,signal)=>{actualExit={status,signal};});return created;};
cp.spawnSync=function(command,args,options){
 if(command==='ps'&&args[0]==='-p'&&args[1]===String(created?.pid)){
  if(!intercepted){intercepted=true;const wait=Date.now()+3000;while(!fs.existsSync(${JSON.stringify(ready)})&&Date.now()<wait)Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5);assert(fs.existsSync(${JSON.stringify(ready)}),'Actual child was not ready');
   if(mode.startsWith('exit-')||mode==='zombie-stderr'){fs.writeFileSync(${JSON.stringify(gate)},'exit');const deadline=Date.now()+3000;while(Date.now()<deadline){const row=nativeRead('ps',['-p',String(created.pid),'-o','pid=,stat='],{encoding:'utf8',timeout:500});const fields=row.stdout?.trim().split(/\\s+/)??[];if(!row.error&&((row.status===1&&!row.stdout.trim())||(row.status===0&&Number(fields[0])===created.pid&&fields[1]?.startsWith('Z')))){gone={status:row.status,zombie:fields[1]?.startsWith('Z')??false};break;}Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5);}assert(gone,'Real child did not exit before observation');}
  }
  if(mode==='failed-observer'||mode==='observer-stderr')return {status:1,stdout:'',stderr:'fixture observer unavailable',...(mode==='failed-observer'?{error:Error('fixture ps failure')}:{})};
  if(mode==='zombie-stderr'&&args.at(-1)==='pid=,stat=')return {...nativeRead(command,args,options),stderr:'fixture ps diagnostic'};
 }
 return nativeRead(command,args,options);
};process.kill=function(pid,signal){fallbackSignals.push({pid,signal});return nativeKill(pid,signal);};syncBuiltinESMExports();
const api=await import(${JSON.stringify(runner)});let result;try{result=await api.superviseOwnedChild({command:process.execPath,args:[${JSON.stringify(childPath)}],cwd:${JSON.stringify(root)},env:api.safeEnvironment(),ownerId,timeoutMs:5000,graceMs:100});}finally{if(created&&created.exitCode===null&&created.signalCode===null)created.kill('SIGKILL');}
const after=nativeRead('ps',['-p',String(created.pid),'-o','stat='],{encoding:'utf8',timeout:500});process.stdout.write(JSON.stringify({mode,result,actualExit,intercepted,gone,fallbackSignals,pidAbsent:!after.error&&after.status===1&&!after.stdout.trim()}));`);
  const execution=spawnSync(process.execPath,[driver],{encoding:'utf8',timeout:10000});expect(execution.status,execution.stderr).toBe(0);
  const receipt=JSON.parse(execution.stdout),detail=JSON.stringify(receipt);
  expect(receipt.intercepted,detail).toBe(true);expect(receipt.actualExit,detail).toEqual({status:mode==='exit-0'?0:23,signal:null});
  expect(receipt.result.status,detail).toBe(mode==='exit-23'?23:1);
  expect(receipt.result.error,detail).toBe('Owned resource observation failed');
  expect(receipt.result.observationFailure,detail).toBeDefined();
  if(mode.startsWith('exit-'))expect(['absent','zombie'],detail).toContain(receipt.result.observationFailure.initialRootExit);
  else expect(receipt.result.observationFailure.initialRootExit,detail).toBeUndefined();
  expect(receipt.result.resources,detail).toEqual([]);expect(receipt.result.timedOut,detail).toBe(false);
  expect(receipt.fallbackSignals,detail).toEqual([]);expect(receipt.pidAbsent,detail).toBe(true);
  if(mode.startsWith('exit-'))expect(receipt.gone,detail).toBeDefined();
 }finally{rmSync(root,{recursive:true,force:true});}
}
it.each<Mode>(['exit-23','exit-0','failed-observer','missing-marker','observer-stderr','zombie-stderr'])('initial root observation: %s',mode=>earlyRootExit(mode),15000);
