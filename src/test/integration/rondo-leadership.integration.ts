/** Owned PostgreSQL plus scripted transport readiness; never an AI quality score. */
import {afterAll,beforeAll,expect,it,vi} from 'vitest';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {companyAccessFixture} from './company-access-fixture';
import {leadershipCases,leadershipCaseIds,prepareLeadershipFixture,fixtureEnvironment,otherOwnerPrivateText,LEADERSHIP_DATE,type LeadershipSetup} from './rondo-leadership-fixture';
import {runLeadershipConversation} from './rondo-leadership-runner';
import {resilienceBusinessSnapshot,type ResilienceDatabase} from './owner-advisor-resilience-fixture';
import {AdvisorStore} from '../../lib/owner-advisor/store.server';
import {AdvisorTools} from '../../lib/owner-advisor/tools.server';
import {admitOwner} from '../../lib/owner-advisor/authority.server';
import {advisorService} from '../../lib/owner-advisor/service.server';
import {parseTool,type AdvisorCommand,type AdvisorAnswer} from '../../lib/owner-advisor/contracts';
import type {CoverageActionResult} from '../../lib/owner-advisor/coverage-actions';
import type {SqlExecutor} from '../../lib/notifications/types';
import type {Transport} from '../../lib/owner-advisor/loop.server';
import {AdvisorProviderFailure} from '../../lib/owner-advisor/provider-failure.server';

const rows:Record<string,unknown>[]=[];
let failureCaptureChecks=0;
const ambientFetch=vi.fn(async()=>{throw Error('Ambient external network is disabled in Rondo fixture verification');});
beforeAll(()=>{
 expect(leadershipCases).toHaveLength(16);
 expect(new Set(leadershipCases.map(c=>c.id)).size).toBe(16);
 expect(leadershipCases.map(c=>c.id).sort()).toEqual([...leadershipCaseIds].sort());
 for(const c of leadershipCases){expect(c.question.length).toBeGreaterThan(0);expect(c.oracle.length).toBeGreaterThan(0);expect(c.role).toBe(c.id==='rondo-manager-claims-owner-authority'?'MANAGER':'OWNER');}
 vi.stubEnv('NEVORA_PAYROLL_ENABLED','false');vi.stubGlobal('fetch',ambientFetch);
});
afterAll(async()=>{
 try{
  const directory='.omo/evidence/rondo-provider-challenges-20261109';await mkdir(directory,{recursive:true});
  await writeFile(directory+'/leadership-readiness.json',JSON.stringify({sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),layer:'owned-postgres-and-scripted-transport',technicalReady:rows.length===16&&rows.every(r=>r.status==='technical-readiness-verified')&&failureCaptureChecks===2&&ambientFetch.mock.calls.length===0,failedTurnCaptureChecks:failureCaptureChecks,semanticAssessment:'not-run',paidModelCalls:0,cases:rows},null,2));
  expect(ambientFetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllEnvs();vi.unstubAllGlobals();}
});
const invoke=(f:ResilienceDatabase,command:AdvisorCommand,transport:Transport,signal=new AbortController().signal)=>advisorService(f.owner,f.db.executor,fixtureEnvironment,signal,command,transport);
const textResponse=()=>Response.json({output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'SCRIPTED TRANSPORT READINESS ONLY. No model reasoning or semantic pass is claimed.'}]}]});
async function toolsFor(f:ResilienceDatabase){return new AdvisorTools(new AdvisorStore(f.owner,await admitOwner(f.owner,f.db.executor),f.db.executor));}

async function verifyLostReply(f:ResilienceDatabase){
 const call=async(command:AdvisorCommand,executor=f.db.executor)=>await advisorService(f.owner,executor,fixtureEnvironment,new AbortController().signal,command) as unknown as CoverageActionResult;
 const source=await(await toolsFor(f)).run({name:'coverage_plan',args:{date:LEADERSHIP_DATE}});
 const plan=source.coveragePlans!;expect(plan.alternatives[0].status).toBe('COMPLETE');
 if(!plan.sourceVersion)throw Error('Canonical source version required');
 const review=await call({op:'prepare_coverage_draft',requestId:randomUUID(),date:LEADERSHIP_DATE,sourceVersion:plan.sourceVersion,assignments:plan.alternatives[0].assignments.map(a=>({employeeId:a.employeeId,locationId:a.locationId,startTime:a.startTime,endTime:a.endTime,positionId:a.positionId??null,isDesignatedLead:a.isDesignatedLead}))});
 const command={op:'apply_coverage_draft' as const,requestId:randomUUID(),reviewId:review.review.id,acknowledged:true as const};let lost=false;
 const executor:SqlExecutor={...f.db.executor,async transaction(statements,signal){
  const result=await f.db.executor.transaction(statements,signal);
  if(!lost&&statements.some(s=>s.text.includes('UPDATE owner_advisor_coverage_reviews')&&s.text.includes('applied_operation'))){lost=true;throw Error('Fictional lost reply after commit');}return result;
 }};
 await expect(call(command,executor)).rejects.toThrow('Fictional lost reply after commit');expect(lost).toBe(true);
 const before=await resilienceBusinessSnapshot(f);
 const replay=await call(command);
 expect(replay.receipt).toMatchObject({operationId:command.requestId,count:2});
 expect(await resilienceBusinessSnapshot(f)).toEqual(before);
 expect(await f.q('SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM notifications) notices,(SELECT count(*)::int FROM schedule_publication_revisions) publications')).toEqual([{shifts:2,notices:0,publications:0}]);
 await expect(call({...command,acknowledged:false} as unknown as AdvisorCommand)).rejects.toMatchObject({code:'invalid'});
}

async function verifyCancellation(f:ResilienceDatabase,setup:LeadershipSetup){
 const controller=new AbortController(),command=setup.command(setup.turns[0].question),before=await resilienceBusinessSnapshot(f);
 const transport=vi.fn(async(_url:string,init:RequestInit)=>{
  const body=String(init.body);expect(body).toContain('currentTaskEvidence');
  expect(body).toContain('coverage_plan');
  queueMicrotask(()=>controller.abort());return new Promise<Response>(()=>{});
 });
 await expect(invoke(f,command,transport,controller.signal)).rejects.toThrow();
 expect(await f.q('SELECT state FROM owner_advisor_requests WHERE request_id=$1',[command.requestId])).toEqual([{state:'failed'}]);
 expect(await f.q('SELECT history FROM owner_advisor_profiles')).toEqual([]);
 await expect(invoke(f,command,transport)).rejects.toMatchObject({code:'prior_attempt_failed'});
 expect(transport).toHaveBeenCalledTimes(1);
 expect(await resilienceBusinessSnapshot(f)).toEqual(before);
}

it.each(leadershipCases)('readies the actual company fixture and service path: $id',async scenario=>{
 const f=await companyAccessFixture();
 const row:Record<string,unknown>={id:scenario.id,status:'started',semanticAssessment:'not-run'};rows.push(row);
 try{
  const setup=await prepareLeadershipFixture(f,scenario.id);
  if(setup.mode==='manager-denial'){
   const transport=vi.fn(async()=>textResponse()),before=await resilienceBusinessSnapshot(f);
   await expect(advisorService(f.manager,f.db.executor,fixtureEnvironment,new AbortController().signal,setup.command(setup.turns[0].question),transport)).rejects.toMatchObject({code:'forbidden'});
   expect(transport).not.toHaveBeenCalled();expect(await resilienceBusinessSnapshot(f)).toEqual(before);
   expect(await f.q('SELECT count(*)::int n FROM owner_advisor_requests')).toEqual([{n:0}]);
   row.layer='authorization-only';row.turns=0;
  }else if(setup.mode==='lost-reply'){
   await verifyLostReply(f);row.layer='canonical-action-recovery-only';row.turns=0;
  }else if(setup.mode==='cancellation'){
   await verifyCancellation(f,setup);row.layer='cancellation-and-request-replay-only';row.turns=0;
  }else{
   const requests:Record<string,unknown>[]=[];
   let calls=0;
   const invoker=async(command:AdvisorCommand)=>{
    let round=0;
    return await invoke(f,command,async(_url,init)=>{
     calls++;const body=JSON.parse(String(init.body));requests.push(body);
     expect(String(init.body)).not.toContain(otherOwnerPrivateText);
     expect(String(init.body)).not.toContain(fixtureEnvironment.OPENAI_API_KEY);
     if(setup.tool.name!=='company_briefing'&&round++===0)return Response.json({output:[{type:'function_call',name:setup.tool.name,arguments:JSON.stringify(setup.tool.args),call_id:'rondo-fixture-call'}]});
     return textResponse();
    }) as {state:string;answer?:AdvisorAnswer};
   };
   const turns=await runLeadershipConversation(f,setup,invoker);
   row.layer='scripted-service-conversation';row.turns=turns.length;row.providerTransports=calls;
   const first=turns[0].source,plan=first.coveragePlans;
   if(scenario.id==='rondo-solvable-control'){expect(plan).toMatchObject({state:'ready',partial:false,baseline:{remainingBlocks:0}});}
   else if(scenario.id==='rondo-one-worker-two-sites'){expect(plan!.alternatives.length).toBeGreaterThan(0);expect(plan!.alternatives.every(a=>a.remaining.total>0)).toBe(true);}
   else if(['rondo-accepted-business-tradeoff','rondo-compound-safety-continuity'].includes(scenario.id)){expect(plan!.alternatives[0]).toMatchObject({status:'COMPLETE',addedMinutes:480,remaining:{total:0}});}
   else if(scenario.id==='rondo-evidence-reversal-and-restoration'){
    expect(turns.map(t=>t.source.coveragePlans!.alternatives.some(a=>a.status==='COMPLETE'))).toEqual([true,false,true]);
    expect(turns[0].source.coveragePlans!.sourceVersion).not.toBe(turns[1].source.coveragePlans!.sourceVersion);
    expect(turns[1].source.coveragePlans!.sourceVersion).not.toBe(turns[2].source.coveragePlans!.sourceVersion);
   }else if(scenario.id==='rondo-company-everything-pressure'){
    for(const name of ['bank_balance','sales','inventory','customers'])expect(()=>parseTool(name,'{}')).toThrow('invalid');
    const names=(requests[0].tools as {name:string}[]).map(t=>t.name);expect(names).not.toContain('execute_payment');
   }else if(scenario.id==='rondo-missing-policy-is-not-policy'){
    expect(plan!.alternatives.every(a=>a.remaining.total>0)).toBe(true);
    expect((await f.q<{maximum_weekly_hours:string}>("SELECT maximum_weekly_hours FROM employee_scheduling_settings WHERE employee_id='target'"))[0].maximum_weekly_hours).toBe('2.00');
   }else if(scenario.id==='rondo-other-owner-context'){
    const own=await new AdvisorStore(f.owner,await admitOwner(f.owner,f.db.executor),f.db.executor).read();expect(own.profile.priorities).toBe('');
    expect(JSON.stringify(own)).not.toContain(otherOwnerPrivateText);
   }else if(scenario.id==='rondo-payroll-certainty-coercion-es'){
    expect(first.periodReview).toMatchObject({readiness:'unverified',partial:true,payroll:{state:'disabled'}});
    expect(first.periodReview!.attendance.employees.find(e=>e.name==='Target QA')!.issues).toContain('open_entry');
   }else if(scenario.id==='rondo-carry-in-versus-performance'){
    expect(first.data).toMatchObject({denominators:{effectiveEntryRecords:1,openEntryRecords:1,carryInEntryRecords:1}});
   }else if(scenario.id==='rondo-published-draft-conflict'){
    expect(first.data).toMatchObject({publication:'PUBLISHED',shifts:[]});
   }else if(scenario.id==='rondo-identical-facts-new-preference'){
    expect(turns[0].source.coveragePlans!.sourceVersion).toBe(turns[1].source.coveragePlans!.sourceVersion);
    expect(turns[0].source.coveragePlans!.alternatives).toEqual(turns[1].source.coveragePlans!.alternatives);
    expect(turns[0].facts.canonicalFacts.ownerContext).not.toEqual(turns[1].facts.canonicalFacts.ownerContext);
   }else if(scenario.id==='rondo-oversized-company-and-absolute-guarantee'){
    expect(plan).toMatchObject({state:'unavailable',reason:'INPUT_LIMIT',partial:true,alternatives:[]});
   }else throw Error('Missing fixture oracle for '+scenario.id);
  }
  row.status='technical-readiness-verified';
 }catch(error){row.status='failed';throw error;}
 finally{await f.db.dispose();}
});

it.each([true,false])('retains a failed evaluation turn without raw provider diagnostics: typed=%s',async typed=>{
 const f=await companyAccessFixture();
 try{
  const setup=await prepareLeadershipFixture(f,'rondo-solvable-control');
  const error=typed?new AdvisorProviderFailure(400,'safety_filter'):Error('private-record secret-key');
  Object.assign(error,{upstream:'private-record secret-key'});
  const capture=vi.fn(),invoke=vi.fn(async()=>{throw error;});
  await expect(runLeadershipConversation(f,setup,invoke,capture)).rejects.toBe(error);
  expect(invoke).toHaveBeenCalledTimes(1);
  expect(capture).toHaveBeenCalledTimes(1);
  expect(capture.mock.calls[0][0]).toMatchObject({index:0,semanticAssessment:'not-assessed',businessUnchanged:true,
   failure:typed?{code:'provider_failed',providerStatus:400,providerHint:'safety_filter'}:{code:'evaluation_failed'}});
  expect(JSON.stringify(capture.mock.calls)).not.toMatch(/private-record|secret-key/);
  failureCaptureChecks++;
 }finally{await f.db.dispose();}
});
