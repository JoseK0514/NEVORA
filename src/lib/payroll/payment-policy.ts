import type {PayrollRun} from './contracts';
import {PayrollError} from './model';

/** No provider replacement/delta contract exists for correction artifacts. */
export function assertPaymentExportSupported(run: Pick<PayrollRun,'sourceAuthority'|'correctionOf'>): void {
  if (run.sourceAuthority === 'NATIVE_RECORDED_TIME') throw new PayrollError('NATIVE_PAYMENT_EXPORT_UNAVAILABLE',409);
  if (run.correctionOf) throw new PayrollError('CORRECTION_PAYMENT_EXPORT_UNAVAILABLE',409);
}
