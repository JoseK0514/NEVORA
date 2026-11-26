import { copy as approvedTimeB } from './time-b-copy';
import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';

/* Signed-in Spanish (Nov 23, 2026): the words on the Employee and Lead Time screens (time-b.tsx): the Time tab, one day,
 * Past timecards, Your correction requests and Fix my time, in English and Puerto Rico Spanish (docs/design/voice.md: tú,
 * Marcación, En turno, Tarjeta de tiempo, Solicitud de corrección). English is the approved wording, unchanged. Status words,
 * request kinds, timecard notes and the tablet's name come from the shared Time model (employee-mobile/hours-model), whose
 * helpers take the language, so they are not repeated here. */
export type TimeLang = 'en' | 'es';

const en = {
  // Frame and states
  tryAgain: 'Try again', signIn: 'Sign in', timeStatus: 'Time status', timeAccess: 'Time access',
  paused: 'Your time records are paused. Return to this page or reconnect to refresh.',
  denied: 'Your access changed. Sign in again to continue.',
  checking: 'Checking your current time records…',
  failed: 'Your records couldn’t be checked.',
  earlierRequest: 'Earlier request', earlierStillChecked: 'An earlier correction request still needs to be checked.',
  returnFirst: 'Return to it before starting a new one.', checkEarlier: 'Check your earlier request',
  // Time tab
  onBreak: 'On break', clockedIn: 'Clocked in', notClockedIn: 'Not clocked in',
  onBreakSince: (time: string) => `On break since ${time}`,
  clockedInAt: (time: string) => `Clocked in at ${time}`,
  clockInOn: (tablet: string) => `Clock in on ${tablet}`,
  placeClockedInAt: (place: string, time: string) => `${place} · clocked in at ${time}`,
  soFar: ' so far',
  takeBreaksThere: 'Take breaks and clock out there too',
  endBreakHint: 'End your break on your location’s tablet.',
  clockOutHint: 'Take breaks and clock out on your location’s tablet.',
  atAGlance: 'This week at a glance', thisWeek: 'This week', breaks: 'Breaks',
  rightNow: 'Right now', thisWeekDot: 'This week · ', inProgress: 'In progress',
  weekTime: 'This week’s time', breakSub: (duration: string) => `${duration} break`,
  noTimeYet: 'No time recorded yet this week', fixMissed: 'Fix a missed punch', includeBreaks: 'Hours include breaks.',
  yourRequests: 'Your correction requests',
  lastWeek: 'Last week', noHoursRecorded: 'No hours recorded', notApprovedYet: 'Not approved yet',
  // One day
  hours: 'Hours', soFarShort: ' so far', punches: 'Punches', location: 'Location', requestCorrection: 'Request a correction',
  // Past timecards
  pausedShort: 'Paused', loading: 'Loading…', couldntCheck: 'Couldn’t be checked', noHoursYet: 'No hours yet',
  countSoFar: (count: string) => `${count} so far`, noHoursThisWeek: 'No hours this week',
  hoursIncludes: (duration: string) => `Hours · includes ${duration} of breaks`,
  days: 'Days', weeks: 'Weeks', showEarlier: 'Show earlier weeks', earlierWeeks: 'Earlier weeks',
  // Corrections
  correctionRequests: 'Correction requests', waiting: 'Waiting', decided: 'Decided', decisions: 'Decisions', waitingForReview: 'Waiting for review',
  noDecided: 'No decided requests', nothingWaiting: 'Nothing waiting for review',
  nothingDecided: 'Nothing decided in your recent history.', stayHere: 'Requests you send stay here until your manager decides.',
  openFromTime: 'To fix a day you already clocked, open it from Time.',
  showingRecent: (count: number) => `Showing your ${count} most recent requests.`,
  // One correction
  breakNamed: (name: string) => `Break · ${name}`, times: 'Times', recorded: 'Recorded', noPunches: 'No punches recorded',
  youAskedFor: 'You asked for', onTimecard: 'On your timecard', sent: 'Sent',
  decision: 'Decision', yourNote: 'Your note', decidedBy: (status: string, by: string) => `${status} by ${by}`, managersNote: 'Manager’s note',
  earlierDecisions: 'Earlier decisions for this time', approved: 'Approved', declined: 'Declined',
  managerReviews: 'Your manager reviews this request. Your original punches stay unchanged.',
  changedTimecard: 'Changed timecard', timecardChanged: 'Your timecard changed after this request. Check the current times before sending another request.',
  requestAnother: 'Request another correction',
  // Fix my time receipts
  close: 'Close', submissionResult: 'Submission result', submissionStatus: 'Submission status',
  checkingRequest: 'Checking your request…', checkingWhether: 'We’re checking whether your request was sent.',
  couldntConfirm: 'We couldn’t confirm your request was sent. Check it before you send another.',
  sending: 'Sending your request…', checkStatus: 'Check request status',
  // /app/timecards
  time: 'Time', pastTimecards: 'Past timecards', openingLabel: 'Opening your timecards', opening: 'Opening your timecards…', openPast: 'Open past timecards',
  shifts: (n: number) => `${n} ${n === 1 ? 'shift' : 'shifts'}`,
};

const es: typeof en = {
  tryAgain: approvedTimeB.es.tryAgain, signIn: approvedTimeB.es.signIn, timeStatus: approvedTimeB.es.timeStatus, timeAccess: approvedTimeB.es.timeAccess,
  paused: approvedTimeB.es.yourTimeRecordsArePausedReturnToThisPageOr,
  denied: approvedTimeB.es.yourAccessChangedSignInAgainToContinue,
  checking: approvedTimeB.es.checkingYourCurrentTimeRecords,
  failed: approvedTimeB.es.yourRecordsCouldnTBeChecked,
  earlierRequest: approvedTimeB.es.earlierRequest, earlierStillChecked: approvedTimeB.es.anEarlierCorrectionRequestStillNeedsToBeChecked,
  returnFirst: approvedTimeB.es.returnToItBeforeStartingANewOne, checkEarlier: approvedTimeB.es.checkYourEarlierRequest,
  onBreak: approvedTimeB.es.onBreak, clockedIn: approvedTimeB.es.clockedIn, notClockedIn: approvedTimeB.es.notClockedIn,
  onBreakSince: (time: string) => formatPortalCopy(approvedTimeB.es.onBreakSinceStartAt, { startAt: time }),
  clockedInAt: (time: string) => formatPortalCopy(approvedTimeB.es.clockedInAtClockInAt, { clockInAt: time }),
  clockInOn: (tablet: string) => formatPortalCopy(approvedTimeB.es.clockInOnTablet, { tablet }),
  placeClockedInAt: (place: string, time: string) => formatPortalCopy(approvedTimeB.es.locationnameClockedInAtClockInAt, { locationName: place, clockInAt: time }),
  soFar: approvedTimeB.es.soFar,
  takeBreaksThere: approvedTimeB.es.takeBreaksAndClockOutThereToo,
  endBreakHint: approvedTimeB.es.endYourBreakOnYourLocationSTablet,
  clockOutHint: approvedTimeB.es.takeBreaksAndClockOutOnYourLocationSTablet,
  atAGlance: approvedTimeB.es.thisWeekAtAGlance, thisWeek: approvedTimeB.es.thisWeek2, breaks: approvedTimeB.es.breaks,
  rightNow: approvedTimeB.es.rightNow, thisWeekDot: approvedTimeB.es.thisWeek, inProgress: approvedTimeB.es.inProgress,
  weekTime: approvedTimeB.es.thisWeekSTime, breakSub: (duration: string) => `${duration} de descanso`,
  noTimeYet: approvedTimeB.es.noTimeRecordedYetThisWeek, fixMissed: approvedTimeB.es.fixAMissedPunch, includeBreaks: approvedTimeB.es.hoursIncludeBreaks,
  yourRequests: approvedTimeB.es.yourCorrectionRequests,
  lastWeek: approvedTimeB.es.lastWeek, noHoursRecorded: approvedTimeB.es.noHoursRecorded, notApprovedYet: approvedTimeB.es.notApprovedYet,
  hours: approvedTimeB.es.hours, soFarShort: approvedTimeB.es.soFar2, punches: approvedTimeB.es.punches, location: approvedTimeB.es.location, requestCorrection: approvedTimeB.es.requestACorrection,
  pausedShort: approvedTimeB.es.paused, loading: approvedTimeB.es.loading, couldntCheck: 'No pudimos verificarla', noHoursYet: approvedTimeB.es.noHoursYet,
  countSoFar: (count: string) => formatPortalCopy(approvedTimeB.es.countSoFar, { count }), noHoursThisWeek: approvedTimeB.es.noHoursThisWeek,
  hoursIncludes: (duration: string) => formatPortalCopy(approvedTimeB.es.hoursIncludesBreakNanosecondsOfBreaks, { breakNanoseconds: duration }),
  days: approvedTimeB.es.days, weeks: approvedTimeB.es.weeks, showEarlier: approvedTimeB.es.showEarlierWeeks, earlierWeeks: approvedTimeB.es.earlierWeeks,
  correctionRequests: approvedTimeB.es.correctionRequests, waiting: approvedTimeB.es.waiting, decided: approvedTimeB.es.decided, decisions: approvedTimeB.es.decisions, waitingForReview: approvedTimeB.es.waitingForReview,
  noDecided: approvedTimeB.es.noDecidedRequests, nothingWaiting: approvedTimeB.es.nothingWaitingForReview,
  nothingDecided: approvedTimeB.es.nothingDecidedInYourRecentHistory, stayHere: approvedTimeB.es.requestsYouSendStayHereUntilYourManagerDecides,
  openFromTime: approvedTimeB.es.toFixADayYouAlreadyClockedOpenItFrom,
  showingRecent: (count: number) => formatPortalCopy(approvedTimeB.es.showingYourRequestsCountMostRecentRequests, { requestsCount: count }),
  breakNamed: (name: string) => formatPortalCopy(approvedTimeB.es.breakBreakName, { breakName: name }), times: approvedTimeB.es.times, recorded: approvedTimeB.es.recorded, noPunches: approvedTimeB.es.noPunchesRecorded,
  youAskedFor: approvedTimeB.es.youAskedFor, onTimecard: approvedTimeB.es.onYourTimecard, sent: approvedTimeB.es.sent,
  decision: approvedTimeB.es.decision, yourNote: approvedTimeB.es.yourNote, decidedBy: (status: string, by: string) => formatPortalCopy(approvedTimeB.es.statuswordByBy, { statusWord: status, by }), managersNote: approvedTimeB.es.managerSNote,
  earlierDecisions: approvedTimeB.es.earlierDecisionsForThisTime, approved: approvedTimeB.es.approved, declined: approvedTimeB.es.declined,
  managerReviews: approvedTimeB.es.yourManagerReviewsThisRequestYourOriginalPunchesStayUnchanged,
  changedTimecard: approvedTimeB.es.changedTimecard, timecardChanged: approvedTimeB.es.yourTimecardChangedAfterThisRequestCheckTheCurrentTimes,
  requestAnother: approvedTimeB.es.requestAnotherCorrection,
  close: approvedTimeB.es.close, submissionResult: approvedTimeB.es.submissionResult, submissionStatus: approvedTimeB.es.submissionStatus,
  checkingRequest: approvedTimeB.es.checkingYourRequest, checkingWhether: approvedTimeB.es.weReCheckingWhetherYourRequestWasSent,
  couldntConfirm: approvedTimeB.es.weCouldnTConfirmYourRequestWasSentCheckIt,
  sending: approvedTimeB.es.sendingYourRequest, checkStatus: approvedTimeB.es.checkRequestStatus,
  time: approvedTimeB.es.time, pastTimecards: approvedTimeB.es.pastTimecards, openingLabel: approvedTimeB.es.openingYourTimecards, opening: approvedTimeB.es.openingYourTimecards2, openPast: approvedTimeB.es.openPastTimecards,
  shifts: (n: number) => `${n} ${n === 1 ? 'turno' : 'turnos'}`,
};

export const TIME_COPY: Record<TimeLang, typeof en> = {en, es};
export type TimeCopy = typeof en;
export const timeCopy = (lang: TimeLang = 'en'): TimeCopy => TIME_COPY[lang];
