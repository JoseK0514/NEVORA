/* Signed-in Spanish (Nov 23, 2026): the older timecard view (hours-cards.tsx: a period's effective time, entries and
 * approval history) in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary: "Tarjeta
 * de tiempo", "Marcación", "Descanso", "Comprobante de pago", "gerente"). A timecard ("tarjeta") is feminine, so its
 * states agree with it. Dates and times come from mobile-format.ts; durations ("8 h 2 min") read the same in both. */
import {timeZoneLabel} from '@/lib/time-zone-label';

/** "Puerto Rico time" → "hora de Puerto Rico". */
const zoneEs = (zone: string) => {const label = timeZoneLabel(zone);return label.endsWith(' time') ? `hora de ${label.slice(0, -5)}` : label;};

const en = {
  issues: {
    period_open: 'This period is still in progress. Totals can change.',
    open_entry: 'An entry is still missing its clock-out.',
    open_break: 'A break is still in progress.',
    pending_correction: 'A correction is waiting for review.',
    overlapping_time: 'Some time entries overlap.',
  },
  states: {DRAFT: 'Draft', APPROVED: 'Approved', FINALIZED: 'Finalized', REOPENED: 'Reopened', NEEDS_REVIEW: 'Review needed'},
  invalidPeriod: 'Choose a valid period of 1 to 31 days, with the end on or after the start.',
  startDate: 'Start date', endDate: 'End date', viewPeriod: 'View period',
  unavailable: 'Your timecard couldn’t be checked. Recorded punches remain available under Hours.',
  noCard: 'No timecard is available for your account in this period.',
  status: 'Timecard status',
  finalized: 'This timecard is finalized. Your manager controls reopening.',
  hoursInPeriod: 'Hours in this period', effective: 'Effective time', breaks: 'Breaks',
  effectiveHelp: 'Effective time includes breaks and approved adjustments. Totals cover the selected dates and aren’t a pay statement.',
  periodInfo: 'Period information', periodInProgress: 'Period in progress', aboutHours: 'About these hours',
  reviewCorrections: 'Review my corrections',
  timeEntries: 'Time entries', recordedTime: 'Recorded time', inProgress: 'In progress',
  currentEffective: 'Current effective time', adjustmentIncluded: 'An approved adjustment is included.',
  originalPunches: 'Original punches', noClockOut: ' – Clock-out not recorded',
  approvedMissing: 'Approved missing time · No device punch was created.',
  breaksHeading: 'Breaks', original: 'Original: ', requestCorrection: 'Request a correction',
  noEntries: 'No time entries in this period.',
  history: 'Timecard history', historySub: 'Approval, finalization and reopening',
  historyBy: (action: 'APPROVE' | 'FINALIZE' | 'REOPEN', by: string) => `${{APPROVE: 'Approved', FINALIZE: 'Finalized', REOPEN: 'Reopened'}[action]} by ${by}`,
  noHistory: 'No approval history for this period yet.',
  timesIn: (zone: string) => `Times in ${timeZoneLabel(zone)}. Your manager controls approval and finalization.`,
};
const es: typeof en = {
  issues: {
    period_open: 'Este período todavía está en curso. Los totales pueden cambiar.',
    open_entry: 'A una entrada todavía le falta la marcación de salida.',
    open_break: 'Un descanso todavía está en curso.',
    pending_correction: 'Una corrección está en espera de revisión.',
    overlapping_time: 'Algunas entradas de tiempo se solapan.',
  },
  states: {DRAFT: 'Borrador', APPROVED: 'Aprobada', FINALIZED: 'Finalizada', REOPENED: 'Reabierta', NEEDS_REVIEW: 'Necesita revisión'},
  invalidPeriod: 'Elige un período válido de 1 a 31 días, con el fin igual o después del inicio.',
  startDate: 'Fecha de inicio', endDate: 'Fecha de fin', viewPeriod: 'Ver período',
  unavailable: 'No pudimos verificar tu tarjeta de tiempo. Tus marcaciones registradas siguen disponibles en Horas.',
  noCard: 'No hay una tarjeta de tiempo disponible para tu cuenta en este período.',
  status: 'Estado de la tarjeta de tiempo',
  finalized: 'Esta tarjeta de tiempo está finalizada. Tu gerente decide si se reabre.',
  hoursInPeriod: 'Horas en este período', effective: 'Tiempo efectivo', breaks: 'Descansos',
  effectiveHelp: 'El tiempo efectivo incluye los descansos y los ajustes aprobados. Los totales cubren las fechas elegidas y no son un comprobante de pago.',
  periodInfo: 'Información del período', periodInProgress: 'Período en curso', aboutHours: 'Sobre estas horas',
  reviewCorrections: 'Revisar mis correcciones',
  timeEntries: 'Entradas de tiempo', recordedTime: 'Tiempo registrado', inProgress: 'En curso',
  currentEffective: 'Tiempo efectivo actual', adjustmentIncluded: 'Incluye un ajuste aprobado.',
  originalPunches: 'Marcaciones originales', noClockOut: ' – Salida no registrada',
  approvedMissing: 'Tiempo sin marcar aprobado · No se creó una marcación en el dispositivo.',
  breaksHeading: 'Descansos', original: 'Original: ', requestCorrection: 'Solicitar una corrección',
  noEntries: 'No hay entradas de tiempo en este período.',
  history: 'Historial de la tarjeta de tiempo', historySub: 'Aprobación, finalización y reapertura',
  historyBy: (action: 'APPROVE' | 'FINALIZE' | 'REOPEN', by: string) => `${{APPROVE: 'Aprobada', FINALIZE: 'Finalizada', REOPEN: 'Reabierta'}[action]} por ${by}`,
  noHistory: 'Todavía no hay historial de aprobación para este período.',
  timesIn: (zone: string) => `Las horas están en ${zoneEs(zone)}. Tu gerente controla la aprobación y la finalización.`,
};
export const hoursCardsCopy = {en, es};
