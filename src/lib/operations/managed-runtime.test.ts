import {it,expect} from 'vitest';
import {mkdtemp,mkdir,realpath,writeFile,readFile,symlink,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:http';
import {createServer as createTcpServer} from 'node:net';
import {createHmac,createHash} from 'node:crypto';
import {once} from 'node:events';
import {acquireManagedState,runManagedProcess,runManagedCycle,managedHttpResponse,invokeManagedCommand} from './managed-runtime';
import {signHealthRequest,type ManagedHostConfig} from './managed-host';
import {observeManagedHost,type MonitorConfig} from './monitor';

const source='a'.repeat(40),scope='b7f07d3e-2255-474c-9a28-10c3185f5234',key=Buffer.alloc(32,7).toString('base64url');
const config=(root:string):ManagedHostConfig=>({enabled:true,sourceSha:source,stateDirectory:join(root,'state'),healthKey:key,profiles:[{scopeId:scope,environment:'test',commands:['payroll','notifications-reminders'],stateDirectory:join(root,'state',scope+'-test'),env:{}}]});
it('authenticates the actual health HTTP response with independent request/response HMAC purposes',async()=>{
 const c=config('/tmp/fictional');let wireSignature='',expectedSignature='';
 const server=createServer(async(req,res)=>{
  const request=new Request('http://localhost'+req.url,{headers:Object.fromEntries(Object.entries(req.headers).filter((e):e is [string,string]=>typeof e[1]==='string'))});
  const observations=c.profiles.flatMap(p=>p.commands.map(command=>({scopeId:p.scopeId,environment:p.environment,command,sourceSha:source,observedAt:Date.now(),healthy:true,reason:'ok' as const})));
  const response=managedHttpResponse(request,c,observations,Date.now(),true),body=await response.text();wireSignature=response.headers.get('x-nevora-ops-response')??'';
  expectedSignature=createHmac('sha256',Buffer.from(key,'base64url')).update('NEVORA_WORKFORCE_HEALTH_RESPONSE_V1\n'+request.headers.get('x-nevora-ops-time')+'\n'+request.headers.get('x-nevora-ops-nonce')+'\n'+response.status+'\n'+createHash('sha256').update(body).digest('hex')).digest('hex');
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(body);
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();if(!address||typeof address==='string')throw Error('owned_http_unavailable');
 try{
  const monitor:MonitorConfig={enabled:true,mailEnabled:false,origin:'https://fictional.onrender.com',sourceSha:source,healthKey:key,expectedCommands:2,databaseUrl:'unused',role:'unused'};
  expect(await observeManagedHost(monitor,async(_url,init)=>fetch('http://127.0.0.1:'+address.port+'/private/health',init))).toBe('ok');expect(wireSignature).toHaveLength(64);expect(wireSignature).toBe(expectedSignature);
 }finally{server.closeAllConnections();await new Promise<void>(ok=>server.close(()=>ok()));}
});
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
it('classifies unconfirmed custody without retaining child output or exception text',async()=>{
 const c=config('/tmp/fictional');
 const runFailure=await runManagedCycle(c,new AbortController().signal,async()=>({exitCode:1,started:true,cleanupConfirmed:true,validOutput:false,output:'fictional-private-output'}));
 expect(runFailure.cleanupConfirmed).toBe(false);
 expect(runFailure.failure).toEqual({scopeId:scope,environment:'test',command:'payroll',sourceSha:source,phase:'run',reason:'receipt_unconfirmed',exitCode:1,started:true,processCleanupConfirmed:true,validOutput:false,receiptBound:false,receiptCleanupConfirmed:false});
 const healthFailure=await runManagedCycle(c,new AbortController().signal,async(p,mode,command)=>{
  if(mode==='health')throw Error('fictional-private-error');
  return {exitCode:0,started:true,cleanupConfirmed:true,validOutput:true,output:JSON.stringify({schemaVersion:1,command,scopeId:p.scopeId,environment:p.environment,sourceSha:source,status:'succeeded',cleanupConfirmed:true})};
 });
 expect(healthFailure.cleanupConfirmed).toBe(false);
 expect(healthFailure.failure).toEqual({scopeId:scope,environment:'test',command:'payroll',sourceSha:source,phase:'health',reason:'invocation_exception',exitCode:null,started:null,processCleanupConfirmed:null,validOutput:null,receiptBound:null,receiptCleanupConfirmed:null});
 expect(JSON.stringify([runFailure,healthFailure])).not.toContain('fictional-private');
});
it('releases singleton custody when cancellation wins after admission and before the actual child spawn',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'nevora-managed-admission-')));let lease:Awaited<ReturnType<typeof acquireManagedState>>|undefined;
 try{
  const c=config(root),controller=new AbortController();lease=await acquireManagedState(c);let calls=0;
  const cycle=await runManagedCycle(c,controller.signal,async(_profile,mode,_command,signal)=>{
   expect(mode).toBe('run');calls++;controller.abort();
   return runManagedProcess({file:process.execPath,args:['-e','require("node:fs").writeFileSync(process.argv[1],"unexpected child")',join(root,'unexpected-child')],env:{NODE_ENV:'test'}},signal,1000);
  });
  expect(await readdir(root)).not.toContain('unexpected-child');expect(calls).toBe(1);
  expect(cycle.cleanupConfirmed).toBe(true);expect(cycle.observations).toEqual([]);
  await lease.release(cycle.cleanupConfirmed);const next=await acquireManagedState(c);await next.release(true);
 }finally{await lease?.release(false);await rm(root,{recursive:true,force:true});}
});
it('retains singleton custody after an actual child exits without a trusted receipt even when cancellation follows',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'nevora-managed-started-')));let lease:Awaited<ReturnType<typeof acquireManagedState>>|undefined;
 try{
  const c=config(root),controller=new AbortController();lease=await acquireManagedState(c);
  const cycle=await runManagedCycle(c,controller.signal,async()=>{
   const result=await runManagedProcess({file:process.execPath,args:['-e','require("node:fs").writeFileSync(process.argv[1],"started")',join(root,'actual-child')],env:{NODE_ENV:'test'}},undefined,1000);
   expect(result.cleanupConfirmed).toBe(true);controller.abort();return result;
  });
  expect(await readdir(root)).toContain('actual-child');expect(cycle.cleanupConfirmed).toBe(false);
  await lease.release(cycle.cleanupConfirmed);await expect(acquireManagedState(c)).rejects.toThrow('managed_state_unavailable');
 }finally{await lease?.release(false);await rm(root,{recursive:true,force:true});}
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
it('drains the actual failed CLI receipt before removing shutdown handlers after a control database rejection',async()=>{
 const root=await realpath(await mkdtemp(join(tmpdir(),'nevora-managed-quota-')));
 // Reject the real pg startup on an owned loopback socket. No hosted database,
 // actual credentials or business jobs are used by this regression.
 const database=createTcpServer(socket=>socket.once('data',()=>{
  const fields=Buffer.from('SFATAL\0C53300\0Msynthetic quota exhausted\0\0');
  const header=Buffer.alloc(5);header[0]=69;header.writeInt32BE(fields.length+4,1);socket.end(Buffer.concat([header,fields]));
 }));
 await new Promise<void>(ok=>database.listen(0,'127.0.0.1',ok));
 let lease:Awaited<ReturnType<typeof acquireManagedState>>|undefined;
 try{
  const address=database.address();if(!address||typeof address==='string')throw Error('owned_database_unavailable');
  const c=config(root),p=c.profiles[0];p.commands=['payroll'];
  const env={NEVORA_OPERATIONS_ENABLED:'true',NEVORA_OPERATIONS_SOURCE_SHA:source,NEVORA_OPERATIONS_SCOPE_ID:scope,NEVORA_OPERATIONS_ENVIRONMENT:'test',NEVORA_OPERATIONS_STATE_DIR:p.stateDirectory,NEVORA_OPERATIONS_DEADLINE_SECONDS:'30',NEVORA_PAYROLL_ENABLED:'true',NEVORA_WORKSPACE_MODE:'isolated',NEVORA_WORKER_WORKSPACE_ORIGIN:'http://fictional.portal.localhost',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_PORTAL_BASE_DOMAIN:'portal.localhost',NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64url'),NEVORA_CONTROL_DATABASE_URL:`postgresql://nv_control_worker_t_${scope.replaceAll('-','')}:fictional@127.0.0.1:${address.port}/owned?sslmode=disable`};
  // Model a pending pipe write, then deliver an actual SIGTERM before its
  // completion. This catches removing the CLI's handlers immediately after
  // console.log while its durable failed receipt has already been committed.
  const preload=join(root,'pending-stdout.mjs');await writeFile(preload,`const write=process.stdout.write.bind(process.stdout);process.stdout.write=(chunk,encoding,callback)=>{if(typeof chunk==='string'&&chunk.includes('"cleanupConfirmed":true')){setTimeout(()=>process.kill(process.pid,'SIGTERM'),10);setTimeout(()=>write(chunk,...(typeof encoding==='function'?[encoding]:encoding===undefined?[]:[encoding,callback])),100);return true;}return write(chunk,encoding,callback);};`);
  lease=await acquireManagedState(c);
  const cycle=await runManagedCycle(c,new AbortController().signal,async(_profile,mode,command,signal)=>{
   expect(mode).toBe('run');
   return runManagedProcess({file:process.execPath,args:['--conditions=react-server','--import','./scripts/node-server-context.mjs','--import','tsx','--import',preload,'scripts/workforce-operations.mts',mode,command],env:{PATH:process.env.PATH,NODE_ENV:'test',...env}},signal,3000);
  });
  const receipt=JSON.parse(await readFile(join(p.stateDirectory,'payroll.json'),'utf8'));
  expect(receipt).toMatchObject({command:'payroll',scopeId:scope,sourceSha:source,status:'failed',exitCode:1,cleanupConfirmed:true});
  expect(await readdir(p.stateDirectory)).toEqual(['payroll.json']);
  expect(cycle.observations).toMatchObject([{healthy:false,reason:'invocation_failed'}]);
  expect(cycle.cleanupConfirmed).toBe(true);
  await lease.release(cycle.cleanupConfirmed);
  const restarted=await acquireManagedState(c);await restarted.release(true);
 }finally{await lease?.release(false);await new Promise<void>(ok=>database.close(()=>ok()));await rm(root,{recursive:true,force:true});}
});
