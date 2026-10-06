import { describe, expect, it } from 'vitest';
import { calculateScheduleHealth } from './schedule-health';
import { validateShift } from './validate-shift';
const workspace = { id: 'w', active: true, timeZone: 'America/New_York' };
const location = { id: 'l', workspaceId: 'w', active: true };
const barista = { id: 'b', workspaceId: 'w', name: 'Barista', active: true, createdAt: '', updatedAt: '' };
const cashier = { ...barista, id: 'c', name: 'Cashier' };
const employee = { id: 'sam', name: 'Sam', role: 'LEAD' as const, active: true, eligibleLocationIds: ['l'], positionIds: ['b', 'c'] };
const shift = { id: 's', employeeId: 'sam', locationId: 'l', date: '2026-10-05', startTime: '08:00', endTime: '12:00', positionId: 'b', isDesignatedLead: true };
const window = { locationId: 'l', dayOfWeek: 1, startTime: '08:00', endTime: '12:00', positionRequirements: [{positionId:'b',quantity:1},{positionId:'c',quantity:1}] };
const healthInput = { workspace, positions: [barista,cashier], locations: [{...location,name:'Shop',minimumStaffPerShift:1,requiresDesignatedLead:true}], employees:[employee], shifts:[shift], coverageWindows:[window] };
const validationInput = { workspace, location, position:barista, candidate:shift, employee, existingShifts:[], availability:Array.from({length:7},(_,dayOfWeek)=>({dayOfWeek,startTime:'00:00',endTime:'24:00'})), approvedTimeOff:[] };
describe('explicit assigned position coverage',()=>{
 it('assigned position and orthogonal Lead; quota sum exceeds overall minimum',()=>{
  const result=calculateScheduleHealth(healthInput), block=result.coverageBlocks[0];
  expect(block).toMatchObject({assignedStaff:1,leadCovered:true,covered:false,positionsCovered:false});
  expect(block.positionCoverage).toEqual([{positionId:'b',positionName:'Barista',assigned:1,required:1,missing:0},{positionId:'c',positionName:'Cashier',assigned:0,required:1,missing:1}]);
  expect(result.issues).toContainEqual(expect.objectContaining({code:'POSITION_COVERAGE_GAP'}));
 });
 it('positionless staff never receive inferred position credit',()=>{
  const block=calculateScheduleHealth({...healthInput,shifts:[{...shift,positionId:undefined}]}).coverageBlocks[0];
  expect(block).toMatchObject({assignedStaff:1,leadCovered:true});
  expect(block.positionCoverage?.map(p=>p.assigned)).toEqual([0,0]);
 });
 it('duplicate same-position records count once; conflicting positions count neither',()=>{
  const same=calculateScheduleHealth({...healthInput,shifts:[shift,{...shift,id:'s2'}]}).coverageBlocks[0];
  expect(same.positionCoverage?.map(p=>p.assigned)).toEqual([1,0]);
  const conflict=calculateScheduleHealth({...healthInput,shifts:[shift,{...shift,id:'s2',positionId:'c'}]});
  expect(conflict.coverageBlocks[0].positionCoverage?.map(p=>p.assigned)).toEqual([0,0]);
  expect(conflict.issues).toContainEqual(expect.objectContaining({code:'SHIFT_OVERLAP'}));
 });
 it.each([{active:false},{eligibleLocationIds:[]},{positionIds:[]}])('ineligible employee facts deny quota: %j',facts=>{
  const block=calculateScheduleHealth({...healthInput,employees:[{...employee,...facts}]}).coverageBlocks[0];
  expect(block.positionCoverage?.map(p=>p.assigned)).toEqual([0,0]);
 });
 it('inactive requirements stay visible and actionable',()=>{
  const result=calculateScheduleHealth({...healthInput,positions:[{...barista,active:false},cashier]});
  expect(result.coverageBlocks[0].positionCoverage?.[0]).toMatchObject({assigned:0,required:1,missing:1});
  expect(result.setupIssues).toContainEqual(expect.objectContaining({code:'POSITION_REQUIREMENT_INVALID',locationId:'l'}));
 });
 it('overlapping same-position quotas use maximum and locations cannot borrow credits',()=>{
  const result=calculateScheduleHealth({...healthInput,locations:[...healthInput.locations,{...healthInput.locations[0],id:'other'}],coverageWindows:[window,{...window,positionRequirements:[{positionId:'b',quantity:2}]},{...window,locationId:'other'}]});
  expect(result.coverageBlocks.find(b=>b.locationId==='l')?.positionCoverage?.[0]).toMatchObject({assigned:1,required:2,missing:1});
  expect(result.coverageBlocks.find(b=>b.locationId==='other')).toMatchObject({assignedStaff:0,covered:false});
 });
});
describe('assignment facts and strict boundaries',()=>{
 it.each([
  [{location:{...location,active:false}},'LOCATION_INACTIVE'],
  [{workspace:{...workspace,active:false}},'LOCATION_INACTIVE'],
  [{position:{...barista,active:false}},'POSITION_INACTIVE'],
  [{position:undefined},'POSITION_INACTIVE'],
  [{employee:{...employee,positionIds:[]}},'POSITION_INELIGIBLE'],
 ] as const)('blocks invalid authoritative facts %j', (facts,code)=>expect(validateShift({...validationInput,...facts}).blockers).toContainEqual(expect.objectContaining({code})));
 it('keeps positionless legacy valid',()=>expect(validateShift({...validationInput,candidate:{...shift,positionId:undefined},position:undefined}).eligible).toBe(true));
 it.each(['2026-03-08','2026-11-01'])('rejects skipped or ambiguous boundary %s',date=>expect(validateShift({...validationInput,candidate:{...shift,date,startTime:date.includes('03')?'02:30':'01:30'}}).blockers).toContainEqual(expect.objectContaining({code:'INVALID_TIME_RANGE'})));
 it('DST-crossing valid boundaries retain four scheduled wall hours',()=>expect(validateShift({...validationInput,candidate:{...shift,date:'2026-03-08',startTime:'00:00',endTime:'04:00'}}).projectedHours[0].assignmentHours).toBe(4));
});

describe('cross-location simultaneous position conflicts', () => {
 const input = {
  ...healthInput,
  employees: [{ ...employee, eligibleLocationIds: ['l', 'other'] }],
  locations: [healthInput.locations[0], { ...healthInput.locations[0], id: 'other' }],
  coverageWindows: [
   { ...window, positionRequirements: [{ positionId: 'b', quantity: 1 }] },
   { ...window, locationId: 'other', positionRequirements: [{ positionId: 'c', quantity: 1 }] },
  ],
 };
 const foreignShift = { ...shift, id: 'foreign', locationId: 'other', positionId: 'c' };
 it('gives neither location named credit when different positions overlap completely', () => {
  const health = calculateScheduleHealth({ ...input, shifts: [shift, foreignShift] });
  expect(health.coverageBlocks.map(block => ({
   locationId: block.locationId,
   assigned: block.positionCoverage[0].assigned,
   missing: block.positionCoverage[0].missing,
   assignedStaff: block.assignedStaff,
   leadCovered: block.leadCovered,
   covered: block.covered,
  }))).toEqual([
   { locationId: 'l', assigned: 0, missing: 1, assignedStaff: 1, leadCovered: true, covered: false },
   { locationId: 'other', assigned: 0, missing: 1, assignedStaff: 1, leadCovered: true, covered: false },
  ]);
  expect(health.issues.filter(issue => issue.code === 'SHIFT_OVERLAP').map(issue => issue.details)).toEqual([
   { employeeId: 'sam', locationId: 'l', date: '2026-10-05', startTime: '08:00', endTime: '12:00' },
   { employeeId: 'sam', locationId: 'other', date: '2026-10-05', startTime: '08:00', endTime: '12:00' },
  ]);
 });
 it('foreign boundaries suppress credit only during the partial conflict and retain before/after credit', () => {
  const health = calculateScheduleHealth({ ...input, shifts: [shift, { ...foreignShift, startTime: '09:00', endTime: '11:00' }] });
  expect(health.coverageBlocks.filter(block => block.locationId === 'l').map(block => ({
   start: block.startTime, end: block.endTime,
   assigned: block.positionCoverage[0].assigned, covered: block.covered,
  }))).toEqual([
   { start: '08:00', end: '09:00', assigned: 1, covered: true },
   { start: '09:00', end: '11:00', assigned: 0, covered: false },
   { start: '11:00', end: '12:00', assigned: 1, covered: true },
  ]);
  expect(health.coverageBlocks.find(block => block.locationId === 'other' && block.startTime === '09:00')?.positionCoverage[0]).toMatchObject({assigned:0,missing:1});
  expect(health.issues.filter(issue => issue.code === 'SHIFT_OVERLAP').map(issue => issue.details)).toEqual([
   { employeeId: 'sam', locationId: 'l', date: '2026-10-05', startTime: '09:00', endTime: '11:00' },
   { employeeId: 'sam', locationId: 'other', date: '2026-10-05', startTime: '09:00', endTime: '11:00' },
  ]);
 });
});
