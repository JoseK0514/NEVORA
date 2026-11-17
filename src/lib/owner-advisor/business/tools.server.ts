import 'server-only';
import type { AdvisorStore } from '../store.server';
import { AdvisorStore as Store } from '../store.server';
import { AdvisorError, ADVISOR_MAX_ANSWER_SOURCES, type ToolResult } from '../contracts';
import { businessFlags, captureBusinessContext, type BusinessOrigin } from './context.server';
import { BusinessStore } from './store.server';
import { inspectBusinessEvidence, businessExecution } from './service.server';
import { businessDigest } from './digest.server';
import { businessInspectionId } from './identity.server';
import { businessSourceDigest, decodeBusinessInspection, prepareBusinessInvestigationFence, type StoredBusinessFence } from './fence.server';
import { parseBusinessQuery } from './parse';
import type { BusinessFinanceQuery, BusinessQuery } from './contracts';
import type { BusinessModelEvidence, BusinessInspectionReference } from './model-contracts';
export { businessInspectionId } from './identity.server';
export type BusinessToolRuntime={env:Record<string,string|undefined>;origin:BusinessOrigin};
export async function readBusinessTool(parent:AdvisorStore,call:{name:'business_finance';args:BusinessFinanceQuery}|{name:'business_sales';args:BusinessQuery},runtime:BusinessToolRuntime,budget:{sourceSlots:number;occurrence:number},incoming:AbortSignal):Promise<ToolResult>{
 const {ex,signal}=businessExecution(parent.ex,incoming),advisor=new Store(parent.proof,parent.original,ex),store=new BusinessStore(advisor,runtime.env);
 if(!businessFlags(runtime.env).parent||!businessFlags(runtime.env).retrieval)throw new AdvisorError('disabled');
 if(!Number.isInteger(budget.sourceSlots)||budget.sourceSlots<0||budget.sourceSlots>ADVISOR_MAX_ANSWER_SOURCES)throw new AdvisorError('limit');
 const query=call.name==='business_finance'?parseBusinessQuery(call.args,true):parseBusinessQuery(call.args),queryHash=businessDigest({tool:call.name,args:query});
 const ref:BusinessInspectionReference={inspectionId:businessInspectionId({workspaceId:store.workspaceId,ownerId:store.ownerId,requestId:runtime.origin.requestId,occurrence:budget.occurrence,tool:call.name}),occurrence:budget.occurrence,tool:call.name};
 const result=(model:BusinessModelEvidence):ToolResult=>({observedAt:model.observedAt,partial:model.state!=='ready'||!model.completeScope,sources:model.citations.map(c=>({label:`${c.name} — Owner import (${c.currency})`,href:c.href,observedAt:model.observedAt})),data:{state:model.state,domain:model.domain,reason:model.reason},businessEvidence:[model],businessInspectionRef:ref});
 const existing=await store.peekInspection(ref.inspectionId,signal);
 if(existing){const stored=await store.readInspection(ref.inspectionId,signal);if(stored.state!=='completed')throw new AdvisorError('busy');const {model,fence}=decodeBusinessInspection(stored,ref,runtime.origin.requestId);
  if(stored.query_hash!==queryHash||fence.originHash!==businessDigest(runtime.origin))throw new AdvisorError('conflict');await prepareBusinessInvestigationFence(advisor,[ref],runtime.env,signal,runtime.origin.requestId,[model]);return result(model);}
 const context=await captureBusinessContext(advisor,runtime.origin,runtime.env,signal),originHash=businessDigest(runtime.origin),admission={admission:context,originHash};
 const reserved=await store.reserveInspection(ref.inspectionId,queryHash,admission,signal);
 if(reserved.state==='completed'){const {model}=decodeBusinessInspection(reserved,ref,runtime.origin.requestId);await prepareBusinessInvestigationFence(advisor,[ref],runtime.env,signal,runtime.origin.requestId,[model]);return result(model);}
 const inspected=await inspectBusinessEvidence(advisor,query,runtime.env,signal,{origin:runtime.origin,occurrence:budget.occurrence,sourceSlots:budget.sourceSlots});
 if(businessDigest(inspected.context)!==businessDigest(context))throw new AdvisorError('conflict');
 const model:BusinessModelEvidence={...inspected.result,expiresAt:new Date(Math.min(Date.parse(inspected.result.expiresAt!),Date.parse(reserved.expires_at))).toISOString(),timeZone:advisor.original.workspace.timeZone,queryHash,sourceDigest:businessSourceDigest(inspected.result,advisor.original.workspace.timeZone)};
 if(Buffer.byteLength(JSON.stringify(model))>12288)throw new AdvisorError('limit');
 const fence:StoredBusinessFence={version:1,rootRequestId:runtime.origin.requestId,tool:call.name,query,context,originHash,snapshot:inspected.snapshot,expiresAt:model.expiresAt!,modelHash:businessDigest(model)};
 const guards=[...store.owner(),...businessSnapshotGuardsForTool(store,inspected.snapshot,fence.expiresAt),...businessContextGuardsForTool(advisor,context)];
 await store.completeInspection(ref.inspectionId,model,fence,signal,guards,guards);await prepareBusinessInvestigationFence(advisor,[ref],runtime.env,signal,runtime.origin.requestId,[model]);return result(model);
}
import { businessSnapshotGuards as businessSnapshotGuardsForTool,businessContextGuards as businessContextGuardsForTool } from './context.server';
