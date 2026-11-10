import {expect,it} from 'vitest';
import {projectEmployeeTime,parseEmployeeTime,formatRecordedDuration} from './employee-time';
const entry=(extra:Record<string,unknown>={})=>({id:'e1',employee_id:'worker',location_name:'Main Office',clock_in_at:'2030-10-07T12:00:00Z',clock_out_at:null,status:'CLOCKED_IN',history_valid:true,breaks:[],...extra});
const source=(entries:unknown[]=[],extra:Record<string,unknown>={})=>({observedAt:'2030-10-07T16:00:00Z',expiresAt:'2030-10-08T16:00:00Z',timeZone:'America/Puerto_Rico',recentCount:0,entries,...extra});
const project=(s:unknown)=>projectEmployeeTime(s,'worker');
const br=(extra:Record<string,unknown>={})=>({id:'b1',break_start_at:'2030-10-07T13:00:00Z',break_end_at:'2030-10-07T13:15:00Z',break_type_id:null,break_type_snapshot:null,...extra});
it('only a complete authorized snapshot may represent Off Clock and an empty history',()=>{expect(project(source())).toMatchObject({state:'ready',current:null,date:'2030-10-07',validForMs:45000,today:{entries:[],recordedSeconds:0,breakSeconds:0},recent:{entries:[],total:0,limit:20}});});
it('uses actual elapsed time and shows breaks separately without payroll deductions',()=>{const r=project(source([entry({breaks:[br()]})]));expect(r).toMatchObject({current:{state:'CLOCKED_IN',elapsedSeconds:14400,breakSeconds:900},today:{recordedSeconds:14400,breakSeconds:900}});});
it('reports an open break through the same observation without ending it',()=>{expect(project(source([entry({status:'ON_BREAK',breaks:[br({break_end_at:null})]})]))).toMatchObject({current:{state:'ON_BREAK',elapsedSeconds:14400,breakSeconds:10800,breaks:[{endAt:null,elapsedSeconds:10800}]}});});
it('uses recorded historical break names rather than current configuration',()=>{const b=br({break_type_id:'type',break_type_snapshot:{id:'type',version:2,name:'Original rest',category:'REST',targetMinutes:15}});expect(project(source([entry({breaks:[b]})]))).toMatchObject({current:{breaks:[{name:'Original rest'}]}});});
it('clips overnight recorded and break time to the configured day but retains full entry boundaries',()=>{const r=project(source([entry({clock_in_at:'2030-10-07T02:00:00Z',breaks:[br({break_start_at:'2030-10-07T03:30:00Z',break_end_at:'2030-10-07T04:30:00Z'})]})]));expect(r).toMatchObject({current:{elapsedSeconds:50400},today:{recordedSeconds:43200,breakSeconds:1800}});});
it('sums subsecond intervals before display conversion without rewriting timestamps',()=>{const a=entry({clock_in_at:'2030-10-07T12:00:00.100000Z',clock_out_at:'2030-10-07T12:00:00.700000Z',status:'CLOCKED_OUT'}),b=entry({id:'e2',clock_in_at:'2030-10-07T12:01:00.100000Z',clock_out_at:'2030-10-07T12:01:00.700000Z',status:'CLOCKED_OUT'});const r=project(source([a,b]));expect(r.today.recordedSeconds).toBe(1);expect(r.today.entries[0].clockInAt).toBe(a.clock_in_at);});
it('keeps completed earlier records distinct from today and current',()=>{const old=entry({clock_in_at:'2030-10-06T12:00:00Z',clock_out_at:'2030-10-06T16:00:00Z',status:'CLOCKED_OUT'});expect(project(source([old],{recentCount:1}))).toMatchObject({current:null,today:{entries:[],recordedSeconds:0},recent:{total:1,entries:[{elapsedSeconds:14400}]}});});
it('keeps an old unclosed entry current rather than assuming a daily reset',()=>{const r=project(source([entry({clock_in_at:'2030-10-04T12:00:00Z'})]));expect(r.current?.elapsedSeconds).toBe(273600);expect(r.today.recordedSeconds).toBe(43200);});
it.each([
 ['America/New_York','2030-03-10T16:00:00Z','2030-03-10T05:00:00Z',39600],
 ['America/New_York','2030-11-03T17:00:00Z','2030-11-03T04:00:00Z',46800],
 ['Asia/Kathmandu','2030-10-07T06:15:00Z','2030-10-06T18:15:00Z',43200],
])('uses actual configured-day duration across %s boundaries', (timeZone,observedAt,clock_in_at,seconds)=>{expect(project(source([entry({clock_in_at})],{timeZone,observedAt,expiresAt:'2031-01-01T00:00:00Z'})).today.recordedSeconds).toBe(seconds);});
it('bounds private response lifetime to the remaining real session',()=>{expect(project(source([],{expiresAt:'2030-10-07T16:00:00.900Z'})).validForMs).toBe(900);});
it.each([
 ['absent rows',()=>({})],['wrong employee',()=>source([entry({employee_id:'other'})])],
 ['duplicate entry',()=>source([entry(),entry()])],['two open entries',()=>source([entry(),entry({id:'other'})])],
 ['overlap',()=>source([entry({clock_out_at:'2030-10-07T15:00Z',status:'CLOCKED_OUT'}),entry({id:'other',clock_in_at:'2030-10-07T14:00Z'})])],
 ['future clock',()=>source([entry({clock_in_at:'2030-10-08T12:00Z'})])],['negative entry',()=>source([entry({clock_out_at:'2030-10-07T11:00Z',status:'CLOCKED_OUT'})])],
 ['missing break',()=>source([entry({status:'ON_BREAK'})])],['unclosed break on closed entry',()=>source([entry({status:'CLOCKED_OUT',clock_out_at:'2030-10-07T15:00Z',breaks:[br({break_end_at:null})]})])],
 ['unexpected open break',()=>source([entry({breaks:[br({break_end_at:null})]})])],['overlapping breaks',()=>source([entry({breaks:[br(),br({id:'b2'})]})])],
 ['break before clock',()=>source([entry({breaks:[br({break_start_at:'2030-10-07T11:00Z'})]})])],
 ['break after out',()=>source([entry({clock_out_at:'2030-10-07T12:30Z',status:'CLOCKED_OUT',breaks:[br()]})])],
 ['future break',()=>source([entry({breaks:[br({break_end_at:'2030-10-08T13:15Z'})]})])],
 ['bad history proof',()=>source([entry({history_valid:false})])],['bad timezone',()=>source([],{timeZone:'Invalid/Zone'})],
 ['expired observation',()=>source([],{expiresAt:'2030-10-07T16:00Z'})],['bad total',()=>source([],{recentCount:2})],
 ['broken type snapshot',()=>source([entry({breaks:[br({break_type_id:'type'})]})])],
] as const)('fails closed for %s rather than inventing an empty/healthy view',(_name,make)=>{expect(()=>project(make())).toThrow();});
it('returns only self-service display fields, never proof or raw database metadata',()=>{const r=project(source([entry({device_id:'secret-device',credential_hash:'secret',notes:'private'})]));expect(JSON.stringify(r)).not.toMatch(/worker|secret|credential|employee_id|history_valid|notes/);expect(parseEmployeeTime({...r,secret:'not exposed'})).toEqual(r);});
it('validates and recomputes network totals rather than trusting a claimed duration',()=>{const r=project(source([entry()]));expect(()=>parseEmployeeTime({...r,today:{...r.today,recordedSeconds:9999}})).toThrow();expect(()=>parseEmployeeTime({...r,current:{...r.current,elapsedSeconds:999}})).toThrow();});
it('does not accept network unavailable with an attached prior data payload',()=>{expect(parseEmployeeTime({state:'unavailable',reason:'access_denied',current:entry()})).toEqual({state:'unavailable',reason:'access_denied'});});
it.each([[0,'0 h'],[1,'<1 min'],[59,'<1 min'],[60,'1 min'],[3661,'1 h 1 min'],[90000,'25 h']] as const)('formats %s elapsed seconds as %s without pay conversion',(seconds,label)=>{expect(formatRecordedDuration(seconds)).toBe(label);});
