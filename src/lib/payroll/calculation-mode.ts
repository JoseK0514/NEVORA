import {PayrollError} from './model';

type Environment = Readonly<Record<string,string|undefined>>;

/** Professional reconciliation is pending. Only explicitly opted-in development
 * and test processes may exercise the provisional calculator. Workers without
 * a runtime identity, and production builds including previews, stay external. */
export function readPayrollCalculationMode(env: Environment = process.env): 'external'|'native_provisional' {
  if (env.NEVORA_PAYROLL_CALCULATION_MODE !== 'native_provisional' ||
      (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test')) return 'external';
  const environments = [env.VERCEL_ENV, env.VERCEL_TARGET_ENV, env.NEVORA_ENVIRONMENT, env.NEVORA_ONBOARDING_ENVIRONMENT];
  if (environments.some(value => value !== undefined && !['development','test','preview','staging'].includes(value))) return 'external';
  return 'native_provisional';
}
export function assertNativeCalculationEnabled(env: Environment = process.env): void {
  if (readPayrollCalculationMode(env) !== 'native_provisional') throw new PayrollError('NATIVE_CALCULATION_DISABLED',409);
}
