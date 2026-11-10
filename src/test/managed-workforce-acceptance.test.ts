import {expect,it} from 'vitest';
import {createServer} from 'node:net';
import {spawn,type SpawnOptions} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {readManagedStartupObservation} from '../../scripts/managed-workforce-acceptance-observer.mts';

const observer=resolve('scripts/managed-workforce-acceptance-observer.mts');
async function childRun(script:string,preload=true){
 const dir=await mkdtemp(join(tmpdir(),'nv-managed-startup-'));
 try{
  const file=join(dir,'fixture.mjs');await writeFile(file,script);
  const options:SpawnOptions={env:{PATH:process.env.PATH,NODE_ENV:'test'},stdio:['ignore','pipe','pipe','ipc']};
  const child=spawn(process.execPath,[...(preload?['--import',observer]:[]),file],options);
  if(!child.stdout||!child.stderr)throw Error('owned child pipes missing');
  const messages:unknown[]=[];let stdout='',stderr='';
  child.on('message',message=>messages.push(message));child.stdout.on('data',chunk=>{stdout+=chunk;});child.stderr.on('data',chunk=>{stderr+=chunk;});
  const code=await new Promise<number|null>((ok,bad)=>{const timer=setTimeout(()=>{child.kill('SIGKILL');bad(Error('owned child deadline'));},5000);child.once('error',error=>{clearTimeout(timer);bad(error);});child.once('close',value=>{clearTimeout(timer);ok(value);});});
  return {code,stdout,stderr,messages};
 }finally{await rm(dir,{recursive:true,force:true});}
}
it('captures an actual occupied-port startup failure without changing the original exit or disclosing diagnostics',async()=>{
 const blocker=createServer();await new Promise<void>((ok,bad)=>{blocker.once('error',bad);blocker.listen(0,'127.0.0.1',ok);});
 try{
  const address=blocker.address();if(!address||typeof address==='string')throw Error('owned port missing');
  const script=`import {createServer} from 'node:net';const server=createServer();server.once('error',()=>{console.error('managed_workforce_unavailable');process.exitCode=1;});server.listen(${address.port},'127.0.0.1');`;
  const baseline=await childRun(script,false),observed=await childRun(script);
  expect(baseline).toEqual({code:1,stdout:'',stderr:'managed_workforce_unavailable\n',messages:[]});
  expect({...observed,messages:[]}).toEqual({...baseline,messages:[]});
  expect(observed.messages).toEqual([{version:1,kind:'server_error',code:'EADDRINUSE'}]);
 }finally{await new Promise<void>(ok=>blocker.close(()=>ok()));}
});
it('observes real listening while preserving listener counts, HTTP response and cleanup',async()=>{
 const result=await childRun(`import {createServer} from 'node:http';const server=createServer((_req,res)=>res.end('owned-response'));server.listen(0,'127.0.0.1',async()=>{const response=await fetch('http://127.0.0.1:'+server.address().port);if(await response.text()!=='owned-response'||server.listenerCount('error')!==0)throw Error('observational behavior changed');server.close();server.closeAllConnections();});`);
 expect(result).toEqual({code:0,stdout:'',stderr:'',messages:[{version:1,kind:'listening'}]});
});
it('bounds unknown and repeated server errors without leaking error text, custom codes or data',async()=>{
 const result=await childRun(`import {Server} from 'node:net';const server=new Server();server.on('error',()=>{});for(let i=0;i<10;i++)server.emit('error',Object.assign(Error('fictional-sensitive-body'),{code:'PRIVATE_VALUE',address:'fictional-sensitive-address'}));`);
 expect(result.messages).toEqual([{version:1,kind:'server_error',code:'OTHER'}]);expect(result.stdout+result.stderr+JSON.stringify(result.messages)).not.toContain('fictional-sensitive');
});
it('does not convert an unhandled server error or pre-listener failure into success',async()=>{
 for(const script of [`import {Server} from 'node:net';new Server().emit('error',Object.assign(Error('owned failure'),{code:'EACCES'}));`,`throw Error('owned pre-listener failure');`]){
  const baseline=await childRun(script,false),observed=await childRun(script);
  expect(baseline.code).toBe(1);expect(observed.code).toBe(1);expect(observed.stdout).toBe('');
  if(script.startsWith('throw'))expect(observed.messages).toEqual([]);
 }
});
it('closed observer IPC cannot change actual server listening or shutdown',async()=>{
 const result=await childRun(`import {createServer} from 'node:net';process.disconnect();const server=createServer();server.listen(0,'127.0.0.1',()=>server.close());`);
 expect(result).toEqual({code:0,stdout:'',stderr:'',messages:[]});
});
it('rejects malformed or widened IPC observations and import alone does not patch the parent',async()=>{
 expect(readManagedStartupObservation({version:1,kind:'listening'})).toEqual({version:1,kind:'listening'});
 expect(readManagedStartupObservation({version:1,kind:'server_error',code:'EADDRINUSE'})).toEqual({version:1,kind:'server_error',code:'EADDRINUSE'});
 for(const value of [null,[],{version:1,kind:'listening',extra:'private'},{version:1,kind:'server_error',code:'PRIVATE_VALUE'},{version:2,kind:'listening'}])expect(readManagedStartupObservation(value)).toBeNull();
 const result=await childRun(`import {Server} from 'node:net';const emit=Server.prototype.emit;await import(${JSON.stringify(observer)});if(Server.prototype.emit!==emit)throw Error('Normal import patched Server');`,false);
 expect(result).toEqual({code:0,stdout:'',stderr:'',messages:[]});
});
