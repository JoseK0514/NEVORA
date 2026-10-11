// UNEXECUTED proposed focused regression source. Root must adopt the bound
// additions before running; an absent export/import failure is not feature RED.
import {describe,it,expect,vi} from 'vitest';
import type {Client} from 'pg';
vi.mock('server-only',()=>({}));
import {reconcileGuardedTypedLocalPortalLegacyAccessEnrollment} from './typed-guarded-backfill.server';
import {observePortalLegacyEnrollmentCompleteTarget,preparePortalLegacyReconciliationExpectation,
 isPortalLegacyReconciliationFailure,isPortalLegacyEnrollmentFailure} from './portal-legacy-access-enrollment.server';
import type {EmployeeNumberInstallerExecutionWitness} from './employee-number-enrollment-binding.server';
function hostile(){
 let effects=0;
 const client=new Proxy({}, {get(){effects++;throw Error('client get');},ownKeys(){effects++;throw Error('client keys');},getPrototypeOf(){effects++;throw Error('client prototype');}}) as Client;
 return {client,effects:()=>effects};
}
describe('original Portal uncertainty provenance / source proposal',()=>{
 const copied={status:'UNCERTAIN',code:'COMMIT_OUTCOME_UNKNOWN',planDigest:'0'.repeat(64),reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED'};
 for(const [label,value] of [['null',null],['undefined',undefined],['string','UNCERTAIN'],['ordinary',{}],['copied',copied],['serialized',JSON.parse(JSON.stringify(copied))],
  ['foreign journal shape',{...copied,journal:{}}]] as const){
  it('rejects '+label+' before Client access or SQL',async()=>{
   const h=hostile();await expect(reconcileGuardedTypedLocalPortalLegacyAccessEnrollment(h.client,value)).resolves.toEqual({status:'BLOCKED',code:'PORTAL_ENROLLMENT_ORIGINAL_UNCERTAIN_ATTEMPT_REQUIRED'});
   expect(h.effects()).toBe(0);
  });
 }
 it('rejects accessor receipt without invoking its getter',async()=>{
  let effects=0;const h=hostile(),value={get status(){effects++;return 'UNCERTAIN';}};
  await expect(reconcileGuardedTypedLocalPortalLegacyAccessEnrollment(h.client,value)).resolves.toEqual({status:'BLOCKED',code:'PORTAL_ENROLLMENT_ORIGINAL_UNCERTAIN_ATTEMPT_REQUIRED'});
  expect(effects).toBe(0);expect(h.effects()).toBe(0);
 });
 it('rejects receipt Proxy and revoked Proxy without traps',async()=>{
  let effects=0;const h=hostile(),proxy=new Proxy(copied,{get(){effects++;throw Error('get');},ownKeys(){effects++;throw Error('keys');},getOwnPropertyDescriptor(){effects++;throw Error('descriptor');}});
  const revoked=Proxy.revocable(copied,{});revoked.revoke();
  for(const value of [proxy,revoked.proxy])await expect(reconcileGuardedTypedLocalPortalLegacyAccessEnrollment(h.client,value)).resolves.toEqual({status:'BLOCKED',code:'PORTAL_ENROLLMENT_ORIGINAL_UNCERTAIN_ATTEMPT_REQUIRED'});
  expect(effects).toBe(0);expect(h.effects()).toBe(0);
 });
 it('rejects forged complete expectation without native Client or witness reads',async()=>{
  let effects=0;const h=hostile(),w=new Proxy({}, {get(){effects++;throw Error('witness');}}) as EmployeeNumberInstallerExecutionWitness;
  await expect(observePortalLegacyEnrollmentCompleteTarget(h.client,{},w)).rejects.toSatisfy((e:unknown)=>isPortalLegacyReconciliationFailure(e)&&e.code==='PORTAL_ENROLLMENT_EXPECTATION_REQUIRED');
  expect(effects).toBe(0);expect(h.effects()).toBe(0);
 });
 it('does not derive original expectation from ordinary typed-plan shape',async()=>{
  const h=hostile();await expect(preparePortalLegacyReconciliationExpectation(h.client,{plan:{}},{} as EmployeeNumberInstallerExecutionWitness)).rejects.toSatisfy((e:unknown)=>isPortalLegacyEnrollmentFailure(e)&&e.code==='GENUINE_WHOLE_PLAN_REQUIRED');
  expect(h.effects()).toBe(0);
 });
 it('does not accept code text as original reconciliation failure provenance',()=>{
  let effects=0;const p=new Proxy({}, {get(){effects++;throw Error('get');}});
  for(const v of [p,{},new Error('PORTAL_ENROLLMENT_TARGET_DRIFT'),{code:'PORTAL_ENROLLMENT_TARGET_DRIFT'}])expect(isPortalLegacyReconciliationFailure(v)).toBe(false);
  expect(effects).toBe(0);
 });
});
