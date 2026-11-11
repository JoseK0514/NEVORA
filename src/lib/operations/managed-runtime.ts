import 'server-only';
import {spawn} from 'node:child_process';
import {constants} from 'node:fs';
import {mkdir,lstat,realpath,open,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {authorizeHealthRequest,signHealthResponse,managedHealth,managedChildEnvironment,type ManagedHostConfig,type ManagedProfile,type ManagedObservation} from './managed-host';
import type {WorkerCommand} from './supervisor';

const unavailable=()=>Error('managed_state_unavailable');
async function privateDirectory(path:string){
 try{await mkdir(path,{mode:0o700});}catch(error){if(!error||typeof error!=='object'||!('code'in error)||error.code!=='EEXIST')throw unavailable();}
 const s=await lstat(path);if(!s.isDirectory()||s.isSymbolicLink()||(s.mode&0o077)!==0||!process.getuid||s.uid!==process.getuid()||await realpath(path)!==path)throw unavailable();
}
/** The mounted parent must already exist. Never chmod/adopt a public or aliased
 * directory and never automatically remove an interrupted host's lock. */
export async function acquireManagedState(config:ManagedHostConfig){
 try{
  if(!config.enabled)throw unavailable();await privateDirectory(config.stateDirectory);
  for(const p of config.profiles)await privateDirectory(p.stateDirectory);
  const path=join(config.stateDirectory,'host.lock'),marker=randomUUID(),lock=await open(path,'wx',0o600);
  await lock.writeFile(JSON.stringify({marker,sourceSha:config.sourceSha,pid:process.pid}));await lock.sync();
  const directory=await open(config.stateDirectory,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_DIRECTORY);await directory.sync();await directory.close();
  let released=false;
  return {async release(confirmed:boolean){
   if(released)return;released=true;await lock.close();if(!confirmed)return;
   let reader;try{
    reader=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);const s=await reader.stat();
    if(!s.isFile()||s.size>1024||(s.mode&0o077)!==0||!process.getuid||s.uid!==process.getuid()||JSON.parse(await reader.readFile('utf8')).marker!==marker)throw unavailable();
    await unlink(path);const d=await open(config.stateDirectory,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_DIRECTORY);try{await d.sync();}finally{await d.close();}
   }finally{await reader?.close();}
  }};
 }catch{throw unavailable();}
}
export type ManagedProcessResult={exitCode:number|null;cleanupConfirmed:boolean;validOutput:boolean;output:string};
type Invocation={file:string;args:readonly string[];env:NodeJS.ProcessEnv};
/** Private process primitive, never exposed through HTTP or profile JSON. The
 * caller below constructs only the fixed, source-custodied operations CLI. */
export async function runManagedProcess(invocation:Invocation,signal:AbortSignal|undefined,deadlineMs:number):Promise<ManagedProcessResult>{
 if(signal?.aborted)return {exitCode:null,cleanupConfirmed:true,validOutput:false,output:''};
 if(!Number.isSafeInteger(deadlineMs)||deadlineMs<1||deadlineMs>150000)throw Error('managed_configuration_invalid');
 const child=spawn(invocation.file,[...invocation.args],{env:invocation.env,stdio:['ignore','pipe','ignore'],detached:true,shell:false});
 let output='',bytes=0,valid=true,stopping=false,killTimer:ReturnType<typeof setTimeout>|undefined,hardTimer:ReturnType<typeof setTimeout>|undefined;
 const kill=(s:NodeJS.Signals)=>{if(child.pid)try{process.kill(-child.pid,s);}catch{/* Absence is checked below. */}};
 const alive=()=>{if(!child.pid)return false;try{process.kill(-child.pid,0);return true;}catch(e){return !(e&&typeof e==='object'&&'code'in e&&e.code==='ESRCH');}};
 const stop=()=>{if(stopping)return;stopping=true;kill('SIGTERM');killTimer=setTimeout(()=>kill('SIGKILL'),15000);};
 child.stdout.setEncoding('utf8');child.stdout.on('data',(chunk:string)=>{bytes+=Buffer.byteLength(chunk);if(bytes>65536){valid=false;output='';stop();}else if(valid)output+=chunk;});
 const exit=new Promise<number|null>(ok=>{child.once('error',()=>ok(null));child.once('close',code=>ok(code));});
 const timer=setTimeout(stop,deadlineMs);signal?.addEventListener('abort',stop,{once:true});if(signal?.aborted)stop();
 // Cancellation has a separate bound, so a disk-backed Render host can drain
 // within its fixed 30-second shutdown allowance.
 let abortWake:()=>void=()=>{};const abortPromise=new Promise<null>(ok=>{abortWake=()=>{hardTimer=setTimeout(()=>ok(null),20000);};});
 signal?.addEventListener('abort',abortWake,{once:true});if(signal?.aborted)abortWake();
 let deadlineHard:ReturnType<typeof setTimeout>|undefined;
 const code=await Promise.race([exit,abortPromise,new Promise<null>(ok=>{deadlineHard=setTimeout(()=>ok(null),deadlineMs+20000);})]);
 clearTimeout(timer);if(killTimer)clearTimeout(killTimer);if(hardTimer)clearTimeout(hardTimer);if(deadlineHard)clearTimeout(deadlineHard);signal?.removeEventListener('abort',stop);signal?.removeEventListener('abort',abortWake);
 if(alive()){
  kill('SIGKILL');const end=performance.now()+1500;while(alive()&&performance.now()<end)await new Promise(r=>setTimeout(r,10));
 }
 if(alive()){child.unref();return {exitCode:code,cleanupConfirmed:false,validOutput:false,output:''};}
 return {exitCode:code,cleanupConfirmed:true,validOutput:valid,output:valid?output.trim():''};
}
export async function invokeManagedCommand(profile:ManagedProfile,mode:'run'|'health',command:WorkerCommand,signal:AbortSignal){
 return runManagedProcess({file:process.execPath,args:['--conditions=react-server','--import','./scripts/node-server-context.mjs','--import','tsx','scripts/workforce-operations.mts',mode,command],env:managedChildEnvironment(profile,process.env,command)},signal,mode==='run'?135000:15000);
}
type Invoke=(profile:ManagedProfile,mode:'run'|'health',command:WorkerCommand,signal:AbortSignal)=>Promise<ManagedProcessResult>;
const decode=(r:ManagedProcessResult):Record<string,unknown>|null=>{try{const v=JSON.parse(r.output);return r.validOutput&&v&&typeof v==='object'&&!Array.isArray(v)?v:null;}catch{return null;}};
export async function runManagedCycle(config:ManagedHostConfig,signal:AbortSignal,invoke:Invoke=invokeManagedCommand){
 const observations:ManagedObservation[]=[];let cleanupConfirmed=true;
 if(!config.enabled||signal.aborted)return {observations,cleanupConfirmed};
 outer:for(const p of config.profiles)for(const command of p.commands){
  if(signal.aborted)break outer;
  const same=(v:Record<string,unknown>|null)=>v?.schemaVersion===1&&v.command===command&&v.scopeId===p.scopeId&&v.environment===p.environment&&v.sourceSha===config.sourceSha;
  let healthy=false,reason:ManagedObservation['reason']='invocation_failed';
  try{
   const result=await invoke(p,'run',command,signal),receipt=decode(result);
   const confirmed=result.cleanupConfirmed&&same(receipt)&&receipt?.cleanupConfirmed===true;
   if(!confirmed){cleanupConfirmed=false;}
   else if(result.exitCode===0&&receipt?.status==='succeeded'&&!signal.aborted){
    const health=await invoke(p,'health',command,signal),report=decode(health);
    cleanupConfirmed=cleanupConfirmed&&health.cleanupConfirmed;healthy=health.exitCode===0&&health.cleanupConfirmed&&same(report)&&report?.healthy===true;reason=healthy?'ok':'health_unavailable';
   }
  }catch{cleanupConfirmed=false;}
  observations.push({scopeId:p.scopeId,environment:p.environment,command,sourceSha:config.sourceSha,observedAt:Date.now(),healthy,reason});
  if(!cleanupConfirmed)break outer;
 }
 return {observations,cleanupConfirmed};
}
export function managedHttpResponse(request:Request,config:ManagedHostConfig,observations:readonly ManagedObservation[],now:number,ready:boolean):Response{
 const url=new URL(request.url),headers={'cache-control':'no-store','content-type':'application/json'};
 if(request.method==='GET'&&url.pathname==='/ready'&&!url.search)return Response.json({ready},{status:ready?200:503,headers});
 if(url.pathname!=='/private/health'||url.search)return Response.json({error:'not_found'},{status:404,headers});
 if(!authorizeHealthRequest(request,config.healthKey,now))return Response.json({error:'unauthorized'},{status:401,headers});
 const report=managedHealth(config,observations,now),status=report.healthy?200:503,body=JSON.stringify(report);
 return new Response(body,{status,headers:{...headers,'x-nevora-ops-response':signHealthResponse(config.healthKey,request,status,body)}});
}
