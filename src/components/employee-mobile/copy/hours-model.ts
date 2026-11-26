import { copy as approvedHoursModel } from '../hours-model-copy';
import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';

/* Signed-in Spanish (Nov 23, 2026): the words hours-model.ts returns to the Employee Time pages (hours-corp.tsx) and
 * their Direction B phone screens (employee-b/time-b.tsx), in English and Puerto Rico Spanish (docs/design/voice.md:
 * tú, sentence case, the glossary: "Tarjeta de tiempo", "Descanso", "Ponche", "gerente"). The helpers take a trailing
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
    open_entry: approvedHoursModel.es.anEntryIsStillMissingItsClockOut,
    open_break: approvedHoursModel.es.aBreakIsStillInProgress,
    pending_correction: approvedHoursModel.es.aCorrectionIsWaitingForReview,
    overlapping_time: approvedHoursModel.es.someTimeEntriesOverlap,
  },
  card: {approved: approvedHoursModel.es.approved, finalized: approvedHoursModel.es.finalized, reopened: approvedHoursModel.es.reopened, needsReview: approvedHoursModel.es.needsReview, inProgress: approvedHoursModel.es.inProgress, notApproved: approvedHoursModel.es.notApprovedYet},
  kinds: {ENTRY_BOUNDARY: approvedHoursModel.es.clockInAndOut, BREAK_BOUNDARY: approvedHoursModel.es.break, MISSING_ENTRY: approvedHoursModel.es.missedShift},
  status: {PENDING: approvedHoursModel.es.waitingForReview, APPROVED: approvedHoursModel.es.approved, REJECTED: approvedHoursModel.es.declined},
  short: {PENDING: approvedHoursModel.es.waiting, APPROVED: approvedHoursModel.es.approved, REJECTED: approvedHoursModel.es.declined},
  shifts: (n: number) => `${n} ${n === 1 ? 'turno' : 'turnos'}`,
  placeTablet: (place: string) => formatPortalCopy(approvedHoursModel.es.thePlacesTablet, { places: place }),
  anyTablet: approvedHoursModel.es.theTabletWhereYouWork,
  now: 'ahora',
};
export const hoursModelCopy = {en, es};
