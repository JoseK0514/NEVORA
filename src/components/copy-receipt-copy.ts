/* DEC4 / G4 (Jose, Nov 23, 2026): the Copy receipt's words in English and Puerto Rico Spanish (docs/design/voice.md: tú,
 * sentence case, the glossary: "Turno disponible", "Días libres", "Horario", "localidad"). The signed-in app renders English
 * today (a stored language per person is an open decision), so the page passes no language and the view defaults to
 * English; the Spanish is kept beside it, as the Employee screens keep theirs (workCopy), so this screen is ready. */
export type ReceiptLang = 'en' | 'es';
const en = {
  weekCopied: 'Week copied', templateApplied: 'Template applied', nothingCopied: 'Nothing copied',
  shifts: (n: number) => `${n} ${n === 1 ? 'shift' : 'shifts'}`,
  reviewHours: 'Review weekly limits', reviewSchedule: 'Review schedule', withWarnings: 'With warnings', allWithWarnings: 'All with warnings', notCopied: 'Not copied',
  schedule: 'Schedule', result: 'Result', openShift: 'Open shift', shift: 'Shift', allDay: 'All day',
  templateNoShifts: 'The template has no shifts', previousWeekNoShifts: 'The previous week has no shifts',
  templateChanged: 'The template changed while copying', previousWeekChanged: 'The previous week changed while copying',
  didntPass: 'Didn’t pass the schedule checks',
  notConfirmedTitle: 'Copy not confirmed', mayBeCopied: (into: string) => `Some shifts may already be copied${into ? ` into ${into}` : ''}`,
  dontStartNew: 'Don’t start a new copy.', retryNeverTwice: 'Retrying never adds a shift twice.', retryThisCopy: 'Retry this copy',
  notFoundTitle: 'Copy not found', incompleteLink: 'This link is incomplete.',
  warnings: {
    AVAILABILITY_NOT_SUBMITTED: 'Availability not confirmed', TARGET_HOURS_EXCEEDED: 'Goes over their weekly target',
    PREFERENCE_NOT_MET: 'Outside their preferred hours', MULTIPLE_SHIFTS_SAME_DAY: 'Already has a shift that day',
    PROJECTED_OVERTIME_REVIEW: 'May go into overtime', RULE_UNVERIFIABLE: 'A scheduling rule couldn’t be checked',
  } as Record<string, string>,
  skips: {
    TEMPLATE_UNAVAILABLE: 'The template isn’t available anymore', EMPLOYEE_UNAVAILABLE: 'Open shifts aren’t copied',
    ASSIGNMENT_UNAVAILABLE: 'The person or location isn’t available anymore', INVALID_LOCAL_TIME: 'The time doesn’t exist that day (clock change)',
    SHIFT_OVERLAP: 'Overlaps another shift', MULTIPLE_SHIFTS_SAME_DAY: 'Already has a shift that day', APPROVED_TIME_OFF: 'Approved time off',
    OUTSIDE_AVAILABILITY: 'Outside their availability', WEEKLY_AVAILABILITY_CONFLICT: 'Conflicts with an availability change',
    AGREED_RESTRICTION: 'Conflicts with an agreed restriction', MAX_WEEKLY_HOURS: 'Over their weekly hours limit',
    MAX_DAILY_HOURS: 'Over the daily hours limit', MAX_SHIFT_HOURS: 'Longer than the shift length limit', MIN_REST: 'Not enough rest between shifts',
    BREAK_REQUIREMENT: 'Missing a required break', EMPLOYEE_INACTIVE: 'The person isn’t active', LOCATION_INACTIVE: 'The location isn’t active',
    LOCATION_NOT_ELIGIBLE: 'Not set up for this location', POSITION_INELIGIBLE: 'Not qualified for the position', POSITION_INACTIVE: 'The position isn’t active',
    ROLE_INELIGIBLE: 'Their role can’t take this shift', LEAD_REQUIREMENT: 'Needs a qualified lead', RULE_UNVERIFIABLE: 'A scheduling rule couldn’t be checked',
  } as Record<string, string>,
};
const es: typeof en = {
  weekCopied: 'Semana copiada', templateApplied: 'Plantilla aplicada', nothingCopied: 'No se copió nada',
  shifts: (n: number) => `${n} ${n === 1 ? 'turno' : 'turnos'}`,
  reviewHours: 'Revisar límites semanales', reviewSchedule: 'Revisar horario', withWarnings: 'Con advertencias', allWithWarnings: 'Todos con advertencias', notCopied: 'No copiados',
  schedule: 'Horario', result: 'Resultado', openShift: 'Turno disponible', shift: 'Turno', allDay: 'Todo el día',
  templateNoShifts: 'La plantilla no tiene turnos', previousWeekNoShifts: 'La semana anterior no tiene turnos',
  templateChanged: 'La plantilla cambió mientras se copiaba', previousWeekChanged: 'La semana anterior cambió mientras se copiaba',
  didntPass: 'No pasó las revisiones del horario',
  notConfirmedTitle: 'Copia sin confirmar', mayBeCopied: (into: string) => `Puede que algunos turnos ya se hayan copiado${into ? ` en ${into}` : ''}`,
  dontStartNew: 'No empieces otra copia.', retryNeverTwice: 'Al reintentar, nunca se añade un turno dos veces.', retryThisCopy: 'Reintentar esta copia',
  notFoundTitle: 'No encontramos la copia', incompleteLink: 'Este enlace está incompleto.',
  warnings: {
    AVAILABILITY_NOT_SUBMITTED: 'Disponibilidad sin confirmar', TARGET_HOURS_EXCEEDED: 'Pasa de su meta semanal',
    PREFERENCE_NOT_MET: 'Fuera de su horario preferido', MULTIPLE_SHIFTS_SAME_DAY: 'Ya tiene un turno ese día',
    PROJECTED_OVERTIME_REVIEW: 'Podría generar horas extra', RULE_UNVERIFIABLE: 'No pudimos verificar una regla del horario',
  },
  skips: {
    TEMPLATE_UNAVAILABLE: 'La plantilla ya no está disponible', EMPLOYEE_UNAVAILABLE: 'Los turnos disponibles no se copian',
    ASSIGNMENT_UNAVAILABLE: 'La persona o la localidad ya no está disponible', INVALID_LOCAL_TIME: 'Esa hora no existe ese día (cambio de hora)',
    SHIFT_OVERLAP: 'Se solapa con otro turno', MULTIPLE_SHIFTS_SAME_DAY: 'Ya tiene un turno ese día', APPROVED_TIME_OFF: 'Días libres aprobados',
    OUTSIDE_AVAILABILITY: 'Fuera de su disponibilidad', WEEKLY_AVAILABILITY_CONFLICT: 'Choca con un cambio de disponibilidad',
    AGREED_RESTRICTION: 'Choca con una restricción acordada', MAX_WEEKLY_HOURS: 'Pasa de su límite de horas semanales',
    MAX_DAILY_HOURS: 'Pasa del límite de horas por día', MAX_SHIFT_HOURS: 'Pasa del límite de duración del turno', MIN_REST: 'No tiene descanso suficiente entre turnos',
    BREAK_REQUIREMENT: 'Le falta un descanso requerido', EMPLOYEE_INACTIVE: 'La persona no está activa', LOCATION_INACTIVE: 'La localidad no está activa',
    LOCATION_NOT_ELIGIBLE: 'No está configurado para esta localidad', POSITION_INELIGIBLE: 'No cumple los requisitos del puesto', POSITION_INACTIVE: 'El puesto no está activo',
    ROLE_INELIGIBLE: 'Su rol no puede tomar este turno', LEAD_REQUIREMENT: 'Necesita un líder que cumpla los requisitos', RULE_UNVERIFIABLE: 'No pudimos verificar una regla del horario',
  },
};
export const RECEIPT_WORDS: Record<ReceiptLang, typeof en> = {en, es};
/** Spanish weekday and time forms (voice.md "Dates, times and numbers"): "lun", "6:00 a. m. – 2:00 p. m.", "7–13 dic". */
export const esWeekday = (iso: string) => new Intl.DateTimeFormat('es-PR', {weekday: 'short', timeZone: 'UTC'}).format(new Date(`${iso}T12:00:00Z`)).replace('.', '');
export const esTimes = (text: string) => text.replace(/[ \u00a0\u202f]*\bAM\b/g, ' a. m.').replace(/[ \u00a0\u202f]*\bPM\b/g, ' p. m.');
export const esWeekRange = (weekStart: string) => {
  const a = new Date(`${weekStart}T12:00:00Z`), b = new Date(a); b.setUTCDate(a.getUTCDate() + 6);
  const m = (d: Date) => new Intl.DateTimeFormat('es-PR', {month: 'short', timeZone: 'UTC'}).format(d).replace('.', '');
  return m(a) === m(b) ? `${a.getUTCDate()}–${b.getUTCDate()} ${m(a)}` : `${a.getUTCDate()} ${m(a)} – ${b.getUTCDate()} ${m(b)}`;
};
