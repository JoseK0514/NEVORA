import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {mkdtempSync,realpathSync,rmSync,readFileSync,writeFileSync,existsSync,chmodSync,symlinkSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import * as files from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
vi.mock('node:fs/promises',async original=>({...await original<typeof import('node:fs/promises')>()}));
import {parseOperationsConfig,workerInvocation,superviseProcess,readInvocationHealth,type OperationsConfig} from './supervisor';
let directory:string,config:OperationsConfig;
beforeEach(()=>{directory=realpathSync(mkdtempSync(join(tmpdir(),'nv-workforce-')));config={enabled:true,environment:'test',sourceSha:'a'.repeat(40),scopeId:randomUUID(),stateDirectory:directory,deadlineMs:2000,graceMs:100};});
afterEach(()=>{vi.restoreAllMocks();for(const file of ['pid','descendant'])if(existsSync(join(directory,file))){const pid=Number(readFileSync(join(directory,file),'utf8'));if(Number.isSafeInteger(pid)&&pid>1)try{process.kill(-pid,'SIGKILL');}catch{try{process.kill(pid,'SIGKILL');}catch{}}}rmSync(directory,{recursive:true,force:true});});
const node=(code:string)=>({file:process.execPath,args:['-e',code]});
const receipt=()=>JSON.parse(readFileSync(join(directory,'payroll.json'),'utf8'));
async function waitFor(file:string){const until=Date.now()+5000;while(!existsSync(file)){if(Date.now()>until)throw Error('Owned child did not become ready');await new Promise(ok=>setTimeout(ok,10));}}
it('requires explicit environment, source, scope, bounded runtime and private directory configuration',()=>{
 const env={NEVORA_OPERATIONS_ENABLED:'true',NEVORA_OPERATIONS_ENVIRONMENT:'test',NEVORA_OPERATIONS_SOURCE_SHA:config.sourceSha,NEVORA_OPERATIONS_SCOPE_ID:config.scopeId,NEVORA_OPERATIONS_STATE_DIR:directory,NEVORA_OPERATIONS_DEADLINE_SECONDS:'120'};
 expect(parseOperationsConfig(env)).toMatchObject({...config,deadlineMs:120000,graceMs:5000});
 for(const key of ['NEVORA_OPERATIONS_ENVIRONMENT','NEVORA_OPERATIONS_SOURCE_SHA','NEVORA_OPERATIONS_SCOPE_ID','NEVORA_OPERATIONS_STATE_DIR','NEVORA_OPERATIONS_DEADLINE_SECONDS'])expect(()=>parseOperationsConfig({...env,[key]:''})).toThrow('operations_configuration_invalid');
 expect(()=>parseOperationsConfig({...env,NEVORA_OPERATIONS_DEADLINE_SECONDS:'301'})).toThrow();
});
it('permits only the three canonical commands and no shell or native dispatch',()=>{
 expect(workerInvocation('payroll').args).toContain('scripts/payroll-worker.ts');
 expect(workerInvocation('notifications-dispatch').args.slice(-2)).toEqual(['scripts/fuel-notification-worker.ts','dispatch']);
 expect(workerInvocation('notifications-reminders').args.slice(-2)).toEqual(['scripts/fuel-notification-worker.ts','reminders']);
 for(const command of ['native-dispatch','payroll; echo secret','unknown'])expect(()=>workerInvocation(command)).toThrow('operations_command_invalid');
});
it('records successful exit only, strips child output and uses private atomic files',async()=>{
 const result=await superviseProcess(config,'payroll',node("console.log('sk_test_fictional_never_log');console.error('fictional-password')"));
 expect(result).toMatchObject({status:'succeeded',exitCode:0,scopeId:config.scopeId,sourceSha:config.sourceSha});expect(result.lastSuccessAt).toBe(result.finishedAt);
 expect(JSON.stringify(receipt())).not.toMatch(/sk_test|fictional-password/);expect(lstatSync(join(directory,'payroll.json')).mode&0o777).toBe(0o600);
 expect(existsSync(join(directory,'payroll.lock'))).toBe(false);expect(await readInvocationHealth(config,'payroll',Date.now(),60)).toMatchObject({healthy:true,reason:'ok'});
});
it('durably publishes lock/running state before a real child effect and terminal state before unlock',async()=>{
 const effect=join(directory,'effect'),events:{lock:boolean;status:string|null;effect:boolean}[]=[],original=files.open;
 vi.spyOn(files,'open').mockImplementation(async(...args:Parameters<typeof files.open>)=>{
  const handle=await original(...args);if(String(args[0])===directory){const sync=handle.sync.bind(handle);vi.spyOn(handle,'sync').mockImplementation(async()=>{events.push({lock:existsSync(join(directory,'payroll.lock')),status:existsSync(join(directory,'payroll.json'))?receipt().status:null,effect:existsSync(effect)});await sync();});}return handle;
 });
 await superviseProcess(config,'payroll',node(`require('fs').writeFileSync(${JSON.stringify(effect)},'owned')`));
 expect(events).toEqual([{lock:true,status:null,effect:false},{lock:true,status:'running',effect:false},{lock:true,status:'succeeded',effect:true},{lock:false,status:'succeeded',effect:true}]);
});
it.each([1,2])('fails closed before child effects if acquisition durability step %i fails',async(failAt)=>{
 const effect=join(directory,'effect'),original=files.open;let calls=0;
 vi.spyOn(files,'open').mockImplementation(async(...args:Parameters<typeof files.open>)=>{const handle=await original(...args);if(String(args[0])===directory){const sync=handle.sync.bind(handle);vi.spyOn(handle,'sync').mockImplementation(async()=>{if(++calls===failAt)throw Error('owned durability fault');await sync();});}return handle;});
 await expect(superviseProcess(config,'payroll',node(`require('fs').writeFileSync(${JSON.stringify(effect)},'unexpected')`))).rejects.toThrow('operations_state_unavailable');expect(existsSync(effect)).toBe(false);expect(existsSync(join(directory,'payroll.lock'))).toBe(true);
});
it('rejects an actual private FIFO before blocking outside the child watchdog',()=>{
 const fifo=join(directory,'payroll.json');expect(spawnSync('mkfifo',[fifo]).status).toBe(0);chmodSync(fifo,0o600);
 const code=`import{superviseProcess}from ${JSON.stringify(new URL('./supervisor.ts',import.meta.url).href)};try{await superviseProcess(${JSON.stringify(config)},'payroll',${JSON.stringify(node('process.exit(0)'))});process.exitCode=2;}catch(e){console.log(e.message);}`;
 const result=spawnSync(process.execPath,['--conditions=react-server','--import','./scripts/node-server-context.mjs','--import','tsx','--input-type=module','-e',code],{encoding:'utf8',timeout:2000});expect(result.error).toBeUndefined();expect(result.status).toBe(0);expect(result.stdout.trim()).toBe('operations_state_unavailable');
});
it('retains last success separately and reports a later exit23 as failed',async()=>{
 const first=await superviseProcess(config,'payroll',node('process.exit(0)'));
 const failed=await superviseProcess(config,'payroll',node('process.exit(23)'));
 expect(failed).toMatchObject({status:'failed',exitCode:23,lastSuccessAt:first.finishedAt});expect(await readInvocationHealth(config,'payroll',Date.now(),60)).toMatchObject({healthy:false,reason:'failed'});
});
it('refuses disabled execution before any child or state write',async()=>{
 await expect(superviseProcess({...config,enabled:false},'payroll',node("require('fs').writeFileSync(process.argv[1],'unexpected')"))).rejects.toThrow('operations_disabled');expect(existsSync(join(directory,'payroll.json'))).toBe(false);
});
it('denies actual concurrent invocations and waits for interrupted child exit before releasing the lock',async()=>{
 const ready=join(directory,'pid'),controller=new AbortController();
 const pending=superviseProcess(config,'payroll',node(`require('fs').writeFileSync(${JSON.stringify(ready)},String(process.pid));setInterval(()=>{},1000)`),controller.signal);
 await waitFor(ready);const pid=Number(readFileSync(ready,'utf8'));
 try{await expect(superviseProcess(config,'payroll',node('process.exit(0)'))).rejects.toThrow('operations_overlap');expect(existsSync(join(directory,'payroll.lock'))).toBe(true);}finally{controller.abort();}
 expect(await pending).toMatchObject({status:'interrupted'});expect(()=>process.kill(pid,0)).toThrow();expect(existsSync(join(directory,'payroll.lock'))).toBe(false);
});
it('kills a real SIGTERM-ignoring hung child at the deadline and reaps it before returning',async()=>{
 const ready=join(directory,'pid');
 const result=await superviseProcess({...config,deadlineMs:300},'payroll',node(`process.on('SIGTERM',()=>{});require('fs').writeFileSync(${JSON.stringify(ready)},String(process.pid));setInterval(()=>{},1000)`));
 expect(result.status).toBe('timed_out');const pid=Number(readFileSync(ready,'utf8'));expect(()=>process.kill(pid,0)).toThrow();expect(existsSync(join(directory,'payroll.lock'))).toBe(false);
});
it('stops an owned descendant before releasing process-group overlap protection',async()=>{
 const ready=join(directory,'pid'),descendant=join(directory,'descendant'),controller=new AbortController();
 const code=`const {spawn}=require('child_process');const child=spawn(process.execPath,['-e',"setInterval(()=>{},1000)"],{stdio:'ignore'});require('fs').writeFileSync(${JSON.stringify(descendant)},String(child.pid));require('fs').writeFileSync(${JSON.stringify(ready)},String(process.pid));setInterval(()=>{},1000)`;
 const pending=superviseProcess(config,'payroll',node(code),controller.signal);await waitFor(descendant);const pid=Number(readFileSync(descendant,'utf8'));controller.abort();
 expect((await pending).status).toBe('interrupted');expect(()=>process.kill(pid,0)).toThrow();expect(existsSync(join(directory,'payroll.lock'))).toBe(false);
});
it('rejects public/symlink state directories and receipt symlinks without touching the destination',async()=>{
 chmodSync(directory,0o755);await expect(superviseProcess(config,'payroll',node('process.exit(0)'))).rejects.toThrow('operations_state_unavailable');chmodSync(directory,0o700);
 const outside=realpathSync(mkdtempSync(join(tmpdir(),'nv-workforce-outside-')));try{
  symlinkSync(outside,join(directory,'alias'));await expect(superviseProcess({...config,stateDirectory:join(directory,'alias')},'payroll',node('process.exit(0)'))).rejects.toThrow('operations_state_unavailable');
  const target=join(outside,'target');writeFileSync(target,'preserved',{mode:0o600});symlinkSync(target,join(directory,'payroll.json'));
  await expect(superviseProcess(config,'payroll',node('process.exit(0)'))).rejects.toThrow('operations_state_unavailable');expect(readFileSync(target,'utf8')).toBe('preserved');
 }finally{rmSync(outside,{recursive:true,force:true});}
});
it('fails health closed on missing, corrupt, future, stale and scope/source-mismatched receipts',async()=>{
 expect(await readInvocationHealth(config,'payroll',Date.now(),60)).toMatchObject({healthy:false,reason:'missing'});
 await superviseProcess(config,'payroll',node('process.exit(0)'));const good=receipt();
 for(const bad of [{...good,scopeId:randomUUID()},{...good,sourceSha:'b'.repeat(40)},{...good,extra:'sk_test_fictional'},{...good,finishedAt:'bad'}]){writeFileSync(join(directory,'payroll.json'),JSON.stringify(bad));expect(await readInvocationHealth(config,'payroll',Date.now(),60)).toMatchObject({healthy:false,reason:'invalid'});}
 writeFileSync(join(directory,'payroll.json'),JSON.stringify(good));expect(await readInvocationHealth(config,'payroll',Date.parse(good.finishedAt)-2000,60)).toMatchObject({healthy:false,reason:'future'});expect(await readInvocationHealth(config,'payroll',Date.parse(good.finishedAt)+60001,60)).toMatchObject({healthy:false,reason:'stale'});
});
it('reports a crashed invocation and retains its lock for explicit paused-host recovery',async()=>{
 await superviseProcess(config,'payroll',node('process.exit(0)'));const good=receipt();writeFileSync(join(directory,'payroll.json'),JSON.stringify({...good,status:'running',startedAt:good.finishedAt,finishedAt:null,exitCode:null,cleanupConfirmed:false}));writeFileSync(join(directory,'payroll.lock'),'crash fixture',{mode:0o600});
 expect(await readInvocationHealth(config,'payroll',Date.parse(good.startedAt)+10000,60)).toMatchObject({healthy:false,reason:'stale'});
 await expect(superviseProcess(config,'payroll',node('process.exit(0)'))).rejects.toThrow('operations_overlap');expect(readFileSync(join(directory,'payroll.lock'),'utf8')).toBe('crash fixture');
});
it('detects an actual killed supervisor without automatically replacing its in-flight lock',async()=>{
 const {spawn}=await import('node:child_process');const pidFile=join(directory,'pid');
 const childCode=`require('fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setInterval(()=>{},1000)`;
 const code=`import{superviseProcess}from ${JSON.stringify(new URL('./supervisor.ts',import.meta.url).href)};await superviseProcess(${JSON.stringify({...config,deadlineMs:30000})},'payroll',${JSON.stringify(node(childCode))});`;
 const foreman=spawn(process.execPath,['--conditions=react-server','--import','./scripts/node-server-context.mjs','--import','tsx','--input-type=module','-e',code],{stdio:'ignore',detached:true});
 const exited=new Promise<void>((ok,bad)=>{foreman.once('error',bad);foreman.once('exit',()=>ok());});
 try{
  await waitFor(pidFile);foreman.kill('SIGKILL');await exited;
  expect(()=>process.kill(Number(readFileSync(pidFile,'utf8')),0)).not.toThrow();
  expect(await readInvocationHealth(config,'payroll',Date.parse(receipt().startedAt)+40000,60)).toMatchObject({healthy:false,reason:'stale'});
  await expect(superviseProcess(config,'payroll',node('process.exit(0)'))).rejects.toThrow('operations_overlap');expect(existsSync(join(directory,'payroll.lock'))).toBe(true);
 }finally{if(foreman.exitCode===null&&foreman.signalCode===null)foreman.kill('SIGKILL');await exited;}
},10000);
it('bounds an unconfirmed termination and retains the lock while the real child is still alive',async()=>{
 const original=process.kill.bind(process),pidFile=join(directory,'pid');
 const blocked=vi.spyOn(process,'kill').mockImplementation((pid,signal)=>pid<0&&signal!==0?true:original(pid,signal));
 const pending=superviseProcess({...config,deadlineMs:200,graceMs:50},'payroll',node(`require('fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setInterval(()=>{},1000)`));
 try{
  await waitFor(pidFile);
  const result=await Promise.race([pending,new Promise<'pending'>(ok=>setTimeout(()=>ok('pending'),3000))]);
  expect(result).not.toBe('pending');if(result==='pending')throw Error('Unconfirmed cleanup exceeded its budget');
  expect(result).toMatchObject({status:'failed',cleanupConfirmed:false});expect(existsSync(join(directory,'payroll.lock'))).toBe(true);
  expect(()=>original(Number(readFileSync(pidFile,'utf8')),0)).not.toThrow();
  await expect(superviseProcess(config,'payroll',node('process.exit(0)'))).rejects.toThrow('operations_overlap');
 }finally{blocked.mockRestore();if(existsSync(pidFile))try{original(-Number(readFileSync(pidFile,'utf8')),'SIGKILL');}catch{}await pending;}
},10000);
it('keeps the actual CLI disabled and rejects native/unknown commands before any state or database work',async()=>{
 const {spawnSync}=await import('node:child_process');
 const env:NodeJS.ProcessEnv={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'test',NEVORA_OPERATIONS_ENABLED:'false',NEVORA_OPERATIONS_ENVIRONMENT:'test',NEVORA_OPERATIONS_SOURCE_SHA:config.sourceSha,NEVORA_OPERATIONS_SCOPE_ID:config.scopeId,NEVORA_OPERATIONS_STATE_DIR:directory,NEVORA_OPERATIONS_DEADLINE_SECONDS:'120'};
 const cli=(args:string[])=>spawnSync(process.execPath,['--conditions=react-server','--import','./scripts/node-server-context.mjs','--import','tsx','scripts/workforce-operations.mts',...args],{env,encoding:'utf8',timeout:5000});
 const disabled=cli(['run','payroll']);expect(disabled.status).toBe(1);expect(disabled.stderr.trim()).toBe('operations_disabled');expect(disabled.stdout).toBe('');
 for(const args of [['run','native-dispatch'],['run','payroll','extra'],['health','unknown']]){const result=cli(args);expect(result.status).toBe(1);expect(result.stderr.trim()).toBe('operations_command_invalid');}
 const missingThreshold=cli(['health','payroll']);expect(missingThreshold.status).toBe(1);expect(missingThreshold.stderr.trim()).toBe('operations_configuration_invalid');
 expect(existsSync(join(directory,'payroll.json'))).toBe(false);
},10000);
it('rejects missing or mismatched notification environments in both actual CLI modes before IO',()=>{
 const base:NodeJS.ProcessEnv={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'test',NEVORA_OPERATIONS_ENABLED:'true',NEVORA_OPERATIONS_ENVIRONMENT:'test',NEVORA_OPERATIONS_SOURCE_SHA:config.sourceSha,NEVORA_OPERATIONS_SCOPE_ID:config.scopeId,NEVORA_OPERATIONS_STATE_DIR:directory,NEVORA_OPERATIONS_DEADLINE_SECONDS:'120',NEVORA_OPERATIONS_MAX_HEARTBEAT_GAP_SECONDS:'60',NEVORA_OPERATIONS_MAX_QUEUE_AGE_SECONDS:'60',NEVORA_WORKSPACE_MODE:'isolated'};
 for(const command of ['notifications-dispatch','notifications-reminders'])for(const mode of ['run','health'])for(const environment of [undefined,'production']){
  const env={...base,...(environment?{PUSH_ENVIRONMENT:environment}:{})};
  const result=spawnSync(process.execPath,['--conditions=react-server','--import','./scripts/node-server-context.mjs','--import','tsx','scripts/workforce-operations.mts',mode,command],{env,encoding:'utf8',timeout:5000});
  expect(result.status).toBe(1);expect(result.stderr.trim()).toBe('operations_configuration_invalid');expect(result.stdout).toBe('');expect(existsSync(join(directory,command+'.lock'))).toBe(false);
 }
},20000);
