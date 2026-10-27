import {it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createDisposableExchangeDatabase} from './local-postgres';
import {seedOwnedApp,seedOwnedScenario} from './owned-app-fixture';
import {fixtureProof,reviewedFixtureSource} from './shift-change-api';
import {publishScheduleWithRevision} from './management-api';
import {executeShiftChange} from '../../lib/data/shift-changes';
import {readEmployeeExchange} from '../../lib/data/employee-exchange.server';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
it.each(['detail','list','final-admission'] as const)('rechecks captured location scope before publishing %s after eligibility is revoked during its read',async(point)=>{
 const db=await createDisposableExchangeDatabase({mode:'current-runtime'});
 try{
  await seedOwnedApp(db.executor);const f=await seedOwnedScenario(db.executor,'REV',0),[actor,requester]=f.actors;
  const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
  await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[actor]);
  await q('UPDATE shifts SET is_designated_lead=false WHERE id IN($1,$2)',[f.sourceId,f.targetId]);
  for(const locationId of ['loc-1','loc-2'])await publishScheduleWithRevision({locationId,weekStart:f.week,managerId:'QAOWNER'},db.executor);
  const own=await reviewedFixtureSource(db.executor,f.sourceId),offer=await reviewedFixtureSource(db.executor,f.targetId);
  const proposal=await executeShiftChange(await fixtureProof(db.executor,requester),{kind:'PROPOSE_SWAP',operationId:randomUUID(),...offer,targetShiftId:own.sourceShiftId,targetEpisodeId:own.sourceEpisodeId,targetTermsFingerprint:own.sourceTermsFingerprint},db.executor);
  expect(proposal.status).toBe('pending');if(proposal.status!=='pending')throw Error('Fixture proposal failed');
  const proof=await fixtureProof(db.executor,actor);
  let revoked=false;
  const duringRead:SqlExecutor={query:db.executor.query,async transaction(statements:SqlStatement[],signal?:AbortSignal){
   const revoke=async()=>{revoked=true;await q('DELETE FROM employee_location_eligibility WHERE employee_id=$1 AND location_id=$2',[actor,'loc-2']);};
   if(point==='final-admission'&&!revoked&&statements.some(s=>s.text.includes('AS \"validForMs\"')))await revoke();
   const rows=await db.executor.transaction(statements,signal);
   if(point!=='final-admission'&&!revoked&&statements.some(s=>s.text.includes('allowed_location_ids')))await revoke();
   return rows;
  }};
  const result=await readEmployeeExchange(proof,duringRead,point==='list'?null:proposal.requestId);
  expect(revoked).toBe(true);
  expect(result).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{await db.dispose();}
});
it('does not label live replacement callout time as recorded report terms when history is unavailable',async()=>{
 const db=await createDisposableExchangeDatabase({mode:'current-runtime'});
 try{
  await seedOwnedApp(db.executor);const f=await seedOwnedScenario(db.executor,'HIS',0),[actor]=f.actors;
  const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
  await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[actor]);
  const proof=await fixtureProof(db.executor,actor),source=await reviewedFixtureSource(db.executor,f.sourceId);
  const report=await executeShiftChange(proof,{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...source,reasonCode:'ILLNESS'},db.executor);
  expect(report.status).toBe('pending');if(report.status!=='pending')throw Error('Fixture report failed');
  await q("UPDATE shifts SET start_time='09:00' WHERE id=$1",[f.sourceId]);
  const historyUnavailable:SqlExecutor={query:db.executor.query,async transaction(statements:SqlStatement[],signal?:AbortSignal){
   if(statements.some(s=>s.text.includes('FROM shift_change_events h JOIN')))throw Error('Controlled history read outage');
   return db.executor.transaction(statements,signal);
  }};
  const result=await readEmployeeExchange(proof,historyUnavailable,report.requestId);
  expect(result.state).toBe('ready');if(result.state!=='ready')throw Error('Expected safe own report context');
  expect(result.detail?.offered).toBeNull();expect(result.detail?.history).toBeNull();
 }finally{await db.dispose();}
});
