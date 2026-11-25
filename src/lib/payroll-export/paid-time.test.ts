import {describe,expect,it} from '@rstest/core';
import {adpRunColumns,canonicalPayrollExport,mappedPayrollCsv,neutralPaidProfile,neutralProfile} from './model';
import {projectPaidPayrollExport} from './paid-time';
import type {TimecardEntry,Period} from '../timecards/project';

const period={startDate:'2026-09-21',endDate:'2026-09-27'};
const entry=(startAt:string,endAt:string,breaks:{id:string;startAt:string;endAt:string}[]=[]):TimecardEntry=>({
 id:'T',locationId:'L',locationName:'Fictional location',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,
 startAt,endAt,rawStartAt:startAt,rawEndAt:endAt,breaks:breaks.map(b=>({...b,name:'Uninformative recorded label',rawStartAt:b.startAt,rawEndAt:b.endAt,adjustmentId:null})),
});
const classification=(breakId:string,treatment:'PAID_REST'|'UNPAID_RELIEVED_MEAL')=>({employeeId:'E',entryId:'T',breakId,treatment});
function projection(entries:TimecardEntry[],breakTreatments:unknown[],dates:Period=period,timeZone='America/Puerto_Rico'){
 const source={...dates,employeeId:'E',employeeName:'Fictional Employee',timeZone,pendingCorrections:0,corrections:[],entries};
 const sourceHash='a'.repeat(32),card={source,sourceHash,revision:1,state:'FINALIZED',history:[{operationId:'11111111-1111-4111-8111-111111111111',revision:1,action:'FINALIZE',occurredAt:'2026-12-01T00:00:00Z',actorName:'Fictional Owner',note:null,sourceHash,snapshot:source}]};
 return canonicalPayrollExport('W','2026-12-01T00:00:00Z',dates,[card],['E'],undefined,{version:1,breakTreatments});
}
const shift=()=>entry('2026-09-22T12:00:00Z','2026-09-22T20:30:00Z',[
 {id:'meal',startAt:'2026-09-22T16:00:00Z',endAt:'2026-09-22T16:30:00Z'},
 {id:'rest',startAt:'2026-09-22T14:00:00Z',endAt:'2026-09-22T14:10:00Z'},
]);
describe('explicit recorded-break paid time projection',()=>{
 it('exports eight paid hours from 8.5 elapsed minus only a relieved half-hour meal while retaining paid rest',()=>{
  const input=shift(),before=JSON.stringify(input),model=projection([input],[classification('meal','UNPAID_RELIEVED_MEAL'),classification('rest','PAID_REST')]);
  expect(model.rows[0]).toMatchObject({recordedNanoseconds:'30600000000000',breakNanoseconds:'2400000000000',paidNanoseconds:'28800000000000',unpaidBreakNanoseconds:'1800000000000',paidRestNanoseconds:'600000000000'});
  expect(model.rows[0].days).toEqual([{businessDate:'2026-09-22',recordedNanoseconds:'30600000000000',breakNanoseconds:'2400000000000',paidNanoseconds:'28800000000000',unpaidBreakNanoseconds:'1800000000000',paidRestNanoseconds:'600000000000'}]);
  expect(JSON.stringify(input)).toBe(before);
 });
 it('keeps a reviewed worked-through interval paid without counting it as rest',()=>{
  const input=shift();
  const model=projection([input],[classification('rest','PAID_REST'),
   {employeeId:'E',entryId:'T',breakId:'meal',treatment:'PAID_AS_WORKED'}]);
  const expected={paidNanoseconds:'30600000000000',unpaidBreakNanoseconds:'0',
   paidRestNanoseconds:'600000000000',workedDuringBreakNanoseconds:'1800000000000'};
  expect(model.rows[0]).toMatchObject(expected);
  expect(model.rows[0].days?.[0]).toMatchObject(expected);
  expect(model.rows[0].entries[0].breaks).toEqual(input.breaks.slice().reverse());
 });
 it('recomputes worked-through provenance when a fresh review changes the classification',()=>{
  const model=projection([shift()],[classification('rest','PAID_REST'),
   {employeeId:'E',entryId:'T',breakId:'meal',treatment:'PAID_AS_WORKED'}]);
  const revised=projectPaidPayrollExport(model,{version:1,breakTreatments:[
   classification('rest','PAID_REST'),classification('meal','UNPAID_RELIEVED_MEAL'),
  ]});
  expect(revised.rows[0].paidNanoseconds).toBe('28800000000000');
  expect(revised.rows[0]).not.toHaveProperty('workedDuringBreakNanoseconds');
 });
 it.each([
  [],[classification('meal','UNPAID_RELIEVED_MEAL')],
  [classification('meal','UNPAID_RELIEVED_MEAL'),classification('rest','PAID_REST'),classification('unknown','PAID_REST')],
  [classification('meal','UNPAID_RELIEVED_MEAL'),classification('rest','PAID_REST'),classification('rest','PAID_REST')],
  [classification('meal','UNPAID_RELIEVED_MEAL'),{...classification('rest','PAID_REST'),entryId:'other'}],
  [classification('meal','UNPAID_RELIEVED_MEAL'),{...classification('rest','PAID_REST'),employeeId:'other'}],
  [classification('meal','UNPAID_RELIEVED_MEAL'),{...classification('rest','PAID_REST'),treatment:'UNPAID'}],
 ].map(breakTreatments=>({breakTreatments})))('refuses incomplete, duplicate, unknown or inferred classifications %j',({breakTreatments})=>{
  expect(()=>projection([shift()],breakTreatments)).toThrow(/break/i);
 });
 it('splits overnight time and a midnight-crossing meal into business days',()=>{
  const model=projection([entry('2026-09-22T02:00:00Z','2026-09-22T10:00:00Z',[{id:'meal',startAt:'2026-09-22T03:45:00Z',endAt:'2026-09-22T04:15:00Z'}])],[classification('meal','UNPAID_RELIEVED_MEAL')]);
  expect(model.rows[0].days).toEqual([
   {businessDate:'2026-09-21',recordedNanoseconds:'7200000000000',breakNanoseconds:'900000000000',paidNanoseconds:'6300000000000',unpaidBreakNanoseconds:'900000000000',paidRestNanoseconds:'0'},
   {businessDate:'2026-09-22',recordedNanoseconds:'21600000000000',breakNanoseconds:'900000000000',paidNanoseconds:'20700000000000',unpaidBreakNanoseconds:'900000000000',paidRestNanoseconds:'0'},
  ]);
 });
 it('clips elapsed time and only relevant breaks to the selected period',()=>{
  const dates={startDate:'2026-11-02',endDate:'2026-11-02'};
  const model=projection([entry('2026-11-01T22:00:00Z','2026-11-03T06:00:00Z',[
   {id:'outside',startAt:'2026-11-01T23:00:00Z',endAt:'2026-11-01T23:30:00Z'},
   {id:'left',startAt:'2026-11-02T03:30:00Z',endAt:'2026-11-02T04:30:00Z'},
   {id:'right',startAt:'2026-11-03T03:30:00Z',endAt:'2026-11-03T04:30:00Z'},
  ])],[classification('left','UNPAID_RELIEVED_MEAL'),classification('right','UNPAID_RELIEVED_MEAL')],dates);
  expect(model.rows[0]).toMatchObject({recordedNanoseconds:'86400000000000',breakNanoseconds:'3600000000000',paidNanoseconds:'82800000000000'});
  expect(model.rows[0].days).toHaveLength(1);
 });
 it.each([
  {date:'2026-03-08',start:'2026-03-08T05:00:00Z',end:'2026-03-09T04:00:00Z',mealStart:'2026-03-08T06:30:00Z',mealEnd:'2026-03-08T07:30:00Z',recorded:'82800000000000',paid:'79200000000000'},
  {date:'2026-11-01',start:'2026-11-01T04:00:00Z',end:'2026-11-02T05:00:00Z',mealStart:'2026-11-01T05:30:00Z',mealEnd:'2026-11-01T06:30:00Z',recorded:'90000000000000',paid:'86400000000000'},
 ])('uses actual instant durations across DST on $date',c=>{
  const model=projection([entry(c.start,c.end,[{id:'meal',startAt:c.mealStart,endAt:c.mealEnd}])],[classification('meal','UNPAID_RELIEVED_MEAL')],{startDate:c.date,endDate:c.date},'America/New_York');
  expect(model.rows[0]).toMatchObject({recordedNanoseconds:c.recorded,paidNanoseconds:c.paid});expect(model.rows[0].days).toHaveLength(1);
 });
 it('preserves integer nanoseconds rather than rounding at classification',()=>{
  const model=projection([entry('2026-09-22T12:00:00Z','2026-09-22T13:00:00.000000001Z',[{id:'meal',startAt:'2026-09-22T12:30:00Z',endAt:'2026-09-22T12:30:00.000000001Z'}])],[classification('meal','UNPAID_RELIEVED_MEAL')]);
  expect(model.rows[0]).toMatchObject({recordedNanoseconds:'3600000000001',unpaidBreakNanoseconds:'1',paidNanoseconds:'3600000000000'});
 });
 it('exports daily decimal paid hours only with the reviewed precision and date format of a custom profile',()=>{
  const model=projection([shift()],[classification('meal','UNPAID_RELIEVED_MEAL'),classification('rest','PAID_REST')]);
  const profile={...neutralPaidProfile(),dateFormat:'US' as const,hourDecimals:2,columns:[{header:'Day',source:'businessDate' as const},{header:'Paid hours',source:'paidHours' as const},{header:'Unpaid hours',source:'unpaidBreakHours' as const}]};
  expect(mappedPayrollCsv(model,profile)).toBe('\uFEFF"Day","Paid hours","Unpaid hours"\r\n"09/22/2026","8.00","0.50"\r\n');
  expect(()=>mappedPayrollCsv(model,{...profile,columns:[{header:'Rest',source:'paidRestHours'}]})).toThrow('exactly');
  expect(mappedPayrollCsv(model,{...profile,precision:'HALF_UP',columns:[{header:'Rest',source:'paidRestHours'}]})).toBe('\uFEFF"Rest"\r\n"0.17"\r\n');
 });
 it('includes exact decimal paid, unpaid meal and paid rest hours alongside nanoseconds in the daily neutral file',()=>{
  const model=projection([entry('2026-09-22T12:00:00Z','2026-09-22T20:30:00Z',[{id:'meal',startAt:'2026-09-22T16:00:00Z',endAt:'2026-09-22T16:30:00Z'},{id:'rest',startAt:'2026-09-22T14:00:00Z',endAt:'2026-09-22T14:15:00Z'}])],[classification('meal','UNPAID_RELIEVED_MEAL'),classification('rest','PAID_REST')]);
  const csv=mappedPayrollCsv(model,neutralPaidProfile());
  expect(csv).toContain('"Paid hours","Unpaid meal hours","Paid rest hours"');
  expect(csv).toContain('"8.000000000","0.500000000","0.250000000"');expect(csv).toContain('"28800000000000"');
 });
 it('refuses inexact default decimal hours and permits only a reviewed custom HALF_UP choice',()=>{
  const model=projection([entry('2026-09-22T12:00:00Z','2026-09-22T12:01:00Z')],[]);
  expect(()=>mappedPayrollCsv(model,neutralPaidProfile())).toThrow('exactly');
  const csv=mappedPayrollCsv(model,{...neutralPaidProfile(),hourDecimals:2,precision:'HALF_UP'});
  expect(csv).toContain('"0.02","0.00","0.00"');expect(csv).toContain('"60000000000"');
 });
 it('keeps a selected zero-time employee and requires every provider mapping even when no day contains time',()=>{
  const model=projection([],[]),profile={...neutralPaidProfile(),columns:[{header:'Provider',source:'providerEmployeeId' as const},{header:'Day',source:'businessDate' as const},{header:'Paid',source:'paidNanoseconds' as const}]};
  expect(()=>mappedPayrollCsv(model,profile)).toThrow('identifier required');
  expect(mappedPayrollCsv(model,{...profile,employeeMappings:[{employeeId:'E',providerEmployeeId:'001'}]})).toBe('\uFEFF"Provider","Day","Paid"\r\n"001","","0"\r\n');
 });
 it('refuses a legacy RUN recorded-hours mapping for new output rather than reinterpreting it',()=>{
  const raw=projection([shift()],[classification('meal','UNPAID_RELIEVED_MEAL'),classification('rest','PAID_REST')]);
  const legacy={...neutralProfile(),format:'ADP_RUN_GENERIC_V1' as const,dateFormat:'US' as const,hourDecimals:2,columns:adpRunColumns('FICTIONAL','W','TEST','TEST').map(c=>c.header==='Pay Hours'?{...c,source:'recordedHours' as const}:c),employeeMappings:[{employeeId:'E',providerEmployeeId:'001'}]};
  expect(()=>mappedPayrollCsv(raw,legacy)).toThrow(/review/i);
 });
});
