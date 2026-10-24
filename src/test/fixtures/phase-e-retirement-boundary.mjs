import assert from 'node:assert/strict';
import cp from 'node:child_process';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const runner=resolve(process.argv[2]),mode=process.argv[3];
assert(['member-environment','root-environment','root-with-live-member','member-eacces','member-eio','member-missing-marker','ambiguous-exit','ambiguous-exit-stderr','ambiguous-exit-malformed','root-ambiguous-exit','darwin-environment-stderr','member-retired-eacces','root-retired-eacces','root-retired-eacces-with-live-member','root-retired-eacces-ambiguous'].includes(mode));
const liveMember=['root-with-live-member','root-retired-eacces-with-live-member'].includes(mode);
const retiresMember=['member-environment','root-environment','ambiguous-exit','ambiguous-exit-stderr','ambiguous-exit-malformed','root-ambiguous-exit','darwin-environment-stderr','member-retired-eacces','root-retired-eacces','root-retired-eacces-ambiguous'].includes(mode);
const retiredEacces=['member-retired-eacces','root-retired-eacces','root-retired-eacces-with-live-member','root-retired-eacces-ambiguous'].includes(mode);
const root=fs.mkdtempSync(join(tmpdir(),'nevora-e-retirement-'));
const paths=Object.fromEntries(['member.json','member-exited.json','member-exit','root-exit','child.mjs','worker.mjs'].map(name=>[name,join(root,name)]));
const nativeSpawn=cp.spawn,nativeRead=cp.spawnSync,nativeFileRead=fs.readFileSync,nativeKill=process.kill.bind(process),actualPlatform=process.platform;
const ownerId='c'.repeat(32),environmentReads=[],signals=[];
let created,actualExit,memberSeen=false,leaseReady=false,triggered=false,proof,result,rootProof,memberProof,backupUsed=false;
const memberPid=()=>{try{return JSON.parse(nativeFileRead(paths['member.json'],'utf8')).pid;}catch{return undefined;}};
function identity(pid){
 const row=nativeRead('ps',['-p',String(pid),'-o','pid=,ppid=,pgid=,lstart=,stat='],{encoding:'utf8',timeout:500});
 const fields=row.stdout?.trim().split(/\s+/)??[];
 if(row.error||row.stderr?.trim()||row.status!==0||fields.length!==9||fields[8].startsWith('Z'))return undefined;
 return {pid:Number(fields[0]),ppid:Number(fields[1]),pgid:Number(fields[2]),started:fields.slice(3,8).join(' ')};
}
function state(pid){
 const row=nativeRead('ps',['-p',String(pid),'-o','pid=,stat='],{encoding:'utf8',timeout:500});
 const fields=row.stdout?.trim().split(/\s+/)??[];
 return {clean:!row.error&&!row.stderr?.trim(),status:row.status,pid:Number(fields[0])||undefined,zombie:fields[1]?.startsWith('Z')??false,empty:!row.stdout?.trim()};
}
function gone(pid){
 const deadline=Date.now()+3000;
 while(Date.now()<deadline){const value=state(pid);if(value.clean&&((value.status===1&&value.empty)||(value.status===0&&value.pid===pid&&value.zombie)))return value;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5);}
 throw Error('Actual fixture process did not retire');
}
function sameLifetime(actual,original){return actual&&original&&actual.pid===original.pid&&actual.pgid===original.pgid&&actual.started===original.started;}

fs.writeFileSync(paths['worker.mjs'],`import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(paths['member.json'])},JSON.stringify({pid:process.pid}));${liveMember?"process.on('SIGTERM',()=>{});":''}setInterval(()=>{if(fs.existsSync(${JSON.stringify(paths['member-exit'])}))process.exit(0);},5);`);
fs.writeFileSync(paths['child.mjs'],`import fs from 'node:fs';import {spawn} from 'node:child_process';let worker;process.on('SIGTERM',()=>worker?.kill('SIGTERM'));worker=spawn(process.execPath,[${JSON.stringify(paths['worker.mjs'])}],{env:process.env,stdio:'ignore'});worker.once('exit',(status,signal)=>{fs.writeFileSync(${JSON.stringify(paths['member-exited.json'])},JSON.stringify({status,signal}));setTimeout(()=>process.exit(0),${mode==='root-environment'?0:500});});setInterval(()=>{if(fs.existsSync(${JSON.stringify(paths['root-exit'])}))process.exit(0);},5);`);

cp.spawn=function(command,args,options){
 const child=nativeSpawn(command,args,options);
 if(args[0]===paths['child.mjs']){created=child;child.once('spawn',()=>{rootProof=identity(child.pid);});child.once('exit',(status,signal)=>{actualExit={status,signal};});}
 return child;
};
cp.spawnSync=function(command,args,options){
 if(mode==='darwin-environment-stderr'&&command==='ps'&&args[0]==='eww'){
  try{return {status:0,stdout:fs.readFileSync('/proc/'+Number(args[2])+'/environ','utf8').replaceAll('\0',' '),stderr:triggered&&Number(args[2])===memberPid()?'fixture environment observer diagnostic':''};}
  catch{return {status:0,stdout:'',stderr:'fixture environment observer diagnostic'};}
 }
 if(['ambiguous-exit','ambiguous-exit-stderr','ambiguous-exit-malformed','root-ambiguous-exit','root-retired-eacces-ambiguous'].includes(mode)&&triggered&&command==='ps'&&args[0]==='-p'&&args[1]===String(memberPid())&&args.at(-1)==='pid=,stat='){
  if(mode==='ambiguous-exit-stderr')return {status:1,stdout:'',stderr:'fixture absence observer diagnostic'};
  if(mode==='ambiguous-exit-malformed')return {status:0,stdout:memberPid()+' Z extra',stderr:''};
  return {status:1,stdout:'',stderr:'fixture absence observer unavailable',error:Error('fixture ps error')};
 }
 return nativeRead(command,args,options);
};
process.kill=function(pid,signal){signals.push({pid,signal});return nativeKill(pid,signal);};
fs.readFileSync=function(path,...args){
 const match=typeof path==='string'&&path.match(/^\/proc\/(\d+)\/environ$/);
 if(!match)return nativeFileRead(path,...args);
 const pid=Number(match[1]),member=memberPid();
 if(![created?.pid,member].includes(pid))throw Error('Not a fixture-created process');
 const kind=pid===created.pid?'root':'member';environmentReads.push({kind,pid});
 if(kind==='member'){memberSeen=true;memberProof??=identity(member);}
 if(kind==='root'&&memberSeen&&!leaseReady)setImmediate(()=>{leaseReady=true;});
 const rootTarget=['root-environment','root-with-live-member','root-ambiguous-exit','root-retired-eacces','root-retired-eacces-with-live-member','root-retired-eacces-ambiguous'].includes(mode);
 if(!triggered&&leaseReady&&kind===(rootTarget?'root':'member')){
  triggered=true;const before={root:state(created.pid),member:state(member)};
  assert(before.root.clean&&before.root.status===0&&!before.root.zombie);assert(before.member.clean&&before.member.status===0&&!before.member.zombie);
  if(retiresMember)fs.writeFileSync(paths['member-exit'],'exit');
  if(rootTarget)fs.writeFileSync(paths['root-exit'],'exit');
  const after={root:rootTarget?gone(created.pid):state(created.pid),member:liveMember?state(member):retiresMember?gone(member):state(member)};
  proof={target:kind,before,after};
 }
 if(triggered&&kind==='member'&&['member-eacces','member-eio'].includes(mode)){const error=Error('Declared live fixture read failure');error.code=mode==='member-eacces'?'EACCES':'EIO';throw error;}
 if(triggered&&retiredEacces&&kind===(rootTarget?'root':'member')){const error=Error('Declared retired fixture permission result');error.code='EACCES';throw error;}
 if(triggered&&kind==='member'&&mode==='member-missing-marker')return '';
 if(actualPlatform==='linux')return nativeFileRead(path,...args);
 const live=state(pid);
 if(!live.clean||live.status!==0){const error=Error('Actual process environment retired');error.code='ENOENT';throw error;}
 if(live.zombie)return '';
 return 'NEVORA_OWNED_PROCESS_OWNER='+ownerId+'\0';
};
Object.defineProperty(process,'platform',{value:mode==='darwin-environment-stderr'?'darwin':'linux'});
syncBuiltinESMExports();
try{
 const api=await import(pathToFileURL(runner));
 result=await api.superviseOwnedChild({command:process.execPath,args:[paths['child.mjs']],cwd:root,env:api.safeEnvironment(),ownerId,timeoutMs:8000,graceMs:1500});
}finally{
 cp.spawn=nativeSpawn;cp.spawnSync=nativeRead;fs.readFileSync=nativeFileRead;process.kill=nativeKill;
 Object.defineProperty(process,'platform',{value:actualPlatform});
 syncBuiltinESMExports();
 const rootNow=created&&identity(created.pid),memberNow=memberPid()&&identity(memberPid());
 if((sameLifetime(rootNow,rootProof)&&rootNow.ppid===process.pid&&rootNow.pgid===created.pid)||(sameLifetime(memberNow,memberProof)&&memberNow.pgid===created.pid)){
  backupUsed=true;try{nativeKill(-created.pid,'SIGKILL');}catch(error){if(error.code!=='ESRCH')throw error;}
 }
}
assert(triggered,'Requested native boundary was not reached');
const final={root:gone(created.pid),member:gone(memberPid())};
const receipt={mode,actualPlatform,simulation:mode==='darwin-environment-stderr'?'Darwin environment branch modeled marker/diagnostic result only for native fixture PIDs':retiredEacces?'Declared EACCES only at a native fixture retirement boundary':actualPlatform!=='linux'?'Linux marker retention and ENOENT/empty environment modeled only for native absent/zombie fixture PIDs':'None for positive process/environment reads',faultInjection:retiredEacces||['member-eacces','member-eio','member-missing-marker','ambiguous-exit','ambiguous-exit-stderr','ambiguous-exit-malformed','root-ambiguous-exit','darwin-environment-stderr'].includes(mode)?mode:null,proof,result,actualExit,environmentReads,signals,backupUsed,final};
fs.rmSync(root,{recursive:true,force:true});
process.stdout.write(JSON.stringify(receipt));
