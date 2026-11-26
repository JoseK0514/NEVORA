import { copy as approvedHoursRecords } from '../hours-records-copy';
import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';

/* Signed-in Spanish (Nov 23, 2026): the older Hours records view (a Lead's own time, hours-records.tsx) in English and
 * Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary: "Ponche", "Descanso", "En turno",
 * "Solicitud de corrección", "Tarjeta de tiempo", "localidad"). Times and dates come from mobile-format.ts; durations
 * ("4 h 15 min") read the same in both languages. */
import {timeZoneLabel} from '@/lib/time-zone-label';

/** "Puerto Rico time" → "hora de Puerto Rico". */
const zoneEs = (zone: string) => {const label = timeZoneLabel(zone);return label.endsWith(' time') ? `hora de ${label.slice(0, -5)}` : label;};

const en = {
  tryAgain: 'Try again',
  inProgress: 'In progress',
  elapsed: (duration: string) => `${duration} elapsed`,
  notConfigured: 'Recorded time isn’t available for this account.',
  schemaMissing: 'Recorded time isn’t available yet.',
  readFailed: 'Your recorded time couldn’t be checked.',
  entryStatus: 'Entry status',
  completed: 'Completed entry', onBreak: 'On break', clockedIn: 'Clocked in', offClock: 'Off clock',
  elapsedBreaks: (elapsed: string, breaks: string) => `${elapsed} elapsed · ${breaks} breaks`,
  recordedPunches: 'Recorded punches', clockIn: 'Clock in', clockOut: 'Clock out', recordedBreak: 'Recorded break',
  breakRecorded: (duration: string) => `${duration} recorded break`,
  notRecordedYet: 'Not recorded yet',
  originalRecords: 'These are the original Clocker records. Approved adjustments appear in your timecard.',
  requestCorrection: 'Request a correction',
  finishFirst: 'Finish this entry on your location’s Clocker before requesting a correction.',
  viewTimecard: 'View my timecard',
  timesIn: (zone: string) => `Times in ${timeZoneLabel(zone)}.`,
  entryMissing: 'This entry isn’t in your current recorded-time view. Review your timecard for older dates.',
  todayStatus: 'Today’s clock status',
  since: (place: string, at: string) => `${place} · Since ${at}`,
  noOpenEntry: 'No open time entry was recorded at the last check.',
  useClocker: 'Use your location’s Clocker to clock in, out or record a break.',
  viewCurrent: 'View current entry',
  todayRecorded: 'Today’s recorded time', elapsedTime: 'Elapsed time', breaks: 'Breaks',
  elapsedHelp: 'Elapsed time includes breaks. These are recorded intervals, not payroll totals.',
  todayEntries: 'Today’s entries',
  noPunchesToday: 'No recorded punches today. Use your location’s Clocker when you start work.',
  earlierEntries: 'Earlier entries',
  showing: (shown: number, total: number) => `Showing ${shown} of ${total} earlier entries, most recent first. Choose a timecard period to review older hours.`,
  noEarlier: 'No earlier entries recorded.',
  viewTimecards: 'View my timecards',
};
const es: typeof en = {
  tryAgain: approvedHoursRecords.es.tryAgain,
  inProgress: approvedHoursRecords.es.inProgress,
  elapsed: (duration: string) => `${duration} en total`,
  notConfigured: approvedHoursRecords.es.recordedTimeIsnTAvailableForThisAccount,
  schemaMissing: approvedHoursRecords.es.recordedTimeIsnTAvailableYet,
  readFailed: approvedHoursRecords.es.yourRecordedTimeCouldnTBeChecked,
  entryStatus: approvedHoursRecords.es.entryStatus,
  completed: approvedHoursRecords.es.completedEntry, onBreak: approvedHoursRecords.es.onBreak, clockedIn: approvedHoursRecords.es.clockedIn, offClock: approvedHoursRecords.es.offClock,
  elapsedBreaks: (elapsed: string, breaks: string) => formatPortalCopy(approvedHoursRecords.es.elapsedsecondsElapsedBreakSecondsBreaks, { elapsedSeconds: elapsed, breakSeconds: breaks }),
  recordedPunches: approvedHoursRecords.es.recordedPunches, clockIn: approvedHoursRecords.es.clockIn, clockOut: approvedHoursRecords.es.clockOut, recordedBreak: approvedHoursRecords.es.recordedBreak,
  breakRecorded: (duration: string) => formatPortalCopy(approvedHoursRecords.es.elapsedsecondsRecordedBreak, { elapsedSeconds: duration }),
  notRecordedYet: approvedHoursRecords.es.notRecordedYet,
  originalRecords: approvedHoursRecords.es.theseAreTheOriginalClockerRecordsApprovedAdjustmentsAppearIn,
  requestCorrection: approvedHoursRecords.es.requestACorrection,
  finishFirst: approvedHoursRecords.es.finishThisEntryOnYourLocationSClockerBeforeRequesting,
  viewTimecard: approvedHoursRecords.es.viewMyTimecard,
  timesIn: (zone: string) => formatPortalCopy(approvedHoursRecords.es.timesInTimeZone, { timeZone: zoneEs(zone) }),
  entryMissing: approvedHoursRecords.es.thisEntryIsnTInYourCurrentRecordedTimeView,
  todayStatus: approvedHoursRecords.es.todaySClockStatus,
  since: (place: string, at: string) => formatPortalCopy(approvedHoursRecords.es.locationnameSinceClockInAt, { locationName: place, clockInAt: at }),
  noOpenEntry: approvedHoursRecords.es.noOpenTimeEntryWasRecordedAtTheLastCheck,
  useClocker: approvedHoursRecords.es.useYourLocationSClockerToClockInOutOr,
  viewCurrent: approvedHoursRecords.es.viewCurrentEntry,
  todayRecorded: approvedHoursRecords.es.todaySRecordedTime, elapsedTime: approvedHoursRecords.es.elapsedTime, breaks: approvedHoursRecords.es.breaks,
  elapsedHelp: approvedHoursRecords.es.elapsedTimeIncludesBreaksTheseAreRecordedIntervalsNotPayroll,
  todayEntries: approvedHoursRecords.es.todaySEntries,
  noPunchesToday: approvedHoursRecords.es.noRecordedPunchesTodayUseYourLocationSClockerWhen,
  earlierEntries: approvedHoursRecords.es.earlierEntries,
  showing: (shown: number, total: number) => formatPortalCopy(approvedHoursRecords.es.showingEntriesCountOfTotalEarlierEntriesMostRecentFirstChoose, { entriesCount: shown, total }),
  noEarlier: approvedHoursRecords.es.noEarlierEntriesRecorded,
  viewTimecards: approvedHoursRecords.es.viewMyTimecards,
};
export const hoursRecordsCopy = {en, es};
