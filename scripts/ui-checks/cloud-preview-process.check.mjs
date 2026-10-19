import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {liveProcess} from './cloud-preview-process.mjs';

async function until(read){const end=Date.now()+5000;while(Date.now()<end){const value=await read();if(value)return value;await new Promise(r=>setTimeout(r,25));}throw Error('Process lifecycle condition timed out');}
for(const detached of [false,true])test(`a ${detached?'detached':'attached'} preview ${detached?'survives':'does not survive'} controller group termination`,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'nv-process-check-')),pidFile=join(dir,'pid'),log=join(dir,'log');
 const helper=new URL('./cloud-preview-process.mjs',import.meta.url).href;
 const controllerCode=`import{spawn}from'node:child_process';import{writeFileSync,openSync,closeSync}from'node:fs';import{startPreview}from${JSON.stringify(helper)};let child;const args=['--input-type=module','-e','setInterval(()=>{},1000)'];if(${detached})child=startPreview({script:args.at(-1),args:args.slice(0,-1),cwd:${JSON.stringify(dir)},env:process.env,log:${JSON.stringify(log)}});else{const fd=openSync(${JSON.stringify(log)},'a');child=spawn(process.execPath,args,{stdio:['ignore',fd,fd]});closeSync(fd);}writeFileSync(${JSON.stringify(pidFile)},String(child.pid));setInterval(()=>{},1000);`;
 const parent=spawn(process.execPath,['--input-type=module','-e',controllerCode],{detached:true,stdio:'ignore'});let pid;
 try{pid=await until(async()=>Number(await readFile(pidFile,'utf8').catch(()=>'')));assert(liveProcess(pid));process.kill(-parent.pid,'SIGTERM');await until(()=>!liveProcess(parent.pid));if(detached)assert(liveProcess(pid));else await until(()=>!liveProcess(pid));}
 finally{for(const target of [pid,parent.pid])if(target&&liveProcess(target))try{process.kill(target,'SIGKILL');}catch{}await rm(dir,{recursive:true,force:true});}
});
