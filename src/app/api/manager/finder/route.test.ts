import {beforeEach,expect,it,vi} from 'vitest';
import {getSession} from '@/lib/auth/session';
import {listEmployees,listLocations} from '@/lib/data/employees';
import {GET} from './route';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
vi.mock('@/lib/auth/session',()=>({getSession:vi.fn(),requireSessionMutationProof:async()=>({employee:await getSession(),sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({withOperationalCompany:vi.fn(async(_proof,load)=>({state:'ready',data:await load()}))}));
vi.mock('@/lib/data/employees',()=>({listEmployees:vi.fn(),listLocations:vi.fn()}));
vi.mock('@/lib/employee-display',()=>({employeeRoleLabel:(role:string)=>role==='OWNER'?'Owner':'Employee'}));
const request=(headers:Record<string,string>={'X-Nevora-Finder':'1'})=>new Request('http://localhost/api/manager/finder',{headers});
const person=(id:string,active=true)=>({id,firstName:'Fictional',lastName:id,phone:'787-555-0100',email:'secret@example.com',role:'EMPLOYEE',primaryLocationId:'l1',eligibleLocationIds:[],positionIds:[],active});
beforeEach(()=>{vi.clearAllMocks();vi.mocked(getSession).mockResolvedValue({id:'owner',firstName:'A',lastName:'B',role:'OWNER',primaryLocationId:'l1'} as never);
 vi.mocked(listEmployees).mockResolvedValue([person('E1'),person('E2',false)] as never);
 vi.mocked(listLocations).mockResolvedValue([{id:'l1',workspaceId:'w',clockerKey:'SECRET-KEY',name:'Main Office',shortName:'Main',active:true},{id:'l2',workspaceId:'w',clockerKey:'K2',name:'Closed',shortName:'Closed',active:false}] as never);});
it('requires a session and reads nothing without one',async()=>{vi.mocked(getSession).mockResolvedValue(null);expect((await GET(request())).status).toBe(401);expect(listEmployees).not.toHaveBeenCalled();});
it.each(['EMPLOYEE','LEAD'] as const)('denies %s without reading names',async role=>{vi.mocked(getSession).mockResolvedValue({id:'w',firstName:'A',lastName:'B',role,primaryLocationId:'l1'} as never);expect((await GET(request())).status).toBe(403);expect(listEmployees).not.toHaveBeenCalled();});
it('rejects cross-site and unmarked requests',async()=>{expect((await GET(request({'Sec-Fetch-Site':'cross-site','X-Nevora-Finder':'1'}))).status).toBe(403);expect((await GET(request({}))).status).toBe(403);expect(listEmployees).not.toHaveBeenCalled();});
it('returns only active names and roles, privately and uncached, with no contact details or Clocker keys',async()=>{
 const response=await GET(request());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store, private');
 const body=await response.json();const text=JSON.stringify(body);
 expect(body).toEqual({state:'ready',people:[{id:'E1',name:'Fictional E1',role:'Employee'}],locations:[{id:'l1',name:'Main'}]});
 for(const secret of ['787-555-0100','secret@example.com','SECRET-KEY','clockerKey','phone','email'])expect(text).not.toContain(secret);
});
it('a database failure is unavailable, never an empty list',async()=>{vi.mocked(listEmployees).mockRejectedValue(Error('postgres://secret'));const r=await GET(request());expect(r.status).toBe(503);expect(await r.text()).not.toContain('postgres');});
it('refuses global names before reading when Company authority is absent',async()=>{
 vi.mocked(withOperationalCompany).mockResolvedValueOnce({state:'unavailable',reason:'access_denied'});
 const response=await GET(request());expect(response.status).toBe(403);
 expect(listEmployees).not.toHaveBeenCalled();expect(listLocations).not.toHaveBeenCalled();
});
it('suppresses names when Company authority changes during a read',async()=>{
 vi.mocked(withOperationalCompany).mockImplementationOnce(async(_proof,load)=>{await load();return {state:'unavailable',reason:'access_denied'};});
 const response=await GET(request());expect(response.status).toBe(403);
 expect(await response.json()).toEqual({state:'unavailable',reason:'access_denied'});
});
