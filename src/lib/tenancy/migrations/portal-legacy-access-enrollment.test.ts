// UNEXECUTED prospective regression source. Actual imported module, no VM/private
// extraction, native SQL mocks, manufactured issued plan or authority constructor.
import {describe,it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {enrollCapturedLegacyPortalAccessOnOwnedInstaller,isPortalLegacyEnrollmentFailure} from './portal-legacy-access-enrollment.server';
import type {Client} from 'pg';
import type {EmployeeNumberInstallerExecutionWitness} from './employee-number-enrollment-binding.server';
const unusedWitness=Object.freeze({}) as EmployeeNumberInstallerExecutionWitness;
describe('controlled legacy Portal writer input provenance',()=>{
 it('rejects an ordinary plan before hostile Client or witness property reads',async()=>{
  let traps=0;const client=new Proxy({}, {get(){traps++;throw Error('client trap');},getPrototypeOf(){traps++;throw Error('prototype trap');}});
  const witness=new Proxy({}, {get(){traps++;throw Error('witness trap');}});
  await expect(enrollCapturedLegacyPortalAccessOnOwnedInstaller(client as Client,{plan:{format:'TYPED_TENANT_BACKFILL_PLAN_V1',status:'PLANNED'}},witness as EmployeeNumberInstallerExecutionWitness))
   .rejects.toSatisfy((e:unknown)=>isPortalLegacyEnrollmentFailure(e)&&e.code==='GENUINE_WHOLE_PLAN_REQUIRED');
  expect(traps).toBe(0);
 });
 it('refuses a request Proxy without running traps',async()=>{
  let traps=0;const value=new Proxy({}, {get(){traps++;throw Error('trap');},ownKeys(){traps++;throw Error('trap');},getOwnPropertyDescriptor(){traps++;throw Error('trap');}});
  await expect(enrollCapturedLegacyPortalAccessOnOwnedInstaller(null as unknown as Client,value,unusedWitness))
   .rejects.toSatisfy((e:unknown)=>isPortalLegacyEnrollmentFailure(e)&&e.code==='GENUINE_WHOLE_PLAN_REQUIRED');
  expect(traps).toBe(0);
 });
 it('refuses a revoked request Proxy trap-free',async()=>{
  const proxy=Proxy.revocable({},{});proxy.revoke();
  await expect(enrollCapturedLegacyPortalAccessOnOwnedInstaller(null as unknown as Client,proxy.proxy,unusedWitness))
   .rejects.toSatisfy((e:unknown)=>isPortalLegacyEnrollmentFailure(e)&&e.code==='GENUINE_WHOLE_PLAN_REQUIRED');
 });
 it('refuses an accessor plan before invoking its getter',async()=>{
  let reads=0;const value={get plan(){reads++;return {};}};
  await expect(enrollCapturedLegacyPortalAccessOnOwnedInstaller(null as unknown as Client,value,unusedWitness))
   .rejects.toSatisfy((e:unknown)=>isPortalLegacyEnrollmentFailure(e)&&e.code==='GENUINE_WHOLE_PLAN_REQUIRED');expect(reads).toBe(0);
 });
 it('does not certify an ordinary Error, clone, or hostile error by code text',()=>{
  let traps=0;const proxy=new Proxy({}, {get(){traps++;throw Error('trap');}});
  for(const value of [null,{},new Error('OWNED_INSTALLER_REQUIRED'),{code:'OWNED_INSTALLER_REQUIRED'},proxy])expect(isPortalLegacyEnrollmentFailure(value)).toBe(false);
  expect(traps).toBe(0);
 });
});
