import { managementProof, schedulingSourceFixture } from '../../test/fixtures/management';
import {assignmentFacts} from './assignment-facts.test-support';
import { expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => import('../db'));
import { ensureSchedule, insertShift, updateShift, deleteShift } from './schedules';
import type { GuardedWeekState } from './notification-transactions';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
const week='2030-10-07';
const shift={sourceShiftId:'s1',scheduleId:'a',weekStart:week,locationId:'loc-1',employeeId:'E',date:'2030-10-11',startTime:'09:00',endTime:'17:00',isDesignatedLead:false,isCalloutApproved:false,hasExchangeHistory:false};
function fixture(published=false) {
  const state:GuardedWeekState={assignmentFacts:assignmentFacts(),schedules:[{id:'a',weekStart:week,locationId:'loc-1',status:published?'PUBLISHED':'DRAFT',updatedAt:'2030-10-07 12:00:00.111111+00'}],shifts:[{...shift}],revisions:published?[{id:'r1',weekStart:week,revisionNumber:1,sourceType:'PUBLISH',createdBy:'M',createdAt:'2030-10-07T11:00:00Z',shifts:[{...shift}]}]:[],acknowledgements:[],recipients:[{employeeId:'E',role:'EMPLOYEE',active:true,allowedLocationIds:['loc-1']}]};
  const batches:SqlStatement[][]=[];
  const executor:SqlExecutor={query:vi.fn(async statement=>statement.text.startsWith('SELECT id, name, time_zone')?[{id:'test-workspace',name:'Test',active:true,timeZone:'America/Puerto_Rico',createdAt:'',updatedAt:'2030-01-01 00:00:00.123456+00'}]:statement.text.includes('AS state')?[{state:structuredClone(state),source:schedulingSourceFixture(state),read_at:'2030-10-07 12:00:00.111112+00'}]:[{week_start:week,location_id:'loc-1',status:state.schedules[0]?.status??'DRAFT'}]) as SqlExecutor['query'],transaction:vi.fn(async statements=>{batches.push([...statements]);return statements.map(()=>[]);})};
  return {state,batches,executor};
}
const operations={insert:(executor:SqlExecutor)=>insertShift({proof:managementProof('M'),scheduleId:'a',employeeId:'E',date:'2030-10-12',startTime:'09:00',endTime:'17:00',actorEmployeeId:'M'},executor),update:(executor:SqlExecutor)=>updateShift({proof:managementProof('M'),shiftId:'s1',employeeId:'E',date:'2030-10-11',startTime:'10:00',endTime:'17:00',actorEmployeeId:'M'},executor),delete:(executor:SqlExecutor)=>deleteShift('s1',managementProof('M'),executor)};
it.each(Object.entries(operations))('draft %s touches exact schedule write version without creating a revision or notification',async(_,run)=>{
  const r=fixture();await run(r.executor);
  expect(r.batches).toHaveLength(1);expect(r.batches[0].some(s=>s.text.includes('UPDATE schedules')&&s.text.includes('updated_at'))).toBe(true);
  expect(r.batches[0].some(s=>s.text.includes('INSERT INTO schedule_publication_revisions')||s.text.includes('INSERT INTO notifications'))).toBe(false);
});
const held=(batch:SqlStatement[])=>batch.filter(s=>s.text.includes('INSERT INTO schedule_pending_edits')).flatMap(s=>JSON.parse(String(s.values[2])) as {kind:string;shift_id:string;week_start:string;before_snapshot:unknown;after_snapshot:unknown}[]);
// Publish changes (Jose, 2026-10-29): an edit to a published week is held. It
// used to publish and notify immediately; now it writes the live row and one
// history row in the same transaction, and nothing is published or sent.
it.each([['insert','CREATE'],['update','UPDATE'],['delete','DELETE']] as const)('published %s is held: live write and %s history together, no revision, notification or supersede',async(name,kind)=>{
  const r=fixture(true);await operations[name](r.executor);expect(r.batches).toHaveLength(1);
  expect(r.batches[0].some(s=>s.text.includes('INSERT INTO notifications'))).toBe(false);
  expect(r.batches[0].some(s=>s.text.includes('INSERT INTO schedule_publication_revisions')||s.text.includes('calendar_capture_removals')||s.text.includes('cancelled_at'))).toBe(false);
  const rows=held(r.batches[0]);expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({kind,week_start:week,...(kind==='CREATE'?{before_snapshot:null}:{shift_id:'s1',before_snapshot:expect.objectContaining({startTime:'09:00',employeeId:'E'})}),...(kind==='DELETE'?{after_snapshot:null}:{after_snapshot:expect.objectContaining({employeeId:'E'})})});
  const verify=r.batches[0].findIndex(s=>s.text.includes('guarded_after'));
  expect(r.batches[0].findIndex(s=>s.text.includes('INSERT INTO schedule_pending_edits'))).toBeGreaterThan(verify);
});
it.each(Object.entries(operations))('draft %s records no held-edit history',async(_,run)=>{
  const r=fixture();await run(r.executor);expect(held(r.batches[0])).toEqual([]);
});
it.each(Object.entries(operations))('draft %s racing publication recomputes into a held change',async(_,run)=>{
  const r=fixture();let attempts=0;
  vi.mocked(r.executor.transaction).mockImplementation(async statements=>{r.batches.push([...statements]);if(!attempts++){r.state.schedules[0].status='PUBLISHED';r.state.schedules[0].updatedAt='2030-10-07 12:00:00.111113+00';r.state.revisions=fixture(true).state.revisions;throw Object.assign(new Error('schedule_week_version_conflict'),{code:'22P02'});}return statements.map(()=>[]);});
  // The retry sees a published week, so the same edit is now held (history, no notification) rather than published.
  await run(r.executor);expect(attempts).toBe(2);expect(r.batches[0].some(s=>s.text.includes('INSERT INTO notifications'))).toBe(false);expect(r.batches[1].some(s=>s.text.includes('INSERT INTO notifications'))).toBe(false);
  expect(held(r.batches[0])).toEqual([]);expect(held(r.batches[1])).toHaveLength(1);
});
it('ensuring a schedule participates in the same week lock/version protocol',async()=>{
  const r=fixture();r.state.schedules=[];r.state.shifts=[];const id=await ensureSchedule({proof:managementProof('M'),locationId:'loc-1',weekStart:week,createdBy:'M'},r.executor);
  expect(id).toBeTruthy();expect(r.batches[0].some(s=>s.text.includes('pg_advisory_xact_lock'))).toBe(true);expect(r.batches[0].some(s=>s.text.includes('INSERT INTO schedules'))).toBe(true);
});
it('delete with exchange history reports false without changing business state',async()=>{
  const r=fixture(true);r.state.shifts[0].hasExchangeHistory=true;
  expect(await deleteShift('s1',managementProof('M'),r.executor)).toBe(false);expect(r.batches).toHaveLength(0);
});
it.each(Object.entries(operations))('%s propagates one atomic batch failure without a successful result',async(_,run)=>{
  const r=fixture(true);vi.mocked(r.executor.transaction).mockRejectedValue(new Error('outbox insert failure'));
  await expect(run(r.executor)).rejects.toThrow('outbox insert failure');expect(r.executor.transaction).toHaveBeenCalledTimes(1);
});
it('draft mutations verify the actual resulting shift set before reporting success',async()=>{
  const r=fixture();await deleteShift('s1',managementProof('M'),r.executor);
  const deleteIndex=r.batches[0].findIndex(s=>s.text.includes('DELETE FROM shifts'));
  const verifyIndex=r.batches[0].findIndex(s=>s.text.includes('guarded_after'));
  expect(verifyIndex).toBeGreaterThan(deleteIndex);
});
it('reassigning back to the original employee does not revive a prior assignment episode release',async()=>{
  const r=fixture(true);Object.assign(r.state.shifts[0],{employeeId:'F',isCalloutApproved:false,approvedCalloutEmployeeId:'E'});
  await updateShift({proof:managementProof('M'),shiftId:'s1',employeeId:'E',date:'2030-10-11',startTime:'09:00',endTime:'17:00',actorEmployeeId:'M'},r.executor);
  const guard=r.batches[0].find(s=>s.text.includes('guarded_after'))!;
  expect(JSON.parse(String(guard.values[1]))[0].isCalloutApproved).toBe(false);
});
it('create carries position into the write and resulting canonical assignment',async()=>{
 const r=fixture();await insertShift({...{scheduleId:'a',employeeId:'E',date:'2030-10-12',startTime:'09:00',endTime:'17:00',actorEmployeeId:'M',proof:managementProof('M')},positionId:'barista'},r.executor);
 const guard=r.batches[0].find(s=>s.text.includes('guarded_after'))!;
 expect(JSON.parse(String(guard.values[1])).find((s:{sourceShiftId:string})=>s.sourceShiftId!=='s1').positionId).toBe('barista');
 expect(r.batches[0].find(s=>s.text.includes('INSERT INTO shifts'))?.values).toContain('barista');
});
it.each([{value:undefined,want:'barista'},{value:null,want:null},{value:'',want:null},{value:'cashier',want:'cashier'}])('edit position $value retains or clears explicitly',async({value,want})=>{
 const r=fixture(true);r.state.shifts[0].positionId='barista';Object.assign(r.state.revisions[0].shifts[0],{positionId:'barista'});
 await updateShift({proof:managementProof('M'),shiftId:'s1',employeeId:'E',date:'2030-10-11',startTime:'09:00',endTime:'17:00',actorEmployeeId:'M',...(value!==undefined?{positionId:value}:{})},r.executor);
 const guard=r.batches[0].find(s=>s.text.includes('guarded_after'))!;
 expect(JSON.parse(String(guard.values[1]))[0].positionId).toBe(want);
 // A published edit is held: a changed position records history instead of notifying now.
 expect(r.batches[0].some(s=>s.text.includes('INSERT INTO notifications'))).toBe(false);
 expect(held(r.batches[0]).length).toBe(want!=='barista'?1:0);
});

// These business/unit fixtures do not execute SQL. Current scope admission and
// rollback are exercised by company-access-schedule-*.integration.ts.
vi.mock('@/lib/company-access/operational-scope.server',async original=>({...await original<Record<string,unknown>>(),assertOperationalAccess:async()=>({scope:{mode:'COMPANY',locationIds:[]},workspace:{id:'test-workspace',name:'Fictional',active:true,timeZone:'America/Puerto_Rico',createdAt:'',updatedAt:'2030-01-01 00:00:00.123456+00'}})}));
