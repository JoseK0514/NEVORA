import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({session:vi.fn(),proof:vi.fn(),read:vi.fn(),close:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({getSession:mocks.session,readSessionMutationProof:mocks.proof}));
vi.mock('@/lib/management-close/service.server',()=>({readManagementCloseContext:mocks.read,closeManagedTimeEntry:mocks.close}));
import {GET,POST} from './route';
const url='https://nevora.invalid/api/manager/timecards/entry/close';
const context={params:Promise.resolve({entryId:'entry'})};
const headers={'X-Nevora-Management-Close':'1','X-Nevora-Management-Close-Authority':'a'.repeat(64),'Content-Type':'application/json','Origin':'https://nevora.invalid'};
const command={operationId:'55555555-5555-4555-8555-555555555555',timeEntryId:'entry',expectedSourceHash:'a'.repeat(32),closedAt:'2026-11-10T12:00:00Z',reason:'Confirmed last worked time.'};
const post=(body:unknown=command,overrides:Record<string,string>={})=>new Request(url,{method:'POST',headers:{...headers,...overrides},body:JSON.stringify(body)});
beforeEach(()=>{
  vi.resetAllMocks();mocks.session.mockResolvedValue({id:'manager',role:'MANAGER'});mocks.proof.mockResolvedValue({employee:{id:'manager',role:'MANAGER'},sessionTokenHash:'b'.repeat(64)});
  mocks.read.mockResolvedValue({state:'ready',target:{timeEntryId:'entry'},authority:'a'.repeat(64)});mocks.close.mockResolvedValue({status:'closed',operationId:command.operationId});
});
it.each(['OWNER','MANAGER'])('admits a cookie-derived %s through the strict transport boundary',async role=>{
  mocks.session.mockResolvedValue({id:'manager',role});expect((await GET(new Request(url,{headers}),context)).status).toBe(200);expect((await POST(post(),context)).status).toBe(200);
  expect(mocks.close).toHaveBeenCalledWith(await mocks.proof(),command,'a'.repeat(64));
});
it.each(['EMPLOYEE','LEAD'])('denies %s before accessing private data',async role=>{
  mocks.session.mockResolvedValue({id:'manager',role});expect((await GET(new Request(url,{headers}),context)).status).toBe(403);expect((await POST(post(),context)).status).toBe(403);expect(mocks.read).not.toHaveBeenCalled();expect(mocks.close).not.toHaveBeenCalled();
});
it('denies missing cookies, replaced identities and actor substitution',async()=>{
  mocks.session.mockResolvedValueOnce(null);expect((await POST(post(),context)).status).toBe(401);
  mocks.proof.mockResolvedValueOnce({employee:{id:'other'}});expect((await POST(post(),context)).status).toBe(401);
  expect((await POST(post(command,{'x-nevora-actor':'other'}),context)).status).toBe(403);expect(mocks.close).not.toHaveBeenCalled();
});
it.each([{...command,actorId:'owner'},{...command,timeEntryId:'other'},{...command,closedAt:'2026-11-10T12:00:00'},{...command,reason:''}])('rejects malformed or substituted command %#',async body=>{
  expect((await POST(post(body),context)).status).toBe(400);expect(mocks.close).not.toHaveBeenCalled();
});
it('rejects missing intent, authority, cross-origin and query-string requests',async()=>{
  const invalid:Record<string,string>[]=[{'x-nevora-management-close':''},{'x-nevora-management-close-authority':''},{origin:'https://foreign.invalid'},{'sec-fetch-site':'cross-site'}];
  for(const overrides of invalid)expect((await POST(post(command,overrides),context)).status).toBe(403);
  expect((await GET(new Request(url+'?employeeId=other',{headers}),context)).status).toBe(400);expect(mocks.close).not.toHaveBeenCalled();
});
it('bounds actual streamed bytes and never passes an oversized reason to the service',async()=>{
  expect((await POST(post({...command,reason:'x'.repeat(9000)}),context)).status).toBe(400);expect(mocks.close).not.toHaveBeenCalled();
});
it('keeps conflict, policy denial and uncertain operation recovery explicit',async()=>{
  mocks.close.mockResolvedValueOnce({status:'conflict'});expect((await POST(post(),context)).status).toBe(409);
  mocks.close.mockResolvedValueOnce({status:'blocked',reason:'payroll_approved'});expect(await (await POST(post(),context)).json()).toEqual({state:'blocked',reason:'payroll_approved'});
  mocks.close.mockResolvedValueOnce({status:'outcome-unknown',operationId:command.operationId});expect(await (await POST(post(),context)).json()).toEqual({state:'outcome_unknown',operationId:command.operationId});
});
it('returns private no-store responses without internal failures or proof values',async()=>{
  mocks.close.mockRejectedValue(Error('private SQL '+ 'b'.repeat(64)));const response=await POST(post(),context);expect(response.status).toBe(503);expect(response.headers.get('cache-control')).toBe('no-store, private');expect(await response.json()).toEqual({state:'unavailable'});
});
