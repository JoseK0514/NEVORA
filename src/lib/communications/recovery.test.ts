import {expect,it,vi} from 'vitest';
import type {CommandResult} from './types';
const command={kind:'PUBLISH',operationId:'11111111-1111-4111-8111-111111111111',authority:'a'.repeat(64),draft:{title:'Fictional private title'},audienceFingerprint:'b'.repeat(64)};
async function subject(){const m=await import('./recovery').catch(()=>null);expect(m?.createCommunicationRecovery).toBeTypeOf('function');return m!.createCommunicationRecovery;}
it('pauses without losing original recovery identity and requires current authority before lookup or replay',async()=>{
 const create=await subject(),requests:{path:string;body:unknown}[]=[],events:unknown[]=[];
 const control=create((path,body)=>{requests.push({path,body});return Promise.reject(Error('Lost response'));},events.push.bind(events),()=>{});
 control.authorize(true);await control.send(command);expect(control.snapshot()).toMatchObject({notice:'unknown',hasUnknown:true});
 control.authorize(false);await control.lookup();await control.retry();expect(requests).toHaveLength(1);
 control.authorize(true);await control.lookup();expect(requests[1]).toEqual({path:'/operations/'+command.operationId,body:undefined});
 expect(control.snapshot()).toMatchObject({notice:'unknown',hasUnknown:true});
});
it('not-found allows only exact original replay and refuses a second publication ID',async()=>{
 const create=await subject(),requests:unknown[]=[];let response:CommandResult={status:'outcome_unknown',operationId:command.operationId};
 const control=create(async(_path,body)=>{requests.push(body);return response;},()=>{},()=>{});control.authorize(true);await control.send(command);
 await control.send({...command,operationId:'22222222-2222-4222-8222-222222222222'});expect(requests).toHaveLength(1);
 response={status:'unavailable',reason:'operation_not_found'};await control.lookup();expect(control.snapshot().canRetry).toBe(true);
 response={status:'committed',id:'result',version:'version',operationId:command.operationId};await control.retry();expect(requests).toEqual([command,undefined,command]);expect(control.snapshot().hasUnknown).toBe(false);
});
it('fences delayed committed responses after pause and recovers only through an authorized lookup',async()=>{
 const create=await subject();let resolve!:(r:CommandResult)=>void,lookup=false;const committed=vi.fn();
 const control=create(()=>lookup?Promise.resolve({status:'committed',id:'result',version:'version',operationId:command.operationId}):new Promise(r=>resolve=r),()=>{},committed);
 control.authorize(true);const pending=control.send(command);control.authorize(false);resolve({status:'committed',id:'stale',version:'version',operationId:command.operationId});await pending;expect(committed).not.toHaveBeenCalled();
 lookup=true;control.authorize(true);await control.lookup();expect(committed).toHaveBeenCalledWith({status:'committed',id:'result',version:'version',operationId:command.operationId});
});
it('clear after proven authority loss removes private command and prevents later replay',async()=>{
 const create=await subject(),request=vi.fn(async()=>({status:'outcome_unknown',operationId:command.operationId} as CommandResult));
 const control=create(request,()=>{},()=>{});control.authorize(true);await control.send(command);control.clear();await control.lookup();await control.retry();expect(request).toHaveBeenCalledTimes(1);expect(control.snapshot()).toMatchObject({hasUnknown:false,pending:false,notice:null,canRetry:false});
});

it('distinguishes a signed-out action from changed permission and clears its command',async()=>{
 const createCommunicationRecovery=await subject();
 for(const [httpStatus,notice] of [[401,'signed-out'],[403,'blocked']] as const){
  const recovery=createCommunicationRecovery(async()=>({state:'unauthorized',httpStatus}),()=>{},()=>{});
  recovery.authorize(true);await recovery.send({operationId:'auth-case'});
  expect(recovery.snapshot()).toMatchObject({pending:false,notice,hasUnknown:false,canRetry:false});
 }
});
it('keeps the original intent unknown when a receipt belongs to a different operation or update',async()=>{
 const create=await subject();
 for(const kind of ['PUBLISH','ACKNOWLEDGE'] as const){
  const onCommit=vi.fn(),original={...command,kind,...(kind==='ACKNOWLEDGE'?{communicationId:'own-update',expectedRevisionId:'own-version'}:{})};
  let response:CommandResult={status:'committed',id:'wrong-update',version:'wrong-version',operationId:'other-operation'};
  const recovery=create(async()=>response,()=>{},onCommit);recovery.authorize(true);await recovery.send(original);
  expect(onCommit).not.toHaveBeenCalled();expect(recovery.snapshot()).toMatchObject({hasUnknown:true,notice:'unknown'});
  if(kind==='ACKNOWLEDGE'){response={status:'committed',id:'wrong-update',version:'own-version',operationId:command.operationId};await recovery.lookup();expect(onCommit).not.toHaveBeenCalled();expect(recovery.snapshot().hasUnknown).toBe(true);}
 }
});
it('bounds a hung transport and keeps the exact original command recoverable instead of remaining pending forever',async()=>{
 const create=await subject();vi.useFakeTimers();const onCommit=vi.fn(),seen:unknown[]=[];let calls=0;
 const control=create(async(path,body)=>{seen.push({path,body});if(calls++===0)return new Promise(()=>{});return {status:'committed',operationId:command.operationId,id:'result',version:'version'};},()=>{},onCommit);
 try{control.authorize(true);void control.send(command);await vi.advanceTimersByTimeAsync(10000);expect(control.snapshot()).toMatchObject({pending:false,hasUnknown:true,notice:'unknown',canRetry:false});expect(onCommit).not.toHaveBeenCalled();await control.lookup();expect(seen).toEqual([{path:'',body:command},{path:'/operations/'+command.operationId,body:undefined}]);expect(onCommit).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0);}finally{control.stop();vi.useRealTimers();}
});

const reviewOriginal={kind:'PUBLISH',operationId:'11111111-1111-4111-8111-111111111111',authority:'a'.repeat(64),draft:{title:'Fictional original'},audienceFingerprint:'b'.repeat(64)};
it.each([{state:'unauthorized',httpStatus:403},{state:'unauthorized',httpStatus:401},{status:'blocked'},{status:'conflict'}])('CR-1 retains unknown reviewOriginal after inconclusive lookup refusal %j',async refusal=>{
 const requests:{path:string;body:unknown}[]=[],onCommit=vi.fn(),blocked=vi.fn();let response:unknown={status:'outcome_unknown',operationId:reviewOriginal.operationId};
 const control=(await subject())(async(path,body)=>{requests.push({path,body});return response;},()=>{},onCommit,blocked);
 try{
  control.authorize(true);await control.send(reviewOriginal);response=refusal;await control.lookup();
  expect(control.snapshot()).toMatchObject({pending:false,hasUnknown:true,canRetry:false,notice:'unknown'});
  await control.send({...reviewOriginal,operationId:'22222222-2222-4222-8222-222222222222'});expect(requests).toHaveLength(2);
  control.authorize(false);await control.lookup();await control.retry();expect(requests).toHaveLength(2);
  response={status:'committed',id:'reviewOriginal-result',version:'reviewOriginal-version',operationId:reviewOriginal.operationId};control.authorize(true);await control.lookup();
  expect(requests).toEqual([{path:'',body:reviewOriginal},{path:'/operations/'+reviewOriginal.operationId,body:undefined},{path:'/operations/'+reviewOriginal.operationId,body:undefined}]);
  expect(onCommit).toHaveBeenCalledExactlyOnceWith(response);expect(control.snapshot().hasUnknown).toBe(false);
 }finally{control.stop();}
});
