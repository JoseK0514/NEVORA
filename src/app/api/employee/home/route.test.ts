import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({session:vi.fn(),proof:vi.fn(),read:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({getSession:mocks.session,requireSessionMutationProof:mocks.proof}));
vi.mock('@/lib/data/employee-home.server',()=>({readEmployeeHome:mocks.read,homeAuthority:()=> 'a'.repeat(64)}));
const req=(query='',headers:Record<string,string>={'X-Nevora-Home':'a'.repeat(64)})=>new Request('https://nevora.invalid/api/employee/home'+query,{headers});
async function get(request:Request){const m=await import('./route').catch(()=>null);expect(m?.GET).toBeTypeOf('function');return m!.GET(request);}
beforeEach(()=>{vi.resetAllMocks();mocks.session.mockResolvedValue({id:'self',role:'EMPLOYEE'});mocks.proof.mockResolvedValue({employee:{id:'self',role:'EMPLOYEE'},sessionTokenHash:'b'.repeat(64)});mocks.read.mockResolvedValue({state:'partial',allSet:false,snapshot:{authority:'a'.repeat(64)}});});
it('current bound authority is required and responses remain private',async()=>{const r=await get(req());expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store, private');expect(r.headers.get('vary')).toBe('Cookie');expect(mocks.read).toHaveBeenCalledWith(await mocks.proof());});
it('replaced cookie binding and cross-site reads cannot release the aggregate',async()=>{for(const headers of [{},{'X-Nevora-Home':'c'.repeat(64)},{'X-Nevora-Home':'a'.repeat(64),'Sec-Fetch-Site':'cross-site'}] as Record<string,string>[])expect((await get(req('',headers))).status).toBe(403);expect(mocks.read).not.toHaveBeenCalled();});
it('client employee selectors and manager roles are rejected',async()=>{expect((await get(req('?employeeId=other'))).status).toBe(400);mocks.session.mockResolvedValue({id:'self',role:'MANAGER'});expect((await get(req())).status).toBe(403);expect(mocks.read).not.toHaveBeenCalled();});
it('missing session and aggregate authority loss are not empty success',async()=>{mocks.session.mockResolvedValue(null);expect((await get(req())).status).toBe(401);mocks.session.mockResolvedValue({id:'self',role:'EMPLOYEE'});mocks.read.mockResolvedValue({state:'unauthorized',reason:'access_denied'});expect((await get(req())).status).toBe(403);});
it('raw failures stay private',async()=>{mocks.read.mockRejectedValue(Error('manager notes SQL'));const r=await get(req());expect(r.status).toBe(503);expect(await r.json()).toEqual({state:'unavailable',reason:'read_failed'});});
