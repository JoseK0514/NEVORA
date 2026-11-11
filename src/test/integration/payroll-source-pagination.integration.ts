import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {source,sourceSql,sourceGuard,newRun,saveSettings,command,runs,type Source} from '../../lib/payroll/service';
import {guarded,hash,statement as q,workspaceSql} from '../../lib/payroll/store';
import {readPeriodClose,savePeriodPopulation} from '../../lib/period-close/service';
import {parseTimecardsResponse} from '../../lib/timecards/read-model';
import {timecardReadSql} from '../../lib/timecards/service';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor} from '../../lib/notifications/types';
import type {CompleteReadManifest} from '../../lib/complete-read-pages';

let f:Awaited<ReturnType<typeof createPunchFixture>>,workspaceId:string;
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
const owner:SessionMutationProof={employee:{id:'c34-owner',role:'OWNER',firstName:'Owner',lastName:'Fictional',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
beforeEach(async()=>{
 vi.stubEnv('NEVORA_PAYROLL_ENABLED','true');f=await createPunchFixture();
 // Existing provider-import fixture: current Company authority without native amount capture.
 await f.q(await readFile('db/migrations/0032_company_access_invitations.sql','utf8'));
 [{id:workspaceId}]=await f.q<{id:string}>('SELECT id FROM workspaces WHERE singleton');
 await saveSettings(owner,{action:'SAVE_SETTINGS',operationId:randomUUID(),expectedRevision:0,effectiveFrom:'2026-01-01',reason:'Fictional source qualification',preferences:{companyName:'Fictional source company',language:'en',currency:'USD',schedule:{frequency:'WEEKLY',anchorDate:'2026-09-21',paydayOffsetDays:2},rules:[],automation:{prepare:false,publish:false,reminders:false,reminderLeadDays:[]},bankProfile:'NEUTRAL_UNVERIFIED'}},f.db.executor);
});
afterEach(async()=>{await f?.db.dispose();vi.unstubAllEnvs();});
async function roster(total:number){
 await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active)
  SELECT 'R15-'||lpad(n::text,4,'0'),'Retained','Fictional '||n,'r15-'||n,'EMPLOYEE','loc-1',n%2=0 FROM generate_series(4,$1::integer) n`,[total]);
}
type Captured={id:string;source:Source&{timecards:{cards:unknown[];paging?:CompleteReadManifest}};observed:string};
async function capture(ex:SqlExecutor=f.db.executor,expression=sourceSql){
 const [result]=await guarded<Captured>(owner,'REVIEW',q(`SELECT ${workspaceSql} AS id,${expression} AS source,clock_timestamp()::text AS observed`,workspaceId,true,owner.employee.id,period.startDate,period.endDate),ex);
 return result;
}
it.each([301,601])('aggregates all %i retained timecards from the real payroll SQL with stable complete evidence',async total=>{
 await roster(total);const started=performance.now(),first=await capture(),elapsedMs=Math.round(performance.now()-started);
 expect(first.source.roster).toHaveLength(total);expect(first.source.timecards.cards).toHaveLength(total);
 const parsed=parseTimecardsResponse({...first.source.timecards,observedAt:first.observed},period);
 expect(new Set(parsed.cards.map(c=>c.card.employeeId)).size).toBe(total);
 expect(parsed.cards.some(c=>c.card.employeeId==='R15-'+String(total).padStart(4,'0'))).toBe(true);
 expect(first.source.roster.find(e=>e.employeeId==='R15-0005')?.active).toBe(false);
 expect(first.source.timecards.paging).toMatchObject({pageSize:300,totalRows:total,pageCounts:total===301?[300,1]:[300,300,1]});
 expect((await capture()).source).toEqual(first.source);
 await guarded(owner,'REVIEW',sourceGuard(first,newRun(randomUUID(),period,'2026-09-29'),owner),f.db.executor);
 // Existing financial source bounds are not changed by this internal aggregation fix.
 await expect(source(owner,period,f.db.executor)).rejects.toThrow('SOURCE_LIMIT');
 console.log('R15_SOURCE_MEASUREMENT',JSON.stringify({retainedPeople:total,pages:total===301?2:3,elapsedMs,sourceJsonBytes:Buffer.byteLength(JSON.stringify(first.source))}));
});
it('preserves the current 300-person population hash, payroll approval and exact-operation replay',async()=>{
 await roster(300);const initial=await source(owner,period,f.db.executor),close=await readPeriodClose(owner,period,f.db.executor);
 expect(initial.source.timecards.cards).toHaveLength(300);expect(initial.source.timecards).not.toHaveProperty('paging');
 expect(close.sourceHash).toBe(hash({roster:initial.source.roster,timecards:initial.source.timecards}));
 await savePeriodPopulation(owner,{operationId:randomUUID(),expectedRevision:0,sourceHash:close.sourceHash,...period,members:close.members.map(m=>({employeeId:m.employeeId,disposition:'ZERO_TIME',reason:'Fictional empty-period evidence',employmentFacts:'Fictional retained roster',employmentBasis:'MANAGER_ATTESTED'}))},f.db.executor);
 const current=await source(owner,period,f.db.executor);expect(current.source.population?.members).toHaveLength(300);
 await savePeriodPopulation(owner,{operationId:randomUUID(),expectedRevision:1,sourceHash:close.sourceHash,...period,members:close.members.map(m=>({employeeId:m.employeeId,disposition:'ZERO_TIME',reason:'Revised fictional evidence',employmentFacts:'Fictional retained roster',employmentBasis:'MANAGER_ATTESTED'}))},f.db.executor);
 await expect(guarded(owner,'REVIEW',sourceGuard(current,newRun(randomUUID(),period,'2026-09-29'),owner),f.db.executor)).rejects.toThrow('CONFLICT');
 const prepared=await command(owner,{action:'PREPARE',operationId:randomUUID(),period,payday:'2026-09-29'},f.db.executor);
 await command(owner,{action:'IMPORT',operationId:randomUUID(),runId:prepared.runId,expectedRevision:1,amounts:{schema:'NEVORA_PAYROLL_IMPORT_V1',currency:'USD',sourceName:'Fictional authoritative provider',sourceReference:'R15-empty-period',period,payday:'2026-09-29',rows:close.members.map(m=>({employeeId:m.employeeId,grossMinor:'0',netMinor:'0',employeeDeductions:[],employerContributions:[]}))}},f.db.executor);
 const reviewed=(await runs(owner,f.db.executor)).runs.find(r=>r.id===prepared.runId)!;
 const input={action:'APPROVE',operationId:randomUUID(),runId:reviewed.id,expectedRevision:reviewed.revision,reviewToken:reviewed.reviewToken};
 const approved=await command(owner,input,f.db.executor);expect(await command(owner,input,f.db.executor)).toEqual(approved);
 expect((await runs(owner,f.db.executor)).runs.find(r=>r.id===prepared.runId)?.revision).toBe(reviewed.revision+1);
});
it.each(['missing','repeated','empty'] as const)('refuses %s internal pages instead of returning a partial canonical payroll source',async mode=>{
 await roster(601);
 const corrupted=mode==='repeated'?`WITH original_pages AS MATERIALIZED (${timecardReadSql}) SELECT * FROM original_pages UNION ALL SELECT * FROM original_pages WHERE "pageIndex"=0`:
  `SELECT * FROM (${timecardReadSql}) original_pages WHERE ${mode==='missing'?'"pageIndex"<>2':'false'}`;
 // Fault injection replaces only the source page producer; the real payroll SQL
 // assembly/guard and real role/session/transaction remain under test.
 await expect(capture(f.db.executor,sourceSql.replace(timecardReadSql,corrupted))).rejects.toThrow('PAYROLL_SOURCE_INCOMPLETE');
});
it('invalidates a captured three-page source when a final-page retained employee changes',async()=>{
 await roster(601);const captured=await capture();
 await f.q("UPDATE employees SET first_name='Changed fictional name' WHERE id='R15-0601'");
 await expect(guarded(owner,'REVIEW',sourceGuard(captured,newRun(randomUUID(),period,'2026-09-29'),owner),f.db.executor)).rejects.toThrow('CONFLICT');
});
it('denies payroll source reads after the current actor session is revoked',async()=>{
 await roster(601);let changed=false;
 const executor:SqlExecutor={...f.db.executor,transaction:async(statements,signal)=>{
  if(!changed&&statements.some(s=>s.text.includes(sourceSql))){changed=true;await f.q("DELETE FROM employee_sessions WHERE token_hash=repeat('a',64)");}
  return f.db.executor.transaction(statements,signal);
 }};
 await expect(capture(executor)).rejects.toThrow('authorization');expect(changed).toBe(true);
});
it('refuses source captured before a same-transaction logout when the final authority check runs',async()=>{
 await roster(601);let injected=false;
 const executor:SqlExecutor={...f.db.executor,transaction:async(statements,signal)=>{
  const index=statements.findIndex(s=>s.text.includes(sourceSql));
  if(!injected&&index>=0){injected=true;return f.db.executor.transaction([
   ...statements.slice(0,index+1),q("DELETE FROM employee_sessions WHERE token_hash=repeat('a',64)"),...statements.slice(index+1),
  ],signal);}
  return f.db.executor.transaction(statements,signal);
 }};
 await expect(capture(executor)).rejects.toThrow('authorization');expect(injected).toBe(true);
});
