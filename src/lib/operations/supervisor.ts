import 'server-only';
import {spawn} from 'node:child_process';
import {constants} from 'node:fs';
import {lstat,realpath,open,rename,unlink} from 'node:fs/promises';
import {isAbsolute,join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';

export const WORKER_COMMANDS=['payroll','notifications-dispatch','notifications-reminders'] as const;
export type WorkerCommand=typeof WORKER_COMMANDS[number];
export type OperationsConfig={enabled:boolean;environment:'test'|'production';sourceSha:string;scopeId:string;stateDirectory:string;deadlineMs:number;graceMs:number};
export type InvocationReceipt={schemaVersion:1;command:WorkerCommand;environment:'test'|'production';sourceSha:string;scopeId:string;startedAt:string;finishedAt:string|null;lastSuccessAt:string|null;status:'running'|'succeeded'|'failed'|'timed_out'|'interrupted';exitCode:number|null;cleanupConfirmed:boolean};
type Invocation={file:string;args:readonly string[];env?:NodeJS.ProcessEnv};
const sha=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const instant=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const unavailable=()=>Error('operations_state_unavailable');
export function workerInvocation(command:string):Invocation{
 if(!WORKER_COMMANDS.includes(command as WorkerCommand))throw Error('operations_command_invalid');
 return {file:process.execPath,args:['--conditions=react-server','--import','./scripts/node-server-context.mjs','--import','tsx',...(command==='payroll'?['scripts/payroll-worker.ts']:['scripts/fuel-notification-worker.ts',command==='notifications-dispatch'?'dispatch':'reminders'])]};
}
export function parseOperationsConfig(env:Record<string,string|undefined>):OperationsConfig{
 const seconds=env.NEVORA_OPERATIONS_DEADLINE_SECONDS,environment=env.NEVORA_OPERATIONS_ENVIRONMENT,sourceSha=env.NEVORA_OPERATIONS_SOURCE_SHA,scopeId=env.NEVORA_OPERATIONS_SCOPE_ID,stateDirectory=env.NEVORA_OPERATIONS_STATE_DIR;
 if(!['true','false',undefined].includes(env.NEVORA_OPERATIONS_ENABLED)||!['test','production'].includes(environment??'')||!sha(sourceSha)||!uuid(scopeId)||!stateDirectory||!isAbsolute(stateDirectory)||resolve(stateDirectory)!==stateDirectory||!seconds||!/^[1-9][0-9]{0,2}$/.test(seconds)||Number(seconds)<30||Number(seconds)>300)throw Error('operations_configuration_invalid');
 return {enabled:env.NEVORA_OPERATIONS_ENABLED==='true',environment:environment as OperationsConfig['environment'],sourceSha,scopeId,stateDirectory,deadlineMs:Number(seconds)*1000,graceMs:5000};
}
async function privateDirectory(config:OperationsConfig){
 try{
  const s=await lstat(config.stateDirectory);
  if(!isAbsolute(config.stateDirectory)||!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o077)!==0||!process.getuid||s.uid!==process.getuid()||await realpath(config.stateDirectory)!==config.stateDirectory||!sha(config.sourceSha)||!uuid(config.scopeId)||!['test','production'].includes(config.environment)||!Number.isSafeInteger(config.deadlineMs)||config.deadlineMs<1||config.deadlineMs>300000||!Number.isSafeInteger(config.graceMs)||config.graceMs<1||config.graceMs>5000)throw unavailable();
 }catch{throw unavailable();}
}
async function readPrivate(file:string):Promise<string|null>{
 let handle;
 try{
  handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
  const s=await handle.stat();if(!s.isFile()||(s.mode&0o077)!==0||!process.getuid||s.uid!==process.getuid()||s.size>16384)throw unavailable();
  return await handle.readFile('utf8');
 }catch(error){if(error&&typeof error==='object'&&'code' in error&&error.code==='ENOENT')return null;throw unavailable();}
 finally{await handle?.close();}
}
function decodeReceipt(text:string,config:OperationsConfig,command:WorkerCommand,allowPreviousSource=false):InvocationReceipt{
 try{
  const r=JSON.parse(text) as InvocationReceipt;
  if(!r||Object.keys(r).sort().join(',')!=='cleanupConfirmed,command,environment,exitCode,finishedAt,lastSuccessAt,schemaVersion,scopeId,sourceSha,startedAt,status'||r.schemaVersion!==1||r.command!==command||r.environment!==config.environment||r.scopeId!==config.scopeId||!sha(r.sourceSha)||!allowPreviousSource&&r.sourceSha!==config.sourceSha||!instant(r.startedAt)||!['running','succeeded','failed','timed_out','interrupted'].includes(r.status)||typeof r.cleanupConfirmed!=='boolean'||r.exitCode!==null&&(!Number.isSafeInteger(r.exitCode)||r.exitCode<0||r.exitCode>255)||r.lastSuccessAt!==null&&!instant(r.lastSuccessAt)||r.status==='running'&&(r.finishedAt!==null||r.exitCode!==null||r.cleanupConfirmed)||r.status!=='running'&&(!instant(r.finishedAt)||Date.parse(r.finishedAt)<Date.parse(r.startedAt))||r.status==='succeeded'&&(r.exitCode!==0||!r.cleanupConfirmed||r.lastSuccessAt!==r.finishedAt)||r.lastSuccessAt!==null&&Date.parse(r.lastSuccessAt)>Date.parse(r.finishedAt??r.startedAt))throw unavailable();
  return r;
 }catch{throw unavailable();}
}
async function writeReceipt(config:OperationsConfig,command:WorkerCommand,receipt:InvocationReceipt){
 const temporary=join(config.stateDirectory,command+'.'+randomUUID()+'.tmp');let handle;
 try{handle=await open(temporary,'wx',0o600);await handle.writeFile(JSON.stringify(receipt)+'\n');await handle.sync();await handle.close();handle=undefined;await rename(temporary,join(config.stateDirectory,command+'.json'));}
 catch{throw unavailable();}
 finally{await handle?.close();await unlink(temporary).catch(()=>{});}
}
const pause=(ms:number)=>new Promise<void>(ok=>setTimeout(ok,ms));
/** This primitive is private operator infrastructure. The public CLI never accepts
 * file/argv: runSupervisedWorker selects the fixed canonical invocation instead. */
export async function superviseProcess(config:OperationsConfig,command:WorkerCommand,invocation:Invocation,signal?:AbortSignal):Promise<InvocationReceipt>{
 workerInvocation(command);if(!config.enabled)throw Error('operations_disabled');await privateDirectory(config);
 const lockPath=join(config.stateDirectory,command+'.lock'),marker=randomUUID();let lock;
 try{lock=await open(lockPath,'wx',0o600);await lock.writeFile(JSON.stringify({marker,pid:process.pid})+'\n');await lock.sync();}
 catch(error){await lock?.close();if(error&&typeof error==='object'&&'code' in error&&error.code==='EEXIST')throw Error('operations_overlap');throw unavailable();}
 let release=true;
 try{
  const previous=await readPrivate(join(config.stateDirectory,command+'.json'));
  const prior=previous===null?null:decodeReceipt(previous,config,command,true);
  const receipt:InvocationReceipt={schemaVersion:1,command,environment:config.environment,sourceSha:config.sourceSha,scopeId:config.scopeId,startedAt:new Date().toISOString(),finishedAt:null,lastSuccessAt:prior?.sourceSha===config.sourceSha?prior.lastSuccessAt:null,status:'running',exitCode:null,cleanupConfirmed:false};
  await writeReceipt(config,command,receipt);
  const result=await runOwnedChild(invocation,config.deadlineMs,config.graceMs,signal);
  release=result.cleanupConfirmed;
  const finishedAt=new Date().toISOString(),status=result.cleanupConfirmed?result.status:'failed';
  const finished:InvocationReceipt={...receipt,...result,status,finishedAt,lastSuccessAt:status==='succeeded'?finishedAt:receipt.lastSuccessAt};
  await writeReceipt(config,command,finished);return finished;
 }finally{
  await lock.close();
  // Unknown cleanup keeps the exclusive marker for explicit paused-host recovery.
  if(release){const value=await readPrivate(lockPath);if(value!==null&&JSON.parse(value).marker===marker)await unlink(lockPath);}
 }
}
async function runOwnedChild(invocation:Invocation,deadlineMs:number,graceMs:number,signal?:AbortSignal):Promise<Pick<InvocationReceipt,'status'|'exitCode'|'cleanupConfirmed'>>{
 if(signal?.aborted)return {status:'interrupted',exitCode:null,cleanupConfirmed:true};
 const child=spawn(invocation.file,[...invocation.args],{stdio:'ignore',detached:true,shell:false,env:invocation.env});
 let reason:'timed_out'|'interrupted'|undefined,killTimer:ReturnType<typeof setTimeout>|undefined;
 const kill=(signal:NodeJS.Signals)=>{if(child.pid)try{process.kill(-child.pid,signal);}catch{/* Absent group is already stopped; probe verifies cleanup. */}};
 const alive=()=>{if(!child.pid)return false;try{process.kill(-child.pid,0);return true;}catch(error){return !(error&&typeof error==='object'&&'code' in error&&error.code==='ESRCH');}};
 const stop=(status:'timed_out'|'interrupted')=>{if(reason)return;reason=status;kill('SIGTERM');killTimer=setTimeout(()=>kill('SIGKILL'),graceMs);};
 const onAbort=()=>stop('interrupted');
 const exit=new Promise<number|null>(ok=>{child.once('error',()=>ok(null));child.once('close',code=>ok(code));});
 const timer=setTimeout(()=>stop('timed_out'),deadlineMs);signal?.addEventListener('abort',onAbort,{once:true});if(signal?.aborted)onAbort();
 let hardTimer:ReturnType<typeof setTimeout>|undefined;
 const outcome=await Promise.race([
  exit.then(code=>({closed:true as const,code})),
  new Promise<{closed:false;code:null}>(ok=>{hardTimer=setTimeout(()=>ok({closed:false,code:null}),deadlineMs+graceMs+2000);}),
 ]);
 clearTimeout(timer);if(hardTimer)clearTimeout(hardTimer);if(killTimer)clearTimeout(killTimer);signal?.removeEventListener('abort',onAbort);
 if(!outcome.closed){kill('SIGKILL');child.unref();return {status:'failed',exitCode:null,cleanupConfirmed:false};}
 const code=outcome.code;
 // A leader may exit before descendants. Stop and observe the entire owned group
 // before releasing host overlap protection, even on an apparently successful exit.
 if(alive()){
  kill('SIGTERM');const graceEnd=performance.now()+graceMs;while(alive()&&performance.now()<graceEnd)await pause(10);
  if(alive()){kill('SIGKILL');const end=performance.now()+2000;while(alive()&&performance.now()<end)await pause(10);}
 }
 return {status:reason??(code===0?'succeeded':'failed'),exitCode:code,cleanupConfirmed:!alive()};
}
export function runSupervisedWorker(config:OperationsConfig,command:WorkerCommand,signal?:AbortSignal){
 const invocation={...workerInvocation(command),env:{...process.env,NEVORA_WORKER_EXPECTED_WORKSPACE_ID:config.scopeId,NEVORA_WORKER_EXPECTED_ENVIRONMENT:config.environment}};
 return superviseProcess(config,command,invocation,signal);
}
export async function readInvocationHealth(config:OperationsConfig,command:WorkerCommand,now:number,maxGapSeconds:number):Promise<{healthy:boolean;reason:string}>{
 workerInvocation(command);await privateDirectory(config);
 if(!Number.isFinite(now)||!Number.isSafeInteger(maxGapSeconds)||maxGapSeconds<1||maxGapSeconds>86400)throw Error('operations_configuration_invalid');
 let r:InvocationReceipt;
 try{const text=await readPrivate(join(config.stateDirectory,command+'.json'));if(text===null)return {healthy:false,reason:'missing'};r=decodeReceipt(text,config,command);}catch{return {healthy:false,reason:'invalid'};}
 const at=Date.parse(r.finishedAt??r.startedAt);if(at>now+1000)return {healthy:false,reason:'future'};
 if(now-at>maxGapSeconds*1000||r.status==='running'&&now-at>config.deadlineMs+config.graceMs+2000)return {healthy:false,reason:'stale'};
 if(r.status!=='succeeded')return {healthy:false,reason:r.status==='running'?'running':'failed'};
 if(await readPrivate(join(config.stateDirectory,command+'.lock'))!==null)return {healthy:false,reason:'lock_present'};
 return {healthy:config.enabled,reason:config.enabled?'ok':'disabled'};
}
