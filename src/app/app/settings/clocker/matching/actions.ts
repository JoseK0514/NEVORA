'use server';
import { headers } from 'next/headers';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { clockerOriginFailure, clockerSecurity } from '@/lib/clocker/setup.server';
import { ClockerScheduleGraceError, readClockerScheduleGrace, saveClockerScheduleGrace } from '@/lib/clocker/schedule-grace.server';
import type { ClockerGraceActionResult } from '@/components/clocker-schedule-grace';
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { serverMessage } from "@/lib/i18n/server-messages";
import { SETTINGS_ACTIONS_COPY, type SettingsActionsCopy } from "../../actions-copy";

const ownerOnly = (t: SettingsActionsCopy): ClockerGraceActionResult => ({ state: 'rejected', code: 'FORBIDDEN', message: t.matchingOwnerOnly });
const invalid = (t: SettingsActionsCopy): ClockerGraceActionResult => ({ state: 'rejected', code: 'INVALID', message: t.matchingInvalid });
async function failed(error: unknown): Promise<ClockerGraceActionResult> {
  const lang = await readPageLang();
  if (error instanceof ClockerScheduleGraceError && error.code !== 'UNAVAILABLE') return { state: 'rejected', code: error.code, message: serverMessage(lang, error.message) };
  // A failed response may follow a committed save. Never invite a blind retry.
  return { state: 'unavailable', message: SETTINGS_ACTIONS_COPY[lang].matchingUnconfirmed };
}

/** Owner read of the early clock-in grace, from the server-derived session proof. */
export async function readClockerGraceAction(): Promise<ClockerGraceActionResult> {
  const session = await requireSessionMutationProof();
  if (session.employee.role !== 'OWNER') return ownerOnly(SETTINGS_ACTIONS_COPY[await readPageLang()]);
  try {
    return { state: 'available', setting: await readClockerScheduleGrace({ employeeId: session.employee.id, sessionTokenHash: session.sessionTokenHash }) };
  } catch (error) { return await failed(error); }
}

/**
 * Owner-only, origin-checked save of the early clock-in grace. Exactly two fields: earlyClockInGraceMinutes (a whole
 * number 0–30) and expectedVersion (the version the Owner reviewed, 0 before the first save). The actor comes from the
 * session, never the form. An uncertain result asks for a reload before another save.
 */
export async function saveClockerGraceAction(form: FormData): Promise<ClockerGraceActionResult> {
  const session = await requireSessionMutationProof();
  const lang = await readPageLang(), t = SETTINGS_ACTIONS_COPY[lang];
  if (session.employee.role !== 'OWNER') return ownerOnly(t);
  const originError = clockerOriginFailure(await headers(), await clockerSecurity());
  if (originError) return { state: 'rejected', code: 'ORIGIN_REJECTED', message: serverMessage(lang, originError.error) };
  const fields = ['earlyClockInGraceMinutes', 'expectedVersion'];
  if (!(form instanceof FormData) || [...form.keys()].some(key => !fields.includes(key))) return invalid(t);
  const values = fields.map(key => form.getAll(key));
  if (values.some(list => list.length !== 1 || typeof list[0] !== 'string')) return invalid(t);
  const [minutes, version] = values.map(list => list[0] as string);
  if (!/^(0|[1-9][0-9]?)$/.test(minutes) || Number(minutes) > 30 || !/^(0|[1-9][0-9]{0,9})$/.test(version)) return invalid(t);
  const expectedVersion = Number(version);
  if (!Number.isSafeInteger(expectedVersion)) return invalid(t);
  try {
    const setting = await saveClockerScheduleGrace({ employeeId: session.employee.id, sessionTokenHash: session.sessionTokenHash },
      { earlyClockInGraceMinutes: Number(minutes), expectedVersion });
    return { state: 'available', setting };
  } catch (error) { return await failed(error); }
}
