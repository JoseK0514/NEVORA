import { copy as approvedHoursFrame } from '../hours-frame-copy';

/* Signed-in Spanish (Nov 23, 2026): the older Hours frame (hours-frame.tsx: its tabs and the status shown before the
 * private read is ready) in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary:
 * "Tarjetas de tiempo", "Iniciar sesión", "Intentar de nuevo", "Verificando…"). */
const en = {
  pastTimecards: 'Past timecards',
  yourTime: 'Your time', hours: 'Hours', timecards: 'Timecards', corrections: 'Corrections',
  timeAccess: 'Time access',
  paused: 'Your time records are paused. Return to this page or reconnect to refresh.',
  denied: 'Your access changed. Sign in again to continue.',
  checkingRecords: 'Checking your current time records…',
  failed: 'Your records couldn’t be checked.',
  signIn: 'Sign in', checking: 'Checking…', tryAgain: 'Try again',
};
const es: typeof en = {
  pastTimecards: approvedHoursFrame.es.pastTimecards,
  yourTime: approvedHoursFrame.es.yourTime, hours: approvedHoursFrame.es.hours, timecards: approvedHoursFrame.es.timecards, corrections: approvedHoursFrame.es.corrections,
  timeAccess: approvedHoursFrame.es.timeAccess,
  paused: approvedHoursFrame.es.yourTimeRecordsArePausedReturnToThisPageOr,
  denied: approvedHoursFrame.es.yourAccessChangedSignInAgainToContinue,
  checkingRecords: approvedHoursFrame.es.checkingYourCurrentTimeRecords,
  failed: approvedHoursFrame.es.yourRecordsCouldnTBeChecked,
  signIn: approvedHoursFrame.es.signIn, checking: approvedHoursFrame.es.checking, tryAgain: approvedHoursFrame.es.tryAgain,
};
export const hoursFrameCopy = {en, es};
