import {describe,expect,it} from 'vitest';
import {classifyTimecardReview,summarizeTimecardReview} from './review-summary';
import {parseTimecardsResponse,type TimecardItem} from './read-model';
import {combineManagerActions} from '../action-center/project';
import type {AttendanceDisplayReview} from '../attendance/read-model';

const period={startDate:'2026-09-21',endDate:'2026-09-27'},observedAt='2026-09-29T12:00:00Z';
function item(id:string,state:TimecardItem['state']='DRAFT',recorded=true,history=false):TimecardItem{
 const source={...period,employeeId:id,employeeName:id,timeZone:'America/Puerto_Rico',pendingCorrections:0,entries:recorded?[{id:'entry-'+id,locationId:'fixture-office',locationName:'Fixture office',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-09-22T08:00:00Z',endAt:'2026-09-22T09:00:00Z',rawStartAt:'2026-09-22T08:00:00Z',rawEndAt:'2026-09-22T09:00:00Z',breaks:[]}]:[],corrections:[]};
 return parseTimecardsResponse({observedAt,cards:[{source,state,revision:history?1:0,sourceHash:'a'.repeat(32),history:history?[{operationId:'22222222-2222-4222-8222-222222222222',revision:1,action:state==='FINALIZED'?'FINALIZE':'APPROVE',occurredAt:observedAt,actorName:'Fictional reviewer',note:null,sourceHash:'a'.repeat(32),snapshot:source}]:[]}]},period).cards[0];
}
const mixed=()=>[item('DRAFT'),item('APPROVED','APPROVED',false,true),item('REOPENED','REOPENED',true,true),item('NEEDS_REVIEW','NEEDS_REVIEW',true,true),item('FINALIZED','FINALIZED',true,true),item('BLANK','DRAFT',false)];
describe('canonical recorded-time review summary',()=>{
 it('preserves the period and distinguishes approval, finalization, finalized and untouched rows',()=>{
  const cards=mixed(),before=structuredClone(cards);
  expect(cards.map(classifyTimecardReview)).toEqual(['awaiting_approval','awaiting_finalization','awaiting_approval','awaiting_approval','finalized','untouched']);
  expect(summarizeTimecardReview({period,cards})).toEqual({period,counts:{total:6,review:4,awaitingApproval:3,awaitingFinalization:1,finalized:1,untouched:1}});
  expect(cards).toEqual(before);
 });
 it('reviews a valid newly opened entry even when elapsed recorded time is zero',()=>{
  const original=item('OPEN'),source={...original.source,entries:original.source.entries.map(e=>({...e,endAt:null,rawEndAt:null}))};
  const open=parseTimecardsResponse({observedAt:'2026-09-22T08:00:00Z',cards:[{...original,source}]},period).cards[0];
  expect(open.card.recordedNanoseconds).toBe('0');expect(open.card.issues).toContain('open_entry');
  expect(classifyTimecardReview(open)).toBe('awaiting_approval');
 });
 it('keeps Action Center own-card prompts, period links and scheduling aggregation',()=>{
  const attendance:Extract<AttendanceDisplayReview,{state:'ready'}>={state:'ready',engineVersion:1,workspaceId:'fixture-workspace',timeZone:'America/Puerto_Rico',observedAt,scope:{kind:'TODAY_AND_OPEN',localDate:'2026-09-29',dayStartAt:'2026-09-29T04:00:00Z'},groups:[],recordCount:0,signalCount:0,affectedEmployeeCount:0,coverage:{state:'complete',limitations:[],deferredCapabilities:[]},validForMs:45000,pendingCorrectionCount:0,labels:{employees:[],locations:[]}};
  const actions=combineManagerActions([{id:'setup',type:'TARGET_MISSING',priority:'MISSING_INPUT',title:'Set target',detail:'Missing target',href:'/app/employees'}],attendance,{state:'ready',validForMs:45000,observedAt,timeZone:'America/Puerto_Rico',requests:[]},{cards:mixed()},'DRAFT');
  expect(actions.filter(a=>a.type==='TIMECARD').map(a=>a.employeeId)).toEqual(['APPROVED','DRAFT','NEEDS_REVIEW','REOPENED']);
  expect(actions.find(a=>a.employeeId==='DRAFT')?.title).toBe('Your timecard needs another reviewer');
  expect(actions.find(a=>a.employeeId==='APPROVED')).toMatchObject({title:'Approved timecard awaits finalization',href:'/app/timecards?start=2026-09-21&end=2026-09-27#timecard-APPROVED'});
  expect(actions).toHaveLength(5);expect(actions.find(a=>a.id==='setup')?.category).toBe('scheduling');
 });
});
