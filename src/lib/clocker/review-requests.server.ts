import 'server-only';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {getWorkspace,workspaceReadGuard} from '../data/workspaces';
import {managementSessionStatements,isManagementAuthorizationError} from '../data/management-session';
import {readCompanyResult} from '../company-access/company-result.server';
import {clockerIdentityWriteGuards,type ClockerIdentityProof} from './pin-identity.server';
import {parseCommandId} from './punch-command';
export class ClockerReviewError extends Error{
 constructor(readonly code:'INVALID'|'FORBIDDEN'|'CONFLICT'|'UNAVAILABLE'){super(code==='INVALID'?'Use the original review and action references.':code==='FORBIDDEN'?'Verify your current access before continuing.':code==='CONFLICT'?'This review reference already belongs to another request.':'The review request could not be confirmed. Keep its original reference.');}
}
const sql=(text:string,values:readonly unknown[]=[]):SqlStatement=>({text,values});
const assert=(condition:string,values:readonly unknown[],code:'FORBIDDEN'|'CONFLICT')=>sql(`SELECT (CASE WHEN ${condition} THEN '1' ELSE 'clocker_review_${code}' END)::integer`,values);
export function parseClockerReviewRequest(value:unknown):{requestId:string;commandId:string|null}{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2||!('requestId'in value)||!('commandId'in value))throw new ClockerReviewError('INVALID');
 try{return {requestId:parseCommandId(value.requestId),commandId:value.commandId===null?null:parseCommandId(value.commandId)};}catch{throw new ClockerReviewError('INVALID');}
}
function normalized(error:unknown):ClockerReviewError{
 if(error instanceof ClockerReviewError)return error;const message=error instanceof Error?error.message:'';
 if(message.includes('clocker_review_CONFLICT'))return new ClockerReviewError('CONFLICT');
 if(message.includes('clocker_review_FORBIDDEN')||message.includes('clocker_pin_IDENTITY_INVALID')||message.includes('clocker_device_')||isManagementAuthorizationError(error))return new ClockerReviewError('FORBIDDEN');
 return new ClockerReviewError('UNAVAILABLE');
}
export async function requestClockerReview(proof:ClockerIdentityProof,value:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<{state:'saved';requestId:string}>{
 const input=parseClockerReviewRequest(value);
 if(!proof?.device)throw new ClockerReviewError('FORBIDDEN');
 try{
  await executor.transaction([...clockerIdentityWriteGuards(proof),
   assert(`NOT EXISTS(SELECT 1 FROM clocker_command_ledger WHERE command_id=$1::uuid AND (employee_id<>$2 OR device_id<>$3))`,[input.commandId,proof.employeeId,proof.device.deviceId],'FORBIDDEN'),
   sql(`INSERT INTO clocker_review_requests(request_id,workspace_id,device_id,requester_id,location_id,command_id)
    VALUES($1::uuid,$2,$3,$4,$5,$6::uuid) ON CONFLICT(request_id) DO NOTHING`,[input.requestId,proof.device.workspaceId,proof.device.deviceId,proof.employeeId,proof.device.locationId,input.commandId]),
   assert(`EXISTS(SELECT 1 FROM clocker_review_requests WHERE request_id=$1::uuid AND workspace_id=$2 AND device_id=$3 AND requester_id=$4 AND location_id=$5 AND command_id IS NOT DISTINCT FROM $6::uuid)`,[input.requestId,proof.device.workspaceId,proof.device.deviceId,proof.employeeId,proof.device.locationId,input.commandId],'CONFLICT'),
   ...clockerIdentityWriteGuards(proof)]);
  return {state:'saved',requestId:input.requestId};
 }catch(error){throw normalized(error);}
}
export type OwnerReviewRequest={requestId:string;commandId:string|null;requesterId:string;requesterName:string;deviceName:string;locationName:string;requestedAt:string};
export type OwnerReviewRequestPage={requests:OwnerReviewRequest[];nextCursor:string|null;observedAt:string;validForMs:number};
export type OwnerReviewRequestsResult=({state:'ready'}&OwnerReviewRequestPage)|{state:'unavailable';reason:string};
function readQuery(input:{cursor?:string;limit?:number}){
 if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['cursor','limit'].includes(k)))throw new ClockerReviewError('INVALID');
 const limit=input.limit??50;if(!Number.isInteger(limit)||limit<1||limit>100)throw new ClockerReviewError('INVALID');
 let after:{requestedAt:string;requestId:string}|null=null;
 if(input.cursor!==undefined){try{
  if(typeof input.cursor!=='string'||input.cursor.length>512||!/^[A-Za-z0-9_-]+$/.test(input.cursor))throw Error();const value:unknown=JSON.parse(Buffer.from(input.cursor,'base64url').toString('utf8'));
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==2||!('requestedAt'in value)||!('requestId'in value)||typeof value.requestedAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(value.requestedAt)||!Number.isFinite(Date.parse(value.requestedAt)))throw Error();
  after={requestedAt:value.requestedAt,requestId:parseCommandId(value.requestId)};
 }catch{throw new ClockerReviewError('INVALID');}}
 return {limit,after};
}
export async function listClockerReviewRequests(proof:SessionMutationProof,input:{cursor?:string;limit?:number},executor:SqlExecutor=neonNotificationExecutor()):Promise<OwnerReviewRequestsResult>{
 const query=readQuery(input);
 return readCompanyResult(proof,async():Promise<OwnerReviewRequestsResult>=>{
  if(proof?.employee?.role!=='OWNER')return {state:'unavailable',reason:'access_denied'};
  try{
   const workspace=await getWorkspace(executor),guards=[...workspaceReadGuard(workspace),...managementSessionStatements(proof,proof.employee.id,['OWNER'])];
   const rows=await executor.transaction([...guards,sql(`SELECT r.request_id::text AS "requestId",r.command_id::text AS "commandId",r.requester_id AS "requesterId",
    trim(e.first_name||' '||e.last_name) AS "requesterName",d.name AS "deviceName",l.name AS "locationName",
    to_char(r.requested_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "requestedAt"
    FROM clocker_review_requests r JOIN employees e ON e.id=r.requester_id JOIN clocker_devices d ON d.id=r.device_id JOIN locations l ON l.id=r.location_id
    WHERE r.workspace_id=$1 AND ($2::timestamptz IS NULL OR (r.requested_at,r.request_id)<($2::timestamptz,$3::uuid))
    ORDER BY r.requested_at DESC,r.request_id DESC LIMIT $4`,[workspace.id,query.after?.requestedAt??null,query.after?.requestId??null,query.limit+1]),sql('SELECT clock_timestamp()::text AS "observedAt"'),...guards]);
   const all=rows[guards.length] as OwnerReviewRequest[],observedAt=(rows[guards.length+1][0] as {observedAt:string}).observedAt,requests=all.slice(0,query.limit),last=requests.at(-1);
   const authority=await executor.query<{remaining:number}>(sql(`SELECT floor(LEAST(15000,EXTRACT(epoch FROM(s.expires_at-clock_timestamp()))*1000,15000-EXTRACT(epoch FROM(clock_timestamp()-$3::timestamptz))*1000))::integer AS remaining FROM employee_sessions s JOIN employees e ON e.id=s.employee_id
    WHERE s.token_hash=$1 AND e.id=$2 AND e.active AND e.role='OWNER' AND s.expires_at>clock_timestamp()`,[proof.sessionTokenHash,proof.employee.id,observedAt]));
   if(!authority[0]||authority[0].remaining<1)return {state:'unavailable',reason:'access_denied'};
   const nextCursor=all.length>query.limit&&last?Buffer.from(JSON.stringify({requestedAt:last.requestedAt,requestId:last.requestId})).toString('base64url'):null;
   return {state:'ready',requests,nextCursor,observedAt,validForMs:authority[0].remaining};
  }catch(error){return {state:'unavailable',reason:normalized(error).code==='FORBIDDEN'?'access_denied':'read_failed'};}
 },executor);
}
