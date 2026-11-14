import {expect,it} from 'vitest';
import {parseTimecardsResponse} from './timecards/read-model';
import {parseCurrentTimecards} from './timecards/client';
import {parseManagerTimeCorrections} from './time-corrections/read-model';

const period={startDate:'2026-09-21',endDate:'2026-09-27'},observedAt='2026-11-10T12:00:00Z';
const cards=Array.from({length:301},(_,i)=>({source:{...period,employeeId:'PERSON-'+i,employeeName:'Fictional person '+i,timeZone:'America/Puerto_Rico',pendingCorrections:0,entries:[],corrections:[]},sourceHash:'a'.repeat(32),revision:0,state:'DRAFT',history:[]}));
const requests=Array.from({length:101},(_,i)=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,kind:'ENTRY_BOUNDARY',status:'PENDING',revision:1,createdAt:'2026-09-22T16:00:00Z',locationId:'L1',locationName:'Main',originalStartAt:'2026-09-22T12:00:00Z',originalEndAt:'2026-09-22T16:00:00Z',proposedStartAt:'2026-09-22T12:05:00Z',proposedEndAt:'2026-09-22T15:55:00Z',breakName:null,reason:'Fictional correction',baseChanged:false,context:{state:'confirmed',sourceKind:'RECORDED',startAt:'2026-09-22T12:00:00Z',endAt:'2026-09-22T16:00:00Z',totalDecisions:0,decisions:[]},employeeName:'Fictional person',isSelf:false}));
const timecardPaging={version:'COMPLETE_READ_V1',pageSize:300,totalRows:301,pageCounts:[300,1]};
const correctionPaging={version:'COMPLETE_READ_V1',pageSize:100,totalRows:101,pageCounts:[100,1]};
it('accepts all301 validated timecards through a complete bounded-page manifest, including the last identity',()=>{
 const result=parseCurrentTimecards({state:'ready',validForMs:45000,observedAt,cards,paging:timecardPaging},period);
 expect(result.cards).toHaveLength(301);expect(result.cards.at(-1)?.card.employeeId).toBe('PERSON-300');
 expect(result).toMatchObject({paging:timecardPaging});
});
it('accepts all101 validated manager corrections through the same complete-page contract',()=>{
 const result=parseManagerTimeCorrections({state:'ready',validForMs:45000,observedAt,timeZone:'America/Puerto_Rico',requests,paging:correctionPaging});
 expect(result.state).toBe('ready');if(result.state!=='ready')throw Error('Expected complete correction queue');
 expect(result.requests).toHaveLength(101);expect(result.requests.at(-1)?.id).toBe('00000000-0000-4000-8000-000000000100');
 expect(result).toMatchObject({paging:correctionPaging});
});
it('still rejects oversized legacy responses that provide no completeness evidence',()=>{
 expect(()=>parseTimecardsResponse({observedAt,cards},period)).toThrow();
 expect(()=>parseManagerTimeCorrections({state:'ready',validForMs:45000,observedAt,timeZone:'America/Puerto_Rico',requests})).toThrow();
});
it.each([
 {...timecardPaging,totalRows:300}, {...timecardPaging,pageCounts:[300]}, {...timecardPaging,pageCounts:[299,2]},
 {...timecardPaging,pageCounts:[300,0,1]}, {...timecardPaging,pageSize:301}, {...timecardPaging,version:'UNKNOWN'},
])('refuses incomplete or noncanonical timecard page evidence %j',paging=>{
 expect(()=>parseTimecardsResponse({observedAt,cards,paging},period)).toThrow();
});
it('validates manifests even below the legacy bound',()=>{
 expect(()=>parseTimecardsResponse({observedAt,cards:cards.slice(0,1),paging:{...timecardPaging,totalRows:1,pageCounts:[0]}},period)).toThrow();
});
it('refuses repeated correction identities instead of presenting duplicate work as complete',()=>{
 expect(()=>parseManagerTimeCorrections({state:'ready',validForMs:45000,observedAt,timeZone:'America/Puerto_Rico',requests:[...requests.slice(0,100),requests[0]],paging:correctionPaging})).toThrow();
});
it('refuses a repeated timecard identity across the page boundary',()=>{
 expect(()=>parseTimecardsResponse({observedAt,cards:[...cards.slice(0,300),cards[0]],paging:timecardPaging},period)).toThrow();
});
