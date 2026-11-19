import {expect,it} from 'vitest';
import {readPayrollCalculationMode,assertNativeCalculationEnabled} from './calculation-mode';

it.each([undefined,'external','native','true','NATIVE_PROVISIONAL',' native_provisional'])('requires explicit native provisional opt-in: %j',value=>{
 expect(readPayrollCalculationMode({NEVORA_PAYROLL_CALCULATION_MODE:value})).toBe('external');
 expect(()=>assertNativeCalculationEnabled({NEVORA_PAYROLL_CALCULATION_MODE:value})).toThrow('NATIVE_CALCULATION_DISABLED');
});
it('permits the explicit provisional mode without enabling the overall payroll feature',()=>{
 const env={NODE_ENV:'test',NEVORA_PAYROLL_CALCULATION_MODE:'native_provisional',NEVORA_PAYROLL_ENABLED:'false'};
 expect(readPayrollCalculationMode(env)).toBe('native_provisional');
 expect(()=>assertNativeCalculationEnabled(env)).not.toThrow();
 expect(env.NEVORA_PAYROLL_ENABLED).toBe('false');
});

it.each([
  {}, {NODE_ENV:'production'}, {NODE_ENV:'production',VERCEL_ENV:'preview'},
  {NODE_ENV:'test',VERCEL_ENV:'production'}, {NODE_ENV:'development',VERCEL_TARGET_ENV:'production'},
  {NODE_ENV:'test',NEVORA_ENVIRONMENT:'production'}, {NODE_ENV:'development',NEVORA_ONBOARDING_ENVIRONMENT:'production'},
  {NODE_ENV:'development',NEVORA_ENVIRONMENT:'unclassified'},
])('keeps production, ambiguous and unidentified runtimes external even with explicit opt-in %j', runtime => {
  const env = {...runtime,NEVORA_PAYROLL_CALCULATION_MODE:'native_provisional',NEVORA_PAYROLL_ENABLED:'true'};
  expect(readPayrollCalculationMode(env)).toBe('external');
  expect(() => assertNativeCalculationEnabled(env)).toThrow('NATIVE_CALCULATION_DISABLED');
});
