import {describe,expect,it} from 'vitest';
import {projectReports} from './project';
import {projectTimecard} from '../timecards/project';
import {makeAttendanceSource,makeRecordedEntry} from '../../test/fixtures/attendance-exceptions';
import {projectAttendanceForPeriod} from '../attendance/project';
const source={employeeId:'E1',employeeName:'Avery',timeZone:'America/Puerto_Rico',startDate:'2026-09-21',endDate:'2026-09-27',pendingCorrections:0,
  corrections:[],entries:[{id:'T1',locationId:'L1',locationName:'Office',positionId:'P1',positionName:'Historical support',sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,
    startAt:'2026-09-22T12:00:00Z',endAt:'2026-09-22T20:00:00Z',rawStartAt:'2026-09-22T12:00:00Z',rawEndAt:'2026-09-22T20:00:00Z',breaks:[]}]};
const cards=[{source,card:projectTimecard(source,'2026-10-01T12:00:00Z'),sourceHash:'a'.repeat(32),revision:0,state:'DRAFT',history:[]}];
const data={workspaceId:'W1',timeZone:'America/Puerto_Rico',observedAt:'2026-10-01T12:00:00Z',period:{startDate:'2026-09-21',endDate:'2026-09-27'},cards,
  schedules:[{id:'S1',employeeId:'E1',locationId:'L1',locationName:'Office',positionId:'P1',positionName:'Support',date:'2026-09-22',startTime:'08:00',endTime:'16:00',revisionId:'R1',revisionNumber:1,isCalloutApproved:false}],
  requests:[],changes:[],publications:[],attendanceSources:[],publishedWeeks:['2026-09-14','2026-09-21']};
describe('D4 report definitions and provenance',()=>{
  it('aggregates canonical elapsed time by employee, location and captured historical position',()=>{
    const report=projectReports(data);
    expect(report.hoursByEmployee[0].recordedNanoseconds).toBe('28800000000000');
    expect(report.hoursByLocation[0].recordedNanoseconds).toBe('28800000000000');
    expect(report.hoursByPosition[0].name).toBe('Historical support');
  });
  it('compares the explicitly identified current published plan with effective actual time',()=>{
    const report=projectReports(data);
    expect(report.scheduleVsActual[0]).toMatchObject({scheduledNanoseconds:'28800000000000',recordedNanoseconds:'28800000000000',differenceNanoseconds:'0'});
  });
  it('keeps an unpublished plan unavailable instead of zero',()=>{const report=projectReports({...data,publishedWeeks:[]});expect(report.planCoverage.state).toBe('unpublished');expect(report.scheduleVsActual[0].scheduledNanoseconds).toBeNull();expect(report.scheduleVsActual[0].differenceNanoseconds).toBeNull();});
  it('accepts a published empty plan as zero assigned time',()=>{expect(projectReports({...data,schedules:[]}).scheduleVsActual[0].scheduledNanoseconds).toBe('0');});
  it('excludes released callout assignments from scheduled coverage',()=>{
    expect(projectReports({...data,schedules:[{...data.schedules[0],isCalloutApproved:true}]}).scheduleVsActual[0].scheduledNanoseconds).toBe('0');
  });
  it('does not fabricate overtime or policy-dependent reliability/stability scores',()=>{
    const report=projectReports(data);
    expect(report.overtime.state).toBe('unavailable');
    expect(report.coverageReliability.score).toBeNull();
    expect(report.scheduleStability.score).toBeNull();
  });
  it('distinguishes missing historical position from a current profile reassignment',()=>{
    const changed={...source,entries:[{...source.entries[0],positionId:null,positionName:null}]};
    const report=projectReports({...data,cards:[{...cards[0],source:changed,card:projectTimecard(changed,data.observedAt)}]});
    expect(report.hoursByPosition[0].name).toBe('Position not captured');
  });
  it('reports empty data as zero complete records',()=>{
    const report=projectReports({...data,cards:[],schedules:[]});
    expect(report.summary.recordedNanoseconds).toBe('0');expect(report.hoursByEmployee).toEqual([]);
  });
  it('counts approved coverage outcomes using distinct historical request identity',()=>{
    const event={id:'C1',requestId:'X1',requestKind:'EXCHANGE',eventKind:'COMPLETED',requestRevision:2,createdAt:'2026-09-23T12:00:00Z',sourceDate:'2026-09-22',employeeId:'E1',outcomeMode:'AUTOMATIC',kind:'COVERAGE'};
    expect(projectReports({...data,changes:[event,{...event,id:'C2',requestRevision:3}]}).coverageReliability.completedCoverageRequests).toBe(1);
  });
  it('fails closed for duplicate plan identities and excessive source data',()=>{
    expect(()=>projectReports({...data,schedules:[data.schedules[0],data.schedules[0]]})).toThrow();
    expect(()=>projectReports({...data,schedules:Array(10001).fill(data.schedules[0])})).toThrow();
  });
  it('does not infer unresolved DST scheduled times as zero',()=>{
    const changed={...source,timeZone:'America/New_York',startDate:'2026-11-01',endDate:'2026-11-01',entries:[]};
    const report=projectReports({...data,timeZone:changed.timeZone,period:{startDate:changed.startDate,endDate:changed.endDate},
      cards:[{...cards[0],source:changed,card:projectTimecard(changed,'2026-11-03T12:00:00Z')}],
      schedules:[{...data.schedules[0],date:'2026-11-01',startTime:'01:30',endTime:'03:00'}]});
    expect(report.scheduleVsActual[0].scheduledNanoseconds).toBeNull();
  });
  it('includes raw historical period observations without changing D1 today/open scope',()=>{
    const entry=makeRecordedEntry({clockInAt:'2030-10-01T12:00:00Z',clockOutAt:'2030-10-01T20:00:00Z',status:'CLOCKED_OUT',
      scheduleContext:{version:1,status:'UNMATCHED',timeZone:'America/Puerto_Rico',capturedAt:'2030-10-01T12:00:00Z',candidateCount:0,reviewedRevisionIds:[],reason:'NO_MATCH',match:null}});
    const result=projectAttendanceForPeriod(makeAttendanceSource({observedAt:'2030-10-07T21:00:00Z',entries:[entry]}),'2030-10-01T04:00:00Z','2030-10-02T04:00:00Z');
    expect(result.state).toBe('ready');if(result.state==='ready')expect(result.groups[0].observations[0].kind).toBe('SCHEDULE_UNMATCHED');
  });
});
