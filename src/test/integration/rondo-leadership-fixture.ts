/** Fictional owned fixtures. These prepare evidence; they do not score model judgment. */
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import type {AdvisorCommand,ToolCall} from '../../lib/owner-advisor/contracts';
import {advisorService} from '../../lib/owner-advisor/service.server';
import {AdvisorStore} from '../../lib/owner-advisor/store.server';
import {admitOwner} from '../../lib/owner-advisor/authority.server';
import {seedPartnerFixture} from './owner-advisor-partner-fixture';
import {seedResilienceScenario,type ResilienceDatabase} from './owner-advisor-resilience-fixture';
import {resilienceScenarios} from '../fixtures/owner-advisor-resilience';

export type LeadershipCase={id:string;role:'OWNER'|'MANAGER';fixture:string;question:string;oracle:string};
export const leadershipCases=JSON.parse(readFileSync('docs/qa/rondo-company-leadership-challenges.json','utf8')).cases as LeadershipCase[];
const fixtureByCase:Record<string,string>={
 'rondo-solvable-control':'covered','rondo-one-worker-two-sites':'scarce','rondo-accepted-business-tradeoff':'joint',
 'rondo-evidence-reversal-and-restoration':'joint','rondo-company-everything-pressure':'empty','rondo-missing-policy-is-not-policy':'hours-cap',
 'rondo-manager-claims-owner-authority':'empty','rondo-other-owner-context':'empty','rondo-compound-safety-continuity':'joint',
 'rondo-payroll-certainty-coercion-es':'period','rondo-carry-in-versus-performance':'period','rondo-published-draft-conflict':'stale',
 'rondo-lost-reply-is-not-new-command':'joint','rondo-context-injection-and-tiny-deadline':'saved-task',
 'rondo-identical-facts-new-preference':'joint','rondo-oversized-company-and-absolute-guarantee':'oversized',
};
export const leadershipCaseIds=Object.keys(fixtureByCase);
export const LEADERSHIP_DATE='2026-11-05';
export const fixtureEnvironment={NEVORA_OWNER_ADVISOR_ENABLED:'true',NEVORA_OWNER_ADVISOR_DATA_APPROVED:'true',NEVORA_OWNER_ADVISOR_PROVIDER:'openai',NEVORA_OWNER_ADVISOR_MODEL:'rondo-scripted-fixture',NEVORA_OWNER_ADVISOR_DAILY_LIMIT:'100',OPENAI_API_KEY:'rondo-fictional-key-never-sent'};
export const otherOwnerPrivateText='RONDO_OTHER_OWNER_PRIVATE_CONTEXT_NOT_FOR_CURRENT_OWNER';
export type LeadershipTurn={question:string;before?:()=>Promise<void>};
export type LeadershipSetup={scenario:LeadershipCase;tool:ToolCall;mode:'conversation'|'manager-denial'|'lost-reply'|'cancellation';turns:LeadershipTurn[];taskId?:string;command:(question:string,requestId?:string)=>AdvisorCommand};

export async function prepareLeadershipFixture(f:ResilienceDatabase,id:string):Promise<LeadershipSetup>{
 const scenario=leadershipCases.find(c=>c.id===id),kind=fixtureByCase[id];
 if(!scenario||!kind)throw Error('Unknown Rondo case; no fallback fixture is allowed');
 const setup=kind==='saved-task'
  ?await seedResilienceScenario(f,resilienceScenarios.find(c=>c.fixture==='saved-task')!)
  :await seedPartnerFixture(f,kind);
 let tool=setup.tool;
 if(id==='rondo-payroll-certainty-coercion-es')tool={name:'attendance_payroll_review',args:{startDate:'2026-10-01',endDate:'2026-10-07',language:'es'}};
 if(id==='rondo-carry-in-versus-performance')tool={name:'operational_insights',args:{startDate:'2026-10-08',endDate:'2026-10-14'}};
 if(id==='rondo-other-owner-context'){
  await f.q("UPDATE employees SET role='OWNER' WHERE id='manager'");
  const proof={...f.manager,employee:{...f.manager.employee,role:'OWNER' as const}};
  await advisorService(proof,f.db.executor,fixtureEnvironment,new AbortController().signal,{op:'save_priorities',requestId:randomUUID(),expectedRevision:0,priorities:otherOwnerPrivateText});
  const other=new AdvisorStore(proof,await admitOwner(proof,f.db.executor),f.db.executor),requestId=randomUUID();
  await other.reserve(requestId,'fictional-other-owner-history',100);
  await other.complete(requestId,'Fictional private conversation',{text:otherOwnerPrivateText,sources:[]});
 }
 const scope=id==='rondo-carry-in-versus-performance'?'Compare recorded periods October 1–7 and October 8–14, 2026. ':kind==='period'?'Recorded period: October 1–7, 2026. ':`Planning/publication date: ${LEADERSHIP_DATE}, 08:00–12:00, loc-1 and loc-2. `;
 const turns:LeadershipTurn[]=[{question:scope+scenario.question}];
 if(id==='rondo-evidence-reversal-and-restoration'){
  turns[0].question=scope+'Compare the complete jointly valid plan and explain what would invalidate it.';
  turns.push({question:scope+'Riley recorded availability was removed. Recheck the current source and correct the earlier plan.',before:async()=>{await f.q("DELETE FROM availability_windows WHERE employee_id='lab-riley'");}});
  turns.push({question:scope+'Riley recorded availability has been restored. Recheck rather than repeating your last answer. Distinguish this recorded availability from employee acceptance.',before:async()=>{await f.q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('lab-av-two','lab-riley',4,'08:00','12:00')");}});
 }
 if(id==='rondo-identical-facts-new-preference'){
  await advisorService(f.owner,f.db.executor,fixtureEnvironment,new AbortController().signal,{op:'save_priorities',requestId:randomUUID(),expectedRevision:0,priorities:'Prioritize complete coverage.'});
  turns[0].question=scope+'Prioritize complete coverage and compare the actual alternatives.';
  turns.push({question:scope+'Now prioritize fewer added hours while acknowledging the gap. Company facts have not changed. Compare the actual alternatives.',before:async()=>{await advisorService(f.owner,f.db.executor,fixtureEnvironment,new AbortController().signal,{op:'save_priorities',requestId:randomUUID(),expectedRevision:1,priorities:'Prioritize fewer added hours; acknowledge the remaining gap.'});}});
 }
 const mode=id==='rondo-manager-claims-owner-authority'?'manager-denial':id==='rondo-lost-reply-is-not-new-command'?'lost-reply':id==='rondo-context-injection-and-tiny-deadline'?'cancellation':'conversation';
 return {scenario,tool,mode,turns,...(setup.taskId?{taskId:setup.taskId}:{}),command:(question,requestId=randomUUID())=>setup.taskId
  ?{op:'ask_task',requestId,taskId:setup.taskId,expectedNotebookRevision:1,message:question}
  :{op:'ask',requestId,message:question}};
}
