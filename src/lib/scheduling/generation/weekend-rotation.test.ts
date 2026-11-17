import {expect,it} from 'vitest';
import {weekendBurden,compareWeekendRotation,type WeekendHistory} from './weekend-rotation';
import {automaticWeek,automaticAssignment} from '../../../test/fixtures/automatic-week';
import {applyRestrictionCommand,emptyRestrictionDocument} from '../restrictions';
import {planWeek} from './planner';
const rules=()=>applyRestrictionCommand(emptyRestrictionDocument(),{kind:'SET',operationId:'11111111-1111-4111-8111-111111111111',expectedRevision:0,effectiveWeek:'2026-09-07',unavailable:[],reason:'Agreed no recurring restrictions'},{actorId:'owner',actorRole:'OWNER',now:'2026-09-01T00:00:00.000Z',earliestWeek:'2026-09-07'}).document.versions;
function fixture(){
 const input=automaticWeek();input.employees=input.employees.slice(0,2);input.staffing[0].minimumStaffPerShift=1;input.coverageWindows[0].dayOfWeek=6;
 for(const e of input.employees){e.availability=[];Object.assign(e,{managementRestrictions:rules()});}
 const history:WeekendHistory={knownWeeks:[{weekStart:'2026-09-21',locationIds:['loc-1']},{weekStart:'2026-09-28',locationIds:['loc-1']}],employeeSince:{e1:'2026-09-01',e2:'2026-09-01'},assignments:[
  automaticAssignment('last','e1',{date:'2026-10-03',scheduleStatus:'PUBLISHED'}),
  automaticAssignment('older','e1',{date:'2026-09-26',scheduleStatus:'ARCHIVED'}),
 ]};
 return {input,history};
}
it('uses actual retained weekend assignments rather than the rotating tie ID',()=>{
 const {input,history}=fixture();const [a,b]=input.employees;
 expect(weekendBurden(a,input.weekStart,history)).toMatchObject({eligibleWeekends:2,workedWeekends:2,lastWeekendWorked:true});
 expect(weekendBurden(b,input.weekStart,history)).toMatchObject({eligibleWeekends:2,workedWeekends:0,lastWeekendWorked:false});
 expect(compareWeekendRotation(a,b,{weekStart:input.weekStart,history,employees:input.employees,ledger:[]})).toBeGreaterThan(0);
});
it('prioritizes the employee who had weekends off while preserving coverage and caps',()=>{
 const {input,history}=fixture();Object.assign(input,{weekendHistory:history});input.employees[0].targetWeeklyHours=40;
 const plan=planWeek(input);expect(plan.status).toBe('COMPLETE');expect(plan.additions).toHaveLength(1);expect(plan.additions[0].employeeId).toBe('e2');
 input.employees[1].maximumWeeklyHours=0;
 const constrained=planWeek(input);expect(constrained.status).toBe('COMPLETE');expect(constrained.additions[0].employeeId).toBe('e1');
});
it('does not treat approved leave or agreed weekend restrictions as a preferential weekend off',()=>{
 const {input,history}=fixture();input.employees[1].approvedTimeOff=[{startDate:'2026-10-03',endDate:'2026-10-04',status:'APPROVED'}];
 expect(weekendBurden(input.employees[1],input.weekStart,history)).toMatchObject({eligibleWeekends:1,lastWeekendWorked:null});
 Object.assign(input.employees[1],{managementRestrictions:[{...rules()[0],unavailable:[{dayOfWeek:0,startTime:'00:00',endTime:'24:00'}]}]});
 expect(weekendBurden(input.employees[1],input.weekStart,history).eligibleWeekends).toBe(0);
});
it('missing employee/history evidence stays unknown rather than inventing weekends off',()=>{
 const {input,history}=fixture();delete history.employeeSince.e2;
 expect(weekendBurden(input.employees[1],input.weekStart,history)).toMatchObject({eligibleWeekends:0,workedWeekends:0,lastWeekendWorked:null});
 expect(compareWeekendRotation(input.employees[0],input.employees[1],{weekStart:input.weekStart,history:{knownWeeks:[],employeeSince:{},assignments:[]},employees:input.employees,ledger:[]})).toBe(0);
});
it('counts Friday carry-in once, deduplicates rows and ignores future/draft or released assignments',()=>{
 const {input,history}=fixture();history.assignments=[
  automaticAssignment('night','e1',{date:'2026-10-02',startTime:'22:00',endTime:'06:00',scheduleStatus:'PUBLISHED'}),
  automaticAssignment('night','e1',{date:'2026-10-02',startTime:'22:00',endTime:'06:00',scheduleStatus:'PUBLISHED'}),
  automaticAssignment('draft','e1',{date:'2026-09-26',scheduleStatus:'DRAFT'}),
  automaticAssignment('future','e1',{date:'2026-10-10',scheduleStatus:'PUBLISHED'}),
 ];
 expect(weekendBurden(input.employees[0],input.weekStart,history)).toMatchObject({eligibleWeekends:2,workedWeekends:1,lastWeekendWorked:true});
 history.assignments[0].isCalloutApproved=true;history.assignments[1].isCalloutApproved=true;
 expect(weekendBurden(input.employees[0],input.weekStart,history)).toMatchObject({eligibleWeekends:1,workedWeekends:0,lastWeekendWorked:null});
});
it('does not give a new employee credit for weekends before the record existed',()=>{
 const {input,history}=fixture();history.employeeSince.e2='2026-10-02';
 expect(weekendBurden(input.employees[1],input.weekStart,history).eligibleWeekends).toBe(0);
});
it('does not invent weekends off before the first effective agreement',()=>{
 const {input,history}=fixture();Object.assign(input.employees[1],{managementRestrictions:[{...rules()[0],effectiveWeek:'2026-10-05'}]});
 expect(weekendBurden(input.employees[1],input.weekStart,history)).toMatchObject({eligibleWeekends:0,lastWeekendWorked:null});
});
it('requires complete location publication evidence before inferring a weekend off',()=>{
 const {input,history}=fixture();input.employees[1].eligibleLocationIds=['loc-1','loc-2'];
 expect(weekendBurden(input.employees[1],input.weekStart,history)).toMatchObject({eligibleWeekends:0,lastWeekendWorked:null});
});
it('retains positive Sunday work when Saturday was released or approved leave/restriction also exists',()=>{
 const {input,history}=fixture();history.assignments=[automaticAssignment('released','e1',{date:'2026-10-03',scheduleStatus:'PUBLISHED',isCalloutApproved:true}),automaticAssignment('worked','e1',{date:'2026-10-04',scheduleStatus:'PUBLISHED'})];
 input.employees[0].approvedTimeOff=[{startDate:'2026-10-03',endDate:'2026-10-03',status:'APPROVED'}];
 expect(weekendBurden(input.employees[0],input.weekStart,history)).toMatchObject({eligibleWeekends:2,workedWeekends:1,lastWeekendWorked:true});
});
