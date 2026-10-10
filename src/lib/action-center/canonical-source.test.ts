// SOURCE PREPARATION ONLY. None of these proposed cases has been executed.
import { describe, expect, it } from 'vitest';
import { makeAttendanceSource, makeHistoricalShift, makeRecordedEntry } from '@/test/fixtures/attendance-exceptions';
import { projectAttendance } from '../attendance/project';
import { parseManagerTimeCorrections } from '../time-corrections/read-model';
import { parseTimecardsResponse } from '../timecards/read-model';
import { copyCanonicalCapture, parseCorrectionActionCapture, prepareAttendanceActionRows,
  prepareCanonicalActionSources, prepareCorrectionActionRows, prepareSchedulingActionRows,
  prepareTimecardActionRows } from './canonical-source';
import type { CanonicalCaptureBundle, CorrectionNativeCapture, SchedulingActionCapture } from './canonical-source';

const workspaceId='workspace-test', actorEmployeeId='manager', observedAt='2030-10-07T16:10:00Z';
const requestId='66666666-6666-4666-8666-666666666666';
function correction() {
  const view=parseManagerTimeCorrections({state:'ready',validForMs:45000,observedAt,timeZone:'America/Puerto_Rico',requests:[{
    id:requestId,kind:'ENTRY_BOUNDARY',status:'PENDING',revision:1,createdAt:'2030-10-07T16:05:00Z',
    locationId:'location-1',locationName:'North',originalStartAt:'2030-10-07T12:00:00Z',originalEndAt:'2030-10-07T16:00:00Z',
    proposedStartAt:'2030-10-07T12:20:00Z',proposedEndAt:'2030-10-07T15:40:00Z',breakName:null,
    reason:'Private reason must never enter an F1 row.',baseChanged:false,
    context:{state:'unavailable'},employeeName:'Fictional Member',isSelf:false,
  }]});
  if(view.state!=='ready')throw Error('Expected canonical fixture');
  const native:CorrectionNativeCapture={id:requestId,workspaceId,employeeId:'member',locationId:'location-1',kind:'ENTRY_BOUNDARY',status:'PENDING',
    timeEntryId:'entry',breakEntryId:null,sourceRevision:1,baseAdjustmentId:null,revision:1,createdAt:view.requests[0].createdAt,
    requests:[{id:requestId,workspaceId,employeeId:'member',locationId:'location-1',snapshotLocationId:'location-1',revision:1,occurredAt:'2030-10-07T16:05:00Z'},
      {id:'77777777-7777-4777-8777-777777777777',workspaceId,employeeId:'member',locationId:'retained-history',snapshotLocationId:null,revision:2,occurredAt:'2030-10-06T16:00:00Z'}],
    adjustments:[],recordedTarget:{id:'entry',employeeId:'member',locationId:'location-1',version:1},breakTarget:null,
    locations:[{id:'location-1',workspaceId},{id:'retained-history',workspaceId}],
  };
  return {view,native};
}
function correctionCapture() {
  const {view,native}=correction();
  return parseCorrectionActionCapture([native],view,workspaceId,actorEmployeeId,30000);
}
function attendance() {
  const source=makeAttendanceSource({observedAt,entries:[makeRecordedEntry({clockOutAt:'2030-10-07T13:00:00Z',status:'CLOCKED_OUT'}),
    makeRecordedEntry({id:'support',locationId:'support-location',clockOutAt:'2030-10-07T13:00:00Z',status:'CLOCKED_OUT'})],
    publications:[makeHistoricalShift({locationId:'retained-publication-location'})]});
  const projection=projectAttendance(source);
  if(projection.state!=='ready')throw Error('Expected canonical fixture');
  return {actorEmployeeId,source,projection,labels:{employees:[{id:'employee-1',name:'Fictional Member'}],
    locations:[{id:'location-1',name:'North'},{id:'support-location',name:'South'}]},
    sessionExpiresAt:'2030-10-07T18:00:00Z',validForMs:30000};
}
function scheduling():SchedulingActionCapture {
  return {workspaceId,actorEmployeeId,weekStart:'2030-10-07',
    actionInput:{weekStart:'2030-10-07',coverageGaps:[{key:'gap',locationId:'location-1',locationName:'North',
      date:'2030-10-07',startTime:'20:00',endTime:'24:00',gap:1,requiresLead:false}],
      pendingRequests:[{id:'time-off',kind:'TIME_OFF',employeeName:'Fictional Member',createdAt:'2030-10-07T15:00:00Z'}],
      availabilityDeadlineSet:false,coverageRulesConfigured:false},
    healthShifts:[{id:'shift',scheduleId:'schedule',employeeId:'member',employeeName:'Fictional Member',locationId:'other-source-location',
      date:'2030-10-07',startTime:'20:00',endTime:'24:00',isDesignatedLead:false,isCalloutApproved:false,scheduleStatus:'DRAFT'}],
    positions:[],employeeTargets:[],staffingSettings:[],coverageWindows:[],
    pendingTimeOff:[{id:'time-off',employeeId:'member',employeeName:'Fictional Member',startDate:'2030-10-07',endDate:'2030-10-07',
      status:'PENDING',createdAt:'2030-10-07T15:00:00Z',reason:'Private time-off reason'}],pendingExchanges:[],pendingCallouts:[],availabilityDeadline:null};
}
function card() {
  const source={employeeId:'member',employeeName:'Fictional Member',timeZone:'America/Puerto_Rico',
    startDate:'2030-10-07',endDate:'2030-10-13',pendingCorrections:0,
    entries:[{id:'entry',locationId:'location-1',locationName:'North',positionId:null,positionName:null,
      sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2030-10-07T12:00:00Z',endAt:'2030-10-07T13:00:00Z',
      rawStartAt:'2030-10-07T12:00:00Z',rawEndAt:'2030-10-07T13:00:00Z',breaks:[]}],corrections:[]};
  const history={operationId:'88888888-8888-4888-8888-888888888888',revision:2,action:'FINALIZE',occurredAt:'2030-10-14T12:00:00Z',
    actorName:'Private Reviewer',note:'Private note',sourceHash:'a'.repeat(32),
    snapshot:{...source,entries:[{...source.entries[0],locationId:'retained-card-location'}]}};
  const projection=parseTimecardsResponse({observedAt:'2030-10-15T12:00:00Z',cards:[{
    source:history.snapshot,sourceHash:'a'.repeat(32),revision:2,state:'FINALIZED',history:[history,
      {...history,operationId:'99999999-9999-4999-8999-999999999999',revision:1,action:'APPROVE',occurredAt:'2030-10-14T11:00:00Z',snapshot:source}],
  }]},{startDate:source.startDate,endDate:source.endDate});
  return {workspaceId,actorEmployeeId,projection,validForMs:30000,currentSources:[{employeeId:'member',sourceHash:'b'.repeat(32),
    source:{...source,entries:[{...source.entries[0],locationId:'current-card-location'}]},
    correctionFootprint:{referencedRequestIds:[],requests:[],adjustments:[],locations:[]}}]};
}

describe('unused F1 canonical capture adapter — proposed, unexecuted',()=>{
  it('recovers correction identity from the native row despite the canonical public parser dropping employeeId',()=>{
    const captured=correctionCapture(), result=prepareCorrectionActionRows(captured);
    expect(captured.view.requests[0]).not.toHaveProperty('employeeId');
    expect(result.rows[0]).toMatchObject({kind:'TIME_CORRECTION',payload:{employeeId:'member',isSelf:false},nativeRowVersion:'1'});
    expect(result.rows[0].capturedLocationIds).toEqual(['location-1','retained-history']);
    expect(result.rows[0].holds).toContain('WHOLE_SUBJECT_BINDING_REQUIRED');
  });
  it('does not copy reason, context, effective interval, note, authority token or custom href into an F1 correction row',()=>{
    const row=prepareCorrectionActionRows(correctionCapture()).rows[0];
    for(const value of ['Private reason','context','proposedStartAt','authority','href'])expect(JSON.stringify(row)).not.toContain(value);
    expect(row.destinationRead).toBe('attendance.read');
  });
  it.each(['employeeId','workspaceId','revision','createdAt','locationId','kind','status'] as const)('rejects a native/public correction join drift in %s',key=>{
    const {view,native}=correction();
    expect(()=>parseCorrectionActionCapture([{...native,[key]:key==='revision'?2:'different'}],view,workspaceId,actorEmployeeId,30000)).toThrow();
  });
  it('never uses duplicate names or an isSelf flag as employee identity',()=>{
    const {view,native}=correction();
    expect(()=>parseCorrectionActionCapture([{...native,employeeId:actorEmployeeId}],view,workspaceId,actorEmployeeId,30000)).toThrow();
  });
  it('rejects missing/duplicate rows and wrong recorded target identity',()=>{
    const {view,native}=correction();
    for(const values of [[],[native,native],[{...native,recordedTarget:{...native.recordedTarget!,id:'other-entry'}}]])
      expect(()=>parseCorrectionActionCapture(values,view,workspaceId,actorEmployeeId,30000)).toThrow();
  });
  it('rejects foreign historical location ownership instead of dropping that location',()=>{
    const {view,native}=correction();
    const changed={...native,locations:native.locations.map(l=>l.id==='retained-history'?{...l,workspaceId:'foreign'}:l)};
    expect(()=>parseCorrectionActionCapture([changed],view,workspaceId,actorEmployeeId,30000)).toThrow();
  });
  it('freezes copied internal capture and keeps caller mutations from changing captured identity/history',()=>{
    const {view,native}=correction(), result=parseCorrectionActionCapture([native],view,workspaceId,actorEmployeeId,30000);
    native.employeeId='mutated';view.requests[0].employeeName='mutated';
    expect(result.nativeRows[0].employeeId).toBe('member');expect(result.view.requests[0].employeeName).toBe('Fictional Member');
    expect(Object.isFrozen(result.nativeRows[0])).toBe(true);expect(Object.isFrozen(result.view.requests)).toBe(true);
  });
  it('retains exact padded and Unicode source IDs without trimming them into another employee',()=>{
    const {view,native}=correction(), employeeId=' member-α ';
    const changed={...native,employeeId,requests:native.requests.map(r=>({...r,employeeId})),recordedTarget:{...native.recordedTarget!,employeeId}};
    const result=prepareCorrectionActionRows(parseCorrectionActionCapture([changed],view,workspaceId,actorEmployeeId,30000));
    expect(result.rows[0].payload).toHaveProperty('employeeId',employeeId);
    // The existing intelligence identifier validator remains unchanged; protected release may suppress unsupported IDs.
  });
  it('captures attendance overlap and retained publication locations, not just the row location',()=>{
    const result=prepareAttendanceActionRows(attendance());
    expect(result.rows[0].capturedLocationIds).toEqual(['location-1','support-location','retained-publication-location']);
    expect(result.rows[0].nativeRowVersion).toBe('1');
    expect(result.rows[0].payload).not.toHaveProperty('evidence');expect(result.rows[0].payload).not.toHaveProperty('scheduleContext');
  });
  it('rejects altered attendance signals instead of trusting a caller projection',()=>{
    const s=attendance();s.projection.groups[0].observations=[];
    expect(()=>prepareAttendanceActionRows(s)).toThrow();
  });
  it('preserves canonical 24:00 coverage and whole health input locations without synthetic versions or permission grants',()=>{
    const result=prepareSchedulingActionRows(scheduling());
    expect(result.rows[0]).toMatchObject({payload:{endTime:'24:00'},nativeRowVersion:null,capturedLocationIds:['other-source-location']});
    expect(result.canonicalCoverage).toBe('not_reported');expect(result.observedAt).toBe(null);
    expect(result.rows[0].holds).toContain('NATIVE_ROW_VERSION_REQUIRED');
    for(const key of ['readAllowed','destinationAllowed','currentVersion','authorityCurrent','capabilities','allClear','counts'])expect(result).not.toHaveProperty(key);
  });
  it('retains time-off employee identity but does not invent an affected location or row version',()=>{
    const row=prepareSchedulingActionRows(scheduling()).rows.find(r=>r.kind==='REQUEST')!;
    expect(row.payload).toHaveProperty('employeeId','member');expect(row.capturedLocationIds).toEqual([]);
    expect(row.holds).toContain('REQUEST_HISTORY_FOOTPRINT_REQUIRED');expect(row.nativeRowVersion).toBe(null);
    expect(JSON.stringify(row)).not.toContain('Private time-off reason');
  });
  it('keeps configuration field requirements separate from the action-center permission ceiling',()=>{
    const rows=prepareSchedulingActionRows(scheduling()).rows.filter(r=>r.kind==='DEADLINE'||r.kind==='COVERAGE_RULES');
    expect(rows).toHaveLength(2);expect(rows.every(r=>r.destinationRead==='configuration.scheduling.manage'&&r.requiredFieldCodes[0]==='configuration')).toBe(true);
  });
  it('retains current/finalized/all retained card locations and distinct native current/display hashes',()=>{
    const result=prepareTimecardActionRows(card());
    expect(result.rows[0].capturedLocationIds).toEqual(['retained-card-location','current-card-location','location-1']);
    expect(result.rows[0].nativeRowVersion).toBe('2:'+'a'.repeat(32));
    expect(result.rows[0].payload).toHaveProperty('state','FINALIZED');
    expect(JSON.stringify(result.rows)).not.toContain('Private Reviewer');expect(JSON.stringify(result.rows)).not.toContain('Private note');
  });
  it('includes the native correction history location omitted from current and retained card entry DTOs',()=>{
    const s=card(), raw=s.currentSources[0];
    const request={id:requestId,kind:'ENTRY_BOUNDARY',status:'PENDING',reason:'Private correction reason',revision:1,
      startAt:'2030-10-07T12:00:00Z',endAt:'2030-10-07T13:00:00Z'};
    const changed={...s,currentSources:[{...raw,source:{...raw.source,pendingCorrections:1,corrections:[request]},
      correctionFootprint:{referencedRequestIds:[requestId],requests:[{id:requestId,workspaceId,employeeId:'member',
        locationId:'correction-history-location',snapshotLocationId:null,revision:1}],adjustments:[],
        locations:[{id:'correction-history-location',workspaceId}]}}]};
    const result=prepareTimecardActionRows(changed);
    expect(result.rows[0].capturedLocationIds).toContain('correction-history-location');
    expect(JSON.stringify(result.rows)).not.toContain('Private correction reason');
  });
  it('rejects incomplete retained card history and missing current-source capture',()=>{
    const s=card();expect(()=>prepareTimecardActionRows({...s,currentSources:[]})).toThrow();
    expect(()=>prepareTimecardActionRows({...s,projection:{...s.projection,cards:[{...s.projection.cards[0],history:[]}]}})).toThrow();
  });
  it('preserves partial/loading sources without presenting any observed rows as an authorized historical total',()=>{
    const bundle:CanonicalCaptureBundle={workspaceId,actorEmployeeId,scheduling:{state:'captured',capture:scheduling()},
      attendance:{state:'loading'},corrections:{state:'captured',capture:correctionCapture()},timecards:{state:'unavailable',reason:'READ_FAILED'}};
    const result=prepareCanonicalActionSources(bundle);
    expect(result.map(s=>[s.source,s.state])).toEqual([['scheduling','CAPTURED_UNBOUND'],['attendance','loading'],['corrections','CAPTURED_UNBOUND'],['timecards','unavailable']]);
    expect(result[2]).toHaveProperty('rows');expect(result[3]).not.toHaveProperty('rows');
    expect(JSON.stringify(result)).not.toContain('allClear');
  });
  it('suppresses a mismatched actor/workspace capture while retaining another known canonical source',()=>{
    const bundle:CanonicalCaptureBundle={workspaceId,actorEmployeeId,scheduling:{state:'captured',capture:{...scheduling(),workspaceId:'foreign'}},
      attendance:{state:'loading'},corrections:{state:'captured',capture:correctionCapture()},timecards:{state:'loading'}};
    const result=prepareCanonicalActionSources(bundle);
    expect(result[0]).toEqual({source:'scheduling',state:'unavailable',reason:'INVALID_SOURCE'});expect(result[2]).toHaveProperty('rows');
  });
  it('rejects accessor/proxy/sparse/extra/symbol/prototype/hidden properties without executing traps',()=>{
    let calls=0;
    const proxy=new Proxy({}, {getPrototypeOf(){calls++;return Object.prototype;},ownKeys(){calls++;return [];},get(){calls++;return null;}});
    const getter=Object.defineProperty({},'value',{get(){calls++;return 'secret';},enumerable:true});
    const sparse=Array(1), extra=Object.assign(['a'],{extra:'x'}), symbol={ [Symbol('secret')]:'x' };
    const hidden=Object.defineProperty({},'sessionVersion',{value:'hidden',enumerable:false});
    for(const value of [proxy,getter,sparse,extra,symbol,Object.create({value:'inherited'}),hidden])expect(()=>copyCanonicalCapture(value)).toThrow();
    expect(calls).toBe(0);
  });
});

// F1-C01: root cause-bearing caller input controls; exact prior assertions retained.
for (const kind of ['accessor', 'proxy'] as const) it('F1-C01 rejects '+kind+' correction view without evaluating caller code', () => {
  const {view,native}=correction();let calls=0;
  const malicious=kind==='proxy' ? new Proxy(view,{get(target,key,receiver){calls++;return Reflect.get(target,key,receiver);}}) :
    Object.defineProperty({...view},'requests',{get(){calls++;return view.requests;},enumerable:true});
  expect(()=>parseCorrectionActionCapture([native],malicious,workspaceId,actorEmployeeId,30000)).toThrow();
  expect(calls).toBe(0);
});

it('F1-C02 rejects accessor descriptors with inherited value without invoking inherited code', () => {
  const value=Object.defineProperty({},'field',{get(){throw Error('caller getter must not run');},enumerable:true});
  const original=Object.getOwnPropertyDescriptor(Object.prototype,'value');let calls=0,rejected=false;
  const descriptor=Object.assign(Object.create(null),{configurable:true,get(){calls++;return 'inherited-secret';}});
  try {Object.defineProperty(Object.prototype,'value',descriptor);try {copyCanonicalCapture(value);} catch {rejected=true;}}
  finally {if(original)Object.defineProperty(Object.prototype,'value',original);else Reflect.deleteProperty(Object.prototype,'value');}
  expect(rejected).toBe(true);expect(calls).toBe(0);
});
for (const field of ['gap','requiresLead'] as const) it('F1-C03 preserves configuration destination for null '+field+' setup coverage', () => {
  const s=scheduling();s.actionInput.coverageGaps![0][field]=null;
  expect(buildManagerActionItems(s.actionInput).find(r=>r.id==='COVERAGE:gap')?.href).toBe('/app/schedule/settings');
  const row=prepareSchedulingActionRows(s).rows.find(r=>r.kind==='COVERAGE_GAP')!;
  expect(row.destinationRead).toBe('configuration.scheduling.manage');expect(row.requiredFieldCodes).toContain('configuration');
  expect(row.holds).toContain('CANONICAL_F6_RELEASE_REQUIRED');
});
it('F1-C03 preserves configuration destination and fields for a missing weekly hours target', () => {
  const s=scheduling();s.actionInput.hourIssues=[{employeeId:'member',employeeName:'Fictional Member',kind:'TARGET_MISSING'}];
  expect(buildManagerActionItems(s.actionInput).find(r=>r.id==='HOURS:member')?.href).toBe('/app/schedule/settings?employeeId=member');
  const row=prepareSchedulingActionRows(s).rows.find(r=>r.kind==='HOURS')!;
  expect(row.destinationRead).toBe('configuration.scheduling.manage');expect(row.requiredFieldCodes).toContain('configuration');
  expect(row.requiredFieldCodes).toContain('employee.identity');expect(row.holds).toContain('CANONICAL_F6_RELEASE_REQUIRED');
});

import { buildManagerActionItems } from '../assistance/manager-actions';

it('F1-C02 rejects an array-index accessor with inherited descriptor value and restores the exact prototype', () => {
  const value:unknown[]=[];Object.defineProperty(value,'0',{get(){throw Error('caller array getter must not run');},enumerable:true,configurable:true});
  const original=Object.getOwnPropertyDescriptor(Object.prototype,'value');let calls=0,rejected=false;
  const descriptor=Object.assign(Object.create(null),{configurable:true,get(){calls++;return 'inherited-secret';}});
  try {Object.defineProperty(Object.prototype,'value',descriptor);try {copyCanonicalCapture(value);} catch {rejected=true;}}
  finally {if(original)Object.defineProperty(Object.prototype,'value',original);else Reflect.deleteProperty(Object.prototype,'value');}
  expect(rejected).toBe(true);expect(calls).toBe(0);
});
it('F1-C03 preserves ordinary under-target schedule destination without configuration hints', () => {
  const s=scheduling();s.actionInput.hourIssues=[{employeeId:'member',employeeName:'Fictional Member',kind:'UNDER',scheduledHours:8,targetHours:40}];
  expect(buildManagerActionItems(s.actionInput).find(r=>r.id==='HOURS:member')?.href).toBe('/app/schedule?week=2030-10-07&employeeId=member');
  const row=prepareSchedulingActionRows(s).rows.find(r=>r.kind==='HOURS')!;expect(row.destinationRead).toBe('schedule.draft.read');
  expect(row.requiredFieldCodes).toEqual(['schedule','employee.identity']);expect(row.holds).toContain('CANONICAL_F6_RELEASE_REQUIRED');
});
