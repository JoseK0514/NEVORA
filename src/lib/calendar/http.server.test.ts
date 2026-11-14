import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('../auth/session',()=>({readSessionMutationProof:vi.fn()}));
vi.mock('./service.server',()=>({calendarAuthority:vi.fn(),getEmployeeCalendarSubscription:vi.fn(),manageEmployeeCalendarSubscription:vi.fn(),revokeEmployeeCalendarSubscription:vi.fn(),validCalendarCommand:vi.fn()}));
import {createCalendarFeedHandler} from './http.server';
import type {CalendarFeedRead} from './types';
import {employeeCalendarHandler,managerCalendarRevokeHandler} from './http.server';
import {readSessionMutationProof} from '../auth/session';
import {calendarAuthority,getEmployeeCalendarSubscription,manageEmployeeCalendarSubscription,revokeEmployeeCalendarSubscription,validCalendarCommand} from './service.server';
const context={params:Promise.resolve({token:'fictional-sentinel'})};
const request=(method='GET')=>new Request('https://fixture.invalid/api/calendar/fictional-sentinel/schedule.ics',{method,headers:{'If-None-Match':'"old"'}});
it('unknown and revoked are identical generic private 404 and never 304',async()=>{
 for(const reason of ['unknown','revoked']){const response=await createCalendarFeedHandler(async()=>({state:'unauthorized',reason}))(request(),context);expect(response.status).toBe(404);expect(await response.text()).toBe('Calendar unavailable.');expect(response.headers.get('Cache-Control')).toBe('no-store, private');expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();expect(response.headers.get('Location')).toBeNull();expect(response.headers.get('ETag')).toBeNull();}
});
const ownProof={employee:{id:'fictional-self',firstName:'Fictional',lastName:'Self',role:'EMPLOYEE' as const,primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
function manageRequest(method='POST',overrides:Record<string,string>={},body:unknown={kind:'ISSUE',operationId:'fictional-operation',authority:'fixture-authority',expectedGeneration:null}){return new Request('https://fixture.invalid/api/employee/calendar-subscriptions',{method,headers:{'X-Nevora-Calendar':'1','X-Nevora-Calendar-Authority':'fixture-authority',Origin:'https://fixture.invalid','Content-Type':'application/json',...overrides},...(method==='POST'?{body:JSON.stringify(body)}:{})});}
it('management rejects cross-origin, missing marker, excessive body and stale authority before mutation',async()=>{
 vi.mocked(readSessionMutationProof).mockResolvedValue(ownProof);vi.mocked(calendarAuthority).mockReturnValue('fixture-authority');vi.mocked(manageEmployeeCalendarSubscription).mockClear();
 for(const headers of [{Origin:'https://outside.invalid'},{'X-Nevora-Calendar':'0'},{'X-Nevora-Calendar-Authority':'stale'}] as Record<string,string>[])expect((await employeeCalendarHandler(manageRequest('POST',headers))).status).toBe(403);
 expect((await employeeCalendarHandler(manageRequest('POST',{'Content-Length':'5000'}))).status).toBe(400);expect(manageEmployeeCalendarSubscription).not.toHaveBeenCalled();
});
it('current Employee proof controls own status and issuance without a durable URL',async()=>{
 vi.mocked(readSessionMutationProof).mockResolvedValue(ownProof);vi.mocked(calendarAuthority).mockReturnValue('fixture-authority');vi.mocked(validCalendarCommand).mockReturnValue(true);
 vi.mocked(getEmployeeCalendarSubscription).mockResolvedValue({state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[],authority:'fixture-authority',observedAt:'2026-10-27',validForMs:45000,canIssue:true});expect((await employeeCalendarHandler(manageRequest('GET'))).status).toBe(200);
 vi.mocked(manageEmployeeCalendarSubscription).mockResolvedValue({status:'created',operationId:'o',id:'id',generation:'g',url:'/api/calendar/fictional-sentinel/schedule.ics'});const response=await employeeCalendarHandler(manageRequest());expect(response.status).toBe(200);expect((await response.json()).url).toBe('https://fixture.invalid/api/calendar/fictional-sentinel/schedule.ics');expect(response.headers.get('Cache-Control')).toBe('no-store, private');
 vi.mocked(readSessionMutationProof).mockResolvedValue({...ownProof,employee:{...ownProof.employee,role:'MANAGER'}});expect((await employeeCalendarHandler(manageRequest())).status).toBe(403);
});
it('manager route permits only current manager revocation and denies issue',async()=>{
 vi.mocked(readSessionMutationProof).mockResolvedValue({...ownProof,employee:{...ownProof.employee,role:'MANAGER'}});vi.mocked(calendarAuthority).mockReturnValue('fixture-authority');vi.mocked(validCalendarCommand).mockReturnValue(true);vi.mocked(revokeEmployeeCalendarSubscription).mockClear();
 expect((await managerCalendarRevokeHandler(manageRequest(),'fictional-target')).status).toBe(400);expect(revokeEmployeeCalendarSubscription).not.toHaveBeenCalled();
 vi.mocked(revokeEmployeeCalendarSubscription).mockResolvedValue({status:'revoked',operationId:'o',id:'id',generation:'g'});expect((await managerCalendarRevokeHandler(manageRequest('POST',{}, {kind:'REVOKE',operationId:'o',authority:'fixture-authority',expectedGeneration:null}),'fictional-target')).status).toBe(200);
 vi.mocked(readSessionMutationProof).mockResolvedValue(ownProof);expect((await managerCalendarRevokeHandler(manageRequest(),'fictional-target')).status).toBe(403);
});
it('issuance uses the verified browser origin when Next exposes an internal loopback request URL',async()=>{
 vi.mocked(readSessionMutationProof).mockResolvedValue(ownProof);vi.mocked(calendarAuthority).mockReturnValue('fixture-authority');vi.mocked(validCalendarCommand).mockReturnValue(true);vi.mocked(manageEmployeeCalendarSubscription).mockResolvedValue({status:'created',operationId:'o',id:'id',generation:'g',url:'/api/calendar/fictional-sentinel/schedule.ics'});
 const request=new Request('http://localhost:3000/api/employee/calendar-subscriptions',{method:'POST',headers:{Host:'fixture.invalid','X-Forwarded-Proto':'https',Origin:'https://fixture.invalid','X-Nevora-Calendar':'1','X-Nevora-Calendar-Authority':'fixture-authority','Content-Type':'application/json'},body:JSON.stringify({kind:'ISSUE'})});const response=await employeeCalendarHandler(request);expect(response.status).toBe(200);expect((await response.json()).url).toBe('https://fixture.invalid/api/calendar/fictional-sentinel/schedule.ics');
});
it('source failure is 503 rather than empty successful calendar',async()=>{const response=await createCalendarFeedHandler(async()=>({state:'unavailable',reason:'sql'}))(request(),context);expect(response.status).toBe(503);expect(await response.text()).not.toContain('VCALENDAR');});
it('HEAD checks the same reader and omits body for ready and refused feeds',async()=>{
 for(const state of ['ready','unauthorized'] as const){let reads=0;const read=async():Promise<CalendarFeedRead>=>{reads++;return state==='ready'?{state,observedAt:'2026-10-08T12:00:00Z',events:[]}:{state,reason:'revoked'};};const response=await createCalendarFeedHandler(read)(request('HEAD'),context);expect(reads).toBe(1);expect(response.status).toBe(state==='ready'?200:404);expect(await response.text()).toBe('');}
});
it('unsupported methods deny and successful GET is a replacement calendar',async()=>{
 const handler=createCalendarFeedHandler(async()=>({state:'ready',observedAt:'2026-10-08T12:00:00Z',events:[]}));expect((await handler(request('POST'),context)).status).toBe(405);const response=await handler(request(),context);expect(response.status).toBe(200);expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8');expect(await response.text()).toContain('BEGIN:VCALENDAR');
});
