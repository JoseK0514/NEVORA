import {describe,expect,it} from 'vitest';
import {projectTimecard,type TimecardBreakPay} from './project';
import {parseTimecardsResponse} from './read-model';
import {resolveBreakPay} from '../payroll/native/break-pay';
import {input} from '../payroll/native/fixtures.test-support';
import {mealPeriodReview} from '@/components/payroll/workflow-status';

// Fictional employee, week Oct 19–25 2026, America/Puerto_Rico (UTC−4).
const entry=(id:string,startAt:string,endAt:string|null,breaks:{id:string;startAt:string;endAt:string|null}[]=[])=>({id,locationId:'L1',locationName:'Main',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt,endAt,rawStartAt:startAt,rawEndAt:endAt,
 breaks:breaks.map(b=>({...b,name:'Meal',adjustmentId:null,rawStartAt:b.startAt,rawEndAt:b.endAt}))});
const source=(entries:ReturnType<typeof entry>[])=>({employeeId:'E1',employeeName:'Fictional Employee',timeZone:'America/Puerto_Rico',startDate:'2026-10-19',endDate:'2026-10-25',pendingCorrections:0,corrections:[],entries});
const MEAL={pay:'UNPAID',kind:'MEAL',mealMinimumMinutes:60} as const, SHORT_MEAL={pay:'PAID',kind:'MEAL',mealMinimumMinutes:60} as const;
const H=(h:number)=>String(BigInt(Math.round(h*3600))*BigInt(1_000_000_000));
const observed='2026-10-27T12:00:00Z';

describe('Timecards paid time (elapsed − unpaid breaks, shift-start-day attribution)',()=>{
 it('10 h span with a 1 h unpaid meal: 9 h paid, 1 h unpaid, elapsed stays 10 h',()=>{
  const c=projectTimecard(source([entry('A','2026-10-19T12:00:00Z','2026-10-19T22:00:00Z',[{id:'B1',startAt:'2026-10-19T16:00:00Z',endAt:'2026-10-19T17:00:00Z'}])]),observed,{B1:MEAL});
  expect(c).toMatchObject({recordedNanoseconds:H(10),breakNanoseconds:H(1),paidNanoseconds:H(9),paidSeconds:9*3600,unpaidBreakNanoseconds:H(1),mealWarnings:[]});
 });
 it('no breaks: paid equals elapsed without any payroll rule',()=>{
  const c=projectTimecard(source([entry('A','2026-10-20T12:00:00Z','2026-10-20T16:00:00Z')]),observed);
  expect(c).toMatchObject({paidSeconds:4*3600,unpaidBreakNanoseconds:'0',mealWarnings:[]});
 });
 it('an unclassified break leaves paid time unknown instead of guessing',()=>{
  const c=projectTimecard(source([entry('A','2026-10-19T12:00:00Z','2026-10-19T22:00:00Z',[{id:'B1',startAt:'2026-10-19T16:00:00Z',endAt:'2026-10-19T17:00:00Z'}])]),observed);
  expect(c).toMatchObject({paidNanoseconds:null,paidSeconds:null,unpaidBreakNanoseconds:null,mealWarnings:[]});
 });
 it('an overnight entry counts wholly on its start day: Sun 22:00 → Mon 06:30 is 8.5 h in this week',()=>{
  const c=projectTimecard(source([entry('A','2026-10-26T02:00:00Z','2026-10-26T10:30:00Z')]),observed);
  expect(c.recordedNanoseconds).toBe(H(2)); // clipped elapsed provenance is unchanged
  expect(c.paidSeconds).toBe(8.5*3600);
  expect(c.mealWarnings).toEqual([{date:'2026-10-25',kind:'NO_MEAL_5H',minutes:510}]);
 });
 it('an overnight entry that started last week is not paid again this week',()=>{
  const c=projectTimecard(source([entry('A','2026-10-19T02:00:00Z','2026-10-19T10:00:00Z'),entry('B','2026-10-19T12:00:00Z','2026-10-19T14:00:00Z')]),observed);
  expect(c.recordedNanoseconds).toBe(H(8)); expect(c.paidSeconds).toBe(2*3600);
 });
 it('a meal under 30 minutes is paid and flagged; a meal before the 2nd hour is flagged',()=>{
  const c=projectTimecard(source([entry('A','2026-10-21T12:00:00Z','2026-10-21T20:20:00Z',[{id:'B1',startAt:'2026-10-21T13:00:00Z',endAt:'2026-10-21T13:20:00Z'}])]),observed,{B1:SHORT_MEAL});
  expect(c.paidSeconds).toBe((8*60+20)*60);
  expect(c.mealWarnings).toEqual([{date:'2026-10-21',kind:'NO_MEAL_5H',minutes:500},{date:'2026-10-21',kind:'MEAL_TOO_EARLY',minutes:60},{date:'2026-10-21',kind:'MEAL_TOO_SHORT',minutes:20}]);
 });
 it('rejects break pay for unknown breaks or malformed classes',()=>{
  const s=source([entry('A','2026-10-19T12:00:00Z','2026-10-19T22:00:00Z',[{id:'B1',startAt:'2026-10-19T16:00:00Z',endAt:'2026-10-19T17:00:00Z'}])]);
  for(const pay of [{OTHER:MEAL},{B1:'UNPAID'},{B1:{...MEAL,pay:'MAYBE'}},{B1:{...MEAL,mealMinimumMinutes:45}}])expect(()=>projectTimecard(s,observed,pay as unknown as TimecardBreakPay)).toThrow('break pay');
 });
 it('the read model carries server break pay into each card and keeps it out of the hashed source',()=>{
  const s=source([entry('A','2026-10-19T12:00:00Z','2026-10-19T22:00:00Z',[{id:'B1',startAt:'2026-10-19T16:00:00Z',endAt:'2026-10-19T17:00:00Z'}])]);
  const r=parseTimecardsResponse({observedAt:observed,cards:[{source:s,sourceHash:'a'.repeat(32),revision:0,state:'DRAFT',history:[],breakPay:{B1:MEAL}}]},{startDate:'2026-10-19',endDate:'2026-10-25'});
  expect(r.cards[0].card.paidSeconds).toBe(9*3600);expect(r.cards[0].breakPay).toEqual({B1:MEAL});expect(JSON.stringify(r.cards[0].source)).not.toContain('UNPAID');
 });
});

describe('server break classification uses the payroll wage profile rule',()=>{
 const i=input(),configuration={schema:'NEVORA_NATIVE_CONFIGURATION_V1',employeeId:'E1',wages:i.wages,tax:i.tax,deductions:[]};
 const b=(id:string,typeId:string|null,startAt:string,endAt:string|null,locationId='L1')=>({id,employeeId:'E1',typeId,locationId,startAt,endAt});
 it('classifies mapped meals and rests; leaves unmapped, untyped, open or other-location breaks unknown',()=>{
  expect(resolveBreakPay([{employeeId:'E1',configuration}],[
   b('meal','MEAL','2026-10-19T16:00:00Z','2026-10-19T17:00:00Z'),b('short','MEAL','2026-10-19T16:00:00Z','2026-10-19T16:20:00Z'),
   b('rest','REST','2026-10-19T14:00:00Z','2026-10-19T14:15:00Z'),b('unmapped','OTHER','2026-10-19T14:00:00Z','2026-10-19T14:15:00Z'),
   b('untyped',null,'2026-10-19T14:00:00Z','2026-10-19T14:15:00Z'),b('open','MEAL','2026-10-19T14:00:00Z',null),b('elsewhere','MEAL','2026-10-19T16:00:00Z','2026-10-19T17:00:00Z','L9'),
  ])).toEqual({meal:{pay:'UNPAID',kind:'MEAL',mealMinimumMinutes:60},short:{pay:'PAID',kind:'MEAL',mealMinimumMinutes:60},rest:{pay:'PAID',kind:'REST',mealMinimumMinutes:60}});
 });
 it('a recorded written meal agreement lowers the meal minimum to 30 minutes',()=>{
  const agreed={...configuration,wages:[{...i.wages[0],mealReductionAgreement:true}]};
  expect(resolveBreakPay([{employeeId:'E1',configuration:agreed}],[b('meal','MEAL','2026-10-19T16:00:00Z','2026-10-19T16:30:00Z')])).toEqual({meal:{pay:'UNPAID',kind:'MEAL',mealMinimumMinutes:30}});
 });
 it('no profile or another employee profile classifies nothing',()=>{
  expect(resolveBreakPay([],[b('meal','MEAL','2026-10-19T16:00:00Z','2026-10-19T17:00:00Z')])).toEqual({});
  expect(resolveBreakPay([{employeeId:'E2',configuration}],[b('meal','MEAL','2026-10-19T16:00:00Z','2026-10-19T17:00:00Z')])).toEqual({});
 });
});

describe('payroll period review: meal periods are non-blocking',()=>{
 it('lists each warning as "Meal period to review", never as a blocker',()=>{
  expect(mealPeriodReview([{employeeId:'E1',breakdown:{mealWarnings:[{date:'2026-10-21',kind:'MEAL_TOO_SHORT',minutes:20}]}},{employeeId:'E2',breakdown:{}}])).toEqual([
   {employeeId:'E1',date:'2026-10-21',kind:'MEAL_TOO_SHORT',minutes:20,blocking:false,title:'Meal period to review',detail:'Meal shorter than required'}]);
 });
});
