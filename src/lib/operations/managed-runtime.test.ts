import {it,expect} from 'vitest';
import {mkdtemp,mkdir,realpath,writeFile,symlink,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {acquireManagedState,runManagedProcess,runManagedCycle,managedHttpResponse,invokeManagedCommand} from './managed-runtime';
import {signHealthRequest,type ManagedHostConfig} from './managed-host';

const source='a'.repeat(40),scope='b7f07d3e-2255-474c-9a28-10c3185f5234',key=Buffer.alloc(32,7).toString('base64url');
const config=(root:string):ManagedHostConfig=>({enabled:true,sourceSha:source,stateDirectory:join(root,'state'),healthKey:key,profiles:[{scopeId:scope,environment:'test',commands:['payroll','notifications-reminders'],stateDirectory:join(root,'state',scope+'-test'),env:{}}]});
it('creates private scoped state, excludes overlap and leaves unconfirmed singleton custody in place',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'nevora-managed-')));
 try{
  const c=config(root),lease=await acquireManagedState(c);
  await expect(acquireManagedState(c)).rejects.toThrow('managed_state_unavailable');
  expect(await readdir(c.stateDirectory)).toEqual(expect.arrayContaining(['host.lock',scope+'-test']));
  await lease.release(false);await expect(acquireManagedState(c)).rejects.toThrow('managed_state_unavailable');
 }finally{await rm(root,{recursive:true,force:true});}
});
it('releases only confirmed own custody and rejects symlinked or public state directories',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'nevora-managed-')));
 try{
  const c=config(root),lease=await acquireManagedState(c);await lease.release(true);
  const second=await acquireManagedState(c);await second.release(true);
  await rm(c.stateDirectory,{recursive:true});await mkdir(join(root,'target'),{mode:0o700});await symlink(join(root,'target'),c.stateDirectory);
  await expect(acquireManagedState(c)).rejects.toThrow('managed_state_unavailable');
  await rm(c.stateDirectory);await mkdir(c.stateDirectory,{mode:0o755});await expect(acquireManagedState(c)).rejects.toThrow('managed_state_unavailable');
 }finally{await rm(root,{recursive:true,force:true});}
});
it('bounds real child output and cancels a real child through SIGTERM without exposing its private stderr',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'nevora-managed-')));
 try{
  const fixture=join(root,'child.cjs');await writeFile(fixture,"process.on('SIGTERM',()=>{console.log(JSON.stringify({cleanupConfirmed:true,status:'interrupted'}));process.exit(1)});console.error('fictional-private');setInterval(()=>{},20)");
  const controller=new AbortController(),started=Date.now();setTimeout(()=>controller.abort(),150);
  const result=await runManagedProcess({file:process.execPath,args:[fixture],env:{PATH:'/bin',NODE_ENV:'test'}},controller.signal,2000);
  expect(result).toMatchObject({exitCode:1,cleanupConfirmed:true});expect(result.output).not.toContain('fictional-private');expect(Date.now()-started).toBeLessThan(2500);
  const flood=await runManagedProcess({file:process.execPath,args:['-e',"process.stdout.write('x'.repeat(100000))"],env:{NODE_ENV:'test'}},undefined,2000);
  expect(flood.output).toBe('');expect(flood.cleanupConfirmed).toBe(true);expect(flood.validOutput).toBe(false);
 }finally{await rm(root,{recursive:true,force:true});}
});
it('serializes fixed run/health commands, isolates observations and stops dispatching on cancellation',async()=>{
 const c=config('/tmp/fictional'),controller=new AbortController(),calls:string[]=[];let concurrent=0;
 const observations=await runManagedCycle(c,controller.signal,async(p,mode,command)=>{
  expect(concurrent++).toBe(0);calls.push(mode+':'+command);await new Promise(r=>setTimeout(r,5));concurrent--;
  if(command==='notifications-reminders'){controller.abort();return {exitCode:1,cleanupConfirmed:true,validOutput:true,output:JSON.stringify({schemaVersion:1,command,scopeId:p.scopeId,environment:p.environment,sourceSha:source,cleanupConfirmed:true,status:'interrupted'})};}
  return {exitCode:0,cleanupConfirmed:true,validOutput:true,output:JSON.stringify(mode==='run'?{schemaVersion:1,command,scopeId:p.scopeId,environment:p.environment,sourceSha:source,status:'succeeded',cleanupConfirmed:true}:{schemaVersion:1,command,scopeId:p.scopeId,environment:p.environment,sourceSha:source,healthy:true})};
 });
 expect(calls).toEqual(['run:payroll','health:payroll','run:notifications-reminders']);expect(observations.cleanupConfirmed).toBe(true);expect(observations.observations).toHaveLength(2);expect(observations.observations[0].healthy).toBe(true);expect(observations.observations[1].healthy).toBe(false);
 const disabled=await runManagedCycle({...c,enabled:false},new AbortController().signal,async()=>{throw Error('must not dispatch');});expect(disabled.observations).toEqual([]);
});
it('never trusts cross-scope health or a successful exit without a confirmed worker receipt',async()=>{
 const c=config('/tmp/fictional');
 for(const output of [JSON.stringify({cleanupConfirmed:true,status:'succeeded'}),JSON.stringify({schemaVersion:1,command:'payroll',scopeId:'foreign',environment:'test',sourceSha:source,status:'succeeded',cleanupConfirmed:true})]){
  const r=await runManagedCycle(c,new AbortController().signal,async()=>({exitCode:0,cleanupConfirmed:true,validOutput:true,output}));expect(r.observations.every(o=>!o.healthy)).toBe(true);expect(r.cleanupConfirmed).toBe(false);
 }
});
it('serves readiness separately and requires authentication even for disabled health',()=>{
 const c=config('/tmp/fictional'),now=1794250000000;
 expect(managedHttpResponse(new Request('https://worker.onrender.com/ready'),c,[],now,true).status).toBe(200);
 expect(managedHttpResponse(new Request('https://worker.onrender.com/private/health'),c,[],now,true).status).toBe(401);
 const response=managedHttpResponse(new Request('https://worker.onrender.com/private/health',{headers:signHealthRequest(key,now,'b'.repeat(32))}),c,[],now,true);expect(response.status).toBe(503);expect(response.headers.get('cache-control')).toBe('no-store');
 expect(managedHttpResponse(new Request('https://worker.onrender.com/ready?command=run'),c,[],now,true).status).toBe(404);
 expect(managedHttpResponse(new Request('https://worker.onrender.com/ready'),c,[],now,false).status).toBe(503);
});
it('runs the actual canonical CLI with a closed payroll gate and retains its structured failure receipt without database access',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'nevora-managed-')));
 try{
  const c=config(root),p=c.profiles[0];await mkdir(p.stateDirectory,{recursive:true,mode:0o700});
  const result=await invokeManagedCommand({...p,env:{NEVORA_OPERATIONS_ENABLED:'true',NEVORA_OPERATIONS_SOURCE_SHA:source,NEVORA_OPERATIONS_SCOPE_ID:scope,NEVORA_OPERATIONS_ENVIRONMENT:'test',NEVORA_OPERATIONS_STATE_DIR:p.stateDirectory,NEVORA_OPERATIONS_DEADLINE_SECONDS:'30',NEVORA_PAYROLL_ENABLED:'false'}},'run','payroll',new AbortController().signal);
  expect(result.cleanupConfirmed).toBe(true);expect(result.exitCode).toBe(1);expect(JSON.parse(result.output)).toMatchObject({command:'payroll',scopeId:scope,sourceSha:source,status:'failed',cleanupConfirmed:true});expect(await readdir(p.stateDirectory)).toEqual(['payroll.json']);
 }finally{await rm(root,{recursive:true,force:true});}
});
