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
