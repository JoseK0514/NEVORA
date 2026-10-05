import 'server-only';
import { randomUUID } from 'node:crypto';
import type { ClockerOwnerProof } from './devices.server';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { getWorkspace, workspaceReadGuard } from '../data/workspaces';
import { validateBreakType, type BreakType, type BreakTypeInput } from './break-types';

type ErrorCode='FORBIDDEN'|'STALE'|'DUPLICATE'|'INVALID'|'UNAVAILABLE';
const messages:Record<ErrorCode,string>={
 FORBIDDEN:'Only a currently authorized Owner may manage break types.',
 STALE:'This break type changed. Reload before saving.',
 DUPLICATE:'A break type already uses this name. Edit or reactivate the existing type.',
 INVALID:'Check the break name, classification and reference duration.',
 UNAVAILABLE:'Break settings could not be confirmed. Reload before trying again.',
};
export class BreakTypeError extends Error { constructor(public readonly code:ErrorCode){super(messages[code]);this.name='BreakTypeError';} }
const s=(text:string,values:readonly unknown[]=[]):SqlStatement=>({text,values});
const fields='id,name,category,target_minutes AS "targetMinutes",active,version';
function ownerAssertion(proof:ClockerOwnerProof,workspaceId:string){
 return s(`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN employee_sessions ss ON ss.employee_id=e.id
   JOIN locations l ON l.id=e.primary_location_id WHERE e.id=$1 AND e.active AND e.role='OWNER'
   AND ss.token_hash=$2 AND ss.expires_at>clock_timestamp() AND l.workspace_id=$3)
   THEN '1' ELSE 'clocker_break_FORBIDDEN' END)::integer`,[proof.employeeId,proof.sessionTokenHash,workspaceId]);
}
function ownerGuards(proof:ClockerOwnerProof,workspaceId:string):SqlStatement[]{
 if(!proof||typeof proof.employeeId!=='string'||!/^[a-f0-9]{64}$/.test(proof.sessionTokenHash??''))throw new BreakTypeError('FORBIDDEN');
 return [s('SELECT id FROM employees WHERE id=$1 FOR SHARE',[proof.employeeId]),
  s('SELECT token_hash FROM employee_sessions WHERE employee_id=$1 AND token_hash=$2 FOR SHARE',[proof.employeeId,proof.sessionTokenHash]),ownerAssertion(proof,workspaceId)];
}
function normalize(error:unknown):never{
 if(error instanceof BreakTypeError)throw error;
 const message=error instanceof Error?error.message:'';
 for(const code of ['FORBIDDEN','STALE'] as const)if(message.includes('clocker_break_'+code))throw new BreakTypeError(code);
 if(error&&typeof error==='object'&&'code' in error&&error.code==='23505'&&'constraint' in error&&error.constraint==='clocker_break_type_name')throw new BreakTypeError('DUPLICATE');
 throw new BreakTypeError('UNAVAILABLE');
}
export async function listBreakTypes(proof:ClockerOwnerProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<BreakType[]>{
 try{
  const workspace=await getWorkspace(executor);
  const result=await executor.transaction([...workspaceReadGuard(workspace),...ownerGuards(proof,workspace.id),
   s(`SELECT ${fields} FROM clocker_break_types WHERE workspace_id=$1 ORDER BY active DESC,lower(name),id`,[workspace.id])]);
  return result.at(-1) as BreakType[];
 }catch(error){return normalize(error);}
}
export async function saveBreakType(proof:ClockerOwnerProof,input:BreakTypeInput & {id?:string;expectedVersion:number},executor:SqlExecutor=neonNotificationExecutor()):Promise<BreakType>{
 let settings:BreakTypeInput;
 try{settings=validateBreakType({name:input?.name,category:input?.category,targetMinutes:input?.targetMinutes,active:input?.active});}
 catch{throw new BreakTypeError('INVALID');}
 if(!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0||input.expectedVersion>=2147483647||
    (input.id===undefined?input.expectedVersion!==0:typeof input.id!=='string'||!input.id||input.id.length>128||input.expectedVersion<1))throw new BreakTypeError('INVALID');
 const id=input.id??randomUUID(),eventId=randomUUID();
 try{
  const workspace=await getWorkspace(executor);
  const result=await executor.transaction([
   ...workspaceReadGuard(workspace),...ownerGuards(proof,workspace.id),
   ...(input.id?[s('SELECT id FROM clocker_break_types WHERE id=$1 AND workspace_id=$2 FOR UPDATE',[id,workspace.id]),
    s("SELECT (CASE WHEN EXISTS(SELECT 1 FROM clocker_break_types WHERE id=$1 AND workspace_id=$2 AND version=$3) THEN '1' ELSE 'clocker_break_STALE' END)::integer",[id,workspace.id,input.expectedVersion])]:[]),
   input.id?s(`UPDATE clocker_break_types SET name=$1,category=$2,target_minutes=$3,active=$4,version=version+1,updated_by=$5,updated_at=clock_timestamp() WHERE id=$6 AND workspace_id=$7`,[settings.name,settings.category,settings.targetMinutes,settings.active,proof.employeeId,id,workspace.id])
    :s('INSERT INTO clocker_break_types(id,workspace_id,name,category,target_minutes,active,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$7)',[id,workspace.id,settings.name,settings.category,settings.targetMinutes,settings.active,proof.employeeId]),
   s(`INSERT INTO clocker_break_type_events(id,break_type_id,version,actor_employee_id,settings)
     SELECT $1,id,version,$2,jsonb_build_object('id',id,'name',name,'category',category,'targetMinutes',target_minutes,'active',active,'version',version)
     FROM clocker_break_types WHERE id=$3 AND workspace_id=$4`,[eventId,proof.employeeId,id,workspace.id]),
   s("SELECT (CASE WHEN EXISTS(SELECT 1 FROM clocker_break_type_events WHERE id=$1 AND break_type_id=$2 AND version=$3) THEN '1' ELSE 'clocker_break_audit_missing' END)::integer",[eventId,id,input.expectedVersion+1]),
   ownerAssertion(proof,workspace.id),
   s(`SELECT ${fields} FROM clocker_break_types WHERE id=$1 AND workspace_id=$2`,[id,workspace.id]),
  ]);
  const row=result.at(-1)?.[0] as BreakType|undefined;
  if(!row)throw new BreakTypeError('UNAVAILABLE');return row;
 }catch(error){return normalize(error);}
}
