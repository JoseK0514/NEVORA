import { copy as approvedHours } from '../hours-copy';

/* Signed-in Spanish (Nov 23, 2026): the Employee Time and Hours pages' own words (hours.tsx: titles, back links, loading
 * and redirect lines, and the messages it hands to the shared Time screens) in English and Puerto Rico Spanish
 * (docs/design/voice.md: tú, sentence case, the glossary: "Tarjeta de tiempo", "Solicitud de corrección", "gerente",
 * "Marcación", "Descanso", "Pago"; buttons in the infinitive). The page names its tab "Time" or "Hours" and Pay's link
 * "Pay"; `tabName` gives those names in the person's language and leaves any other name as it is. */
const namesEs: Record<string, string> = {Time: 'Tiempo', Hours: 'Horas', Pay: 'Pago'};
const en = {
  tabName: (name: string) => name,
  loadingTime: 'Loading your time…',
  openingTimecards: 'Opening your timecards…', openMyTimecards: 'Open my timecards', openPastTimecards: 'Open Past timecards',
  loadingTimecards: 'Loading your timecards…',
  requestMissing: 'Request missing time', requestCorrection: 'Request a correction', yourRequest: 'Your correction request',
  timeEntry: 'Time entry', pastTimecards: 'Past timecards', pastTimecardsButton: 'Past timecards', timecards: 'Timecards', corrections: 'Corrections',
  subEdit: 'The times you want your manager to review', subRequest: 'Recorded, requested and current times',
  subCards: 'Your effective hours and review history', subCorrections: 'Your requests and manager decisions',
  subRecords: 'Your punches, breaks and recorded time',
  time: 'Time', week: 'Week', back: 'Back', cancel: 'Cancel', timecardDay: 'Timecard day',
  yourRequests: 'Your correction requests', fixMyTime: 'Fix my time', sentForReview: 'Sent to your manager for review',
  earlierPending: 'An earlier correction request still needs to be checked. Return to it before starting a new one.',
  checkEarlier: 'Check your earlier request',
  notConfigured: 'Recorded time isn’t available for this account.',
  schemaMissing: 'Recorded time isn’t available yet.',
  readFailed: 'Your recorded time couldn’t be checked.',
  dayMissing: 'This day isn’t in your recent time. Past timecards has older weeks.',
  timeDidntLoad: 'Your time didn’t load. Go back to Time and try again.',
  sourcesFailed: 'Your correction sources couldn’t be checked. Return to Hours to review your records.',
};
const es: typeof en = {
  tabName: (name: string) => namesEs[name] ?? name,
  loadingTime: approvedHours.es.loadingYourTime,
  openingTimecards: approvedHours.es.openingYourTimecards, openMyTimecards: approvedHours.es.openMyTimecards, openPastTimecards: approvedHours.es.openPastTimecards,
  loadingTimecards: approvedHours.es.loadingYourTimecards,
  requestMissing: approvedHours.es.requestMissingTime, requestCorrection: approvedHours.es.requestACorrection, yourRequest: approvedHours.es.yourCorrectionRequest,
  timeEntry: approvedHours.es.timeEntry, pastTimecards: approvedHours.es.pastTimecards, pastTimecardsButton: approvedHours.es.pastTimecardsButton, timecards: approvedHours.es.timecards, corrections: approvedHours.es.corrections,
  subEdit: approvedHours.es.theTimesYouWantYourManagerToReview, subRequest: approvedHours.es.recordedRequestedAndCurrentTimes,
  subCards: approvedHours.es.yourEffectiveHoursAndReviewHistory, subCorrections: approvedHours.es.yourRequestsAndManagerDecisions,
  subRecords: approvedHours.es.yourPunchesBreaksAndRecordedTime,
  time: approvedHours.es.time, week: approvedHours.es.week, back: approvedHours.es.back, cancel: approvedHours.es.cancel, timecardDay: approvedHours.es.timecardDay,
  yourRequests: approvedHours.es.yourCorrectionRequests, fixMyTime: approvedHours.es.fixMyTime, sentForReview: approvedHours.es.sentToYourManagerForReview,
  earlierPending: approvedHours.es.anEarlierCorrectionRequestStillNeedsToBeCheckedReturn,
  checkEarlier: approvedHours.es.checkYourEarlierRequest,
  notConfigured: approvedHours.es.recordedTimeIsnTAvailableForThisAccount,
  schemaMissing: approvedHours.es.recordedTimeIsnTAvailableYet,
  readFailed: approvedHours.es.yourRecordedTimeCouldnTBeChecked,
  dayMissing: approvedHours.es.thisDayIsnTInYourRecentTimePastTimecards,
  timeDidntLoad: approvedHours.es.yourTimeDidnTLoadGoBackToTimeAnd,
  sourcesFailed: approvedHours.es.yourCorrectionSourcesCouldnTBeCheckedReturnToHours,
};
export const hoursCopy = {en, es};
