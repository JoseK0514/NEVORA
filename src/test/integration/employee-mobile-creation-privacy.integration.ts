import {it,expect} from 'vitest';
import {createDisposableExchangeDatabase} from './local-postgres';
import {seedOwnedApp,seedOwnedScenario} from './owned-app-fixture';
import {fixtureProof} from './shift-change-api';
import {publishScheduleWithRevision} from './management-api';
import {readEmployeeCreation} from '../../lib/data/employee-creation.server';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
it('admits own Employee/Lead creation only and releases all facts after exact location scope changes mid-read',async()=>{
 const db=await createDisposableExchangeDatabase({mode:'current-runtime'});try{
  await seedOwnedApp(db.executor);const f=await seedOwnedScenario(db.executor,'CRTREAD',0),[actor]=f.actors;const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
  await q('UPDATE shifts SET is_designated_lead=false WHERE id IN($1,$2)',[f.sourceId,f.targetId]);for(const locationId of ['loc-1','loc-2'])await publishScheduleWithRevision({locationId,weekStart:f.week,managerId:'QAOWNER'},db.executor);
  for(const role of ['EMPLOYEE','LEAD']){
   await q('UPDATE employees SET role=$1 WHERE id=$2',[role,actor]);const proof=await fixtureProof(db.executor,actor);
   for(const mode of ['swap','cover','callout']){const own=await readEmployeeCreation(proof,db.executor,mode,f.sourceId);expect(own.state).toBe('ready');if(own.state==='ready'){expect(own.source?.id).toBe(f.sourceId);expect(own.check.allowed).toBe(true);expect(JSON.stringify(own)).not.toMatch(/employeeId|source_terms|operational_rule_profile|reasonNote/);}}
   const foreign=await readEmployeeCreation(proof,db.executor,'callout',f.targetId);expect(foreign.state).toBe('ready');if(foreign.state==='ready'){expect(foreign.source).toBeNull();expect(foreign.check.allowed).toBe(false);}
  }
  let revoked=false;const proof=await fixtureProof(db.executor,actor);
  const duringRead:SqlExecutor={query:db.executor.query,async transaction(statements:SqlStatement[],signal?:AbortSignal){const rows=await db.executor.transaction(statements,signal);if(!revoked&&statements.some(s=>s.text.includes('allowed_location_ids'))){revoked=true;await q('DELETE FROM employee_location_eligibility WHERE employee_id=$1 AND location_id=$2',[actor,'loc-2']);}return rows;}};
  expect(await readEmployeeCreation(proof,duringRead,'swap',f.sourceId)).toEqual({state:'unavailable',reason:'access_denied'});expect(revoked).toBe(true);
 }finally{await db.dispose();}
});
it('keeps unavailable swap discovery distinct from empty without disabling a separately verified cover offer',async()=>{
 const db=await createDisposableExchangeDatabase({mode:'current-runtime'});try{
  await seedOwnedApp(db.executor);const f=await seedOwnedScenario(db.executor,'CRTPART',0);const failing:SqlExecutor={query:db.executor.query,async transaction(statements:SqlStatement[],signal?:AbortSignal){if(statements.some(s=>s.text.includes('sh.employee_id <> $1')))throw Error('Controlled candidate-list outage');return db.executor.transaction(statements,signal);}};
  const read=await readEmployeeCreation(await fixtureProof(db.executor,f.actors[0]),failing,'swap',f.sourceId);expect(read.state).toBe('ready');if(read.state==='ready'){expect(read.targets).toBeNull();expect(read.partial).toBe(true);expect(read.check.allowed).toBe(false);expect(read.coverage.allowed).toBe(true);}
 }finally{await db.dispose();}
});
it('never publishes mixed original source facts and replacement command fields after a shift changes during discovery',async()=>{
 const db=await createDisposableExchangeDatabase({mode:'current-runtime'});try{
  await seedOwnedApp(db.executor);const f=await seedOwnedScenario(db.executor,'CRTTERMS',0);let changed=false;
  const changing:SqlExecutor={query:db.executor.query,async transaction(statements:SqlStatement[],signal?:AbortSignal){const rows=await db.executor.transaction(statements,signal);if(!changed&&statements.some(s=>s.text.includes('WHERE sh.id = $1')&&s.text.includes('source_assignment_episode_id'))){changed=true;await db.executor.query({text:"UPDATE shifts SET start_time='09:00' WHERE id=$1",values:[f.sourceId]});await publishScheduleWithRevision({locationId:'loc-1',weekStart:f.week,managerId:'QAOWNER'},db.executor);}return rows;}};
  const read=await readEmployeeCreation(await fixtureProof(db.executor,f.actors[0]),changing,'cover',f.sourceId);expect(changed).toBe(true);expect(read.state).toBe('ready');if(read.state==='ready'){expect(read.source).toBeNull();expect(read.check.allowed).toBe(false);}
 }finally{await db.dispose();}
});
