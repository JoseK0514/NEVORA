import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const fixture=vi.hoisted(()=>({now:1000,advance:0}));
vi.mock('./isolated-connection.server',()=>({isolatedCommerceConnection:async()=>({origin:'https://billing.example.test',installationId:'fictional',businessId:'fictional',secret:'a'.repeat(43),assertCurrent:async()=>{await Promise.resolve();fixture.now+=fixture.advance;}})}));
import {commerceGate,resetCommerceAccessCache} from './access';
beforeEach(()=>{fixture.now=1000;fixture.advance=0;vi.spyOn(Date,'now').mockImplementation(()=>fixture.now);vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');vi.stubEnv('NEVORA_COMMERCE_ENABLED','true');});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();resetCommerceAccessCache();});
const fetcher=()=>Response.json({operational:true,state:'ready',validUntil:1100,businessId:'fictional',installationId:'fictional'});
it('denies an operational POST when a fresh grant expires during the final binding lookup',async()=>{
 fixture.advance=100;
 expect((await commerceGate('/api/timecards/finalize','POST',async()=>fetcher()))?.status).toBe(503);
});
it('denies an operational POST when a cached grant expires during the final binding lookup',async()=>{
 const fetch=vi.fn(async()=>fetcher());expect(await commerceGate('/api/timecards/finalize','POST',fetch)).toBeNull();
 fixture.now=1099;fixture.advance=1;
 expect((await commerceGate('/api/timecards/finalize','POST',fetch))?.status).toBe(503);expect(fetch).toHaveBeenCalledTimes(1);
});
