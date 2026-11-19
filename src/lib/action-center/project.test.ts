import {expect,it} from '@rstest/core';
import {combineManagerActions} from './project';
import {isOwnReview} from './needs-you';
import {parseTimecardsResponse} from '../timecards/read-model';
import type {TimecardSource} from '../timecards/project';
import type {AttendanceDisplayReview} from '../attendance/read-model';
import type {ManagerTimeCorrections} from '../time-corrections/read-model';
const period={startDate:'2026-11-02',endDate:'2026-11-08'},at='2026-11-09T12:00:00Z';
function card(employeeId:string,locationName:string){
 const source:TimecardSource={...period,employeeId,employeeName:'Casey',timeZone:'America/Puerto_Rico',pendingCorrections:0,corrections:[],entries:[{id:employeeId+'entry',locationId:locationName,locationName,positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-11-02T12:00:00Z',endAt:'2026-11-02T20:00:00Z',rawStartAt:'2026-11-02T12:00:00Z',rawEndAt:'2026-11-02T20:00:00Z',breaks:[]}]};
 return {source,sourceHash:'a'.repeat(32),revision:0,state:'DRAFT',history:[]};
}
const attendance={state:'ready',groups:[],labels:{employees:[]}} as unknown as Extract<AttendanceDisplayReview,{state:'ready'}>;
const corrections={state:'ready',requests:[]} as unknown as Extract<ManagerTimeCorrections,{state:'ready'}>;
it('disambiguates same-period timecard work using authorized recorded location names, without trailing punctuation',()=>{
 const projection=parseTimecardsResponse({observedAt:at,cards:[card('one','Condado'),card('two','Ponce')]},period);
 const rows=combineManagerActions([],attendance,corrections,projection,'owner');
 expect(rows.map(r=>r.detail)).toEqual(['Casey · Nov 2 – Nov 8 · Condado','Casey · Nov 2 – Nov 8 · Ponce']);
 expect(new Set(rows.map(r=>r.id)).size).toBe(2);
});
it('keeps a single-location period concise without inventing a location for empty records',()=>{
 const projection=parseTimecardsResponse({observedAt:at,cards:[card('one','Condado')]},period);
 expect(combineManagerActions([],attendance,corrections,projection,'owner')[0].detail).toBe('Casey · Nov 2 – Nov 8');
});
it('emits explicit independent-review facts and actual period independent of wording',()=>{
 const projection=parseTimecardsResponse({observedAt:at,cards:[card('owner','Condado'),card('other','Condado')]},period);
 const rows=combineManagerActions([],attendance,corrections,projection,'owner');
 expect(rows.find(r=>r.employeeId==='owner')).toMatchObject({review:{concernsActor:true,independentReviewRequired:true,actorMayReview:false,unavailableReason:'independent_review_required',period,deadlineAt:null,requiredReviewer:{scope:'COMPANY',roles:['OWNER','MANAGER'],assignment:'unassigned',independentOf:'SUBJECT'}}});
 const other=rows.find(r=>r.employeeId==='other')!;
 expect(other).toMatchObject({review:{concernsActor:false,actorMayReview:true,unavailableReason:null}});
 const renamedOther={...other,title:'Your timecard needs another reviewer'},translatedOwn={...rows.find(r=>r.employeeId==='owner')!,title:'Revisa la tarjeta'};
 expect(isOwnReview(renamedOther)).toBe(false);
 expect(isOwnReview(translatedOwn)).toBe(true);
});
it('distinguishes correction subject from its independent-review requester restriction',()=>{
 const requests={...corrections,timeZone:'America/Puerto_Rico',requests:[{id:'correction',isSelf:true,concernsActor:false,employeeName:'Fictional person',kind:'MISSING_ENTRY',createdAt:at,originalStartAt:null,originalEndAt:null,proposedStartAt:'2026-11-02T12:00:00Z',proposedEndAt:'2026-11-02T20:00:00Z'}]} as Extract<ManagerTimeCorrections,{state:'ready'}>;
 expect(combineManagerActions([],attendance,requests,{cards:[]},'owner')[0]).toMatchObject({review:{concernsActor:false,actorMayReview:false,independentReviewRequired:true,requiredReviewer:{independentOf:'SUBJECT_AND_REQUESTER'}}});
});
