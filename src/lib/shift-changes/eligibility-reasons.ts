import type { ShiftChangeIssue } from './types';

/** Open-shift eligibility reasons (B3). The server's existing rules decide; this
 * only names, in plain words, the rules that already refused a claim. Warning-only
 * codes never appear here: they don't stop a claim, so they aren't a reason. */
export type EligibilityReason = 'overlap' | 'same_day' | 'time_off' | 'availability' | 'weekly_hours' | 'daily_hours' | 'shift_length' | 'rest' | 'break' | 'position' | 'role' | 'location' | 'lead' | 'coverage' | 'unconfirmed';

const BY_CODE: Partial<Record<ShiftChangeIssue['code'], EligibilityReason>> = {
  SHIFT_OVERLAP: 'overlap',
  MULTIPLE_SHIFTS_SAME_DAY: 'same_day',
  APPROVED_TIME_OFF: 'time_off',
  OUTSIDE_AVAILABILITY: 'availability',
  WEEKLY_AVAILABILITY_CONFLICT: 'availability',
  MAX_WEEKLY_HOURS: 'weekly_hours',
  MAX_DAILY_HOURS: 'daily_hours',
  MAX_SHIFT_HOURS: 'shift_length',
  MIN_REST: 'rest',
  BREAK_REQUIREMENT: 'break',
  POSITION_INELIGIBLE: 'position',
  ROLE_INELIGIBLE: 'role',
  LOCATION_NOT_ELIGIBLE: 'location',
  LEAD_REQUIREMENT: 'lead',
  STAFFING_GAP: 'coverage',
  LEAD_COVERAGE_GAP: 'coverage',
  POSITION_COVERAGE_GAP: 'coverage',
  // A rule the company hasn't set up can't be checked, so the claim waits for it.
  RULE_UNVERIFIABLE: 'unconfirmed',
  POLICY_UNKNOWN: 'unconfirmed',
};

/** Ordered by what a person can most easily act on or recognise first. */
const ORDER: EligibilityReason[] = ['time_off', 'overlap', 'same_day', 'availability', 'weekly_hours', 'daily_hours', 'rest', 'shift_length', 'break', 'position', 'role', 'location', 'lead', 'coverage', 'unconfirmed'];

export const REASON_TEXT: Record<EligibilityReason, string> = {
  time_off: 'You have approved time off then',
  overlap: 'You already work during this time',
  same_day: 'You already have a shift that day',
  availability: 'It’s outside your availability',
  weekly_hours: 'It would go over your weekly hours limit',
  daily_hours: 'It would go over the daily hours limit',
  rest: 'Not enough rest between your shifts',
  shift_length: 'It’s longer than the shift length limit',
  break: 'The required break doesn’t fit',
  position: 'It needs a position you’re not set up for',
  role: 'It needs a role you’re not set up for',
  location: 'You’re not set up to work at this location',
  lead: 'It needs a qualified shift lead',
  coverage: 'It would leave required coverage short',
  unconfirmed: 'Your manager needs to confirm some rules',
};

/** Signed-in Spanish: the same reasons in Puerto Rico Spanish with tú (English above is unchanged). */
export const REASON_TEXT_ES: Record<EligibilityReason, string> = {
  time_off: 'Tienes días libres aprobados en ese momento',
  overlap: 'Ya trabajas a esa hora',
  same_day: 'Ya tienes un turno ese día',
  availability: 'Está fuera de tu disponibilidad',
  weekly_hours: 'Pasaría tu límite de horas semanales',
  daily_hours: 'Pasaría el límite de horas diarias',
  rest: 'No hay suficiente descanso entre tus turnos',
  shift_length: 'Es más largo que el límite de duración del turno',
  break: 'El descanso requerido no cabe',
  position: 'Necesita un puesto para el que no estás configurado',
  role: 'Necesita un rol para el que no estás configurado',
  location: 'No estás configurado para trabajar en esta localidad',
  lead: 'Necesita un líder de turno calificado',
  coverage: 'Dejaría corta la cobertura requerida',
  unconfirmed: 'Tu gerente tiene que confirmar algunas reglas',
};

export function eligibilityReasons(issues: readonly Pick<ShiftChangeIssue, 'code'>[]): EligibilityReason[] {
  const found = new Set(issues.map(issue => BY_CODE[issue.code]).filter((reason): reason is EligibilityReason => reason !== undefined));
  return ORDER.filter(reason => found.has(reason));
}

export type ClaimRefusal = { reasons?: readonly EligibilityReason[]; refusal?: 'rules' | 'review' | 'stale' | 'other' };

/** Lines shown under a shift that can't be claimed. A refusal without named
 * rules says so plainly instead of guessing which rule it was. */
export function refusalLines(value: ClaimRefusal, lang: 'en' | 'es' = 'en'): string[] {
  const text = lang === 'es' ? REASON_TEXT_ES : REASON_TEXT;
  if (value.reasons?.length) return value.reasons.map(reason => text[reason]);
  if (value.refusal === 'review') return [text.unconfirmed];
  if (value.refusal === 'stale') return [lang === 'es' ? 'Este turno acaba de cambiar. Vuelve a revisar en un momento' : 'This shift just changed. Check again shortly'];
  return [lang === 'es' ? 'No cumple las reglas actuales de este turno' : 'It doesn’t fit the current rules for this shift'];
}

/** Signed-in Spanish: a claim check's `notice` is the English reasons joined ("You already work during this time. You
 * already have a shift that day."). This says each known reason in the person's language; an unknown sentence stays. */
export function reasonNotice(notice: string, lang: 'en' | 'es' = 'en'): string {
  if (lang === 'en') return notice;
  const byText = new Map((Object.keys(REASON_TEXT) as EligibilityReason[]).map(reason => [REASON_TEXT[reason], REASON_TEXT_ES[reason]]));
  return notice.replace(/\.$/, '').split('. ').map(part => byText.get(part) ?? part).join('. ') + (notice.endsWith('.') ? '.' : '');
}
