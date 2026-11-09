import {spawnSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {expect,it} from 'vitest';

const runner=resolve('scripts/phase-e-owned.mjs');
type Mode='exec-clean-exit'|'registered-exec'|'registration-after-exec'|'root-exit'|'forced-root'|'changed-root'|'root-marker-lost'|'member-marker-lost'|'recycled-member'|'reparented-member';

/** Actual shell -> Node exec and a FIFO establish observed identity before exec.
 * Darwin simulates Linux marker retention only for live fixture-created PIDs;
 * PID, birth, group, ancestry and command observations remain native. */
function rootGroupExecution(mode:Mode){
 const root=mkdtempSync(join(tmpdir(),'nevora-e-root-exec-'));
 const resourceTrace=join(root,'resource.json'),rootTrace=join(root,'root.json');
 try{
  const gate=join(root,'exec.fifo'),worker=join(root,'worker.mjs'),child=join(root,'child.mjs'),driver=join(root,'driver.mjs');
  const registered=join(root,'registered'),release=join(root,'release'),releaseRoot=join(root,'release-root'),rootExited=join(root,'root-exited'),changeRoot=join(root,'change-root'),registerAfterExec=join(root,'register-after-exec');
  const fifo=spawnSync('mkfifo',[gate],{encoding:'utf8',timeout:2000});expect(fifo.status,fifo.stderr).toBe(0);
  writeFileSync(worker,`import fs from 'node:fs';fs.writeFileSync(${JSON.stringify(join(root,'exec-entered'))},JSON.stringify({pid:process.pid}));${['root-exit','forced-root'].includes(mode)?"process.on('SIGTERM',()=>{});":''}setInterval(()=>{if(fs.existsSync(${JSON.stringify(release)}))process.exit(0);},5);`);
  const shell=`printf '{"pid":%s}' "$$" > '${resourceTrace}'; read token < '${gate}'; exec '${process.execPath}' '${worker}'`;
  writeFileSync(child,`import fs from 'node:fs';import {spawn} from 'node:child_process';import {once} from 'node:events';import {registerOwnedProcess} from ${JSON.stringify(runner)};
fs.writeFileSync(${JSON.stringify(rootTrace)},JSON.stringify({pid:process.pid}));const resource=spawn('/bin/sh',['-c',${JSON.stringify(shell)}],{env:process.env,stdio:'ignore'});
process.on('SIGTERM',()=>{${mode==='forced-root'?'':"resource.kill('SIGKILL');setTimeout(()=>process.exit(19),20);"}});
${mode==='changed-root'?`setInterval(()=>{if(fs.existsSync(${JSON.stringify(changeRoot)}))process.title='changed-supervised-root';},5);`:''}
${mode==='registered-exec'?`while(!fs.existsSync(${JSON.stringify(resourceTrace)}))await new Promise(r=>setTimeout(r,5));await registerOwnedProcess({kind:'next',pid:resource.pid,ownerId:process.env.PHASE_E_OWNER_ID});fs.writeFileSync(${JSON.stringify(registered)},'registered');`:''}
${mode==='registration-after-exec'?`while(!fs.existsSync(${JSON.stringify(registerAfterExec)}))await new Promise(r=>setTimeout(r,5));try{await registerOwnedProcess({kind:'next',pid:resource.pid,ownerId:process.env.PHASE_E_OWNER_ID});fs.writeFileSync(${JSON.stringify(registered)},'promoted');}catch{}`:''}
${mode==='root-exit'?`while(!fs.existsSync(${JSON.stringify(releaseRoot)}))await new Promise(r=>setTimeout(r,5));fs.writeFileSync(${JSON.stringify(rootExited)},'exiting');process.exit(0);`:`await once(resource,'exit');process.exit(0);`}`);
  writeFileSync(driver,`import fs from 'node:fs';import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';
const ownerId='f'.repeat(32),actualPlatform=process.platform,raw=cp.spawnSync,rawCreate=cp.spawn,rawRead=fs.readFileSync,rawKill=process.kill.bind(process),signals=[],observations=[];let opened=false,finished=false,createdRoot;
cp.spawn=function(command,args,options){const child=rawCreate(command,args,options);if(command===process.execPath&&args[0]===${JSON.stringify(child)})createdRoot=child.pid;return child;};
const fromFile=file=>{try{return JSON.parse(rawRead(file,'utf8')).pid;}catch{return undefined;}},pid=()=>fromFile(${JSON.stringify(resourceTrace)});
fs.readFileSync=function(path,...args){const match=typeof path==='string'&&path.match(/^\\/proc\\/(\\d+)\\/environ$/);if(!match)return rawRead(path,...args);if(![pid(),createdRoot].includes(Number(match[1])))throw Error('Not a fixture-created process');let environment;if(actualPlatform==='linux')environment=rawRead(path,...args);else{const live=raw('ps',['-p',match[1],'-o','stat='],{encoding:'utf8',timeout:2000});if(live.error||live.status!==0||!live.stdout?.trim()||live.stdout.trim().startsWith('Z'))throw Error('Fixture environment unavailable');environment='NEVORA_OWNED_PROCESS_OWNER='+ownerId+'\\0';}return finished&&((${JSON.stringify(mode)}==='root-marker-lost'&&Number(match[1])===createdRoot)||(${JSON.stringify(mode)}==='member-marker-lost'&&Number(match[1])===pid()))?'':environment;};if(actualPlatform!=='linux')Object.defineProperty(process,'platform',{value:'linux'});
cp.spawnSync=function(command,args,options){const result=raw(command,args,options);if(command==='ps'&&finished&&args[0]==='-axo'&&${JSON.stringify(mode)}==='reparented-member')result.stdout=result.stdout.split('\\n').map(line=>{const fields=line.trim().split(/\\s+/);return Number(fields[0])===pid()?[fields[0],1,fields[2]].join(' '):line;}).join('\\n');if(command==='ps'&&args[0]==='-p'&&args[1]===String(pid())&&args[3]==='pid=,ppid=,pgid=,lstart=,stat=,command='&&result.status===0){const fields=result.stdout.trim().split(/\\s+/);if(finished&&${JSON.stringify(mode)}==='recycled-member'){fields[7]='1999';result.stdout=fields.join(' ')+'\\n';}const argv=fields.slice(9).join(' ');observations.push({pid:Number(fields[0]),ppid:Number(fields[1]),pgid:Number(fields[2]),started:fields.slice(3,8).join(' '),argv});
if(!opened&&argv.includes('/bin/sh -c')&&(${JSON.stringify(mode)}!=='registered-exec'||fs.existsSync(${JSON.stringify(registered)}))){opened=true;setImmediate(()=>fs.writeFileSync(${JSON.stringify(gate)},'exec\\n'));}
if(!finished&&argv.includes(${JSON.stringify(worker)} )&&!argv.includes('/bin/sh -c')){finished=true;${['exec-clean-exit','root-exit','changed-root','registration-after-exec'].includes(mode)?`setImmediate(()=>fs.writeFileSync(${JSON.stringify(mode==='root-exit'?releaseRoot:mode==='changed-root'?changeRoot:mode==='registration-after-exec'?registerAfterExec:release)},'release'));`:''}}}
return result;};process.kill=function(pid,signal){signals.push({pid,signal});return rawKill(pid,signal);};syncBuiltinESMExports();
const api=await import(${JSON.stringify(runner)});const result=await api.superviseOwnedChild({command:process.execPath,args:[${JSON.stringify(child)}],cwd:${JSON.stringify(root)},env:{...api.safeEnvironment(),PHASE_E_OWNER_ID:ownerId},ownerId,timeoutMs:${mode==='forced-root'?1500:5000},graceMs:200});process.stdout.write(JSON.stringify({result,observations,signals,opened,finished,actualPlatform,markerSimulation:actualPlatform!=='linux',negativeFieldSimulation:${JSON.stringify(['root-marker-lost','member-marker-lost','recycled-member','reparented-member'].includes(mode)?mode:null)},rootExited:fs.existsSync(${JSON.stringify(rootExited)})}));`);
  const execution=spawnSync(process.execPath,[driver],{encoding:'utf8',timeout:12000});expect(execution.status,execution.stderr).toBe(0);
  const receipt=JSON.parse(execution.stdout),resource=JSON.parse(readFileSync(resourceTrace,'utf8')),parent=JSON.parse(readFileSync(rootTrace,'utf8'));
  expect(receipt.opened,JSON.stringify(receipt)).toBe(true);expect(receipt.finished,JSON.stringify(receipt)).toBe(true);
  const before=receipt.observations.find((row:{argv:string})=>row.argv.includes('/bin/sh -c'));
  const after=receipt.observations.find((row:{argv:string})=>!row.argv.includes('/bin/sh -c')&&row.argv.includes(worker));
  expect(before).toMatchObject({pid:resource.pid,ppid:parent.pid,pgid:parent.pid});
  expect(after).toMatchObject({pid:before.pid,ppid:before.ppid,pgid:before.pgid,started:before.started});
  expect(before.argv).not.toBe(after.argv);
  expect(receipt.result.timedOut).toBe(mode==='forced-root');
  expect(receipt.result.resources.every((row:{stopped:boolean})=>row.stopped)).toBe(true);
  expect(receipt.signals.some((row:{pid:number})=>row.pid===resource.pid)).toBe(false);
  if(mode==='exec-clean-exit'){
   expect(receipt.result.status,JSON.stringify(receipt)).toBe(0);
   expect(receipt.result.observationFailure).toBeUndefined();
  }else if(mode==='registered-exec'){
   expect(receipt.result.status).toBe(1);expect(receipt.result.error).toBe('Owned resource observation failed');
   expect(receipt.result.observationFailure.reason).toBe('IDENTITY_CHANGED');
  }else if(mode==='root-exit'){
   expect(receipt.rootExited).toBe(true);expect(receipt.result.status).toBe(1);
   expect(receipt.result.error).toBe('Owned child left runtime resources running');
   expect(receipt.result.observationFailure).toBeUndefined();
   expect(receipt.signals).toContainEqual({pid:-parent.pid,signal:'SIGKILL'});
  }else if(mode==='forced-root'){
   expect(receipt.result.status).toBe(124);expect(receipt.result.error).toBe('Owned child timed out');
   expect(receipt.signals).toContainEqual({pid:-parent.pid,signal:'SIGKILL'});
  }else if(mode==='registration-after-exec'){
   expect(receipt.result.status).toBe(1);expect(receipt.result.error).toBe('Owned process registration refused');
   expect(existsSync(registered)).toBe(false);
   expect(receipt.result.resources.find((row:{pid:number})=>row.pid===resource.pid).kind).toBe('owned-descendant');
  }else{
   expect(receipt.result.status).toBe(1);expect(receipt.result.error).toBe('Owned resource observation failed');
   expect(receipt.result.observationFailure.reason).toBe(mode==='changed-root'?'IDENTITY_CHANGED':mode.endsWith('marker-lost')?'OWNERSHIP_LOST':'MEMBER_CONTINUITY_CHANGED');
   if(mode==='changed-root')expect(receipt.result.observationFailure.expected.pid).toBe(parent.pid);
  }
 }finally{
  // Only this fixture's recorded, invocation-created process group is eligible.
  if(existsSync(rootTrace)){const {pid}=JSON.parse(readFileSync(rootTrace,'utf8'));try{process.kill(-pid,'SIGKILL');}catch{}}
  rmSync(root,{recursive:true,force:true});
 }
}
it.each<Mode>(['exec-clean-exit','registered-exec','registration-after-exec','root-exit','forced-root','changed-root','root-marker-lost','member-marker-lost','recycled-member','reparented-member'])('root-group actual exec: %s',mode=>rootGroupExecution(mode),15000);
