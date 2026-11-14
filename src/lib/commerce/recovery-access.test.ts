import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {commerceGate,resetCommerceAccessCache} from './access';

beforeEach(()=>{
  vi.stubEnv('NEVORA_COMMERCE_ENABLED','true');
  vi.stubEnv('NEVORA_WORKSPACE_MODE','single_company');
  vi.stubEnv('NEVORA_COMMERCE_API_ORIGIN','https://billing.example.test');
  vi.stubEnv('NEVORA_COMMERCE_INSTALLATION_ID','fixture-installation');
  vi.stubEnv('NEVORA_COMMERCE_INSTANCE_SECRET','a'.repeat(43));
});
afterEach(()=>{vi.unstubAllEnvs();resetCommerceAccessCache();});
const unavailable=async()=>{throw Error('Synthetic billing outage');};

it.each(['/app/billing','/app/my-pay','/api/payroll/statements','/api/payroll/portal-statements','/api/company-access/operational-authority'])(
  'keeps authenticated recovery reads reachable while billing is unavailable: %s',async path=>{
    expect(await commerceGate(path,'GET',unavailable)).toBeNull();
  });
it.each(['/api/payroll/statements','/app/billing','/api/payroll/portal-statements'])(
  'does not turn a recovery read exception into operational write access: %s',async path=>{
    expect((await commerceGate(path,'POST',unavailable))?.status).toBe(503);
  });
it('does not allow unlisted descendants of a recovery path',async()=>{
  expect((await commerceGate('/api/payroll/statements/approve','POST',unavailable))?.status).toBe(503);
  expect((await commerceGate('/app/my-pay/operations','GET',unavailable))?.status).toBe(503);
});
it.each(['restricted','unavailable'] as const)('keeps only the account-deletion read and confirmation reachable when %s',async state=>{
  const fetcher=vi.fn(async()=>{
    if(state==='unavailable')throw Error('Synthetic billing outage');
    return Response.json({state:'restricted',operational:false,validUntil:Date.now()+10000});
  });
  for(const method of ['GET','POST'])expect(await commerceGate('/app/account/delete',method,fetcher)).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
  for(const [path,method] of [['/app/account/delete/other','POST'],['/app/account/delete','DELETE'],['/api/employees','POST']])
    expect((await commerceGate(path,method,fetcher))?.status).toBe(state==='restricted'?402:503);
});
