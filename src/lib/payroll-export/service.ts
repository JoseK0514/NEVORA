import {assertOperationalAccess,operationalScopeStatements} from '../company-access/operational-scope.server';
import {createHash} from 'node:crypto';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {assertManagementProof} from '../data/management-session';
import {workspaceReadGuard} from '../data/workspaces';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {readTimecards} from '../timecards/service';
import {parsePeriod,type Period} from '../timecards/project';
import {canonicalPayrollExport,mappedPayrollCsv,neutralProfile,parseExportProfile,type ExportProfile,type CanonicalPayrollExport} from './model';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
import {stableExportJson} from './json';
const digest=(v:unknown)=>createHash('sha256').update(stableExportJson(v)).digest('hex');
function management(proof:SessionMutationProof){assertManagementProof(proof,proof?.employee?.id);if(!['OWNER','MANAGER'].includes(proof.employee.role))throw new Error('Export access denied');}
type CompanyContext=Pick<Awaited<ReturnType<typeof assertOperationalAccess>>,'workspace'|'authority'>;
async function currentCompany(proof:SessionMutationProof,access:CompanyContext,executor:SqlExecutor){
 await executor.transaction([...workspaceReadGuard(access.workspace),{text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},...operationalScopeStatements(proof,access.workspace,{kind:'COMPANY'},access.authority)]);
}
export type SavedExportProfile={id:string;revision:number;profile:ExportProfile};
const saved=(v:unknown):SavedExportProfile=>{if(!object(v)||!uuid(v.id)||!Number.isSafeInteger(v.revision)||Number(v.revision)<1)throw new Error('Invalid saved mapping profile');return {id:v.id,revision:Number(v.revision),profile:parseExportProfile(v.profile)};};
export async function readExportProfiles(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<SavedExportProfile[]>{
 management(proof);const access=await assertOperationalAccess(proof,{kind:'COMPANY'},executor),{workspace,authority}=access,guards=[...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=$1 FOR SHARE',values:[proof.employee.id]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)];
 const result=await executor.transaction([...guards,{text:`SELECT profile_id AS id,revision,profile FROM nevora_payroll_profile_latest WHERE workspace_id=$1 ORDER BY profile_id LIMIT 101`,values:[workspace.id]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)]);
 const rows=result[guards.length]??[];if(rows.length>100)throw new Error('Mapping profile limit');const projected=rows.map(saved);await currentCompany(proof,access,executor);return projected;
}
/** Save a reviewed mapping through the database command function with operation
 * replay and expectedRevision control; current company scope is rechecked on return. */
export async function saveExportProfile(proof:SessionMutationProof,input:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<SavedExportProfile>{
 management(proof);if(!object(input)||!uuid(input.operationId)||!uuid(input.id)||!Number.isSafeInteger(input.expectedRevision)||Number(input.expectedRevision)<0||Object.keys(input).some(k=>!['operationId','id','expectedRevision','profile'].includes(k)))throw new Error('Invalid mapping command');
 const profile=parseExportProfile(input.profile),access=await assertOperationalAccess(proof,{kind:'COMPANY'},executor),{workspace,authority}=access,ids=[...new Set([proof.employee.id,...profile.employeeMappings.map(m=>m.employeeId)])].sort();
 const guards=[...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[ids]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)];
 const result=await executor.transaction([...guards,{text:'SELECT nevora_payroll_profile_command($1,$2,$3::uuid,$4::uuid,$5::integer,$6,$7::jsonb) AS result',values:[workspace.id,proof.employee.id,input.operationId,input.id,input.expectedRevision,digest({...input,profile}),JSON.stringify(profile)]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)]);
 const row=result[guards.length]?.[0] as {result:unknown};const projected=saved(row?.result);await currentCompany(proof,access,executor);return projected;
}
export type ExportCommand=Period&{operationId:string;profileId:string|null;profileRevision:number;cards:{employeeId:string;revision:number;sourceHash:string;finalizationOperationId:string}[]};
export function parseExportCommand(v:unknown):ExportCommand{
 if(!object(v)||!uuid(v.operationId)||!(v.profileId===null||uuid(v.profileId))||!Number.isSafeInteger(v.profileRevision)||Number(v.profileRevision)<0||!Array.isArray(v.cards)||v.cards.length<1||v.cards.length>100||Object.keys(v).some(k=>!['operationId','profileId','profileRevision','startDate','endDate','cards'].includes(k)))throw new Error('Invalid export command');
 if(v.profileId===null&&v.profileRevision!==0)throw new Error('Invalid neutral profile');
 const cards=v.cards.map(c=>{if(!object(c)||typeof c.employeeId!=='string'||!c.employeeId||c.employeeId.length>200||!Number.isSafeInteger(c.revision)||Number(c.revision)<1||!hash(c.sourceHash)||!uuid(c.finalizationOperationId)||Object.keys(c).length!==4)throw new Error('Review finalized employee revisions');return {employeeId:c.employeeId,revision:Number(c.revision),sourceHash:c.sourceHash,finalizationOperationId:c.finalizationOperationId};});
 if(new Set(cards.map(c=>c.employeeId)).size!==cards.length)throw new Error('Duplicate export employees');
 return {...parsePeriod(String(v.startDate),String(v.endDate)),operationId:v.operationId,profileId:v.profileId,profileRevision:Number(v.profileRevision),cards:cards.sort((a,b)=>a.employeeId.localeCompare(b.employeeId))};
}
export type PayrollExportPayload={operationId:string;model:CanonicalPayrollExport;profile:ExportProfile;profileId:string|null;profileRevision:number;csv:string;csvSha256:string;canonicalSha256:string};
function payload(value:unknown,command:ExportCommand):PayrollExportPayload{
 if(!object(value)||value.operationId!==command.operationId||typeof value.csv!=='string'||typeof value.csvSha256!=='string'||typeof value.canonicalSha256!=='string'||!object(value.model)||value.model.version!==1||!Array.isArray(value.model.rows)||value.profileId!==command.profileId||value.profileRevision!==command.profileRevision||createHash('sha256').update(value.csv).digest('hex')!==value.csvSha256||digest(value.model)!==value.canonicalSha256)throw new Error('Export receipt could not be verified');
 parseExportProfile(value.profile);return value as PayrollExportPayload;
}
/** Create/recover an actor-scoped export receipt under current company authority.
 * Every selected card binds revision, source hash and finalization operation; profile
 * revision and payload fingerprints must also match before CSV is returned. This
 * records an export, without submitting it to a payroll provider. */
export async function createPayrollExport(proof:SessionMutationProof,input:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<PayrollExportPayload>{
 management(proof);const command=parseExportCommand(input),commandHash=digest(command),access=await assertOperationalAccess(proof,{kind:'COMPANY'},executor),{workspace,authority}=access,ids=[...new Set([proof.employee.id,...command.cards.map(c=>c.employeeId)])].sort();
 const guards=[...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[ids]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)];
 const existing=await executor.transaction([...guards,{text:'SELECT command_hash AS hash,payload FROM payroll_export_receipts WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3::uuid',values:[workspace.id,proof.employee.id,command.operationId]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)]);
 const receipt=existing[guards.length]?.[0] as {hash:string;payload:unknown}|undefined;if(receipt){if(receipt.hash!==commandHash)throw new Error('nevora_export_CONFLICT');const verified=payload(receipt.payload,command);await currentCompany(proof,access,executor);return verified;}
 const cards=await readTimecards(proof,command,executor);if(cards.state!=='ready')throw new Error('Timecards unavailable');
 const model=canonicalPayrollExport(workspace.id,cards.observedAt,command,cards.cards,command.cards.map(c=>c.employeeId));
 if(model.rows.some(r=>{const expected=command.cards.find(c=>c.employeeId===r.employeeId)!;return r.revision!==expected.revision||r.sourceHash!==expected.sourceHash||r.finalizationOperationId!==expected.finalizationOperationId;}))throw new Error('nevora_export_CONFLICT');
 let profile=neutralProfile();if(command.profileId){const available=await readExportProfiles(proof,executor),selected=available.find(p=>p.id===command.profileId);if(!selected||selected.revision!==command.profileRevision)throw new Error('nevora_export_CONFLICT');profile=selected.profile;}
 const csv=mappedPayrollCsv(model,profile),generated:PayrollExportPayload={operationId:command.operationId,model,profile,profileId:command.profileId,profileRevision:command.profileRevision,csv,csvSha256:createHash('sha256').update(csv).digest('hex'),canonicalSha256:digest(model)};
 const results=await executor.transaction([...guards,{text:'SELECT nevora_payroll_export_command($1,$2,$3::uuid,$4,$5::uuid,$6::integer,$7::jsonb) AS result',values:[workspace.id,proof.employee.id,command.operationId,commandHash,command.profileId,command.profileRevision,JSON.stringify(generated)]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)]);
 const result=results[guards.length]?.[0] as {result:unknown}|undefined;const verified=payload(result?.result,command);await currentCompany(proof,access,executor);return verified;
}
