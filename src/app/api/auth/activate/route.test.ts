import {beforeEach,it,expect,vi} from 'vitest';
import {randomBytes} from 'node:crypto';
const m=vi.hoisted(()=>({claim:vi.fn()}));
vi.mock('@/lib/auth/invitations/claim.server',()=>({claimInvitation:m.claim}));
import {POST} from './route';
const request=(body:string)=>new Request('https://owned.invalid/api/auth/activate',{method:'POST',headers:{origin:'https://owned.invalid','content-type':'application/json','x-nevora-activation':'1'},body});
beforeEach(()=>vi.resetAllMocks());
it('a source-construction failure is unavailable without echoing identity or proof',async()=>{
 m.claim.mockRejectedValueOnce(Error('Owned source unavailable'));
 const response=await POST(request(JSON.stringify({proof:randomBytes(32).toString('base64url'),password:'Owned-example-password'})));
 expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'unavailable'});expect(response.headers.get('cache-control')).toContain('no-store');
});
it('malformed JSON stays invalid and never starts claim work',async()=>{
 const response=await POST(request('{'));expect(response.status).toBe(400);expect(await response.json()).toEqual({state:'invalid'});expect(m.claim).not.toHaveBeenCalled();
});
it('uncertain credential outcome is identity-free with no automatic cookie',async()=>{
 m.claim.mockResolvedValueOnce({state:'outcome_unknown'});
 const response=await POST(request(JSON.stringify({proof:randomBytes(32).toString('base64url'),password:'Owned-example-password'})));
 expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'outcome_unknown'});expect(response.headers.has('set-cookie')).toBe(false);
});
