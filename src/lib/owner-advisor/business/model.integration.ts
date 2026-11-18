import { companyKnowledgeService } from '../company-knowledge.server';
import { ownerDecision, decisionReply } from '@/test/fixtures/owner-decision';
import { weeklyMemoryAdmission } from '../weekly-context.server';
import { emptyMemory } from '../memory';
import { prepareBusinessInvestigationFence } from './fence.server';
import { afterEach, beforeEach, expect, it, rs } from '@rstest/core';
import { randomUUID } from 'node:crypto';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { fictionalBusinessInput, businessJanuary } from '@/test/fixtures/rondo-business';
import { businessSourceService } from './service.server';
import { advisorService } from '../service.server';
import { AdvisorStore } from '../store.server';
import { admitOwner } from '../authority.server';
import { readBusinessTool } from './tools.server';
import { businessInspectionId } from './identity.server';
import type { SqlExecutor } from '@/lib/notifications/types';
let f:Awaited<ReturnType<typeof companyAccessFixture>>;let sourceId:string;
const env={NEVORA_OWNER_ADVISOR_ENABLED:'true',NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED:'true',NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED:'true',NEVORA_OWNER_ADVISOR_PROVIDER:'openai',NEVORA_OWNER_ADVISOR_DATA_APPROVED:'true',NEVORA_OWNER_ADVISOR_MODEL:'fictional',NEVORA_OWNER_ADVISOR_DAILY_LIMIT:'100',OPENAI_API_KEY:'fictional'};
const signal=()=>new AbortController().signal;
const business=(value?:unknown,settings:Record<string,string|undefined>=env)=>businessSourceService(f.owner,f.db.executor,settings,signal(),value);
beforeEach(async()=>{f=await companyAccessFixture();rs.spyOn(globalThis,'fetch').mockRejectedValue(Error('No real provider requests'));
 const staged=await business({op:'stage_source_version',requestId:randomUUID(),format:'JSON',input:fictionalBusinessInput()});sourceId=staged.receipt!.sourceId!;
 const read=await business({op:'read_source_version',requestId:randomUUID(),sourceId,versionId:staged.receipt!.versionId});await business({op:'publish_source_version',requestId:randomUUID(),sourceId,versionId:staged.receipt!.versionId,expectedRevision:read.receipt!.revision,digest:read.version!.digest,readReceiptId:read.readReceiptId,acknowledged:true});});
afterEach(async()=>{rs.restoreAllMocks();await f?.db.dispose();});
const query=()=>({window:businessJanuary,selection:{kind:'SOURCE' as const,sourceId},locationScope:{kind:'ALL' as const},temporalUse:'HISTORICAL' as const,scenario:null});
const command=()=>({op:'ask',requestId:randomUUID(),message:'Inspect the reported finance snapshot. Do not execute business actions.'});
const prose=()=>Response.json({output:[{type:'message',content:[{type:'output_text',text:'The reported snapshot is historical. Review its evidence before deciding.'}]}]});
function scripted(onSecond?:()=>Promise<void>){let count=0;return rs.fn(async(_url:string,init:RequestInit)=>{count++;const body=JSON.parse(String(init.body));expect(body.tools.some((t:{name:string})=>t.name==='business_finance')).toBe(true);expect(body.tools.some((t:{name:string})=>t.name==='business_sales')).toBe(true);
 if(count===1)return Response.json({output:[{type:'function_call',name:'business_finance',call_id:'finance-1',arguments:JSON.stringify(query())}]});if(onSecond)await onSecond();return prose();});}
const call=(c:unknown,transport:Parameters<typeof advisorService>[5],ex=f.db.executor,settings:Record<string,string|undefined>=env)=>advisorService(f.owner,ex,settings,signal(),c,transport);
it('uses trusted occurrences with weekly off, strips private provenance and preserves ordinary history exactly',async()=>{
 await f.q("INSERT INTO owner_advisor_profiles(workspace_id,owner_id,history) VALUES('workspace-fuel','owner','[{\"role\":\"user\",\"content\":\"Unrelated prior conversation\"}]'::jsonb)");
 const transport=scripted(),c=command(),result=await call(c,transport);expect(result.state).toBe('answered');if(!('answer'in result))throw Error('Expected answer');
 expect(result.answer.businessEvidence?.[0].finance?.currencies[0]).toMatchObject({calculatedClosingMinor:'143500',postedInflowMinor:'50000',postedOutflowMinor:'6500',postedInflowCount:1,postedOutflowCount:2});expect(result.answer.businessInspectionRefs).toBeUndefined();
 const modelInput=String(transport.mock.calls[1][1].body);expect(modelInput).toContain('queryHash');expect(modelInput).not.toMatch(/inspectionId|session_hash|originHash|readReceiptId/);
 expect(await f.q('SELECT history FROM owner_advisor_profiles')).toEqual([{history:[{role:'user',content:'Unrelated prior conversation'}]}]);
 const [saved]=await f.q<{result:{businessInspectionRefs:{occurrence:number}[]}}>('SELECT result FROM owner_advisor_requests WHERE request_id=$1',[c.requestId]);expect(saved.result.businessInspectionRefs[0].occurrence).toBe(1);
 expect(await f.q('SELECT count(*)::int n FROM owner_advisor_weekly_operations')).toEqual([{n:0}]);
});
it('replays with no provider, import or new inspection, and fails closed when retrieval is disabled',async()=>{
 const c=command(),transport=scripted();const result=await call(c,transport);const noProvider=rs.fn(async()=>{throw Error('Replay must not call provider');});
 expect(await call(c,noProvider)).toMatchObject({state:'answered',answer:'answer'in result?result.answer:{}});expect(noProvider).not.toHaveBeenCalled();
 await expect(call(c,noProvider,f.db.executor,{...env,NEVORA_OWNER_ADVISOR_BUSINESS_RETRIEVAL_ENABLED:'false'})).rejects.toMatchObject({code:'conflict'});
 expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_inspections')).toEqual([{n:1}]);
});
it.each(['source','location','role','session','profile'] as const)('does not settle an answer after %s changes during provider I/O',async change=>{
 let reached=false;const transport=scripted(async()=>{reached=true;if(change==='source'){const source=(await business()).catalog!.sources.find(s=>s.sourceId===sourceId)!;await business({op:'withdraw_source',requestId:randomUUID(),sourceId,expectedRevision:source.revision,digest:source.scopeDigest,acknowledged:true});}
 if(change==='location')await f.q("UPDATE locations SET active=false WHERE id='loc-2'");if(change==='role')await f.q("UPDATE employees SET role='MANAGER' WHERE id='owner'");if(change==='session')await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'");if(change==='profile')await f.q("INSERT INTO owner_advisor_profiles(workspace_id,owner_id,priorities,revision) VALUES('workspace-fuel','owner','Changed',1) ON CONFLICT(workspace_id,owner_id) DO UPDATE SET priorities='Changed',revision=owner_advisor_profiles.revision+1");});
 await expect(call(command(),transport)).rejects.toThrow();expect(reached).toBe(true);expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests WHERE state='completed' AND result IS NOT NULL")).toEqual([{n:0}]);
});
it('rolls back an after-settlement source trigger and the answer/history together',async()=>{
 const [before]=await f.q<{epoch:number}>('SELECT evidence_revision::int epoch FROM owner_advisor_business_state');
 await f.q("CREATE FUNCTION alter_business_after_answer() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.state='completed' THEN UPDATE owner_advisor_business_state SET evidence_revision=evidence_revision+1; END IF; RETURN NEW; END$$;CREATE TRIGGER zz_alter_business_after_answer AFTER UPDATE ON owner_advisor_requests FOR EACH ROW EXECUTE FUNCTION alter_business_after_answer()");
 await expect(call(command(),scripted())).rejects.toMatchObject({code:'conflict'});expect(await f.q('SELECT evidence_revision::int epoch FROM owner_advisor_business_state')).toEqual([before]);expect(await f.q("SELECT coalesce((SELECT jsonb_array_length(history) FROM owner_advisor_profiles WHERE owner_id='owner'),0)::int n")).toEqual([{n:0}]);
});
it('keeps direct tool retry identity stable without re-reading records or minting another quota slot',async()=>{
 const original=await admitOwner(f.owner,f.db.executor);let reads=0;const ex:SqlExecutor={...f.db.executor,async transaction(statements,incoming){if(statements.some(s=>s.text.startsWith('SELECT version_id,payload')))reads++;return f.db.executor.transaction(statements,incoming);}};
 const adviser=new AdvisorStore(f.owner,original,ex),runtime={env,origin:{requestId:randomUUID(),profileRevision:0}},tool={name:'business_finance' as const,args:query()},budget={sourceSlots:8,occurrence:1};
 const first=await readBusinessTool(adviser,tool,runtime,budget,signal());expect(await readBusinessTool(adviser,tool,runtime,budget,signal())).toEqual(first);expect(reads).toBe(1);expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_inspections')).toEqual([{n:1}]);
 expect(businessInspectionId({workspaceId:'workspace-fuel',ownerId:'owner',requestId:runtime.origin.requestId,occurrence:1,tool:'business_finance'})).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});

it.each(['suppress','alter-result'])('rolls back %s of business answer custody',async kind=>{
 const mutation=kind==='suppress'?'RETURN NULL;':"NEW.result=jsonb_set(NEW.result,'{businessInspectionRefs}','[]'::jsonb);";
 await f.q(`CREATE FUNCTION corrupt_business_custody() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.state='completed' THEN ${mutation} END IF;RETURN NEW;END$$;CREATE TRIGGER zz_corrupt_business_custody BEFORE UPDATE ON owner_advisor_requests FOR EACH ROW EXECUTE FUNCTION corrupt_business_custody()`);
 await expect(call(command(),scripted())).rejects.toMatchObject({code:'conflict'});expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests WHERE state='completed'")).toEqual([{n:0}]);
});
it.each(['missing','forged','visible','delete'])('rejects %s cached business provenance without a provider call',async kind=>{
 const c=command();await call(c,scripted());
 if(kind==='missing')await f.q("UPDATE owner_advisor_requests SET result=result-'businessInspectionRefs' WHERE request_id=$1",[c.requestId]);
 if(kind==='forged')await f.q("UPDATE owner_advisor_requests SET result=jsonb_set(result,'{businessInspectionRefs,0,occurrence}','2'::jsonb) WHERE request_id=$1",[c.requestId]);
 if(kind==='visible')await f.q("UPDATE owner_advisor_requests SET result=jsonb_set(result,'{businessEvidence,0,finance,currencies,0,calculatedClosingMinor}','\"999999999\"'::jsonb) WHERE request_id=$1",[c.requestId]);
 if(kind==='delete'){const source=(await business()).catalog!.sources.find(s=>s.sourceId===sourceId)!;await business({op:'delete_source',requestId:randomUUID(),sourceId,expectedRevision:source.revision,digest:source.scopeDigest,acknowledged:true});}
 const noProvider=rs.fn(async()=>{throw Error('No provider on replay');});await expect(call(c,noProvider)).rejects.toMatchObject({code:kind==='delete'?'prior_attempt_failed':'conflict'});expect(noProvider).not.toHaveBeenCalled();
});
it('checks a change between preparation and the final settlement transaction',async()=>{
 let changed=false;const ex:SqlExecutor={...f.db.executor,async transaction(statements,incoming){if(!changed&&statements.some(s=>s.text.startsWith("UPDATE owner_advisor_requests SET state='completed'"))){changed=true;await f.q('UPDATE owner_advisor_business_state SET evidence_revision=evidence_revision+1');}return f.db.executor.transaction(statements,incoming);}};
 await expect(call(command(),scripted(),ex)).rejects.toMatchObject({code:'conflict'});expect(changed).toBe(true);
});
it('rejects repeated provider call IDs before a second inspection consumes quota',async()=>{
 let round=0;const transport=rs.fn(async()=>{round++;return Response.json({output:[{type:'function_call',name:'business_finance',call_id:'duplicate',arguments:JSON.stringify(query())}]});});
 await expect(call(command(),transport)).rejects.toMatchObject({code:'provider_failed'});expect(round).toBe(2);expect(await f.q('SELECT count(*)::int n FROM owner_advisor_business_inspections')).toEqual([{n:1}]);
});
it('fences an unselected business read in a mixed weekly, finance and sales investigation',async()=>{
 const input=fictionalBusinessInput('SALES');for(const row of input.records)if('locationId'in row)row.locationId='loc-1';
 const stage=await business({op:'stage_source_version',requestId:randomUUID(),format:'JSON',input});const read=await business({op:'read_source_version',requestId:randomUUID(),sourceId:stage.receipt!.sourceId,versionId:stage.receipt!.versionId});await business({op:'publish_source_version',requestId:randomUUID(),sourceId:stage.receipt!.sourceId,versionId:stage.receipt!.versionId,expectedRevision:read.receipt!.revision,digest:read.version!.digest,readReceiptId:read.readReceiptId,acknowledged:true});
 const {scenario:_scenario,...sales}=query();let round=0;const transport=rs.fn(async(_url:string,init:RequestInit)=>{round++;const reads=[{name:'weekly_plan',args:{weekStart:'2026-11-16',locationScope:{kind:'SELECTED',locationIds:['loc-1']}}},{name:'business_finance',args:query()},{name:'business_sales',args:{...sales,selection:{kind:'SOURCE',sourceId:stage.receipt!.sourceId}}}];if(round<=reads.length)return Response.json({output:[{type:'function_call',call_id:'mixed-'+round,name:reads[round-1].name,arguments:JSON.stringify(reads[round-1].args)}]});
 const body=JSON.parse(String(init.body));const salesRead=body.input.filter((i:{type:string})=>i.type==='function_call_output').map((i:{output:string})=>JSON.parse(i.output)).find((r:{businessEvidence?:{domain:string}[]})=>r.businessEvidence?.[0].domain==='SALES');expect(salesRead.businessEvidence[0].sales.currencies[0]).toMatchObject({sales:{count:1,collectionsMinor:'9900'},refunds:{count:1,collectionsMinor:'1980'}});
 const d=ownerDecision();return Response.json(decisionReply({...d,observations:[{statement:'Inspect the briefing.',evidenceIds:['E1']}],options:[{...d.options[0],evidenceIds:['E1']}],acknowledgedPartialEvidence:['E1']}));});
 const c=command(),settings={...env,NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED:'true'},result=await call(c,transport,f.db.executor,settings);expect('answer'in result&&result.answer.businessEvidence).toBeUndefined();
 const [stored]=await f.q<{result:{businessInspectionRefs:unknown[];weeklyInspectionRefs:unknown[]}}>('SELECT result FROM owner_advisor_requests WHERE request_id=$1',[c.requestId]);expect(stored.result.businessInspectionRefs).toHaveLength(2);expect(stored.result.weeklyInspectionRefs).toHaveLength(1);
 await f.q('UPDATE owner_advisor_business_state SET evidence_revision=evidence_revision+1');await expect(call(c,rs.fn(async()=>{throw Error('No provider');}),f.db.executor,settings)).rejects.toMatchObject({code:'conflict'});
});
it.each(['en','es'])('renders exact typed money from retrieved business evidence in %s',async language=>{
 let round=0;const transport=rs.fn(async(_url:string,init:RequestInit)=>{round++;if(round===1)return Response.json({output:[{type:'function_call',call_id:'money',name:'business_finance',arguments:JSON.stringify(query())}]});
 const body=JSON.parse(String(init.body)),read=body.input.filter((i:{type:string})=>i.type==='function_call_output').map((i:{output:string})=>JSON.parse(i.output)).find((r:{businessEvidence?:unknown})=>r.businessEvidence),m=read.businessEvidence[0],d=ownerDecision();return Response.json(decisionReply({...d,language,observations:[{statement:'Owner reported historical finance.',evidenceIds:[read.evidenceId]}],options:[{...d.options[0],evidenceIds:[read.evidenceId]}],metrics:[{evidenceId:read.evidenceId,metric:'business_reported_closing',business:{queryHash:m.queryHash,sourceDigest:m.sourceDigest,currency:'USD',unit:'MINOR',scale:2}}],acknowledgedPartialEvidence:[read.evidenceId]}));});
 const result=await call(command(),transport);expect('answer'in result&&result.answer.text).toContain('USD 1,435.00');
});
it('expires at the admitted memory applicability boundary without changing its revision',async()=>{
 const original=await admitOwner(f.owner,f.db.executor),adviser=new AdvisorStore(f.owner,original,f.db.executor),[clock]=await f.q<{at:string}>('SELECT clock_timestamp()::text at');
 const memoryAdmission=weeklyMemoryAdmission(emptyMemory(),new Date(clock.at).toISOString(),original.workspace.timeZone);memoryAdmission.validUntil=new Date(Date.now()+700).toISOString();
 const runtime={env,origin:{requestId:randomUUID(),profileRevision:0,memoryRevision:0,memoryAdmission}},result=await readBusinessTool(adviser,{name:'business_finance',args:query()},runtime,{sourceSlots:8,occurrence:1},signal());
 await f.q('SELECT pg_sleep(0.8)');await expect(prepareBusinessInvestigationFence(adviser,[result.businessInspectionRef!],env,signal(),runtime.origin.requestId,result.businessEvidence)).rejects.toMatchObject({code:'conflict'});
});
it.each(['map','guidance','memory'])('rejects a changed %s during the explanation',async kind=>{
 const settings={...env,NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED:'true'};let reached=false;
 const transport=scripted(async()=>{reached=true;if(kind==='map'){
 const staged=await business({op:'stage_coverage_map',requestId:randomUUID(),map:{expectedRevision:(await business()).catalog!.mapRevision,accounts:[{accountRef:'operating',ownership:{kind:'COMPANY_SHARED'}}],cells:['CASH','OBLIGATIONS','RECEIVABLES'].map(metric=>({sourceId,domain:'FINANCE',metric,currency:'USD',window:businessJanuary,role:'PRIMARY',accountRefs:['operating'],locationIds:[]}))}});const full=await business({op:'read_coverage_map',requestId:randomUUID(),mapVersionId:staged.receipt!.mapVersionId});await business({op:'publish_coverage_map',requestId:randomUUID(),mapVersionId:staged.receipt!.mapVersionId,expectedRevision:full.receipt!.revision,digest:full.map!.digest,readReceiptId:full.readReceiptId,acknowledged:true});}
 if(kind==='guidance'){const draft=await companyKnowledgeService(f.owner,f.db.executor,signal(),{op:'draft_profile',requestId:randomUUID(),expectedRevision:0,locale:'en',fields:{businessDescription:'Changed fictional guidance'}});if(!('documentId'in draft))throw Error('Draft');await companyKnowledgeService(f.owner,f.db.executor,signal(),{op:'publish',requestId:randomUUID(),expectedRevision:1,documentId:draft.documentId,versionId:draft.versionId,reviewedTextDigest:draft.textDigest});}
 if(kind==='memory')await f.q("INSERT INTO owner_advisor_memories(workspace_id,owner_id,revision,intents,decisions) VALUES('workspace-fuel','owner',1,'[]'::jsonb,'[]'::jsonb) ON CONFLICT(workspace_id,owner_id) DO UPDATE SET revision=owner_advisor_memories.revision+1");});
 await expect(call(command(),transport,f.db.executor,settings)).rejects.toMatchObject({code:'conflict'});expect(reached).toBe(true);
});
it('erases structured completed business answers with source deletion and preserves unrelated history and operation custody',async()=>{
 await f.q("INSERT INTO owner_advisor_profiles(workspace_id,owner_id,history) VALUES('workspace-fuel','owner','[{\"role\":\"user\",\"content\":\"Unrelated history\"}]'::jsonb)");const c=command();await call(c,scripted());
 const source=(await business()).catalog!.sources.find(s=>s.sourceId===sourceId)!,deletionId=randomUUID();
 await f.q("CREATE FUNCTION fail_business_delete_final() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.command_kind='delete_source' AND NEW.state='completed' THEN RAISE EXCEPTION 'qa_delete_rollback'; END IF;RETURN NEW;END$$;CREATE TRIGGER zz_fail_business_delete_final BEFORE UPDATE ON owner_advisor_business_operations FOR EACH ROW EXECUTE FUNCTION fail_business_delete_final()");
 await expect(business({op:'delete_source',requestId:randomUUID(),sourceId,expectedRevision:source.revision,digest:source.scopeDigest,acknowledged:true})).rejects.toThrow();expect(await f.q('SELECT result IS NOT NULL retained FROM owner_advisor_requests WHERE request_id=$1',[c.requestId])).toEqual([{retained:true}]);
 await f.q('DROP TRIGGER zz_fail_business_delete_final ON owner_advisor_business_operations');
 await business({op:'delete_source',requestId:deletionId,sourceId,expectedRevision:source.revision,digest:source.scopeDigest,acknowledged:true});
 expect(await f.q('SELECT result FROM owner_advisor_requests WHERE request_id=$1',[c.requestId])).toEqual([{result:null}]);expect(await f.q('SELECT history FROM owner_advisor_profiles')).toEqual([{history:[{role:'user',content:'Unrelated history'}]}]);
 const noProvider=rs.fn(async()=>{throw Error('No retry provider');});await expect(call(c,noProvider)).rejects.toMatchObject({code:'prior_attempt_failed'});expect(noProvider).not.toHaveBeenCalled();expect((await business({op:'check_source_operation',requestId:randomUUID(),operationId:deletionId})).receipt?.operationId).toBe(deletionId);
});
