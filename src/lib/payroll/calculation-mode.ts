import {PayrollError} from './model';

/** Schema presence never authorizes calculation. External amounts are the
 * approved release default; provisional native work requires explicit opt-in. */
export function readPayrollCalculationMode(env:Readonly<Record<string,string|undefined>>=process.env):'external'|'native_provisional'{
 return env.NEVORA_PAYROLL_CALCULATION_MODE==='native_provisional'?'native_provisional':'external';
}
export function assertNativeCalculationEnabled(env:Readonly<Record<string,string|undefined>>=process.env):void{
 if(readPayrollCalculationMode(env)!=='native_provisional')throw new PayrollError('NATIVE_CALCULATION_DISABLED',409);
}
