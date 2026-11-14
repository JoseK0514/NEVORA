import {afterEach,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {proxy} from '@/proxy';
import {commerceGate,resetCommerceAccessCache} from './access';

afterEach(()=>{vi.unstubAllEnvs();resetCommerceAccessCache();});
it('admits signup operation recovery after refresh without an unavailable company billing binding',async()=>{
 vi.stubEnv('NEVORA_COMMERCE_ENABLED','true');vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');
 const request=new NextRequest('https://signup.example.invalid/api/onboarding/operations/current');
 // The signup handler, rather than an unrelated company billing connection,
 // must validate the verified signup cookie and original actor-owned operation.
 expect(await proxy(request)).toBeUndefined();
 expect(await commerceGate('/api/onboarding/operations/current','GET',async()=>{throw Error('No company exists yet');})).toBeNull();
});
it.each(['/api/onboarding/state','/api/onboarding/people','/api/onboarding/steps/BUSINESS','/api/onboarding/invitation-batches','/api/onboarding/operations/current/extra'])('retains commercial restrictions on %s',async path=>{
 vi.stubEnv('NEVORA_COMMERCE_ENABLED','true');vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');
 expect((await proxy(new NextRequest('https://signup.example.invalid'+path)))?.status).toBe(503);
});
