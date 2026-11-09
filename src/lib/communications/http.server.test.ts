import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('../data/employee-message-module.server',()=>({employeeUpdatesExecutor:async()=>undefined}));
const mocks=vi.hoisted(()=>({session:vi.fn(),proof:vi.fn(),list:vi.fn(),read:vi.fn(),preview:vi.fn(),execute:vi.fn(),lookup:vi.fn()}));
vi.mock('../auth/session',()=>({getSession:mocks.session,requireSessionMutationProof:mocks.proof}));
vi.mock('./service.server',()=>({communicationAuthority:()=> 'a'.repeat(64),listEmployeeCommunications:mocks.list,readCommunication:mocks.read,previewCommunicationAudience:mocks.preview,executeCommunicationCommand:mocks.execute,findCommunicationOperation:mocks.lookup}));
function request(method='GET',body:unknown=undefined,headers:Record<string,string>={}){return new Request('https://nevora.invalid/api/employee/communications',{method,headers:{'X-Nevora-Communication':'1','X-Nevora-Communication-Authority':'a'.repeat(64),'Origin':'https://nevora.invalid','Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});}
async function handle(request:Request,mode:'EMPLOYEE'|'MANAGER'='EMPLOYEE',action:'list'|'command'|'preview'|'read'|'operation'='list',id?:string){const m=await import('./http.server').catch(()=>null);expect(m?.communicationHttp).toBeTypeOf('function');return m!.communicationHttp(request,mode,action,id);}
beforeEach(()=>{vi.resetAllMocks();mocks.session.mockResolvedValue({id:'self',role:'EMPLOYEE'});mocks.proof.mockResolvedValue({employee:{id:'self',role:'EMPLOYEE'}});mocks.list.mockResolvedValue({state:'complete',items:[]});mocks.execute.mockResolvedValue({status:'committed'});});
it('authorized list stays private and cannot select another employee',async()=>{
 const r=await handle(request());expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store, private');expect(r.headers.get('referrer-policy')).toBe('no-referrer');
 const selected=new Request('https://nevora.invalid/api/employee/communications?employeeId=other',{headers:{'X-Nevora-Communication':'1','X-Nevora-Communication-Authority':'a'.repeat(64)}});expect((await handle(selected)).status).toBe(400);
});
it('cross origin, replacement binding and wrong management role cannot invoke a command',async()=>{
 for(const headers of [{'Origin':'https://other.invalid'},{'X-Nevora-Communication-Authority':'b'.repeat(64)},{'Sec-Fetch-Site':'cross-site'}] as Record<string,string>[])expect((await handle(request('POST',{kind:'PUBLISH'},headers), 'EMPLOYEE','command')).status).toBe(403);
 expect((await handle(request('POST',{}),'MANAGER','command')).status).toBe(403);expect(mocks.execute).not.toHaveBeenCalled();
});
it('raw JSON whitespace and invalid UTF8 cannot bypass transport ceiling',async()=>{
 const r=request('POST',{});const oversized=new Request(r.url,{method:'POST',headers:r.headers,body:' '.repeat(32769)+'{}'});expect((await handle(oversized,'EMPLOYEE','command')).status).toBe(400);
 expect((await handle(new Request(r.url,{method:'POST',headers:r.headers,body:new Uint8Array([255])}),'EMPLOYEE','command')).status).toBe(400);expect(mocks.execute).not.toHaveBeenCalled();
});
it('conflict and outcome unknown remain distinct and raw service errors stay private',async()=>{
 mocks.execute.mockResolvedValue({status:'conflict',reason:'source_changed'});expect((await handle(request('POST',{}),'EMPLOYEE','command')).status).toBe(409);
 mocks.execute.mockResolvedValue({status:'outcome_unknown',operationId:'id'});expect((await handle(request('POST',{}),'EMPLOYEE','command')).status).toBe(503);
 mocks.list.mockRejectedValue(Error('PRIVATE SQL'));const r=await handle(request());expect(r.status).toBe(503);expect(JSON.stringify(await r.json())).not.toContain('PRIVATE');
});
