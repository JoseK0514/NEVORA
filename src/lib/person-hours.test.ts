import {it,expect} from 'vitest';
import {projectPersonHours} from './person-hours';
const base={employeeId:'e',today:'2026-11-09',weekStart:'2026-11-09',timeZone:'America/Puerto_Rico',observedAt:'2026-11-10T12:00:00Z',scheduledComplete:true,shifts:[{employeeId:'e',locationId:'a',date:'2026-11-08',startTime:'22:00',endTime:'02:00',isCalloutApproved:false},{employeeId:'e',locationId:'b',date:'2026-11-09',startTime:'09:00',endTime:'17:00',isCalloutApproved:false}],timecardSource:{employeeId:'e',employeeName:'Private name',timeZone:'America/Puerto_Rico',startDate:'2026-11-09',endDate:'2026-11-15',pendingCorrections:0,entries:[],corrections:[]}};
it('splits published overnight shifts at the canonical workweek and respects location scope',()=>{
 expect(projectPersonHours(base,['a'])).toMatchObject({scheduledTodayMinutes:120,scheduledWeekMinutes:120,workedWeekMinutes:0});
 expect(projectPersonHours(base,null).scheduledWeekMinutes).toBe(600);
 expect(JSON.stringify(projectPersonHours(base,null))).not.toContain('Private name');
});
it('keeps missing sources unknown and excludes released callouts',()=>{
 expect(projectPersonHours({...base,scheduledComplete:false,timecardSource:null},null)).toMatchObject({scheduledTodayMinutes:null,scheduledWeekMinutes:null,workedWeekMinutes:null});
 expect(projectPersonHours({...base,shifts:base.shifts.map(s=>({...s,isCalloutApproved:true}))},null).scheduledWeekMinutes).toBe(0);
});
it('uses effective elapsed week clipping including breaks and excludes other locations from worked totals',()=>{
 const entry=(id:string,locationId:string,startAt:string,endAt:string)=>({id,locationId,locationName:'Private location',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt,endAt,rawStartAt:startAt,rawEndAt:endAt,breaks:id==='a'?[{id:'break',startAt:'2026-11-09T04:15:00Z',endAt:'2026-11-09T04:30:00Z',rawStartAt:'2026-11-09T04:15:00Z',rawEndAt:'2026-11-09T04:30:00Z',name:'Rest',adjustmentId:null}]:[]});
 const source={...base,timecardSource:{...base.timecardSource,entries:[entry('a','a','2026-11-09T03:00:00Z','2026-11-09T05:00:00Z'),entry('b','b','2026-11-09T06:00:00Z','2026-11-09T07:00:00Z')]}};
 expect(projectPersonHours(source,['a']).workedWeekMinutes).toBe(60);
 expect(projectPersonHours(source,null).workedWeekMinutes).toBe(120);
});
