import {assertOperationalAccess,operationalScopeStatements} from '../company-access/operational-scope.server';
import {createHash} from 'node:crypto';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {assertManagementProof} from '../data/management-session';
import {workspaceReadGuard} from '../data/workspaces';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {readTimecards} from '../timecards/service';
import {periodInstants} from '../timecards/project';
import {assertReviewedPaidProfile,canonicalPayrollExport,mappedPayrollCsv,neutralPaidProfile,neutralProfile,parseExportProfile,requiresPaidTimeReview,type ExportProfile,type CanonicalPayrollExport} from './model';
import {projectPaidPayrollExport} from './paid-time';
import {parseExportCommand,type ExportCommand} from './command';
import {PayrollExportReviewError} from './errors';
export {parseExportCommand,type ExportCommand} from './command';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
import {stableExportJson} from './json';
const digest=(v:unknown)=>createHash('sha256').update(stableExportJson(v)).digest('hex');
function management(proof:SessionMutationProof){assertManagementProof(proof,proof?.employee?.id);if(!['OWNER','MANAGER'].includes(proof.employee.role))throw new Error('Export access denied');}
type CompanyContext=Pick<Awaited<ReturnType<typeof assertOperationalAccess>>,'workspace'|'authority'>;
async function currentCompany(proof:SessionMutationProof,access:CompanyContext,executor:SqlExecutor){
 await executor.transaction([...workspaceReadGuard(access.workspace),{text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},...operationalScopeStatements(proof,access.workspace,{kind:'COMPANY'},access.authority)]);
}
export type SavedExportProfile={id:string;revision:number;profile:ExportProfile;requiresTimeBasisReview?:true};
const saved=(v:unknown):SavedExportProfile=>{if(!object(v)||!uuid(v.id)||!Number.isSafeInteger(v.revision)||Number(v.revision)<1)throw new Error('Invalid saved mapping profile');const profile=parseExportProfile(v.profile);return {id:v.id,revision:Number(v.revision),profile,...(requiresPaidTimeReview(profile)?{requiresTimeBasisReview:true as const}:{})};};
export async function readExportProfiles(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<SavedExportProfile[]>{
 management(proof);const access=await assertOperationalAccess(proof,{kind:'COMPANY'},executor),{workspace,authority}=access,guards=[...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=$1 FOR SHARE',values:[proof.employee.id]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)];
 const result=await executor.transaction([...guards,{text:`SELECT profile_id AS id,revision,profile FROM nevora_payroll_profile_latest WHERE workspace_id=$1 ORDER BY profile_id LIMIT 101`,values:[workspace.id]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)]);
 const rows=result[guards.length]??[];if(rows.length>100)throw new Error('Mapping profile limit');const projected=rows.map(saved);await currentCompany(proof,access,executor);return projected;
}
/** Save a reviewed mapping through the database command function with operation
 * replay and expectedRevision control; current company scope is rechecked on return. */
export async function saveExportProfile(proof:SessionMutationProof,input:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<SavedExportProfile>{
 management(proof);if(!object(input)||!uuid(input.operationId)||!uuid(input.id)||!Number.isSafeInteger(input.expectedRevision)||Number(input.expectedRevision)<0||Object.keys(input).some(k=>!['operationId','id','expectedRevision','profile'].includes(k)))throw new Error('Invalid mapping command');
 const profile=parseExportProfile(input.profile),commandHash=digest({...input,profile}),access=await assertOperationalAccess(proof,{kind:'COMPANY'},executor),{workspace,authority}=access,ids=[...new Set([proof.employee.id,...profile.employeeMappings.map(m=>m.employeeId)])].sort();
 const guards=[...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[ids]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)];
 if(requiresPaidTimeReview(profile)){
  // Recover the immutable operation revision, not today's latest profile. This
  // lookup has current authority guards and never permits a new legacy write.
  const priorResult=await executor.transaction([...guards,{text:'SELECT profile_id AS id,revision,profile,actor_employee_id AS actor,command_hash AS hash FROM payroll_export_profile_revisions WHERE workspace_id=$1 AND operation_id=$2::uuid',values:[workspace.id,input.operationId]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)]);
  const prior=priorResult[guards.length]?.[0] as {actor:string;hash:string}|undefined;
  if(prior){if(prior.actor!==proof.employee.id||prior.hash!==commandHash)throw new Error('nevora_export_CONFLICT');const projected=saved(prior);await currentCompany(proof,access,executor);return projected;}
  assertReviewedPaidProfile(profile);
 }
 const result=await executor.transaction([...guards,{text:'SELECT nevora_payroll_profile_command($1,$2,$3::uuid,$4::uuid,$5::integer,$6,$7::jsonb) AS result',values:[workspace.id,proof.employee.id,input.operationId,input.id,input.expectedRevision,commandHash,JSON.stringify(profile)]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)]);
 const row=result[guards.length]?.[0] as {result:unknown};const projected=saved(row?.result);await currentCompany(proof,access,executor);return projected;
}
export type PayrollExportPayload={operationId:string;model:CanonicalPayrollExport;profile:ExportProfile;profileId:string|null;profileRevision:number;csv:string;csvSha256:string;canonicalSha256:string};
function payload(value:unknown,command:ExportCommand):PayrollExportPayload{
 if(!object(value)||value.operationId!==command.operationId||typeof value.csv!=='string'||typeof value.csvSha256!=='string'||typeof value.canonicalSha256!=='string'||!object(value.model)||value.model.version!==1||!Array.isArray(value.model.rows)||value.profileId!==command.profileId||value.profileRevision!==command.profileRevision||createHash('sha256').update(value.csv).digest('hex')!==value.csvSha256||digest(value.model)!==value.canonicalSha256)throw new Error('Export receipt could not be verified');
 parseExportProfile(value.profile);const model=value.model as CanonicalPayrollExport;
 try{if(command.paidTime===undefined?model.paidTime!==undefined:stableExportJson(projectPaidPayrollExport(model,command.paidTime))!==stableExportJson(model))throw new Error();}
 catch{throw new Error('Export paid-time receipt could not be verified');}
 return value as PayrollExportPayload;
}
/** Create/recover an actor-scoped export receipt under current company authority.
 * Every selected card binds revision, source hash and finalization operation; profile
 * revision and payload fingerprints must also match before CSV is returned. This
 * records an export, without submitting it to a payroll provider. */
export async function createPayrollExport(proof:SessionMutationProof,input:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<PayrollExportPayload>{
 management(proof);const command=parseExportCommand(input),commandHash=digest(command),access=await assertOperationalAccess(proof,{kind:'COMPANY'},executor),{workspace,authority}=access,ids=[...new Set([proof.employee.id,...command.cards.map(c=>c.employeeId)])].sort();
 const guards=[...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[ids]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)];
 const recover=async()=>{
  const existing=await executor.transaction([...guards,{text:'SELECT command_hash AS hash,payload FROM payroll_export_receipts WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3::uuid',values:[workspace.id,proof.employee.id,command.operationId]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)]);
  const receipt=existing[guards.length]?.[0] as {hash:string;payload:unknown}|undefined;
  if(!receipt)return undefined;
  if(receipt.hash!==commandHash)throw new Error('nevora_export_CONFLICT');
  const verified=payload(receipt.payload,command);await currentCompany(proof,access,executor);return verified;
 };
 const receipt=await recover();if(receipt)return receipt;
 let generated:PayrollExportPayload;
 try{
 // A repeated or skipped local midnight can resolve differently in PostgreSQL
 // and Temporal. A finalized snapshot may already have omitted source entries.
 const {startAt,endAt}=periodInstants(command,workspace.timeZone);
 const [boundary]=await executor.query<{aligned:boolean}>({
  text:`SELECT ($1::date::timestamp AT TIME ZONE $3::text)=$4::timestamptz
    AND (($2::date+1)::timestamp AT TIME ZONE $3::text)=$5::timestamptz AS aligned`,
  values:[command.startDate,command.endDate,workspace.timeZone,startAt,endAt],
 });
 if(!boundary?.aligned)throw new PayrollExportReviewError('PERIOD_BOUNDARY_MISMATCH');
 const cards=await readTimecards(proof,command,executor);if(cards.state!=='ready')throw new Error('Timecards unavailable');
 const model=canonicalPayrollExport(workspace.id,cards.observedAt,command,cards.cards,command.cards.map(c=>c.employeeId),cards.paging,command.paidTime);
 if(model.rows.some(r=>{const expected=command.cards.find(c=>c.employeeId===r.employeeId)!;return r.revision!==expected.revision||r.sourceHash!==expected.sourceHash||r.finalizationOperationId!==expected.finalizationOperationId;}))throw new Error('nevora_export_CONFLICT');
 let profile=command.paidTime?neutralPaidProfile():neutralProfile();if(command.profileId){const available=await readExportProfiles(proof,executor),selected=available.find(p=>p.id===command.profileId);if(!selected||selected.revision!==command.profileRevision)throw new Error('nevora_export_CONFLICT');profile=selected.profile;}
 const csv=mappedPayrollCsv(model,profile);generated={operationId:command.operationId,model,profile,profileId:command.profileId,profileRevision:command.profileRevision,csv,csvSha256:createHash('sha256').update(csv).digest('hex'),canonicalSha256:digest(model)};
 }catch(error){
  // An overlapping identical call can have committed since the initial lookup.
  // Reacquire current authority/employee guards and recover that original before
  // describing a later source/profile refusal as having no operation outcome.
  const concurrent=await recover();if(concurrent)return concurrent;throw error;
 }
 const results=await executor.transaction([...guards,{text:'SELECT nevora_payroll_export_command($1,$2,$3::uuid,$4,$5::uuid,$6::integer,$7::jsonb) AS result',values:[workspace.id,proof.employee.id,command.operationId,commandHash,command.profileId,command.profileRevision,JSON.stringify(generated)]},...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)]);
 const result=results[guards.length]?.[0] as {result:unknown}|undefined;const verified=payload(result?.result,command);await currentCompany(proof,access,executor);return verified;
}

/** QA A3-03 (Nov 21, 2026): a generated export's file could be lost for good. The page clears it when its protected view
 * expires (by design: the CSV carries names and hours), a second export of the same timecards is refused, and the history
 * had no way back to it. The receipt already holds the exact file this person downloaded, so these read it again:
 * only the person's own receipts, under current company access before and after the read, never regenerated, and only
 * when the stored CSV still matches its recorded SHA-256. */
const RECEIPT_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type PayrollExportReceiptSummary={operationId:string;createdAt:string;period:{startDate:string;endDate:string};people:number;csvSha256:string};
function storedPayload(value:unknown,operationId:string):PayrollExportPayload{
 if(!object(value)||value.operationId!==operationId||typeof value.csv!=='string'||typeof value.csvSha256!=='string'||!object(value.model)||value.model.version!==1||!Array.isArray(value.model.rows))
  throw new Error('Export receipt could not be verified');
 if(createHash('sha256').update(value.csv).digest('hex')!==value.csvSha256)throw new Error('Export receipt could not be verified');
 return value as PayrollExportPayload;
}
async function ownReceipts(proof:SessionMutationProof,query:{text:string;values:unknown[]},executor:SqlExecutor){
 management(proof);
 const access=await assertOperationalAccess(proof,{kind:'COMPANY'},executor),{workspace,authority}=access;
 const guards=[...workspaceReadGuard(workspace),...operationalScopeStatements(proof,workspace,{kind:'COMPANY'},authority)];
 const result=await executor.transaction([...guards,{text:query.text,values:[workspace.id,proof.employee.id,...query.values]}]);
 return {rows:(result[guards.length]??[]) as {operation_id:string;created_at:string|Date;payload:unknown}[],recheck:()=>currentCompany(proof,access,executor)};
}
export async function readOwnPayrollExportReceipt(proof:SessionMutationProof,operationId:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<PayrollExportPayload|null>{
 if(!RECEIPT_ID.test(operationId))throw new Error('nevora_export_INVALID_RECEIPT');
 const {rows,recheck}=await ownReceipts(proof,{text:'SELECT operation_id,created_at,payload FROM payroll_export_receipts WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3::uuid',values:[operationId]},executor);
 const verified=rows[0]?storedPayload(rows[0].payload,operationId):null;await recheck();return verified;
}
export async function listOwnPayrollExportReceipts(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<PayrollExportReceiptSummary[]>{
 const {rows,recheck}=await ownReceipts(proof,{text:'SELECT operation_id,created_at,payload FROM payroll_export_receipts WHERE workspace_id=$1 AND actor_employee_id=$2 ORDER BY created_at DESC LIMIT 10',values:[]},executor);
 const summaries=rows.flatMap(row=>{try{const p=storedPayload(row.payload,String(row.operation_id));const model=p.model as CanonicalPayrollExport;
  return [{operationId:String(row.operation_id),createdAt:new Date(row.created_at).toISOString(),period:{startDate:model.period.startDate,endDate:model.period.endDate},people:model.rows.length,csvSha256:p.csvSha256}];}catch{return [];}});
 await recheck();return summaries;
}
