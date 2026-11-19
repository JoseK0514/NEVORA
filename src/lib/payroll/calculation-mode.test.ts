import {expect,it} from '@rstest/core';
import {readPayrollCalculationMode,assertNativeCalculationEnabled} from './calculation-mode';

it.each([undefined,'external','native','true','NATIVE_PROVISIONAL',' native_provisional'])('requires explicit native provisional opt-in: %j',value=>{
 expect(readPayrollCalculationMode({NEVORA_PAYROLL_CALCULATION_MODE:value})).toBe('external');
 expect(()=>assertNativeCalculationEnabled({NEVORA_PAYROLL_CALCULATION_MODE:value})).toThrow('NATIVE_CALCULATION_DISABLED');
});
it('permits the explicit provisional mode without enabling the overall payroll feature',()=>{
 const env={NEVORA_PAYROLL_CALCULATION_MODE:'native_provisional',NEVORA_PAYROLL_ENABLED:'false'};
 expect(readPayrollCalculationMode(env)).toBe('native_provisional');
 expect(()=>assertNativeCalculationEnabled(env)).not.toThrow();
 expect(env.NEVORA_PAYROLL_ENABLED).toBe('false');
});
