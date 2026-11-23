/* Signed-in Spanish (Nov 23, 2026): the words hours-model.ts returns to the Employee Time pages (hours-corp.tsx) and
 * their Direction B phone screens (employee-b/time-b.tsx), in English and Puerto Rico Spanish (docs/design/voice.md:
 * tú, sentence case, the glossary: "Tarjeta de tiempo", "Descanso", "Marcación", "gerente"). The helpers take a trailing
 * language that defaults to English, so callers outside employee-mobile keep their English byte for byte. A timecard
 * ("tarjeta") and a correction request ("solicitud") are feminine, so their states agree with them. */
const en = {
  issues: {
    open_entry: 'An entry is still missing its clock-out.',
    open_break: 'A break is still in progress.',
    pending_correction: 'A correction is waiting for review.',
    overlapping_time: 'Some time entries overlap.',
  },
  card: {approved: 'Approved', finalized: 'Finalized', reopened: 'Reopened', needsReview: 'Needs review', inProgress: 'In progress', notApproved: 'Not approved yet'},
  kinds: {ENTRY_BOUNDARY: 'Clock in and out', BREAK_BOUNDARY: 'Break', MISSING_ENTRY: 'Missed shift'},
  status: {PENDING: 'Waiting for review', APPROVED: 'Approved', REJECTED: 'Declined'},
  short: {PENDING: 'Waiting', APPROVED: 'Approved', REJECTED: 'Declined'},
  shifts: (n: number) => `${n} ${n === 1 ? 'shift' : 'shifts'}`,
  placeTablet: (place: string) => `the ${place} tablet`,
  anyTablet: 'the tablet where you work',
  now: 'now',
};
const es: typeof en = {
  issues: {
    open_entry: 'A una entrada todavía le falta la marcación de salida.',
    open_break: 'Un descanso todavía está en curso.',
    pending_correction: 'Una corrección está en espera de revisión.',
    overlapping_time: 'Algunas entradas de tiempo se solapan.',
  },
  card: {approved: 'Aprobada', finalized: 'Finalizada', reopened: 'Reabierta', needsReview: 'Necesita revisión', inProgress: 'En curso', notApproved: 'Aún sin aprobar'},
  kinds: {ENTRY_BOUNDARY: 'Entrada y salida', BREAK_BOUNDARY: 'Descanso', MISSING_ENTRY: 'Turno sin marcar'},
  status: {PENDING: 'En espera de revisión', APPROVED: 'Aprobada', REJECTED: 'Rechazada'},
  short: {PENDING: 'En espera', APPROVED: 'Aprobada', REJECTED: 'Rechazada'},
  shifts: (n: number) => `${n} ${n === 1 ? 'turno' : 'turnos'}`,
  placeTablet: (place: string) => `la tableta de ${place}`,
  anyTablet: 'la tableta donde trabajas',
  now: 'ahora',
};
export const hoursModelCopy = {en, es};
