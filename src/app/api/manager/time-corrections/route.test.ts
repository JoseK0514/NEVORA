vi.mock('@/lib/time-corrections/authority.server',()=>({matchesCorrectionAuthority:mocks.binding}));
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks=vi.hoisted(()=>({binding:vi.fn(),session:vi.fn(),read:vi.fn(),review:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({getSession:mocks.session}));
vi.mock('@/lib/data/time-corrections',()=>({
  getManagerTimeCorrections:mocks.read,
  reviewManagerTimeCorrection:mocks.review,
}));
import {GET,POST} from './route';

const url='https://nevora.invalid/api/manager/time-corrections';
const get=(query='',headers:Record<string,string>={'X-Nevora-Time-Correction':'1'})=>new Request(url+query,{headers});
const post=(body:unknown,headers:Record<string,string>={
  'X-Nevora-Time-Correction':'1','X-Nevora-Correction-Authority':'a'.repeat(64),'Content-Type':'application/json','Sec-Fetch-Site':'same-origin','Origin':'https://nevora.invalid',
})=>new Request(url,{method:'POST',headers,body:JSON.stringify(body)});
const review=()=>({
  operationId:'55555555-5555-4555-8555-555555555555',
  requestId:'66666666-6666-4666-8666-666666666666',
  expectedRevision:1,decision:'APPROVE',note:'Reviewed against the recorded entry.',
});

describe('D2 manager correction API boundary',()=>{
 beforeEach(()=>{
  vi.resetAllMocks();
  mocks.binding.mockImplementation(async(binding:string|null)=>binding==='a'.repeat(64));
  mocks.session.mockResolvedValue({id:'manager',role:'MANAGER'});
  mocks.read.mockResolvedValue({state:'ready',observedAt:'2030-10-07T16:10:00Z',timeZone:'America/Puerto_Rico',requests:[]});
  mocks.review.mockResolvedValue({status:'approved',operationId:review().operationId,requestId:review().requestId,revision:2,adjustmentId:review().operationId});
 });
 it.each(['OWNER','MANAGER'] as const)('permits %s review authority',async role=>{
  mocks.session.mockResolvedValue({id:'manager',role});
  expect((await GET(get())).status).toBe(200);expect((await POST(post(review()))).status).toBe(200);
  expect(mocks.read).toHaveBeenCalledWith();expect(mocks.review).toHaveBeenCalledWith(review());
 });
 it.each(['EMPLOYEE','LEAD'] as const)('denies %s without reading or deciding',async role=>{
  mocks.session.mockResolvedValue({id:'worker',role});
  expect((await GET(get())).status).toBe(403);expect((await POST(post(review()))).status).toBe(403);
  expect(mocks.read).not.toHaveBeenCalled();expect(mocks.review).not.toHaveBeenCalled();
 });
 it('rejects target identity injection and unsafe boundaries',async()=>{
  expect((await POST(post({...review(),employeeId:'other'}))).status).toBe(400);
  expect((await POST(post(review(),{'X-Nevora-Time-Correction':'1','Content-Type':'application/json','Sec-Fetch-Site':'cross-site'}))).status).toBe(403);
  expect((await GET(get('?employeeId=other'))).status).toBe(400);expect(mocks.review).not.toHaveBeenCalled();
 });
 it('surfaces self-review and stale-decision conflicts as bounded 409s',async()=>{
  mocks.review.mockResolvedValueOnce({status:'blocked',reason:'self_review'});let response=await POST(post(review()));
  expect(response.status).toBe(409);expect(await response.json()).toEqual({state:'blocked',reason:'self_review'});
  mocks.review.mockResolvedValueOnce({status:'conflict'});response=await POST(post(review()));
  expect(response.status).toBe(409);expect(await response.json()).toEqual({state:'conflict'});
 });
 it('never reflects thrown infrastructure diagnostics',async()=>{
  mocks.read.mockRejectedValue(Error('private SQL connection'));
  const response=await GET(get()),copy=response.clone();expect(response.status).toBe(503);
  expect(await response.json()).toEqual({state:'unavailable'});expect(await copy.text()).not.toMatch(/sql|connection/i);
 });
 it('rejects a correction mutation without originating session binding',async()=>{
  const response=await POST(post(review(),{'X-Nevora-Time-Correction':'1','Content-Type':'application/json','Origin':'https://nevora.invalid'}));
  expect(response.status).toBe(403);
 });

 it('rejects stale account or replaced-session bindings before mutation',async()=>{
  const response=await POST(post(review(),{'X-Nevora-Time-Correction':'1','X-Nevora-Correction-Authority':'b'.repeat(64),'Content-Type':'application/json','Origin':'https://nevora.invalid'}));
  expect(response.status).toBe(403);expect(mocks.review).not.toHaveBeenCalled();
 });

});
