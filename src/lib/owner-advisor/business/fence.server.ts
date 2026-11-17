import 'server-only';
import type { AdvisorStore } from '../store.server';
import { AdvisorError, ADVISOR_MAX_TOOL_CALLS, record } from '../contracts';
import { readFeatureFlags } from '@/lib/feature-flags';
import type { InvestigationFence } from '../investigation-fence.server';
import { BusinessStore, type BusinessInspection } from './store.server';
import { businessFlags, businessContextGuards, businessSnapshotGuards, type BusinessContext, type BusinessSnapshot } from './context.server';
import { businessDigest } from './digest.server';
import { businessInspectionId } from './identity.server';
import { parseBusinessQuery, uuid } from './parse';
import type { BusinessFinanceQuery, BusinessQuery, BusinessReadResult } from './contracts';
import type { BusinessModelEvidence, BusinessInspectionReference, BusinessToolName } from './model-contracts';
export type StoredBusinessFence={version:1;rootRequestId:string;tool:BusinessToolName;query:BusinessQuery|BusinessFinanceQuery;context:BusinessContext;originHash:string;snapshot:BusinessSnapshot;expiresAt:string;modelHash:string};
export function businessSourceDigest(value:BusinessReadResult,timeZone:string):string{return businessDigest({domain:value.domain,window:value.window,selection:value.selection,locationScope:value.locationScope,temporalUse:value.temporalUse,scenario:value.scenario,timeZone,citations:value.citations});}
const conflict=():never=>{throw new AdvisorError('conflict');};
export function decodeBusinessInspection(row:BusinessInspection,ref:BusinessInspectionReference,rootRequestId:string):{model:BusinessModelEvidence;fence:StoredBusinessFence}{
 try{
  if(row.state!=='completed'||!row.result||!record(row.fence)||!record(row.context))return conflict();
  const fence=row.fence as unknown as StoredBusinessFence,model=JSON.parse(row.result) as BusinessModelEvidence;
  if(Object.keys(fence).sort().join(',')!=='context,expiresAt,modelHash,originHash,query,rootRequestId,snapshot,tool,version'||fence.version!==1||fence.rootRequestId!==rootRequestId||fence.tool!==ref.tool||!record(model))return conflict();
  const query=ref.tool==='business_finance'?parseBusinessQuery(fence.query,true):parseBusinessQuery(fence.query);
  if(row.query_hash!==businessDigest({tool:ref.tool,args:query})||model.queryHash!==row.query_hash||businessDigest(model)!==fence.modelHash||model.sourceDigest!==businessSourceDigest(model,model.timeZone)||businessDigest(fence.context)!==businessDigest(row.context.admission)||row.context.originHash!==fence.originHash||!fence.context||!fence.snapshot)return conflict();
  if(model.expiresAt!==fence.expiresAt||Date.parse(fence.expiresAt)>Date.parse(row.expires_at)||!Number.isFinite(Date.parse(fence.expiresAt))||Date.parse(fence.expiresAt)<=Date.now()||Buffer.byteLength(row.result)>12288||model.citations.length>15)return conflict();
  const publicQuery={window:model.window,selection:model.selection,locationScope:model.locationScope,temporalUse:model.temporalUse,...(ref.tool==='business_finance'?{scenario:model.scenario}:{})};
  if(businessDigest(query)!==businessDigest(publicQuery)||model.domain!==(ref.tool==='business_finance'?'FINANCE':'SALES'))return conflict();
  for(const c of model.citations)if(c.href!==`/api/owner/advisor/business/sources/${uuid(c.sourceId)}/versions/${uuid(c.versionId)}`||!/^[a-f0-9]{64}$/.test(c.digest))return conflict();
  return {model,fence};
 }catch(error){if(error instanceof AdvisorError)throw error;return conflict();}
}
/** Read-only receipt validation: no import, reservation, re-calculation or cleanup. */
export async function prepareBusinessInvestigationFence(advisor:AdvisorStore,references:BusinessInspectionReference[],env:Record<string,string|undefined>,signal:AbortSignal,rootRequestId:string,visible:BusinessModelEvidence[]=[]):Promise<InvestigationFence>{
 if(!Array.isArray(references)||!references.length||references.length>=ADVISOR_MAX_TOOL_CALLS||new Set(references.map(r=>r.inspectionId)).size!==references.length)return conflict();
 const store=new BusinessStore(advisor,env),checks=[] as InvestigationFence['before'],models:BusinessModelEvidence[]=[],fences:StoredBusinessFence[]=[];
 for(const ref of references){
  if(!record(ref)||Object.keys(ref).sort().join(',')!=='inspectionId,occurrence,tool'||businessInspectionId({workspaceId:store.workspaceId,ownerId:store.ownerId,requestId:rootRequestId,occurrence:ref.occurrence,tool:ref.tool})!==ref.inspectionId)return conflict();
  const row=await store.readInspection(ref.inspectionId,signal),{model,fence}=decodeBusinessInspection(row,ref,rootRequestId);models.push(model);fences.push(fence);
  checks.push(...businessContextGuards(advisor,fence.context),...businessSnapshotGuards(store,fence.snapshot,fence.expiresAt),{
   text:`SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_business_inspections WHERE workspace_id=$1 AND owner_id=$2 AND inspection_id=$3::uuid AND query_hash=$4 AND authority=$5 AND session_hash=$6 AND state='completed' AND result=$7 AND context=$8::jsonb AND fence=$9::jsonb AND expires_at>clock_timestamp()) THEN '1' ELSE 'advisor_business_inspection_changed' END)::integer`,
   values:[store.workspaceId,store.ownerId,ref.inspectionId,row.query_hash,advisor.original.authority,advisor.proof.sessionTokenHash,row.result,JSON.stringify(row.context),JSON.stringify(row.fence)]});
 }
 if(fences.some(f=>f.snapshot.fingerprint!==fences[0].snapshot.fingerprint)||!Array.isArray(visible)||visible.some(v=>!models.some(m=>businessDigest(m)===businessDigest(v))))return conflict();
 const checkFlags=()=>{const flags=businessFlags(env);if(!flags.parent||!flags.retrieval||fences.some(f=>f.context.knowledgeEnabled!==readFeatureFlags(env).ownerAdvisorKnowledge))return conflict();};
 checkFlags();await store.guarded({text:'SELECT 1',values:[]},signal,checks,checks);checkFlags();
 return {before:[...store.writeGuards(),...checks],after:checks,expiresAt:new Date(Math.min(...fences.map(f=>Date.parse(f.expiresAt)))).toISOString(),checkFlags};
}
