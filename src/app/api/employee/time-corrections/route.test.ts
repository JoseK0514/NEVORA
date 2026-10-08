vi.mock('@/lib/time-corrections/authority.server',()=>({matchesCorrectionAuthority:mocks.binding}));
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ binding:vi.fn(),session:vi.fn(), read:vi.fn(), submit:vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ getSession:mocks.session }));
vi.mock('@/lib/data/time-corrections', () => ({
  getEmployeeTimeCorrections:mocks.read,
  submitEmployeeTimeCorrection:mocks.submit,
}));
import { GET, POST } from './route';

const url='https://nevora.invalid/api/employee/time-corrections';
const get=(query='',headers:Record<string,string>={'X-Nevora-Time-Correction':'1'})=>new Request(url+query,{headers});
const post=(body:unknown,headers:Record<string,string>={
  'X-Nevora-Time-Correction':'1','X-Nevora-Correction-Authority':'a'.repeat(64),'Content-Type':'application/json','Sec-Fetch-Site':'same-origin','Origin':'https://nevora.invalid',
})=>new Request(url,{method:'POST',headers,body:JSON.stringify(body)});
const command=()=>({
  operationId:'11111111-1111-4111-8111-111111111111',kind:'ENTRY_BOUNDARY',
  timeEntryId:'entry-1',proposedStartAt:'2030-10-07T12:05:00Z',proposedEndAt:'2030-10-07T16:00:00Z',
  reason:'The recorded boundaries need review.',
});

describe('D2 employee correction API boundary',()=>{
 beforeEach(()=>{
  vi.resetAllMocks();
  mocks.binding.mockImplementation(async(binding:string|null)=>binding==='a'.repeat(64));
  mocks.session.mockResolvedValue({id:'self',role:'EMPLOYEE'});
  mocks.read.mockResolvedValue({state:'ready',observedAt:'2030-10-07T16:10:00Z',timeZone:'America/Puerto_Rico',locations:[],requests:[]});
  mocks.submit.mockResolvedValue({status:'pending',operationId:command().operationId,requestId:command().operationId,revision:1});
 });
 it.each(['EMPLOYEE','LEAD'] as const)('allows %s to read server-derived self context',async role=>{
  mocks.session.mockResolvedValue({id:'self',role});
  const response=await GET(get());
  expect(response.status).toBe(200);expect(mocks.read).toHaveBeenCalledWith();
  expect(response.headers.get('cache-control')).toBe('no-store, private');expect(response.headers.get('vary')).toBe('Cookie');
 });
 it.each(['OWNER','MANAGER'] as const)('denies %s self-service correction access',async role=>{
  mocks.session.mockResolvedValue({id:'other',role});
  expect((await GET(get())).status).toBe(403);expect((await POST(post(command()))).status).toBe(403);
  expect(mocks.read).not.toHaveBeenCalled();expect(mocks.submit).not.toHaveBeenCalled();
 });
 it('rejects selectors and unsafe write boundaries before data access',async()=>{
  expect((await GET(get('?employeeId=other'))).status).toBe(400);
  expect((await POST(post(command(),{'X-Nevora-Time-Correction':'1','Content-Type':'application/json','Sec-Fetch-Site':'cross-site'}))).status).toBe(403);
  expect((await POST(post(command(),{'X-Nevora-Time-Correction':'1','Content-Type':'application/json','Origin':'https://evil.invalid'}))).status).toBe(403);
  expect((await POST(post(command(),{'Content-Type':'application/json'}))).status).toBe(403);
  expect((await POST(post(command(),{'X-Nevora-Time-Correction':'1','Content-Type':'text/plain'}))).status).toBe(403);
  expect(mocks.submit).not.toHaveBeenCalled();
 });
 it('accepts a same-origin browser POST when Next internal URL differs from the actual Host',async()=>{
  const request=new Request('http://internal.invalid/api/employee/time-corrections',{
   method:'POST',
   headers:{
    'Host':'127.0.0.1:50515',
    'Origin':'http://127.0.0.1:50515',
    'X-Nevora-Time-Correction':'1',
    'X-Nevora-Correction-Authority':'a'.repeat(64),
    'Content-Type':'application/json',
    'Sec-Fetch-Site':'same-origin',
   },
   body:JSON.stringify(command()),
  });
  const response=await POST(request);
  expect(response.status).toBe(202);
  expect(mocks.submit).toHaveBeenCalledWith(command());
 });
 it('rejects identity injection and oversized commands before mutation',async()=>{
  expect((await POST(post({...command(),employeeId:'other'}))).status).toBe(400);
  expect((await POST(post({...command(),reason:'x'.repeat(9000)}))).status).toBe(400);
  expect(mocks.submit).not.toHaveBeenCalled();
 });
 it('accepts a validated correction as pending without proof data',async()=>{
  const response=await POST(post(command()));expect(response.status).toBe(202);expect(mocks.submit).toHaveBeenCalledWith(command());
  const body=await response.json();expect(body).toEqual({state:'pending',operationId:command().operationId,requestId:command().operationId,revision:1});
  expect(JSON.stringify(body)).not.toMatch(/token|session|sql/i);
 });
 it('returns bounded conflict, blocked and unknown outcomes',async()=>{
  mocks.submit.mockResolvedValueOnce({status:'conflict'});expect((await POST(post(command()))).status).toBe(409);
  mocks.submit.mockResolvedValueOnce({status:'blocked',reason:'live_state'});let response=await POST(post(command()));
  expect(response.status).toBe(409);expect(await response.json()).toEqual({state:'blocked',reason:'live_state'});
  mocks.submit.mockResolvedValueOnce({status:'outcome-unknown',operationId:command().operationId});response=await POST(post(command()));
  expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'outcome_unknown',operationId:command().operationId});
 });
 it('never reflects thrown infrastructure diagnostics',async()=>{
  mocks.submit.mockRejectedValue(Error('postgres://private token_hash=secret'));
  const response=await POST(post(command())),copy=response.clone();expect(response.status).toBe(503);
  expect(await response.json()).toEqual({state:'unavailable'});expect(await copy.text()).not.toMatch(/postgres|token_hash|secret/i);
 });
 it('rejects a correction mutation without originating session binding',async()=>{
  const response=await POST(post(command(),{'X-Nevora-Time-Correction':'1','Content-Type':'application/json','Origin':'https://nevora.invalid'}));
  expect(response.status).toBe(403);
 });

 it('rejects stale account or replaced-session bindings before mutation',async()=>{
  const response=await POST(post(command(),{'X-Nevora-Time-Correction':'1','X-Nevora-Correction-Authority':'b'.repeat(64),'Content-Type':'application/json','Origin':'https://nevora.invalid'}));
  expect(response.status).toBe(403);expect(mocks.submit).not.toHaveBeenCalled();
 });

});
