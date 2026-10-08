import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {projectPublishedAssignmentRows} from './employee-published-assignments.server';

const row=(overrides:Record<string,unknown>={})=>({shiftId:'own',assignmentEpisodeId:'00000000-0000-4000-8000-000000000001',termsRevision:1,
 weekStart:'2026-12-28',date:'2027-01-04',startTime:'08:00',endTime:'16:00',locationId:'loc-1',locationLabel:'Main',
 positionLabel:'Counter',designatedLead:false,publicationRevisionId:'revision-1',...overrides});

it('next_shift_crosses_multiple_weeks and year_rollover using real instants and source identity',()=>{
 const result=projectPublishedAssignmentRows({observedAt:'2026-12-30T12:00:00.000Z',timeZone:'America/Puerto_Rico',
  future:[row({weekStart:'2027-01-04'})],current:[],coverageComplete:false});
 expect(result).toEqual({observedAt:'2026-12-30T12:00:00.000Z',timeZone:'America/Puerto_Rico',
  nextShift:{shiftId:'own',assignmentEpisodeId:'00000000-0000-4000-8000-000000000001',termsRevision:1,weekStart:'2027-01-04',
   date:'2027-01-04',startAt:'2027-01-04T12:00:00.000Z',endAt:'2027-01-04T20:00:00.000Z',locationId:'loc-1',locationLabel:'Main',
   positionLabel:'Counter',designatedLead:false,publicationRevisionId:'revision-1'},currentShift:null,publicationState:'partial'});
});
it('ongoing_overnight_previous_week is Scheduled now and Next Shift stays separate',()=>{
 const result=projectPublishedAssignmentRows({observedAt:'2027-01-04T04:00:00.000Z',timeZone:'America/Puerto_Rico',
  current:[row({shiftId:'overnight',weekStart:'2026-12-28',date:'2027-01-03',startTime:'22:00',endTime:'02:00'})],
  future:[row({shiftId:'next',weekStart:'2027-01-04',date:'2027-01-05'})],coverageComplete:true});
 expect(result?.currentShift).toMatchObject({shiftId:'overnight',date:'2027-01-03',startAt:'2027-01-04T02:00:00.000Z',endAt:'2027-01-04T06:00:00.000Z'});
 expect(result?.nextShift).toMatchObject({shiftId:'next',date:'2027-01-05'});
 expect(result?.publicationState).toBe('complete');
});
it('at_exact_start_becomes_current and Next Shift advances',()=>{
 const result=projectPublishedAssignmentRows({observedAt:'2027-01-04T12:00:00.000Z',timeZone:'America/Puerto_Rico',
  current:[row({weekStart:'2027-01-04'})],future:[row({shiftId:'later',weekStart:'2027-01-04',date:'2027-01-06'})],coverageComplete:true});
 expect(result?.currentShift?.shiftId).toBe('own');expect(result?.nextShift?.shiftId).toBe('later');
});
it('invalid_DST_boundary_unavailable instead of normalizing a skipped local time',()=>{
 expect(projectPublishedAssignmentRows({observedAt:'2026-03-01T12:00:00.000Z',timeZone:'America/New_York',
  current:[],future:[row({weekStart:'2026-03-02',date:'2026-03-08',startTime:'02:30',endTime:'03:30'})],coverageComplete:true})).toBeNull();
});
