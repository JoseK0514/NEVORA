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
