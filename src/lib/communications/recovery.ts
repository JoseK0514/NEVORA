import type {CommandResult} from './types';
export type CommunicationNotice='conflict'|'unknown'|'signed-out'|'blocked'|'unavailable'|'committed'|null;
export type CommunicationRecoveryState={pending:boolean;notice:CommunicationNotice;hasUnknown:boolean;canRetry:boolean};

function matchesReceipt(result:Extract<CommandResult,{status:'committed'}>,command:unknown,operationId:string|null){
 if(result.operationId!==operationId||typeof result.id!=='string'||!result.id||typeof result.version!=='string'||!result.version||!command||typeof command!=='object')return false;
 const c=command as Record<string,unknown>,ref=c.ref&&typeof c.ref==='object'?c.ref as Record<string,unknown>:null;
 const id=c.communicationId??ref?.id,version=c.kind==='ACKNOWLEDGE'||c.kind==='WITHDRAW'?c.expectedRevisionId:c.kind==='MARK_READ'?ref?.version:null;
 return (id===undefined||result.id===id)&&(version===null||version===undefined||result.version===version);
}
/** In-memory, authority-scoped recovery lives above disposable private content.
 * Pausing fences completions but keeps the exact original command. Only a fresh
 * authorized view may look it up or explicitly replay it. */
export function createCommunicationRecovery(request:(path:string,body:unknown,signal:AbortSignal)=>Promise<unknown>,changed:(state:CommunicationRecoveryState)=>void,onCommit:(result:Extract<CommandResult,{status:'committed'}>)=>void,onBlocked:()=>void=()=>{}){
 let authorized=false,command:unknown=null,operationId:string|null=null,generation=0,abort:AbortController|null=null;
 let state:CommunicationRecoveryState={pending:false,notice:null,hasUnknown:false,canRetry:false};
 const publish=(patch:Partial<CommunicationRecoveryState>)=>{state={...state,...patch,hasUnknown:operationId!==null};changed({...state});};
 const fence=()=>{generation++;abort?.abort();abort=null;};
 function clear(){fence();command=null;operationId=null;publish({pending:false,notice:null,canRetry:false});}
 async function run(body:unknown,lookup:boolean){
  if(!authorized||state.pending||lookup&&!operationId)return;
  if(!lookup){
   if(!body||typeof body!=='object'||!('operationId'in body))return;
   if(command&&JSON.stringify(command)!==JSON.stringify(body))return;
   command=structuredClone(body);operationId=String(body.operationId);
  }
  const sequence=++generation,controller=new AbortController();abort=controller;publish({pending:true,notice:null,canRetry:false});
  const onAbort=()=>rejectDeadline(Error('Communication request interrupted'));
  let rejectDeadline:(error:Error)=>void=()=>{};
  const deadline=new Promise<never>((_resolve,reject)=>{rejectDeadline=reject;controller.signal.addEventListener('abort',onAbort,{once:true});});
  const timer=setTimeout(()=>controller.abort(),10000);
  try{
   const result=await Promise.race([request(lookup?'/operations/'+operationId:'',lookup?undefined:command,controller.signal),deadline]) as CommandResult;
   if(sequence!==generation||!authorized)return;
   if(result.status==='committed'){
    if(!matchesReceipt(result,command,operationId)){publish({notice:'unknown',canRetry:false});return;}
    command=null;operationId=null;publish({notice:'committed',canRetry:false});onCommit(result);
   }else if(result.status==='conflict'||result.status==='blocked'||'state'in result&&result.state==='unauthorized'){
    command=null;operationId=null;if(result.status!=='conflict')onBlocked();publish({notice:result.status==='conflict'?'conflict':'httpStatus'in result&&result.httpStatus===401?'signed-out':'blocked',canRetry:false});
   }else publish({notice:operationId?'unknown':'unavailable',canRetry:lookup&&result.status==='unavailable'&&result.reason==='operation_not_found'});
  }catch{if(sequence===generation&&authorized)publish({notice:operationId?'unknown':'unavailable',canRetry:false});}
  finally{clearTimeout(timer);controller.signal.removeEventListener('abort',onAbort);if(sequence===generation){abort=null;publish({pending:false});}}
 }
 return {
  snapshot:()=>({...state}),
  authorize(value:boolean){if(value===authorized)return;authorized=value;if(!value){fence();publish({pending:false,notice:operationId?'unknown':state.notice,canRetry:false});}else if(!operationId&&(state.notice==='blocked'||state.notice==='signed-out'))publish({notice:null});},
  send:(body:unknown)=>run(body,false),lookup:()=>run(undefined,true),retry:()=>state.canRetry?run(command,false):Promise.resolve(),clear,
  setNotice(notice:CommunicationNotice){if(!operationId)publish({notice});},
  stop(){authorized=false;clear();},
 };
}
