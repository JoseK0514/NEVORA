import {beforeEach,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({session:vi.fn(),proof:vi.fn(),read:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({getSession:mocks.session,requireSessionMutationProof:mocks.proof}));
vi.mock('@/lib/data/inbox-count.server',()=>({readInboxCount:mocks.read}));
import {GET} from './route';
beforeEach(()=>{mocks.session.mockReset().mockResolvedValue({id:'qa',role:'OWNER'});mocks.proof.mockReset().mockResolvedValue({employee:{id:'qa',role:'OWNER'}});mocks.read.mockReset().mockResolvedValue({state:'ready',count:4,observedAt:'2026-10-19T14:00:00Z'});});
it('returns the own ready projection privately and preserves unavailable without inventing zero',async()=>{
  let response=await GET(new Request('http://localhost/api/manager/inbox-count'));expect(response.status).toBe(200);expect(await response.json()).toMatchObject({state:'ready',count:4});expect(response.headers.get('cache-control')).toContain('no-store');
  mocks.read.mockResolvedValue({state:'unavailable'});response=await GET(new Request('http://localhost/api/manager/inbox-count'));expect(await response.json()).toEqual({state:'unavailable'});
});
it('requires current management authority and rejects selectors/cross-site requests',async()=>{
  expect((await GET(new Request('http://localhost/api/manager/inbox-count?employeeId=other'))).status).toBe(400);
  expect((await GET(new Request('http://localhost/api/manager/inbox-count',{headers:{'sec-fetch-site':'cross-site'}}))).status).toBe(403);
  mocks.session.mockResolvedValue(null);expect((await GET(new Request('http://localhost/api/manager/inbox-count'))).status).toBe(401);
  mocks.session.mockResolvedValue({id:'qa',role:'EMPLOYEE'});expect((await GET(new Request('http://localhost/api/manager/inbox-count'))).status).toBe(403);
  expect(mocks.read).not.toHaveBeenCalled();
});
