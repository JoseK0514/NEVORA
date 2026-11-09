import {it,expect} from 'vitest';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const runner=new URL('../../scripts/phase-e-owned.mjs',import.meta.url).href;

it.each(['exec-ready','unresolved','changed-birth'] as const)('first detached-child proof handles a pre-exec parent sample: %s',mode=>{
 const root=mkdtempSync(join(tmpdir(),'nevora-e-fork-birth-'));
 const trace=join(root,'trace.json'),sampled=join(root,'sampled'),registered=join(root,'registered'),receipt=join(root,'receipt.json');
 try{
  const worker=join(root,'worker.mjs'),child=join(root,'child.mjs'),driver=join(root,'driver.mjs');
  // These invocation-created fixtures self-retire even if the test driver dies.
  writeFileSync(worker,'setTimeout(()=>process.exit(0),6000);setInterval(()=>{},100);');
  writeFileSync(child,`import fs from 'node:fs';import {spawn} from 'node:child_process';import {registerOwnedProcess} from ${JSON.stringify(runner)};
const resource=spawn(process.execPath,[${JSON.stringify(worker)}],{env:process.env,detached:true,stdio:'ignore'});
fs.writeFileSync(${JSON.stringify(trace)},JSON.stringify({root:process.pid,resource:resource.pid}));
const delay=ms=>new Promise(r=>setTimeout(r,ms));let closing;
const close=()=>closing??=(async()=>{try{resource.kill('SIGTERM');}catch{}while(resource.exitCode===null&&resource.signalCode===null)await delay(5);})();
process.on('SIGTERM',()=>{void close().then(()=>process.exit(19));});
process.once('disconnect',()=>{void close().then(()=>process.exit(19));});
setTimeout(()=>{void close().then(()=>process.exit(19));},6000).unref();
try{while(!fs.existsSync(${JSON.stringify(sampled)}))await delay(5);await registerOwnedProcess({kind:'next',pid:resource.pid,ownerId:process.env.PHASE_E_OWNER_ID});fs.writeFileSync(${JSON.stringify(registered)},'registered');await close();process.exit(0);}catch{await close();process.exit(19);}`);
  writeFileSync(driver,`import fs from 'node:fs';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';
const actual=cp.spawnSync,columns='pid=,ppid=,pgid=,lstart=,stat=,command=';let injected=0;
cp.spawnSync=function(command,args,options){const result=actual(command,args,options);if(command==='ps'&&args[0]==='-p'&&args[3]===columns&&fs.existsSync(${JSON.stringify(trace)})){
 const p=JSON.parse(fs.readFileSync(${JSON.stringify(trace)},'utf8'));
 if(args[1]===String(p.resource)&&result.status===0&&result.stdout?.trim()){
  const fields=result.stdout.trim().split(/\\s+/);
  if(injected===0||${JSON.stringify(mode)}==='unresolved'){
   const parent=actual('ps',['-p',String(p.root),'-o',columns],options);if(parent.status!==0)throw Error('Owned fixture parent unavailable');
   result.stdout=fields.slice(0,9).concat(parent.stdout.trim().split(/\\s+/).slice(9)).join(' ')+'\\n';injected++;fs.writeFileSync(${JSON.stringify(sampled)},'sampled');
  }else if(${JSON.stringify(mode)}==='changed-birth'&&!fs.existsSync(${JSON.stringify(registered)})){fields[7]='1999';result.stdout=fields.join(' ')+'\\n';}
 }
}return result;};syncBuiltinESMExports();
const api=await import(${JSON.stringify(runner)}),ownerId='a'.repeat(32),started=Date.now();
const result=await api.superviseOwnedChild({command:process.execPath,args:[${JSON.stringify(child)}],cwd:${JSON.stringify(root)},env:{...api.safeEnvironment(),PHASE_E_OWNER_ID:ownerId},ownerId,timeoutMs:4000,graceMs:200});
fs.writeFileSync(${JSON.stringify(receipt)},JSON.stringify({result,injected,elapsedMs:Date.now()-started}));`);
  const done=spawnSync(process.execPath,[driver],{encoding:'utf8',timeout:10_000});
  expect(done.status,done.stderr).toBe(0);
  const observed=JSON.parse(readFileSync(receipt,'utf8'));
  expect(observed.injected).toBeGreaterThan(0);
  if(mode==='exec-ready'){
   expect(observed.result.status,JSON.stringify(observed)).toBe(0);
   expect(observed.result.resources.some((r:{kind:string;stopped:boolean})=>r.kind==='next'&&r.stopped)).toBe(true);
   expect(readFileSync(registered,'utf8')).toBe('registered');
  }else{
   expect(observed.result.status,JSON.stringify(observed)).toBe(1);
   expect(observed.result.resources.some((r:{kind:string})=>r.kind==='next')).toBe(false);
  }
  const pid=JSON.parse(readFileSync(trace,'utf8')).resource;
  expect(()=>process.kill(pid,0),'actual invocation-created child must be gone').toThrow();
 }finally{
  // Never signal a recorded PID after its creator has retired: it can be reused.
  // Normal closure is asserted above; fixture self-deadlines cover driver loss.
  rmSync(root,{recursive:true,force:true});
 }
},15_000);
