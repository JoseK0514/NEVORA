import {describe,expect,it} from 'vitest';
import {adpRunColumns,decimalHours,isLegacyAdpProfile,mappedPayrollCsv,neutralProfile,parseExportProfile,type CanonicalPayrollExport,type ExportProfile} from './model';
import {projectTimecard} from '../timecards/project';
import {classifyPayableHours} from '../payroll/native/payable-hours';
import {input} from '../payroll/native/fixtures.test-support';
import {OWNER_PROVISIONAL_POLICY_REFERENCE,type NativePayrollInput,type NativeRecordedEntry} from '../payroll/native/contracts';
import {PR_FINAL_PERIODIC_HALF_UP_GUIDANCE} from '../payroll/native/pr-income-cent-policy';

// Business analyst case X1 (inspect/business.md §2), fictional employee, week Oct 19–25 2026:
// Mon 8:00–18:00 with a 1 h meal, Tue 8:07–16:02, Wed 59 s, Sat 22:00→Sun 06:00,
// Sun 22:00→Mon 06:00 (clipped at the period end). Times below are UTC (AST = UTC−4).
const X1=[
 {id:'E1',start:'2026-10-19T12:00:00Z',end:'2026-10-19T22:00:00Z',meal:['2026-10-19T16:00:00Z','2026-10-19T17:00:00Z']},
 {id:'E2',start:'2026-10-20T12:07:00Z',end:'2026-10-20T20:02:00Z'},
 {id:'E5',start:'2026-10-21T12:00:00Z',end:'2026-10-21T12:00:59Z'},
 {id:'E3',start:'2026-10-25T02:00:00Z',end:'2026-10-25T10:00:00Z'},
 {id:'E4',start:'2026-10-26T02:00:00Z',end:'2026-10-26T10:00:00Z'},
] as const;
const timecardSource={employeeId:'E1',employeeName:'Alexandra Rivera',timeZone:'America/Puerto_Rico',startDate:'2026-10-19',endDate:'2026-10-25',pendingCorrections:0,corrections:[],
 entries:X1.map(e=>({id:e.id,locationId:'L1',locationName:'Main',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:e.start,endAt:e.end,rawStartAt:e.start,rawEndAt:e.end,
  breaks:'meal' in e?[{id:'B1',name:'Meal',adjustmentId:null,startAt:e.meal[0],endAt:e.meal[1],rawStartAt:e.meal[0],rawEndAt:e.meal[1]}]:[]}))};
function engineInput(owner:boolean):NativePayrollInput{
 const i=input();i.period={startDate:'2026-10-19',endDate:'2026-10-25'};i.payday='2026-10-27';
 const entries:NativeRecordedEntry[]=X1.map(e=>({id:e.id,locationId:'L1',startAt:e.start,endAt:e.end,sourceKind:'RECORDED',recordedVersion:1,adjustmentId:null,breaks:'meal' in e?[{id:'B1',typeId:'MEAL',startAt:e.meal[0],endAt:e.meal[1]}]:[]}));
 i.timecards=[{...i.timecards[0],period:{startDate:'2026-10-12',endDate:'2026-10-25'},entries}];
 if(owner){i.calculationPolicyReference=OWNER_PROVISIONAL_POLICY_REFERENCE;i.wages[0].wageCentRounding='UNVERIFIED';i.tax!.ruleEvidenceReference=PR_FINAL_PERIODIC_HALF_UP_GUIDANCE.id;}
 return i;
}
const MEAL={pay:'UNPAID' as const,kind:'MEAL' as const,mealMinimumMinutes:60 as const};
const card=projectTimecard(timecardSource,'2026-10-27T12:00:00Z',{B1:MEAL});
type Variant='owner'|'default'|'noProfile';
const modelFor=(variant:Variant):CanonicalPayrollExport=>({version:2,workspaceId:'W',timeZone:'America/Puerto_Rico',period:{startDate:'2026-10-19',endDate:'2026-10-25'},timeBasis:'RECORDED_ELAPSED_INCLUDING_BREAKS',payableBasis:'NATIVE_PAYROLL_ENGINE',
 rows:[{employeeId:'E1',employeeName:'Alexandra Rivera',revision:2,sourceHash:'a'.repeat(32),finalizationOperationId:'11111111-1111-4111-8111-111111111111',recordedNanoseconds:card.recordedNanoseconds,breakNanoseconds:card.breakNanoseconds,entries:[],payable:classifyPayableHours((()=>{const i=engineInput(variant==='owner');if(variant==='noProfile')i.wages=[];return i;})())}]});
const adp=(codes:ExportProfile['earningsCodes']={regular:'REG',overtime:'OT',doubleTime:'DT'}):ExportProfile=>({version:1,name:'RUN',product:'ADP RUN',format:'ADP_RUN_GENERIC_V1',dateFormat:'US',hourDecimals:2,precision:'HALF_UP',verifiedRequirements:'Fictional verified template',reviewedTimeBasis:true,columns:adpRunColumns('ABC1','W','R1'),earningsCodes:codes,employeeMappings:[{employeeId:'E1',providerEmployeeId:'1001'}]});
const hours=(ns:string)=>decimalHours(ns,2,'HALF_UP');
const cents=(h:string,rateCents:number)=>Math.round(Number(h)*100)*rateCents/100;

// Jose 2026-10-25: both overnight entries count wholly on their start day (Sat and Sun),
// so all 8 h of the Sun 22:00→Mon 06:00 shift belong to this period.
describe('X1: export pays payable hours, not elapsed time with breaks',()=>{
 it('elapsed time is unchanged provenance: 27.93 h clipped to the period, including the 1 h meal',()=>{
  expect(hours(card.recordedNanoseconds)).toBe('27.93');expect(hours(card.breakNanoseconds)).toBe('1.00');
 });
 it.each(['owner','default'] as const)('engine (%s policy): 31.93 REG + 1.00 OT, 32.93 paid, 1.00 unpaid break; overnight never blocks',variant=>{
  const payable=modelFor(variant).rows[0].payable!;
  expect(payable.state).toBe('ready');if(payable.state!=='ready')return;
  expect({regular:hours(payable.regularNanoseconds),overtime:hours(payable.overtimeNanoseconds),doubleTime:hours(payable.doubleTimeNanoseconds),paid:hours(payable.paidNanoseconds),unpaid:hours(payable.unpaidBreakNanoseconds)})
   .toEqual({regular:'31.93',overtime:'1.00',doubleTime:'0.00',paid:'32.93',unpaid:'1.00'});
  expect(payable.basis.dailyInterpretation).toBe('SHIFT_START_DAY');
  // Timecards' paid time (same attribution, elapsed − unpaid breaks) equals the engine's paid hours.
  expect(card.paidNanoseconds).toBe(payable.paidNanoseconds);expect(card.unpaidBreakNanoseconds).toBe(payable.unpaidBreakNanoseconds);
  // ...and Timecards flag the same meal-period days as payroll.
  expect(card.mealWarnings).toEqual(payable.mealWarnings);
  expect(payable.mealWarnings.map(w=>[w.date,w.kind,w.minutes])).toEqual([['2026-10-20','NO_MEAL_5H',475],['2026-10-24','NO_MEAL_5H',480],['2026-10-25','NO_MEAL_5H',480]]);
 });
 it('ADP RUN emits a REG row and an OT row; the meal hour is not paid and OT is not paid as REG',()=>{
  const csv=mappedPayrollCsv(modelFor('owner'),adp());
  expect(csv).toBe('##GENERIC## V1.0\r\n"IID","Pay Frequency","Pay Period Start Date","Pay Period End Date","Employee ID","Earnings Code","Pay Hours","Dollars","Separate Check","Worked In Dept","Rate Code"\r\n'+
   '"ABC1","W","10/19/2026","10/25/2026","1001","REG","31.93","","0","","R1"\r\n"ABC1","W","10/19/2026","10/25/2026","1001","OT","1.00","","0","","R1"\r\n');
  // At $20/h: 31.93 × 20 + 1.00 × 30 = 668.60, versus 33.93 elapsed paid straight (678.60).
  expect(cents('31.93',2000)+cents('1.00',3000)).toBe(66860);expect(cents('33.93',2000)-(cents('31.93',2000)+cents('1.00',3000))).toBe(1000);
 });
 it('blocks the provider file when an overtime code is missing instead of paying OT as REG',()=>{
  expect(()=>mappedPayrollCsv(modelFor('owner'),adp({regular:'REG',overtime:null,doubleTime:null}))).toThrow('Add the overtime earnings code');
 });
 it('without a pay profile the provider file fails and the default file explains',()=>{
  const model=modelFor('noProfile');
  expect(model.rows[0].payable).toMatchObject({state:'blocked',code:'WAGE_PROFILE_REQUIRED'});
  expect(()=>mappedPayrollCsv(model,adp())).toThrow('Payable hours unavailable for Alexandra Rivera: Needs a pay profile in Payroll settings');
  const csv=mappedPayrollCsv(model,neutralProfile());
  expect(csv).toContain('"Paid hours","Regular hours","Overtime hours"');
  expect(csv).toContain('"","","","","","","27.93","1.00","Needs a pay profile in Payroll settings","2"');
 });
 it('default file: human hours to 2 decimals, no nanoseconds or fingerprints',()=>{
  const csv=mappedPayrollCsv(modelFor('owner'),neutralProfile());
  expect(csv).toBe('﻿"Employee ID","Employee","Period start","Period end","Paid hours","Regular hours","Overtime hours","Double-time hours","7th-day hours (in overtime)","Unpaid break hours","Elapsed hours incl. breaks (not payable)","Break hours","Payable hours","Finalized revision"\r\n'+
   '"E1","Alexandra Rivera","2026-10-19","2026-10-25","32.93","31.93","1.00","0.00","0.00","1.00","27.93","1.00","Ready","2"\r\n');
  expect(csv).not.toMatch(/\d{10,}/);expect(csv).not.toContain('a'.repeat(32));
 });
});

describe('payable mapping sources',()=>{
 const base:CanonicalPayrollExport=modelFor('owner');
 const custom=(columns:ExportProfile['columns'],extra:Partial<ExportProfile>={}):ExportProfile=>({...neutralProfile(),columns,...extra});
 it('a custom file of payable columns without a status column blocks an unclassified employee',()=>{
  expect(()=>mappedPayrollCsv(modelFor('noProfile'),custom([{header:'Paid',source:'paidHours'}]))).toThrow('Payable hours unavailable');
  expect(mappedPayrollCsv(base,custom([{header:'Paid',source:'paidHours'},{header:'OT',source:'overtimeHours'}]))).toBe('﻿"Paid","OT"\r\n"32.93","1.00"\r\n');
 });
 it('a version-1 record (before payable hours) never fills payable cells',()=>{
  const v1:CanonicalPayrollExport={...base,version:1,payableBasis:undefined,rows:base.rows.map(({payable:_p,...r})=>r)};
  expect(()=>mappedPayrollCsv(v1,custom([{header:'Paid',source:'paidHours'}]))).toThrow('export made before payable hours');
 });
 it('double time is its own earnings row and code',()=>{
  const dt={...base,rows:[{...base.rows[0],payable:classifyPayableHours((()=>{const i=input();i.wages[0].overtime='DOUBLE_PRESERVED';i.timecards[0].entries[0].endAt='2026-10-05T17:00:00-04:00';return i;})())}]};
  expect(mappedPayrollCsv(dt,custom([{header:'Code',source:'earningsCode'},{header:'Hours',source:'earningsHours'}],{earningsCodes:{regular:'REG',overtime:'OT',doubleTime:'DT'}}))).toBe('﻿"Code","Hours"\r\n"REG","8.00"\r\n"DT","1.00"\r\n');
 });
 it('earning rows need a regular code and distinct codes',()=>{
  expect(()=>parseExportProfile(custom([{header:'Code',source:'earningsCode'}]))).toThrow('regular earnings code');
  expect(()=>parseExportProfile(custom([{header:'Code',source:'earningsCode'}],{earningsCodes:{regular:'REG',overtime:'REG',doubleTime:null}}))).toThrow('different earnings code');
  expect(()=>parseExportProfile(custom([{header:'Code',source:'earningsCode'}],{earningsCodes:{regular:'=CMD',overtime:null,doubleTime:null}}))).toThrow('earnings codes');
 });
});

describe('saved ADP RUN mappings from before payable hours',()=>{
 const legacy={...adp(),earningsCodes:undefined,columns:adpRunColumns('ABC1','W','R1').map((c,i)=>i===5?{header:c.header,source:'constant' as const,constant:'REG'}:i===6?{header:c.header,source:'recordedHours' as const}:c)};
 it('still load, so the export page keeps working',()=>{const p=parseExportProfile(legacy);expect(isLegacyAdpProfile(p)).toBe(true);});
 it('never produce a file that pays elapsed time with breaks',()=>{expect(()=>mappedPayrollCsv(modelFor('owner'),legacy)).toThrow('saved before paid and overtime hours');});
 it('a current RUN mapping needs earnings codes',()=>{expect(()=>parseExportProfile({...adp(),earningsCodes:undefined})).toThrow();});
});
