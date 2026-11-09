import 'server-only';
import type {SqlExecutor} from '../notifications/types';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {workspaceReadGuard} from '../data/workspaces';
import {operationalScopeStatements} from '../company-access/operational-scope.server';
import type {ClockerOwnerProof} from './devices.server';
import {ClockerPinError,pinActorGuards,pinBatch,pinManagementAccess,statement} from './pin-authority.server';
export type OwnerPinStatus={employeeId:string;firstName:string;lastName:string;active:boolean;configured:boolean;version:number};
async function context(proof:ClockerOwnerProof,employeeId:string,executor:SqlExecutor){
 const access=await pinManagementAccess(proof,executor),workspace=access.workspace;
 return {workspaceId:workspace.id,guards:()=>[...workspaceReadGuard(workspace),...pinActorGuards(proof,employeeId,workspace.id,false),...operationalScopeStatements(access.proof,workspace,{kind:'COMPANY'},access.authority)]};
}
export async function listOwnerClockerPinStatuses(proof:ClockerOwnerProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<OwnerPinStatus[]>{
 const {guards,workspaceId}=await context(proof,proof.employeeId,executor),before=guards();
 const result=await pinBatch(executor,[...before,statement(`SELECT e.id AS "employeeId",e.first_name AS "firstName",e.last_name AS "lastName",e.active,
 p.employee_id IS NOT NULL AS configured,COALESCE(p.version,0) AS version
 FROM employees e JOIN locations l ON l.id=e.primary_location_id JOIN workspaces w ON w.id=l.workspace_id
 LEFT JOIN employee_clocker_pins p ON p.employee_id=e.id AND p.workspace_id=w.id
 WHERE w.id=$1 ORDER BY e.last_name,e.first_name,e.id`,[workspaceId]),...guards()]);
 await pinBatch(executor,guards());return result[before.length] as OwnerPinStatus[];
}
export type PinOperationResult={state:'recorded';version:number;currentVersion:number}|{state:'unknown'};
export async function readClockerPinOperation(proof:ClockerOwnerProof,employeeId:string,operationId:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<PinOperationResult>{
 if(typeof operationId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId))throw new ClockerPinError('INVALID');
 const {guards,workspaceId}=await context(proof,employeeId,executor),before=guards();
 const result=await pinBatch(executor,[...before,statement(`SELECT ev.pin_version AS version,p.version AS "currentVersion" FROM clocker_pin_events ev
 JOIN employee_clocker_pins p ON p.employee_id=ev.employee_id JOIN employees e ON e.id=ev.employee_id JOIN locations l ON l.id=e.primary_location_id
 JOIN workspaces w ON w.id=l.workspace_id AND p.workspace_id=w.id
 WHERE ev.operation_id=$1::uuid AND ev.employee_id=$2 AND w.id=$3`,[operationId,employeeId,workspaceId]),...guards()]);
 await pinBatch(executor,guards());const row=result[before.length]?.[0] as {version:number;currentVersion:number}|undefined;
 return row?{state:'recorded',...row}:{state:'unknown'};
}
