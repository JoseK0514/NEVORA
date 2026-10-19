import {spawn} from 'node:child_process';
import {openSync,closeSync,readFileSync} from 'node:fs';
import {readFile,stat} from 'node:fs/promises';

export function liveProcess(pid){
 if(!Number.isInteger(pid)||pid<=0)return false;
 try{process.kill(pid,0);if(process.platform==='linux'){const s=readFileSync(`/proc/${pid}/stat`,'utf8');if(s.slice(s.lastIndexOf(')')+2).split(' ')[0]==='Z')return false;}return true;}
 catch(error){if(error.code==='ESRCH'||error.code==='ENOENT')return false;throw error;}
}

export function startPreview({script,args=[],cwd,env,log}){
 const fd=openSync(log,'a',0o600);
 try{
  // A controller exit must not signal its preview or break the preview's stdout.
  const child=spawn(process.execPath,[...args,script],{cwd,env,detached:true,stdio:['ignore',fd,fd]});
  child.unref();return child;
 }finally{closeSync(fd);}
}

export async function previewReady(child,log,offset=0,timeout=300000){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){
  const content=await readFile(log,'utf8').catch(()=>''),match=/PREVIEW_READY (http:\/\/127\.0\.0\.1:\d+)/.exec(content.slice(offset));
  if(match)return match[1];
  if(!liveProcess(child.pid))throw Error('Preview exited before readiness; '+log);
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 throw Error('Preview bootstrap exceeded five minutes; '+log);
}

export const logOffset=async path=>(await stat(path).catch(()=>({size:0}))).size;
