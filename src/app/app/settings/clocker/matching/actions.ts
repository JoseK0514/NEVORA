'use server';
import { headers } from 'next/headers';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { clockerOriginFailure, clockerSecurity } from '@/lib/clocker/setup.server';
import { ClockerScheduleGraceError, readClockerScheduleGrace, saveClockerScheduleGrace } from '@/lib/clocker/schedule-grace.server';
import type { ClockerGraceActionResult } from '@/components/clocker-schedule-grace';

const ownerOnly: ClockerGraceActionResult = { state: 'rejected', code: 'FORBIDDEN', message: 'Only an active Owner may change shift matching.' };
const invalid: ClockerGraceActionResult = { state: 'rejected', code: 'INVALID', message: 'Enter a whole number of minutes from 0 to 30.' };
function failed(error: unknown): ClockerGraceActionResult {
  if (error instanceof ClockerScheduleGraceError && error.code !== 'UNAVAILABLE') return { state: 'rejected', code: error.code, message: error.message };
  // A failed response may follow a committed save. Never invite a blind retry.
  return { state: 'unavailable', message: 'Shift matching could not be confirmed. Reload the setting before trying again.' };
}

/** Owner read of the early clock-in grace, from the server-derived session proof. */
export async function readClockerGraceAction(): Promise<ClockerGraceActionResult> {
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return ownerOnly;
  try {
    return { state: 'available', setting: await readClockerScheduleGrace({ employeeId: session.employee.id, sessionTokenHash: session.sessionTokenHash }) };
  } catch (error) { return failed(error); }
}

/**
 * Owner-only, origin-checked save of the early clock-in grace. Exactly two fields: earlyClockInGraceMinutes (a whole
 * number 0–30) and expectedVersion (the version the Owner reviewed, 0 before the first save). The actor comes from the
 * session, never the form. An uncertain result asks for a reload before another save.
 */
export async function saveClockerGraceAction(form: FormData): Promise<ClockerGraceActionResult> {
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return ownerOnly;
  const originError = clockerOriginFailure(await headers(), await clockerSecurity());
  if (originError) return { state: 'rejected', code: 'ORIGIN_REJECTED', message: originError.error };
  const fields = ['earlyClockInGraceMinutes', 'expectedVersion'];
  if (!(form instanceof FormData) || [...form.keys()].some(key => !fields.includes(key))) return invalid;
  const values = fields.map(key => form.getAll(key));
  if (values.some(list => list.length !== 1 || typeof list[0] !== 'string')) return invalid;
  const [minutes, version] = values.map(list => list[0] as string);
  if (!/^(0|[1-9][0-9]?)$/.test(minutes) || Number(minutes) > 30 || !/^(0|[1-9][0-9]{0,9})$/.test(version)) return invalid;
  const expectedVersion = Number(version);
  if (!Number.isSafeInteger(expectedVersion)) return invalid;
  try {
    const setting = await saveClockerScheduleGrace({ employeeId: session.employee.id, sessionTokenHash: session.sessionTokenHash },
      { earlyClockInGraceMinutes: Number(minutes), expectedVersion });
    return { state: 'available', setting };
  } catch (error) { return failed(error); }
}
