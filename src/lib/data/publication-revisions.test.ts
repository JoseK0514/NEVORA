import { managementProof, schedulingSourceFixture } from '../../test/fixtures/management';
import {assignmentFacts} from './assignment-facts.test-support';
import { beforeEach, expect, it, vi } from 'vitest';
import { publishScheduleWithRevision } from './publication-revisions';
import { commitPublishedWeekChange, type GuardedWeekState } from './notification-transactions';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
const week = '2030-10-07';
const shift = { sourceShiftId:'s1', scheduleId:'a', weekStart:week, locationId:'loc-1', employeeId:'E', date:'2030-10-11', startTime:'09:00', endTime:'17:00', isDesignatedLead:false, isCalloutApproved:false, hasExchangeHistory:false };
function state(): GuardedWeekState {
  return { assignmentFacts:assignmentFacts(), schedules:[{id:'a',locationId:'loc-1',weekStart:week,status:'DRAFT',updatedAt:'2030-10-07 12:00:00.123456+00'}], shifts:[{...shift}], recipients:[{employeeId:'E',role:'EMPLOYEE',active:true,allowedLocationIds:['loc-1','loc-2']},{employeeId:'F',role:'LEAD',active:true,allowedLocationIds:['loc-1','loc-2']}], revisions:[], acknowledgements:[] };
}
function recorder(initial = state()) {
  const batches: SqlStatement[][] = [];
  const db = {state:initial};
  const executor: SqlExecutor = {
    query:vi.fn(async statement => statement.text.startsWith('SELECT id, name, time_zone') ? [{id:'test-workspace',name:'Test',active:true,timeZone:'America/Puerto_Rico',createdAt:'',updatedAt:'2030-01-01 00:00:00.123456+00'}] : [{state:structuredClone(db.state),source:schedulingSourceFixture(db.state),read_at:'2030-10-07 12:00:00.654321+00'}]) as SqlExecutor['query'],
    transaction:vi.fn(async statements => { batches.push([...statements]); return statements.map(() => []); }),
  };
  return {executor,batches,db};
}
function notificationValues(batch: SqlStatement[], purpose = 'EVENT') { return batch.filter(s=>s.text.includes('INSERT INTO notifications') && s.values[12]===purpose).map(s=>s.values); }
function published() {
  const s = state(); s.schedules[0].status='PUBLISHED';
  s.revisions=[{id:'r1',weekStart:week,revisionNumber:1,sourceType:'PUBLISH',createdBy:'M',createdAt:'2030-10-06T12:00:00Z',shifts:[{...shift}]}];
  s.acknowledgements=[{weekStart:week,employeeId:'E',revisionId:'r1'}];
  return s;
}
beforeEach(()=>{vi.stubEnv('PUSH_ENVIRONMENT','test');});
it('first publication commits update, actual immutable snapshot and durable intent in ordered batch', async()=>{
  const r=recorder();
  const result=await publishScheduleWithRevision({proof:managementProof('M'),locationId:'loc-1',weekStart:week,managerId:'M'},r.executor);
  expect(result.published).toBe(true);
  const texts=r.batches[0].map(s=>s.text);
  expect(texts.findIndex(s=>s.includes('UPDATE schedules'))).toBeLessThan(texts.findIndex(s=>s.includes('INSERT INTO schedule_publication_revisions')));
  expect(texts.findIndex(s=>s.includes('INSERT INTO schedule_publication_revision_shifts'))).toBeLessThan(texts.findIndex(s=>s.includes('INSERT INTO notifications')));
  expect(notificationValues(r.batches[0]).map(v=>[v[1],v[2]])).toEqual([['E','SCHEDULE_PUBLISHED']]);
  expect(notificationValues(r.batches[0],'REMINDER')).toHaveLength(1);
});
it.each(['notes','unchanged','other-location'])('%s preserves acknowledgement and effective reminder version',async mode=>{
  const s=published(); s.acknowledgements=[];
  if(mode==='notes') s.shifts[0].notes='new note';
  if(mode==='other-location') {s.schedules.push({id:'b',locationId:'loc-2',weekStart:week,status:'DRAFT',updatedAt:'2030-10-07 12:00:00.123456+00'});s.shifts.push({...shift,sourceShiftId:'s2',scheduleId:'b',locationId:'loc-2',employeeId:'F'});}
  const r=recorder(s); await publishScheduleWithRevision({proof:managementProof('M'),locationId:mode==='other-location'?'loc-2':'loc-1',weekStart:week,managerId:'M'},r.executor);
  expect(notificationValues(r.batches[0]).filter(v=>v[1]==='E')).toEqual([]);
  expect(notificationValues(r.batches[0],'REMINDER').find(v=>v[1]==='E')?.[11]).toBe('r1');
  expect(r.batches[0].some(s=>s.text.includes('DELETE FROM schedule_acknowledgements'))).toBe(false);
  if(mode==='other-location') expect(notificationValues(r.batches[0]).map(v=>[v[1],v[2]])).toEqual([['F','SCHEDULE_PUBLISHED']]);
});
it.each(['remove','reassign','lead','location','callout'])('%s notifies only meaningful former/new recipients and supersedes their pending work', async mode=>{
  const current=published(); if(mode==='lead') current.recipients[0].role='LEAD';
  const r=recorder(current);
  await commitPublishedWeekChange({weekStarts:[week],actorEmployeeId:'M',proof:managementProof('M'),sourceType:'MANAGER_MUTATION',build:s=>({statements:[{text:'BUSINESS',values:[]}],afterSchedules:s.schedules,afterShifts:mode==='remove'?[]:s.shifts.map(sh=>({...sh,...(mode==='reassign'?{employeeId:'F'}:mode==='lead'?{isDesignatedLead:true}:mode==='location'?{locationId:'loc-2'}:{isCalloutApproved:true})}))})},r.executor);
  expect(notificationValues(r.batches[0]).map(v=>v[1])).toEqual(mode==='reassign'?['E','F']:['E']);
  expect(r.batches[0].filter(s=>s.text.includes('cancelled_at')).map(s=>s.values[2])).toContain('E');
});
it('snapshot conflict recomputes from fresh microsecond versions and changed recipient access, at most three attempts',async()=>{
  const r=recorder(); let attempts=0;
  vi.mocked(r.executor.transaction).mockImplementation(async statements=>{r.batches.push([...statements]);if(++attempts<3){r.db.state.schedules[0].updatedAt='2030-10-07 12:00:00.123457+00';r.db.state.recipients[0].active=false;throw Object.assign(new Error('schedule_week_version_conflict'),{code:'22P02'});}return statements.map(()=>[]);});
  await publishScheduleWithRevision({proof:managementProof('M'),locationId:'loc-1',weekStart:week,managerId:'M'},r.executor);
  expect(attempts).toBe(3); expect(notificationValues(r.batches[2])).toEqual([]);
  expect(JSON.stringify(r.batches[0])).toContain('123456');expect(JSON.stringify(r.batches[2])).toContain('123457');
});
it('persistent guard failure stops after three full attempts; outbox failure is not retried or reported successful',async()=>{
  const r=recorder();vi.mocked(r.executor.transaction).mockRejectedValue(Object.assign(new Error('schedule_week_version_conflict'),{code:'22P02'}));
  await expect(publishScheduleWithRevision({proof:managementProof('M'),locationId:'loc-1',weekStart:week,managerId:'M'},r.executor)).rejects.toThrow('schedule_week_version_conflict');expect(r.executor.transaction).toHaveBeenCalledTimes(3);
  vi.mocked(r.executor.transaction).mockReset().mockRejectedValue(new Error('outbox failed'));
  await expect(publishScheduleWithRevision({proof:managementProof('M'),locationId:'loc-1',weekStart:week,managerId:'M'},r.executor)).rejects.toThrow('outbox failed');expect(r.executor.transaction).toHaveBeenCalledTimes(1);
});
it('multi-week changes acquire every unique week lock in sorted order before mutation',async()=>{
  const r=recorder(published());
  await commitPublishedWeekChange({weekStarts:['2030-10-14',week,week],actorEmployeeId:'M',sourceType:'EXCHANGE',build:s=>({statements:[{text:'SWAP',values:[]}],afterSchedules:s.schedules,afterShifts:s.shifts})},r.executor);
  expect(r.batches[0].filter(s=>s.text.includes('pg_advisory_xact_lock')).map(s=>s.values[0])).toEqual([week,'2030-10-14']);
  expect(r.batches[0].findIndex(s=>s.text==='SWAP')).toBeGreaterThan(r.batches[0].findLastIndex(s=>s.text.includes('pg_advisory_xact_lock')));
});
it('two publishing managers rebuild the loser and emit only the first personal publication',async()=>{
  const r=recorder();let tail=Promise.resolve();
  vi.mocked(r.executor.transaction).mockImplementation(async statements=>{
    let release!:()=>void;const prior=tail;tail=new Promise<void>(resolve=>{release=resolve;});await prior;
    try {
      r.batches.push([...statements]);
      const guard=statements.find(s=>s.text.includes(' AS guarded'))!;
      if(JSON.stringify(r.db.state)!==String(guard.values[1])) throw Object.assign(new Error('schedule_week_version_conflict'),{code:'22P02'});
      r.db.state.schedules[0].status='PUBLISHED';r.db.state.schedules[0].updatedAt+='1';
      const revision=statements.find(s=>s.text.includes('INSERT INTO schedule_publication_revisions'))!;
      r.db.state.revisions.push({id:String(revision.values[0]),weekStart:week,revisionNumber:Number(revision.values[2]),sourceType:'PUBLISH',createdBy:String(revision.values[5]),createdAt:String(revision.values[6]),shifts:[{...shift}]});
      return statements.map(()=>[]);
    } finally { release(); }
  });
  const results=await Promise.all(['M','N'].map(managerId=>publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId,proof:managementProof(managerId)},r.executor)));
  expect(results.every(r=>r.published)).toBe(true);expect(r.batches).toHaveLength(3);
  expect(notificationValues(r.batches.at(-1)!)).toEqual([]);expect(r.db.state.revisions.map(r=>r.revisionNumber)).toEqual([1,2]);
});
it('a two-week manual swap produces separate actual revisions and former/new-recipient intents in one transaction',async()=>{
  const s=published(); const next='2030-10-14';
  s.schedules.push({...s.schedules[0],id:'b',weekStart:next});s.shifts.push({...shift,sourceShiftId:'s2',scheduleId:'b',weekStart:next,date:'2030-10-18',employeeId:'F'});
  s.revisions.push({...s.revisions[0],id:'r2',weekStart:next,shifts:[{...s.shifts[1]}]});const r=recorder(s);
  const result=await commitPublishedWeekChange({weekStarts:[next,week],actorEmployeeId:'M',sourceType:'EXCHANGE',build:state=>({statements:[{text:'MANUAL SWAP',values:[]}],afterSchedules:state.schedules,afterShifts:state.shifts.map(sh=>({...sh,employeeId:sh.employeeId==='E'?'F':'E'}))})},r.executor);
  expect(result.revisions.map(r=>r.weekStart)).toEqual([week,next]);expect(r.batches).toHaveLength(1);
  expect(notificationValues(r.batches[0]).map(v=>[v[9],v[1]])).toEqual([[week,'E'],[week,'F'],[next,'E'],[next,'F']]);
});
it('outbox insert failure leaves the staged business publication and immutable revision uncommitted',async()=>{
  const r=recorder();let committed=structuredClone(r.db.state);
  vi.mocked(r.executor.transaction).mockImplementation(async statements=>{
    const staged=structuredClone(committed);
    for(const statement of statements){
      if(statement.text.includes("SET status='PUBLISHED'")) staged.schedules[0].status='PUBLISHED';
      if(statement.text.includes('INSERT INTO notifications')) throw new Error('outbox storage failure');
    }
    committed=staged;return statements.map(()=>[]);
  });
  await expect(publishScheduleWithRevision({proof:managementProof('M'),locationId:'loc-1',weekStart:week,managerId:'M'},r.executor)).rejects.toThrow('outbox storage failure');
  expect(committed.schedules[0].status).toBe('DRAFT');expect(committed.revisions).toEqual([]);expect(r.executor.transaction).toHaveBeenCalledTimes(1);
});
it('publication retains the schedule source and affected-location metadata',async()=>{
  const r=recorder();const result=await publishScheduleWithRevision({proof:managementProof('M'),locationId:'loc-1',weekStart:week,managerId:'M'},r.executor);
  expect(result.revision).toMatchObject({sourceId:'a',affectedLocationId:'loc-1'});
});

import { listCapturedShiftPositions } from './publication-revisions';
it('reads latest captured identities for the exact week/shift batch and projects only position context',async()=>{
  const query=vi.fn(async(_statement:SqlStatement)=>[
    {source_shift_id:'archived',position_id:'cashier',position_name:'Original Cashier',notes:'PRIVATE',employee_id:'PRIVATE'},
    {source_shift_id:'positionless',position_id:null,position_name:null},
  ]);
  const executor:SqlExecutor={query:query as SqlExecutor['query'],transaction:vi.fn()};
  expect(await listCapturedShiftPositions({weekStart:week,shiftIds:['archived','positionless','archived']},executor)).toEqual([
    {sourceShiftId:'archived',positionId:'cashier',positionName:'Original Cashier'},
    {sourceShiftId:'positionless',positionId:undefined,positionName:undefined},
  ]);
  expect(query).toHaveBeenCalledTimes(1);
  const statement=query.mock.calls[0][0] as SqlStatement;
  expect(statement.values).toEqual([week,['archived','positionless']]);
  const sql=statement.text.replace(/\s+/g,' ');
  expect(sql).toContain('DISTINCT ON (sh.source_shift_id)');
  expect(sql).toContain('r.week_start = $1');
  expect(sql).toContain('sh.source_shift_id = ANY($2::text[])');
  expect(sql).toContain('ORDER BY sh.source_shift_id, r.revision_number DESC, r.id DESC, sh.id DESC');
  expect(executor.transaction).not.toHaveBeenCalled();
});
it('an empty non-Draft identity batch performs no history read or writes',async()=>{
  const executor:SqlExecutor={query:vi.fn(),transaction:vi.fn()};
  expect(await listCapturedShiftPositions({weekStart:week,shiftIds:[]},executor)).toEqual([]);
  expect(executor.query).not.toHaveBeenCalled();expect(executor.transaction).not.toHaveBeenCalled();
});

// These business/unit fixtures do not execute SQL. Current scope admission and
// rollback are exercised by company-access-schedule-*.integration.ts.
vi.mock('@/lib/company-access/operational-scope.server',async original=>({...await original<Record<string,unknown>>(),assertOperationalAccess:async()=>({scope:{mode:'COMPANY',locationIds:[]},workspace:{id:'test-workspace',name:'Fictional',active:true,timeZone:'America/Puerto_Rico',createdAt:'',updatedAt:'2030-01-01 00:00:00.123456+00'}})}));
