import { copy as approvedManagementCloseForm } from './management-close-form-copy';
import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';

import {formatBusinessDateTime} from '@/lib/business-time';

// Close open punch (Timecards sheet): one {en, es} table. Messages stay English in state (the form compares them),
// and are translated when shown through `message`.
const MESSAGES = {
  'Checking current punch…': 'Revisando la marcación actual…',
  'Checking the new punch…': 'Revisando la nueva marcación…',
  'An earlier close is unconfirmed. Check its original saved result.': 'Un cierre anterior no está confirmado. Revisa su resultado original guardado.',
  'This view is paused. Return to check current access.': 'Esta vista está en pausa. Vuelve para revisar tu acceso actual.',
  'Your access changed. Refresh your current session.': 'Tu acceso cambió. Actualiza tu sesión actual.',
  'Reconcile the original close before starting another.': 'Concilia el cierre original antes de empezar otro.',
  'Enter a valid, unambiguous end time and a reason.': 'Escribe una hora de salida válida y clara, y una razón.',
  'Recording the confirmed close…': 'Guardando el cierre confirmado…',
  'Punch closed. The selected end time and reason are recorded.': 'Marcación cerrada. Se guardaron la hora de salida y la razón.',
  'Review the current punch before continuing.': 'Revisa la marcación actual antes de seguir.',
  'The original operation conflicts. Refresh and review the current punch.': 'La operación original tiene un conflicto. Actualiza y revisa la marcación actual.',
  'The result is unconfirmed. Retry the same close to check its saved result.': 'El resultado no está confirmado. Intenta el mismo cierre otra vez para revisar lo guardado.',
  'A different manager must close your punch.': 'Otro gerente tiene que cerrar tu marcación.',
  'This punch changed. Refresh and review it again.': 'Esta marcación cambió. Actualiza y revísala otra vez.',
  'Choose an end after the recorded start and breaks, no later than now.': 'Elige una salida después de la entrada y los descansos guardados, no más tarde que ahora.',
  'This end overlaps other recorded time. Review the timecard first.': 'Esta salida se cruza con otro tiempo guardado. Revisa la tarjeta de tiempo primero.',
  'Reopen the finalized timecard through the existing review process first.': 'Primero reabre la tarjeta de tiempo finalizada con el proceso de revisión.',
  'Start a payroll correction before changing time in this approved payroll period.': 'Empieza una corrección de nómina antes de cambiar tiempo en este período de nómina aprobado.',
} as const;

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
function whenEs(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone, month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit'}).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  return `${value('day')} ${MONTHS_ES[Number(value('month')) - 1]}, ${value('hour')}:${value('minute')} ${value('dayPeriod') === 'PM' ? 'p. m.' : 'a. m.'}`;
}

const en = {
  message: (text: string) => text,
  when: formatBusinessDateTime,
  closeOpenPunch: 'Close open punch',
  confirmOriginal: 'Confirm original close',
  newPunchOpen: 'A new punch is open. Review its current time before another close.',
  reviewNewPunch: 'Review new open punch',
  started: (who: string, where: string, at: string) => `${who} · ${where}. Started ${at}.`,
  openBreakEnds: 'The open break ends at the same selected time.',
  endTime: (zone: string) => `Confirmed end time (${zone})`,
  reason: 'Reason for closing',
  verified: 'I verified this end time and reason.',
  recordClose: 'Record close',
  alreadyClosed: 'This punch is already closed.',
  unavailable: 'Current punch information is unavailable.',
  checking: 'Checking current punch…',
  recording: 'Recording…',
  retry: 'Retry same close',
  refresh: 'Refresh current punch',
  cancel: 'Cancel close',
};

const es: typeof en = {
  when: whenEs,
  message: (text: string) => (MESSAGES as Record<string, string>)[text] ?? text,
  closeOpenPunch: approvedManagementCloseForm.es.closeOpenPunch,
  confirmOriginal: approvedManagementCloseForm.es.confirmOriginalClose,
  newPunchOpen: approvedManagementCloseForm.es.aNewPunchIsOpenReviewItsCurrentTimeBefore,
  reviewNewPunch: approvedManagementCloseForm.es.reviewNewOpenPunch,
  started: (who: string, where: string, at: string) => formatPortalCopy(approvedManagementCloseForm.es.employeenameLocationNameStartedClockInAt, { employeeName: who, locationName: where, clockInAt: at }),
  openBreakEnds: approvedManagementCloseForm.es.theOpenBreakEndsAtTheSameSelectedTime,
  endTime: (zone: string) => formatPortalCopy(approvedManagementCloseForm.es.confirmedEndTimeTimeZone, { timeZone: zone }),
  reason: approvedManagementCloseForm.es.reasonForClosing,
  verified: approvedManagementCloseForm.es.iVerifiedThisEndTimeAndReason,
  recordClose: approvedManagementCloseForm.es.recordClose,
  alreadyClosed: approvedManagementCloseForm.es.thisPunchIsAlreadyClosed,
  unavailable: approvedManagementCloseForm.es.currentPunchInformationIsUnavailable,
  checking: approvedManagementCloseForm.es.checkingCurrentPunch,
  recording: approvedManagementCloseForm.es.recording,
  retry: approvedManagementCloseForm.es.retrySameClose,
  refresh: approvedManagementCloseForm.es.refreshCurrentPunch,
  cancel: approvedManagementCloseForm.es.cancelClose,
};

export const MANAGEMENT_CLOSE_COPY = {en, es};
export const MANAGEMENT_CLOSE_MESSAGES = MESSAGES;
