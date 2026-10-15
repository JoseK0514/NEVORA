import {managementProof} from '../../test/fixtures/management';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ getDb: () => ({ query: async () => [{ id: 'legacy' }] }), queryRows: (value: unknown) => value }));
import { approveCoverageExchange, approveSwapExchange, cancelExchange, claimCoverage, createCoverageOffer, createSwapProposal, denyExchange, respondToSwap } from './shift-change-compat.test-support';
import { fixture, intents, week } from './shift-change-compat.test-support';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2030-10-07T12:00:00Z')); });
afterEach(() => vi.useRealTimers());
const transitions = [
  { name: 'claim', status: 'OPEN', run: claimCoverage, input: { exchangeId: 'request-1', employeeId: 'F' }, expected: [['M','SUMMARY'],['O','SUMMARY']] },
  { name: 'decline', status: 'EMPLOYEE_PENDING', run: respondToSwap, input: { exchangeId: 'request-1', employeeId: 'F', accept: false }, expected: [['E','EVENT']] },
  { name: 'accept', status: 'EMPLOYEE_PENDING', run: respondToSwap, input: { exchangeId: 'request-1', employeeId: 'F', accept: true }, expected: [['M','SUMMARY'],['O','SUMMARY']] },
  { name: 'deny', status: 'MANAGER_PENDING', run: denyExchange, input: { exchangeId: 'request-1', managerId: 'M' }, expected: [['E','EVENT'],['F','EVENT']] },
  { name: 'cancel', status: 'EMPLOYEE_PENDING', run: cancelExchange, input: { exchangeId: 'request-1', employeeId: 'E' }, expected: [['F','EVENT']] },
] as const;
it.each(transitions)('$name emits only the authorized transition recipients', async ({ name, status, run, input, expected }) => {
  const r=fixture('EXCHANGE',status); if (['decline','accept','cancel'].includes(name)) r.row.kind='SWAP';
  expect(await run(input as never,r.executor)).toBe(true); expect(r.batches).toHaveLength(1);
  expect(intents(r.batches[0]).filter(n=>n.kind==='EXCHANGE').map(n=>[n.employee,n.purpose])).toEqual(expected);
  expect(r.batches[0].some(s=>s.text.includes('request_transition_conflict'))).toBe(true);
  expect(r.batches[0].some(s=>s.text.includes('push_deliveries'))).toBe(true);
});
it.each(transitions)('$name cannot report success after request status races or outbox failure', async ({ name, status, run, input }) => {
  const r=fixture('EXCHANGE',status); if (['decline','accept','cancel'].includes(name)) r.row.kind='SWAP';
  vi.mocked(r.executor.transaction).mockRejectedValue(Object.assign(new Error('request_transition_conflict'),{code:'22P02'}));
  expect(await run(input as never,r.executor)).toBe(false);
  vi.mocked(r.executor.transaction).mockRejectedValueOnce(Object.assign(new Error('outbox failure'),{code:'23514'}));
  await expect(run(input as never,r.executor)).rejects.toThrow('outbox failure');
});
it('open coverage queues only manager summary seeds; swap proposal asks only its target', async()=>{
  const r=fixture('EXCHANGE','OPEN');
  await createCoverageOffer({sourceShiftId:'s1',requestedByEmployeeId:'E'},r.executor);
  expect(r.batches).toHaveLength(1); expect(intents(r.batches[0]).map(n=>[n.employee,n.purpose])).toEqual([['M','SUMMARY'],['O','SUMMARY']]);
  r.state.shifts.push({...r.state.shifts[0],sourceShiftId:'s2',employeeId:'F'});
  r.state.revisions[0].shifts.push({...r.state.shifts[1]});
  await createSwapProposal({sourceShiftId:'s1',targetShiftId:'s2',requestedByEmployeeId:'E',targetEmployeeId:'F'},r.executor);
  expect(intents(r.batches[1]).map(n=>[n.employee,n.purpose])).toEqual([['F','EVENT']]);
});
it('coverage approval uses the common actual snapshot, preserves unaffected acknowledgement, and recomputes callout/lead flags',async()=>{
  const r=fixture('EXCHANGE','MANAGER_PENDING'); r.state.shifts[0].isCalloutApproved=true; r.state.shifts[0].approvedCalloutEmployeeId='E' as never;
  expect(await approveCoverageExchange({exchangeId:'request-1',managerId:'M'},r.executor)).toBe(true);
  const b=r.batches[0]; expect(b.filter(s=>s.text.includes('INSERT INTO schedule_publication_revisions'))).toHaveLength(1);
  expect(b.some(s=>s.text.includes('INSERT INTO schedule_publication_revision_shifts')&&s.text.includes('SELECT'))).toBe(true);
  expect(b.some(s=>s.text.includes('DELETE FROM schedule_acknowledgements'))).toBe(false);
  const after=JSON.parse(String(b.find(s=>s.text.includes('guarded_after'))!.values[1]));
  expect(after[0]).toMatchObject({employeeId:'F',isDesignatedLead:true,isCalloutApproved:false});
  expect(intents(b).filter(n=>n.kind==='EXCHANGE').map(n=>n.employee)).toEqual(['E','F']);
  expect(b.filter(s=>s.text.includes("source_kind='SCHEDULE'")).map(s=>s.values[2])).toEqual(['E','F']);
});
it('H01 cross-owning-week swap is rejected before any transaction',async()=>{
  const r=fixture('EXCHANGE','MANAGER_PENDING'); r.row.kind='SWAP';
  Object.assign(r.row,{target_shift_id:'s2',target_schedule_id:'b',target_shift_employee_id:'F',target_location_id:'L',target_week_start:'2030-10-14',target_date:'2030-10-18',target_start_time:'09:00',target_end_time:'17:00'});
  r.state.schedules.push({...r.state.schedules[0],id:'b',weekStart:'2030-10-14'});
  r.state.shifts.push({...r.state.shifts[0],sourceShiftId:'s2',scheduleId:'b',employeeId:'F',weekStart:'2030-10-14',date:'2030-10-18',isDesignatedLead:false});
  expect(await approveSwapExchange({exchangeId:'request-1',managerId:'M'},r.executor)).toBe(false);
  expect(r.batches).toEqual([]);
});
it.each([approveCoverageExchange,approveSwapExchange])('approval fails atomically for a conditional no-op', async run=>{
  const r=fixture('EXCHANGE','MANAGER_PENDING');
  if(run===approveSwapExchange){r.row.kind='SWAP'; Object.assign(r.row,{target_shift_id:'s2',target_schedule_id:'a',target_shift_employee_id:'F',target_location_id:'L',target_week_start:week,target_date:'2030-10-11',target_start_time:'09:00',target_end_time:'17:00'});r.state.shifts.push({...r.state.shifts[0],sourceShiftId:'s2',employeeId:'F'});}
  vi.mocked(r.executor.transaction).mockRejectedValue(Object.assign(new Error('request_transition_conflict'),{code:'22P02'}));
  expect(await run({exchangeId:'request-1',managerId:'M'},r.executor)).toBe(false);
});
it('manager summary recipient access is locked before the eligibility lock and business write',async()=>{
 const r=fixture('EXCHANGE','OPEN');await createCoverageOffer({sourceShiftId:'s1',requestedByEmployeeId:'E'},r.executor);
 const b=r.batches[0];const lock=b.findIndex(s=>s.text.includes('LOCK TABLE employees IN SHARE ROW EXCLUSIVE'));
 expect(lock).toBeGreaterThanOrEqual(0);expect(b.findIndex(s=>s.text.includes('LOCK TABLE employees IN SHARE ROW EXCLUSIVE'))).toBeLessThan(b.findIndex(s=>s.text.includes('LOCK TABLE employee_location_eligibility')));
});
it.each(transitions)('$name repeated/resolved transition is a no-op',async ({run,input})=>{
 const r=fixture('EXCHANGE','APPROVED');expect(await run(input as never,r.executor)).toBe(false);expect(r.executor.transaction).not.toHaveBeenCalled();
});
it.each(['coverage','swap'] as const)('%s creation rejects invalid ownership and atomic batch failures',async kind=>{
 const r=fixture('EXCHANGE','OPEN');r.state.shifts.push({...r.state.shifts[0],sourceShiftId:'s2',employeeId:'F'});r.state.revisions[0].shifts.push({...r.state.shifts[1]});
 const run=()=>kind==='coverage'?createCoverageOffer({sourceShiftId:'s1',requestedByEmployeeId:'E'},r.executor):createSwapProposal({sourceShiftId:'s1',targetShiftId:'s2',requestedByEmployeeId:'E',targetEmployeeId:'F'},r.executor);
 vi.mocked(r.executor.transaction).mockRejectedValueOnce(Object.assign(new Error('outbox failure'),{code:'23514'}));await expect(run()).rejects.toThrow('outbox failure');
 r.state.shifts[0].employeeId='Z';vi.mocked(r.executor.transaction).mockClear();await expect(run()).rejects.toThrow('Current reviewed command');expect(r.executor.transaction).not.toHaveBeenCalled();
});
it('coverage reassignment back to an earlier approved callout owner does not revive an earlier episode release',async()=>{
 const r=fixture('EXCHANGE','MANAGER_PENDING');r.row.target_employee_id='E';r.row.requested_by_employee_id='F';r.row.source_employee_id='F';Object.assign(r.state.shifts[0],{employeeId:'F',approvedCalloutEmployeeId:'E',isCalloutApproved:false});
 expect(await approveCoverageExchange({exchangeId:'request-1',managerId:'M'},r.executor)).toBe(true);
 expect(JSON.parse(String(r.batches[0].find(s=>s.text.includes('guarded_after'))!.values[1]))[0]).toMatchObject({employeeId:'E',isDesignatedLead:true,isCalloutApproved:false});
});
it.each([approveCoverageExchange,approveSwapExchange])('completed approvals do not produce duplicate outcomes',async run=>{
 const r=fixture('EXCHANGE','APPROVED');expect(await run({exchangeId:'request-1',managerId:'M'},r.executor)).toBe(false);expect(r.executor.transaction).not.toHaveBeenCalled();
});
it('missing optional request-recipient lock IDs retains the Task 5 assignment lock scope',async()=>{
 const { commitPublishedWeekChange }=await import('./notification-transactions');const r=fixture('EXCHANGE','OPEN');
 await commitPublishedWeekChange({weekStarts:[week],actorEmployeeId:'M',proof:managementProof('M'),sourceType:'MANAGER_MUTATION',build:state=>({statements:[{text:'SELECT 1',values:[]}],afterSchedules:state.schedules,afterShifts:state.shifts})},r.executor);
 expect(r.batches[0].find(s=>s.text.includes('FROM employees')&&s.text.includes('FOR SHARE'))!.values[0]).toEqual(['E','M']);
});
it('published outcome returns with a stalled provider and without any provider request',async()=>{
 const provider=vi.fn(()=>new Promise(()=>{}));vi.stubGlobal('fetch',provider);const r=fixture('EXCHANGE','MANAGER_PENDING');
 try{expect(await approveCoverageExchange({exchangeId:'request-1',managerId:'M'},r.executor)).toBe(true);expect(provider).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();}
});
it('decision recipients use the guarded current shift location rather than the earlier request read',async()=>{
 const r=fixture('EXCHANGE','MANAGER_PENDING');r.state.shifts[0].locationId='NEW';r.state.schedules[0].locationId='NEW';r.state.revisions[0].shifts[0].locationId='NEW';
 expect(await denyExchange({exchangeId:'request-1',managerId:'M'},r.executor)).toBe(true);
 expect(intents(r.batches[0]).filter(n=>n.kind==='EXCHANGE')).toEqual([]);
});
it('coverage preserves its assigned position and blocks an unqualified incoming employee',async()=>{
 const r=fixture('EXCHANGE','MANAGER_PENDING');r.state.shifts[0].positionId='barista';r.row.source_position_id='barista';
 expect(await approveCoverageExchange({exchangeId:'request-1',managerId:'M'},r.executor)).toBe(true);
 expect(JSON.parse(String(r.batches[0].find(s=>s.text.includes('guarded_after'))!.values[1]))[0]).toMatchObject({employeeId:'F',positionId:'barista'});
 r.state.assignmentFacts.memberships=r.state.assignmentFacts.memberships.filter(m=>m.employeeId!=='F');
 expect(await approveCoverageExchange({exchangeId:'request-1',managerId:'M'},r.executor)).toBe(false);
 expect(r.batches).toHaveLength(1);
});
it('unrelated request denial preserves an inactive historical position and employee',async()=>{
 const r=fixture('EXCHANGE','MANAGER_PENDING');r.state.shifts[0].positionId='barista';r.state.assignmentFacts.positions[0].active=false;r.state.assignmentFacts.locations[0].active=false;r.state.recipients[0].active=false;
 expect(await denyExchange({exchangeId:'request-1',managerId:'M'},r.executor)).toBe(true);
 expect(JSON.parse(String(r.batches[0].find(s=>s.text.includes('guarded_after'))!.values[1]))[0]).toMatchObject({employeeId:'E',positionId:'barista'});
});

function positionedSwapFixture() {
  const r = fixture('EXCHANGE', 'MANAGER_PENDING');
  Object.assign(r.row, {
    kind: 'SWAP', source_position_id: 'barista', target_position_id: 'cashier',
    target_shift_id: 's2', target_schedule_id: 'b', target_shift_employee_id: 'F',
    target_location_id: 'L', target_week_start: week, target_date: '2030-10-12',
    target_start_time: '09:00', target_end_time: '17:00',
  });
  r.state.shifts[0].positionId = 'barista';
  r.state.revisions[0].shifts[0].positionId = 'barista';
  r.state.schedules.push({ ...r.state.schedules[0], id: 'b', weekStart: week });
  r.state.shifts.push({
    ...r.state.shifts[0], sourceShiftId: 's2', scheduleId: 'b', employeeId: 'F',
    weekStart: week, date: '2030-10-12', isDesignatedLead: false, positionId: 'cashier',
  });
  r.state.revisions.push({
    ...r.state.revisions[0], id: 'r2', weekStart: week, shifts: [{ ...r.state.shifts[1] }],
  });
  return r;
}

it('two-leg swap retains each source position while reassigning both employees atomically', async () => {
  const r = positionedSwapFixture();
  expect(await approveSwapExchange({ exchangeId: 'request-1', managerId: 'M' }, r.executor)).toBe(true);
  expect(r.batches).toHaveLength(1);
  const batch = r.batches[0];
  const after = JSON.parse(String(batch.find(s => s.text.includes('guarded_after'))!.values[1]));
  expect(after).toEqual([
    expect.objectContaining({ sourceShiftId: 's1', employeeId: 'F', positionId: 'barista' }),
    expect.objectContaining({ sourceShiftId: 's2', employeeId: 'E', positionId: 'cashier' }),
  ]);
  expect(batch.filter(s => s.text.includes('UPDATE shifts')).map(s => s.values.slice(0, 2))).toEqual([['s1', 'F'], ['s2', 'E']]);
  // Publication revisions are per owning week, shared by both valid swap legs.
  expect(batch.filter(s => s.text.includes('INSERT INTO schedule_publication_revisions'))).toHaveLength(1);
  expect(intents(batch).filter(intent => intent.kind === 'EXCHANGE').map(intent => intent.employee)).toEqual(['E', 'F']);
});

it.each([
  { incomingEmployeeId: 'F', requiredPositionId: 'barista' },
  { incomingEmployeeId: 'E', requiredPositionId: 'cashier' },
])('two-leg swap rejects missing $incomingEmployeeId / $requiredPositionId qualification before any business batch', async ({ incomingEmployeeId, requiredPositionId }) => {
  const r = positionedSwapFixture();
  r.state.assignmentFacts.memberships = r.state.assignmentFacts.memberships.filter(
    membership => membership.employeeId !== incomingEmployeeId || membership.positionId !== requiredPositionId,
  );
  const before = structuredClone(r.state);
  expect(await approveSwapExchange({ exchangeId: 'request-1', managerId: 'M' }, r.executor)).toBe(false);
  expect(r.executor.transaction).not.toHaveBeenCalled();
  expect(r.batches).toEqual([]);
  expect(r.state).toEqual(before);
});

// These business/unit fixtures do not execute SQL. Current scope admission and
// rollback are exercised by company-access-schedule-*.integration.ts.
vi.mock('@/lib/company-access/operational-scope.server',async original=>({...await original<Record<string,unknown>>(),assertOperationalAccess:async()=>({scope:{mode:'COMPANY',locationIds:[]},workspace:{id:'test-workspace',name:'Fictional',active:true,timeZone:'America/Puerto_Rico',createdAt:'',updatedAt:'2030-01-01 00:00:00.123456+00'}})}));
