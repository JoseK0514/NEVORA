import {describe,expect,it} from 'vitest';
import {parseEmployeeTimeCorrections,parseManagerTimeCorrections} from './read-model';

const context={state:'confirmed',sourceKind:'ADJUSTMENT',startAt:'2030-10-07T12:15:00Z',endAt:'2030-10-07T15:45:00Z',totalDecisions:1,decisions:[{
  status:'APPROVED',decidedAt:'2030-10-07T16:02:00Z',startAt:'2030-10-07T12:15:00Z',endAt:'2030-10-07T15:45:00Z',note:'Earlier approved interval.',
}]};
const request={id:'66666666-6666-4666-8666-666666666666',kind:'ENTRY_BOUNDARY',status:'PENDING',revision:1,createdAt:'2030-10-07T16:05:00Z',locationId:'loc-1',locationName:'QA',originalStartAt:'2030-10-07T12:00:00Z',originalEndAt:'2030-10-07T16:00:00Z',proposedStartAt:'2030-10-07T12:20:00Z',proposedEndAt:'2030-10-07T15:40:00Z',breakName:null,reason:'Review the next interval.',baseChanged:false,context,employeeName:'Avery QA',isSelf:false};
const manager={state:'ready',observedAt:'2030-10-07T16:10:00Z',timeZone:'America/Puerto_Rico',requests:[request]};
const target={kind:'ENTRY_BOUNDARY',timeEntryId:'entry-1',breakEntryId:null,recordedStartAt:request.originalStartAt,recordedEndAt:request.originalEndAt,context};
const employee={...manager,totalRequests:1,locations:[],targets:[target]};
describe('D2 protected effective context parsing',()=>{
  it('retains authoritative effective context without deriving it from raw or proposed time',()=>{
    expect(parseManagerTimeCorrections(manager)).toMatchObject({requests:[{context,baseChanged:false}]});
    expect(parseEmployeeTimeCorrections(employee)).toMatchObject({targets:[target]});
  });
  it.each([
    {...context,startAt:null},
    {...context,endAt:context.startAt},
    {...context,sourceKind:'SCHEDULE'},
    {...context,totalDecisions:2},
    {...context,decisions:Array(6).fill(context.decisions[0]),totalDecisions:6},
    {...context,decisions:[{...context.decisions[0],status:'PENDING'}]},
    {...context,decisions:[{...context.decisions[0],note:'x'.repeat(501)}]},
  ])('rejects malformed or misleadingly incomplete context %j',value=>{
    expect(()=>parseManagerTimeCorrections({...manager,requests:[{...request,context:value}]})).toThrow();
  });
  it('rejects absent context, unbounded or duplicate targets, and invalid timezones',()=>{
    expect(()=>parseManagerTimeCorrections({...manager,requests:[{...request,context:undefined}]})).toThrow();
    expect(()=>parseEmployeeTimeCorrections({...employee,targets:Array(101).fill(target)})).toThrow();
    expect(()=>parseEmployeeTimeCorrections({...employee,targets:[target,target]})).toThrow();
    expect(()=>parseManagerTimeCorrections({...manager,timeZone:'Invalid/Zone'})).toThrow();
  });
  it('retains approved missing-time base evidence without treating it as a raw punch',()=>{
    const missing={...request,kind:'MISSING_ENTRY',context:{...context,sourceKind:'ADJUSTMENT'}};
    expect(parseManagerTimeCorrections({...manager,requests:[missing]})).toMatchObject({requests:[{kind:'MISSING_ENTRY',originalStartAt:request.originalStartAt,context:missing.context}]});
    expect(()=>parseManagerTimeCorrections({...manager,requests:[{...missing,originalEndAt:null}]})).toThrow();
  });
  it('does not substitute raw timestamps for unavailable context',()=>{
    expect(parseManagerTimeCorrections({...manager,requests:[{...request,context:{state:'unavailable'}}]})).toMatchObject({requests:[{context:{state:'unavailable'}}]});
  });
});
