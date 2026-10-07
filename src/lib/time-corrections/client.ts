import {
  parseEmployeeTimeCorrections,
  parseManagerTimeCorrections,
  type EmployeeTimeCorrections,
  type ManagerTimeCorrections,
} from './read-model';
import type { CorrectionRequestCommand, CorrectionReviewCommand } from './validation';

export type CorrectionActionResponse =
  | {state:'pending';operationId:string;requestId:string;revision:number}
  | {state:'approved';operationId:string;requestId:string;revision:number;adjustmentId:string}
  | {state:'rejected';operationId:string;requestId:string;revision:number}
  | {state:'blocked';reason:'self_review'|'stale_source'|'overlap'|'live_state'|'invalid_interval'}
  | {state:'conflict'}
  | {state:'outcome_unknown';operationId:string}
  | {state:'invalid'}
  | {state:'unavailable'};

const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const revision=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=1;

function action(value:unknown):CorrectionActionResponse{
  if(!object(value)||typeof value.state!=='string')throw new Error('Invalid correction response');
  if(value.state==='conflict'||value.state==='invalid'||value.state==='unavailable')return {state:value.state};
  if(value.state==='blocked'&&['self_review','stale_source','overlap','live_state','invalid_interval'].includes(String(value.reason))){
    return {state:'blocked',reason:value.reason as Extract<CorrectionActionResponse,{state:'blocked'}>['reason']};
  }
  if(value.state==='outcome_unknown'&&uuid(value.operationId))return {state:'outcome_unknown',operationId:value.operationId};
  if(['pending','approved','rejected'].includes(value.state)&&uuid(value.operationId)&&uuid(value.requestId)&&revision(value.revision)){
    if(value.state==='approved'){
      if(!uuid(value.adjustmentId))throw new Error('Invalid correction response');
      return {state:'approved',operationId:value.operationId,requestId:value.requestId,revision:value.revision,adjustmentId:value.adjustmentId};
    }
    return {state:value.state as 'pending'|'rejected',operationId:value.operationId,requestId:value.requestId,revision:value.revision};
  }
  throw new Error('Invalid correction response');
}

async function get(path:string,signal:AbortSignal){
  const response=await fetch(path,{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal,headers:{
    Accept:'application/json','X-Nevora-Time-Correction':'1',
  }});
  if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'} as const;
  if(!response.ok)throw new Error('Correction data is unavailable');
  return response.json();
}

async function post(path:string,body:CorrectionRequestCommand|CorrectionReviewCommand):Promise<CorrectionActionResponse>{
  const response=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{
    Accept:'application/json','Content-Type':'application/json','X-Nevora-Time-Correction':'1',
  },body:JSON.stringify(body)});
  if(response.status===401||response.status===403)return {state:'unavailable'};
  const payload=await response.json().catch(()=>({state:'unavailable'}));
  try{return action(payload);}catch{return {state:'unavailable'};}
}

export async function fetchEmployeeTimeCorrections(signal:AbortSignal):Promise<EmployeeTimeCorrections>{
  return parseEmployeeTimeCorrections(await get('/api/employee/time-corrections',signal));
}
export async function submitEmployeeTimeCorrection(command:CorrectionRequestCommand):Promise<CorrectionActionResponse>{
  return post('/api/employee/time-corrections',command);
}
export async function fetchManagerTimeCorrections(signal:AbortSignal):Promise<ManagerTimeCorrections>{
  return parseManagerTimeCorrections(await get('/api/manager/time-corrections',signal));
}
export async function reviewManagerTimeCorrection(command:CorrectionReviewCommand):Promise<CorrectionActionResponse>{
  return post('/api/manager/time-corrections',command);
}
