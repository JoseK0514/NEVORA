import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const f=vi.hoisted(()=>({session:vi.fn(),query:vi.fn(),transaction:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:f.session}));
vi.mock('@/lib/data/notification-transactions',()=>({neonNotificationExecutor:()=>({query:f.query,transaction:f.transaction})}));
// Actual HTTP boundary, JSON reader, validator and service. Only session and
// executor are replaced; the executor never connects to a database.
import {employeeCalendarHandler,managerCalendarRevokeHandler} from '@/lib/calendar/http.server';
import {calendarAuthority} from '@/lib/calendar/service.server';
const employee={employee:{id:'fictional-self',firstName:'Fictional',lastName:'Self',role:'EMPLOYEE' as const,primaryLocationId:'fictional-location'},sessionTokenHash:'a'.repeat(64)};
const manager={...employee,employee:{...employee.employee,role:'MANAGER' as const}};
const invalid: unknown[]=[['ISSUE'],['ROTATE'],['REVOKE'],[],['ISSUE','ROTATE'],['ISSUE','ISSUE'],null,true,7,{}, {value:'ISSUE'}, {toString:null}, {toString:'ISSUE'}];
function request(proof:typeof employee|typeof manager,kind:unknown){const authority=calendarAuthority(proof);return new Request('https://fixture.invalid/api/employee/calendar-subscriptions',{method:'POST',headers:{Origin:'https://fixture.invalid','Content-Type':'application/json','X-Nevora-Calendar':'1','X-Nevora-Calendar-Authority':authority},body:JSON.stringify({kind,operationId:'11111111-1111-4111-8111-111111111111',authority,expectedGeneration:null})});}
beforeEach(()=>{vi.resetAllMocks();f.query.mockRejectedValue(Error('Injected executor boundary; database forbidden'));f.transaction.mockRejectedValue(Error('Injected transaction boundary; database forbidden'));});
for(const route of ['employee','manager'] as const){
  it.each(invalid.map((kind,index)=>({kind,index})))(`${route} real JSON kind case $index is 400 without data access`,async({kind})=>{
    const proof=route==='employee'?employee:manager;f.session.mockResolvedValue(proof);
    const response=await (route==='employee'?employeeCalendarHandler(request(proof,kind)):managerCalendarRevokeHandler(request(proof,kind),'fictional-target'));
    expect(response.status).toBe(400);expect(await response.json()).toEqual({status:'blocked',reason:'invalid_command'});
    expect(f.query).not.toHaveBeenCalled();expect(f.transaction).not.toHaveBeenCalled();
    expect(response.headers.get('Cache-Control')).toBe('no-store, private');expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  });
}
it.each(['ISSUE','ROTATE','REVOKE'])('employee scalar %s reaches the protected service',async kind=>{f.session.mockResolvedValue(employee);const response=await employeeCalendarHandler(request(employee,kind));expect(response.status).toBe(503);expect(f.query).toHaveBeenCalledTimes(1);expect(f.transaction).not.toHaveBeenCalled();expect(await response.json()).toEqual({status:'unavailable',reason:'read_failed'});});
it.each(['ISSUE','ROTATE'])('manager scalar %s stays invalid without data access',async kind=>{f.session.mockResolvedValue(manager);const response=await managerCalendarRevokeHandler(request(manager,kind),'fictional-target');expect(response.status).toBe(400);expect(f.query).not.toHaveBeenCalled();expect(f.transaction).not.toHaveBeenCalled();});
it('manager scalar REVOKE reaches the protected service',async()=>{f.session.mockResolvedValue(manager);const response=await managerCalendarRevokeHandler(request(manager,'REVOKE'),'fictional-target');expect(response.status).toBe(503);expect(f.query).toHaveBeenCalledTimes(1);expect(f.transaction).not.toHaveBeenCalled();});
