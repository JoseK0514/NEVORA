import { expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => import('../db'));
import { ensureSchedule, insertShift, updateShift, deleteShift } from './schedules';
import type { GuardedWeekState } from './notification-transactions';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
const week='2030-10-07';
const shift={sourceShiftId:'s1',scheduleId:'a',weekStart:week,locationId:'loc-1',employeeId:'E',date:'2030-10-11',startTime:'09:00',endTime:'17:00',isDesignatedLead:false,isCalloutApproved:false,hasExchangeHistory:false};
function fixture(published=false) {
  const state:GuardedWeekState={schedules:[{id:'a',weekStart:week,locationId:'loc-1',status:published?'PUBLISHED':'DRAFT',updatedAt:'2030-10-07 12:00:00.111111+00'}],shifts:[{...shift}],revisions:published?[{id:'r1',weekStart:week,revisionNumber:1,sourceType:'PUBLISH',createdBy:'M',createdAt:'2030-10-07T11:00:00Z',shifts:[{...shift}]}]:[],acknowledgements:[],recipients:[{employeeId:'E',role:'EMPLOYEE',active:true,allowedLocationIds:['loc-1']}]};
  const batches:SqlStatement[][]=[];
  const executor:SqlExecutor={query:vi.fn(async statement=>statement.text.includes('AS state')?[{state:structuredClone(state),read_at:'2030-10-07 12:00:00.111112+00'}]:[{week_start:week}]) as SqlExecutor['query'],transaction:vi.fn(async statements=>{batches.push([...statements]);return statements.map(()=>[]);})};
  return {state,batches,executor};
}
const operations={insert:(executor:SqlExecutor)=>insertShift({scheduleId:'a',employeeId:'E',date:'2030-10-12',startTime:'09:00',endTime:'17:00',actorEmployeeId:'M'},executor),update:(executor:SqlExecutor)=>updateShift({shiftId:'s1',employeeId:'E',date:'2030-10-11',startTime:'10:00',endTime:'17:00',actorEmployeeId:'M'},executor),delete:(executor:SqlExecutor)=>deleteShift('s1','M',executor)};
it.each(Object.entries(operations))('draft %s touches exact schedule write version without creating a revision or notification',async(_,run)=>{
  const r=fixture();await run(r.executor);
  expect(r.batches).toHaveLength(1);expect(r.batches[0].some(s=>s.text.includes('UPDATE schedules')&&s.text.includes('updated_at'))).toBe(true);
  expect(r.batches[0].some(s=>s.text.includes('INSERT INTO schedule_publication_revisions')||s.text.includes('INSERT INTO notifications'))).toBe(false);
});
it.each(Object.entries(operations))('published %s commits business mutation and affected notification together',async(_,run)=>{
  const r=fixture(true);await run(r.executor);expect(r.batches).toHaveLength(1);
  expect(r.batches[0].some(s=>s.text.includes('INSERT INTO notifications'))).toBe(true);
  expect(r.batches[0].filter(s=>s.text.includes('INSERT INTO schedule_publication_revisions'))).toHaveLength(1);
});
it.each(Object.entries(operations))('draft %s racing publication recomputes into a published change',async(_,run)=>{
  const r=fixture();let attempts=0;
  vi.mocked(r.executor.transaction).mockImplementation(async statements=>{r.batches.push([...statements]);if(!attempts++){r.state.schedules[0].status='PUBLISHED';r.state.schedules[0].updatedAt='2030-10-07 12:00:00.111113+00';r.state.revisions=fixture(true).state.revisions;throw Object.assign(new Error('schedule_week_version_conflict'),{code:'22P02'});}return statements.map(()=>[]);});
  await run(r.executor);expect(attempts).toBe(2);expect(r.batches[0].some(s=>s.text.includes('INSERT INTO notifications'))).toBe(false);expect(r.batches[1].some(s=>s.text.includes('INSERT INTO notifications'))).toBe(true);
});
it('ensuring a schedule participates in the same week lock/version protocol',async()=>{
  const r=fixture();r.state.schedules=[];r.state.shifts=[];const id=await ensureSchedule({locationId:'loc-1',weekStart:week,createdBy:'M'},r.executor);
  expect(id).toBeTruthy();expect(r.batches[0].some(s=>s.text.includes('pg_advisory_xact_lock'))).toBe(true);expect(r.batches[0].some(s=>s.text.includes('INSERT INTO schedules'))).toBe(true);
});
it('delete with exchange history reports false without changing business state',async()=>{
  const r=fixture(true);r.state.shifts[0].hasExchangeHistory=true;
  expect(await deleteShift('s1','M',r.executor)).toBe(false);expect(r.batches).toHaveLength(0);
});
it.each(Object.entries(operations))('%s propagates one atomic batch failure without a successful result',async(_,run)=>{
  const r=fixture(true);vi.mocked(r.executor.transaction).mockRejectedValue(new Error('outbox insert failure'));
  await expect(run(r.executor)).rejects.toThrow('outbox insert failure');expect(r.executor.transaction).toHaveBeenCalledTimes(1);
});
it('draft mutations verify the actual resulting shift set before reporting success',async()=>{
  const r=fixture();await deleteShift('s1','M',r.executor);
  const deleteIndex=r.batches[0].findIndex(s=>s.text.includes('DELETE FROM shifts'));
  const verifyIndex=r.batches[0].findIndex(s=>s.text.includes('guarded_after'));
  expect(verifyIndex).toBeGreaterThan(deleteIndex);
});
it('reassigning back to the employee with the approved callout preserves the actual approved status',async()=>{
  const r=fixture(true);Object.assign(r.state.shifts[0],{employeeId:'F',isCalloutApproved:false,approvedCalloutEmployeeId:'E'});
  await updateShift({shiftId:'s1',employeeId:'E',date:'2030-10-11',startTime:'09:00',endTime:'17:00',actorEmployeeId:'M'},r.executor);
  const guard=r.batches[0].find(s=>s.text.includes('guarded_after'))!;
  expect(JSON.parse(String(guard.values[1]))[0].isCalloutApproved).toBe(true);
});
