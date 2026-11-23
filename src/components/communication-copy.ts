/* G98 (Phase 2, signed-in Spanish): the words of Updates' compose and edit form (communication-compose.tsx) and an
 * update's page with its Confirmed list (communication-detail.tsx), in English and Puerto Rico Spanish (docs/design/
 * voice.md: tú, sentence case; Update = Aviso, location = localidad). Jose's decision: "Acknowledged" is "Confirmed"
 * everywhere; where the English still says Acknowledged it is kept as it was, and the Spanish uses Confirmado. The English
 * is the text these screens already said, moved here unchanged. */
import { formatDisplayDate, formatTimeRange } from '../lib/date-utils';
import { timeZoneLabel } from '../lib/time-zone-label';
import { keepWhole } from '../lib/keep-whole';
import { esTimes, esWeekday } from './copy-receipt-copy';

export type CommunicationLang = 'en' | 'es';

const esMonth = (d: Date, timeZone = 'UTC') => new Intl.DateTimeFormat('es-PR', { month: 'short', timeZone }).format(d).replace('.', '').replace(/^sept$/, 'sep');
/** "mié, 14 oct" (voice.md "Dates, times and numbers"). */
export function esDisplayDate(date: string) {
  const d = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return `${esWeekday(date.slice(0, 10))}, ${d.getUTCDate()} ${esMonth(d)}`;
}
/** An instant in a zone: "8 oct 2026, 8:00 a. m." (with the year) or "8 oct, 8:00 a. m.". */
export function esInstant(at: string, timeZone: string, year: boolean) {
  const d = new Date(at);
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    .formatToParts(d).map(part => [part.type, part.value]));
  const month = esMonth(new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, 15)));
  return `${parts.day} ${month}${year ? ` ${parts.year}` : ''}, ${parts.hour}:${parts.minute} ${parts.dayPeriod === 'PM' ? 'p.\u00a0m.' : 'a.\u00a0m.'}`;
}
const esZone = (timeZone: string) => { const place = timeZone.split('/').at(-1)?.replaceAll('_', ' ').trim(); return place ? `hora de ${place}` : timeZone; };

const en = {
  // Dates and times, as the English screens wrote them.
  date: (date: string) => formatDisplayDate(date),
  timeRange: (start: string, end: string) => formatTimeRange(start, end),
  zone: (timeZone: string) => timeZoneLabel(timeZone),
  stamp: (at: string, timeZone: string) => keepWhole(new Intl.DateTimeFormat('en-US', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(at))),
  short: (at: string, timeZone: string, year: boolean) => keepWhole(new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric', ...(year ? { year: 'numeric' as const } : {}), hour: 'numeric', minute: '2-digit' }).format(new Date(at))),
  // Types.
  todaysTeam: 'Today’s team', shiftNote: 'Shift note', importantUpdate: 'Important update', announcement: 'Announcement',
  // Shared states.
  sessionEnded: 'Your session ended', signIn: 'Sign in', signInAgain: 'Sign in again', offline: 'You’re offline',
  paused: 'Paused while you were away', connect: 'Connect to the internet, then try again.', checkConnection: 'Check your connection, then try again.',
  tryAgain: 'Try again', checkStatus: 'Check status', checking: 'Checking…', updates: 'Updates', reviewLatest: 'Review latest',
  checkBeforeRetry: 'Check status before trying again.', couldntConfirmCheck: 'We couldn’t confirm the result. Check status before trying again.',
  editUpdate: 'Edit update', edit: 'Edit', mustBeConfirmed: 'Must be confirmed', confirmingOptional: 'Confirming is optional', optional: 'Optional', message: 'Message', cancel: 'Cancel',
  publishing: 'Publishing…', publishUpdate: 'Publish update',
  // Compose: checks.
  chooseShift: 'Choose a current published shift.',
  validDateTime: (zone: string) => `Choose a valid date and time in ${zone}.`,
  laterThanNow: 'Choose a time later than now.',
  enterTitle: 'Enter a title', titleTooLong: 'Use 120 characters or fewer', enterMessage: 'Enter a message', messageTooLong: 'Use 2,000 characters or fewer',
  plainTextScope: 'Use plain text, and choose a location and who receives it.',
  audienceDenied: 'Audience couldn’t be checked. You may not have access to this location.',
  audienceRetry: 'Audience couldn’t be checked. Try again.',
  // Compose: refused.
  signInToContinue: 'Sign in again to continue.', publicationUnavailable: 'Publication unavailable',
  noPermission: 'Your current permission does not allow publication.', returnToUpdates: 'Return to updates',
  // Compose: a Lead's message to today's team.
  audiencePreview: 'Audience preview', audiencePreviewSr: (n: number) => `Audience preview: ${n} `,
  peopleAt: (n: number, location: string) => `${n === 1 ? 'person' : 'people'} at ${location}`,
  everyoneToday: (day: string) => `Everyone on today’s team · ${day}`,
  noEligible: 'No eligible recipients in this audience. You can change the delivery settings before publishing.',
  onTheirPhone: 'On their phone', yourTitle: 'Your title', yourMessage: 'Your message', now: 'now', inTheApp: 'In the app',
  checkedAgain: 'Eligibility is checked again when you publish. Changing any field requires a new preview.',
  checkingAudience: 'Checking audience…', previewAudience: 'Preview audience',
  nothingPublished: 'Nothing is published until you review the audience and choose Publish.',
  newUpdate: 'New update', messageTodaysTeam: 'Message today’s team', titleSr: 'Title: ', title: 'Title',
  whatToKnow: 'What does your team need to know?', plainTextKept: 'Plain text · line breaks kept', whoGetsIt: 'Who gets it',
  todaysTeamAt: (label: string) => `Today’s team · ${label}`, peopleWorking: (day: string) => `People working ${day}`,
  basedOnAssignments: 'Based on current published assignments, including overnight shifts.',
  setExpiration: 'Set an expiration', staysAvailable: 'It stays available until it is withdrawn.',
  availableUntilZone: (zone: string) => `Available until (${zone})`,
  // Compose: an Owner's or Manager's form.
  charactersOf: (n: number, max: string) => `${n} of ${max} characters`, titleExample: 'e.g. Holiday hours',
  plainTextSr: 'Plain text. Line breaks are kept.',
  newVersionNote: 'Publishing creates a new version. Earlier confirmations stay with the version people reviewed.',
  delivery: 'Delivery', type: 'Type', whoReceives: 'Who receives it', everyoneAtLocation: 'Everyone at the location', onePublishedShift: 'One published shift',
  sendTo: 'Send to', teamHint: 'People with a published shift today, overnight shifts included.', shift: 'Shift', choosePublishedShift: 'Choose a published shift',
  askToConfirm: 'Ask them to confirm', eachConfirms: 'Each person confirms this version.', canMarkRead: 'People can mark it read.',
  expires: 'Expires', never: 'Never', expiryHint: (zone: string) => `Time in ${zone}. Empty means it never expires.`, next: 'Next',
  reviewFeedback: 'Update review feedback', reviewLatestInfo: 'Review the latest information',
  newerVersion: 'A newer version is available. Your retained draft belongs to the version you originally reviewed. Review latest before editing again.',
  changedAudience: 'This update or its audience changed. Review the latest context and preview again.',
  couldntConfirmResult: 'Couldn’t confirm the result', couldNotConfirm: 'We could not confirm the result. Check status before trying again.',
  reviewSr: 'Review: ', expiresOn: (date: string) => `Expires ${date}`, neverExpires: 'Never expires',
  goesTo: (n: number) => `Goes to ${n} ${n === 1 ? 'person' : 'people'}`, at: (location: string) => `At ${location}`,
  noOneYet: 'No one is in this audience right now. Edit the update to change who gets it. ', listChecked: 'The list is checked again when you publish.',
  back: 'Back', publishNewVersion: 'Publish new version', reviewBeforePublishing: 'Review before publishing',
  checkEligible: 'Check the eligible audience before your update goes live.', confirmingPublication: 'Confirming publication…',
  needsStatusCheck: 'Publication needs a status check', retryOriginal: 'Retry original publication',
  loadingForm: 'Loading the form', couldntLoadForm: 'Couldn’t load the form', keepWritingSignIn: 'Sign in again to keep writing.',
  keepWritingReturn: 'Come back to this page to keep writing.', gettingLocations: 'Getting your locations and today’s team…',
  teamUpdatesNew: 'Team updates · new', messageLine1: 'Message', messageLine2: 'today’s team', writeOnce: 'Write it once. Everyone working today sees it.',
  step: (step: 1 | 2) => `Step ${step} of 2 · ${step === 1 ? 'Write' : 'Review'}`,
  // Detail.
  ackRequired: 'Con­fir­ma­tion required',
  accessChanged: 'Access changed', updateChanged: 'This update changed', updateWithdrawn: 'Update withdrawn', loadingUpdate: 'Loading update…',
  couldntLoadUpdate: 'Couldn’t load this update', checkAccess: 'Sign in again to check your current access.',
  seeCurrent: 'Come back to this page to see the current update.', noLongerAccess: 'You no longer have access to this update. Refresh to check.',
  reviewBeforeConfirming: 'Review the latest version before confirming it.', noLongerAvailable: 'This update is no longer available.',
  notAllowed: 'Your current permission does not allow this update. Sign in to check your access.',
  gettingLatest: 'Getting the latest version and your review status.', allUpdates: 'All updates', update: 'Update', loadingUpdateAria: 'Loading update',
  sentTo: (n: number) => `Sent to ${n} ${n === 1 ? 'recipient' : 'recipients'}. Delivery does not confirm reading.`,
  withdrawFor: (n: number) => `Withdraw this update for ${n} ${n === 1 ? 'person' : 'people'}? They won’t see it anymore.`,
  withdrawAsk: 'Withdraw this update? People won’t see it anymore.', withdrawing: 'Withdrawing…', withdrawUpdate: 'Withdraw update',
  keepUpdate: 'Keep update', withdraw: 'Withdraw', updateContent: 'Update content', confirmed: 'Confirmed', markedRead: 'Marked read',
  forYourInformation: 'For your information', editedVersion: 'Edited version · ', availableUntil: 'Available until ',
  yourReviewStatus: 'Your review status', confirmingReview: 'Confirming your review…',
  confirmedOnBefore: 'You confirmed receipt of this version on ', sentenceEnd: '.',
  informational: 'Informational update', mustConfirm: 'Recipients must review and confirm this version.', dontHaveTo: 'Recipients don’t have to confirm it.',
  confirmReceived: 'Confirm you received this update',
  confirmingRecords: 'Confirming records receipt of this version. It does not indicate agreement or attendance.',
  recordedOn: 'Recorded on ', noConfirmationIsNeeded: '. No confirmation is needed.', noConfirmationNeeded: 'No confirmation needed',
  canMarkThisRead: 'You can mark this update as read to keep your updates organized.', iReviewed: 'I have reviewed this update',
  confirming: 'Confirming…', confirmIRead: 'Confirm I read it', saving: 'Saving…', markRead: 'Mark read',
  confirmationStatus: 'Confirmation status', recipientStatus: 'Recipient status', countConfirmed: (count: number, total: number) => `${count} of ${total} confirmed`,
  acknowledged: 'Acknowledged', notConfirmedYet: 'Not confirmed yet', noRecipientsCurrent: 'No recipients are available in your current view.',
  resultNotConfirmed: 'Result not yet confirmed', unableToConfirm: 'Unable to confirm', couldntCheckUpdate: 'We couldn’t check this update. Try again.',
  tryAgainSentence: 'Try again.', published: (stamp: string) => `Published ${stamp}`, edited: (stamp: string) => `Edited ${stamp}`,
  availableUntilStamp: (stamp: string) => `Available until ${stamp}`, countOf: (count: number, total: number) => `${count} of ${total}`,
  recipients: 'Recipients', notYet: 'Not yet', noRecipients: 'No recipients are available in your view.',
  publishedTo: (n: number) => `Published to ${n} ${n === 1 ? 'person' : 'people'}`, updatePublished: 'Update published',
  confirmedBy: (count: number, total: number) => `Confirmed by ${count} of ${total} so far`,
};

const es: typeof en = {
  date: (date: string) => esDisplayDate(date),
  timeRange: (start: string, end: string) => { const range = formatTimeRange(start, end); return range === 'All day' ? 'Todo el día' : esTimes(range); },
  zone: esZone,
  stamp: (at: string, timeZone: string) => keepWhole(esInstant(at, timeZone, true)),
  short: (at: string, timeZone: string, year: boolean) => keepWhole(esInstant(at, timeZone, year)),
  todaysTeam: 'Equipo de hoy', shiftNote: 'Nota del turno', importantUpdate: 'Aviso importante', announcement: 'Anuncio',
  sessionEnded: 'Tu sesión terminó', signIn: 'Iniciar sesión', signInAgain: 'Iniciar sesión de nuevo', offline: 'Estás sin conexión',
  paused: 'En pausa mientras no estabas', connect: 'Conéctate a internet y vuelve a intentarlo.', checkConnection: 'Revisa tu conexión y vuelve a intentarlo.',
  tryAgain: 'Intentar de nuevo', checkStatus: 'Verificar estado', checking: 'Verificando…', updates: 'Avisos', reviewLatest: 'Revisar lo más reciente',
  checkBeforeRetry: 'Verifica el estado antes de volver a intentarlo.', couldntConfirmCheck: 'No pudimos confirmar el resultado. Verifica el estado antes de volver a intentarlo.',
  editUpdate: 'Editar aviso', edit: 'Editar', mustBeConfirmed: 'Debe confirmarse', confirmingOptional: 'Confirmar es opcional', optional: 'Opcional', message: 'Mensaje', cancel: 'Cancelar',
  publishing: 'Publicando…', publishUpdate: 'Publicar aviso',
  chooseShift: 'Elige un turno publicado vigente.',
  validDateTime: (zone: string) => `Elige una fecha y hora válidas en la ${zone}.`,
  laterThanNow: 'Elige una hora posterior a ahora.',
  enterTitle: 'Escribe un título', titleTooLong: 'Usa 120 caracteres o menos', enterMessage: 'Escribe un mensaje', messageTooLong: 'Usa 2,000 caracteres o menos',
  plainTextScope: 'Usa texto simple y elige una localidad y quién lo recibe.',
  audienceDenied: 'No pudimos verificar quién lo recibe. Puede que no tengas acceso a esta localidad.',
  audienceRetry: 'No pudimos verificar quién lo recibe. Inténtalo de nuevo.',
  signInToContinue: 'Inicia sesión de nuevo para continuar.', publicationUnavailable: 'No se puede publicar',
  noPermission: 'Tu permiso actual no te deja publicar.', returnToUpdates: 'Volver a avisos',
  audiencePreview: 'Vista previa de destinatarios', audiencePreviewSr: (n: number) => `Vista previa de destinatarios: ${n} `,
  peopleAt: (n: number, location: string) => `${n === 1 ? 'persona' : 'personas'} en ${location}`,
  everyoneToday: (day: string) => `Todo el equipo de hoy · ${day}`,
  noEligible: 'Nadie en este grupo puede recibirlo. Puedes cambiar el envío antes de publicar.',
  onTheirPhone: 'En su teléfono', yourTitle: 'Tu título', yourMessage: 'Tu mensaje', now: 'ahora', inTheApp: 'En la aplicación',
  checkedAgain: 'Al publicar, se vuelve a verificar quién puede recibirlo. Si cambias algún campo, necesitas otra vista previa.',
  checkingAudience: 'Verificando destinatarios…', previewAudience: 'Ver destinatarios',
  nothingPublished: 'No se publica nada hasta que revises los destinatarios y elijas Publicar.',
  newUpdate: 'Aviso nuevo', messageTodaysTeam: 'Escribir al equipo de hoy', titleSr: 'Título: ', title: 'Título',
  whatToKnow: '¿Qué necesita saber tu equipo?', plainTextKept: 'Texto simple · con saltos de línea', whoGetsIt: 'Quién lo recibe',
  todaysTeamAt: (label: string) => `Equipo de hoy · ${label}`, peopleWorking: (day: string) => `Personas que trabajan el ${day}`,
  basedOnAssignments: 'Según las asignaciones publicadas actuales, incluidos los turnos nocturnos.',
  setExpiration: 'Poner fecha de vencimiento', staysAvailable: 'Sigue disponible hasta que lo retires.',
  availableUntilZone: (zone: string) => `Disponible hasta (${zone})`,
  charactersOf: (n: number, max: string) => `${n} de ${max} caracteres`, titleExample: 'p. ej., Horario de días feriados',
  plainTextSr: 'Texto simple. Se mantienen los saltos de línea.',
  newVersionNote: 'Al publicar, se crea una versión nueva. Las confirmaciones anteriores se quedan con la versión que la gente revisó.',
  delivery: 'Envío', type: 'Tipo', whoReceives: 'Quién lo recibe', everyoneAtLocation: 'Todos en la localidad', onePublishedShift: 'Un turno publicado',
  sendTo: 'Enviar a', teamHint: 'Personas con un turno publicado hoy, incluidos los nocturnos.', shift: 'Turno', choosePublishedShift: 'Elige un turno publicado',
  askToConfirm: 'Pedir que confirmen', eachConfirms: 'Cada persona confirma esta versión.', canMarkRead: 'Pueden marcarlo como leído.',
  expires: 'Vence', never: 'Nunca', expiryHint: (zone: string) => `Usa la ${zone}. Si lo dejas vacío, no vence.`, next: 'Siguiente',
  reviewFeedback: 'Resultado de la revisión del aviso', reviewLatestInfo: 'Revisa la información más reciente',
  newerVersion: 'Hay una versión más nueva. Tu borrador guardado es de la versión que revisaste primero. Revisa la más reciente antes de volver a editar.',
  changedAudience: 'Este aviso o sus destinatarios cambiaron. Revisa lo más reciente y vuelve a ver la vista previa.',
  couldntConfirmResult: 'No pudimos confirmar el resultado', couldNotConfirm: 'No pudimos confirmar el resultado. Verifica el estado antes de volver a intentarlo.',
  reviewSr: 'Revisión: ', expiresOn: (date: string) => `Vence ${date}`, neverExpires: 'No vence',
  goesTo: (n: number) => `Para ${n} ${n === 1 ? 'persona' : 'personas'}`, at: (location: string) => `En ${location}`,
  noOneYet: 'Ahora no hay nadie en este grupo. Edita el aviso para cambiar quién lo recibe. ', listChecked: 'La lista se verifica otra vez al publicar.',
  back: 'Atrás', publishNewVersion: 'Publicar versión nueva', reviewBeforePublishing: 'Revisa antes de publicar',
  checkEligible: 'Verifica quién puede recibir tu aviso antes de publicarlo.', confirmingPublication: 'Confirmando la publicación…',
  needsStatusCheck: 'Verifica el estado de la publicación', retryOriginal: 'Reintentar la publicación original',
  loadingForm: 'Cargando el formulario', couldntLoadForm: 'No pudimos cargar el formulario', keepWritingSignIn: 'Inicia sesión de nuevo para seguir escribiendo.',
  keepWritingReturn: 'Vuelve a esta página para seguir escribiendo.', gettingLocations: 'Buscando tus localidades y el equipo de hoy…',
  teamUpdatesNew: 'Avisos del equipo · nuevo', messageLine1: 'Escribir al', messageLine2: 'equipo de hoy', writeOnce: 'Escríbelo una vez. Todos los que trabajan hoy lo ven.',
  step: (step: 1 | 2) => `Paso ${step} de 2 · ${step === 1 ? 'Escribir' : 'Revisar'}`,
  ackRequired: 'Con­fir­ma­ción obligatoria',
  accessChanged: 'Tu acceso cambió', updateChanged: 'Este aviso cambió', updateWithdrawn: 'Aviso retirado', loadingUpdate: 'Cargando el aviso…',
  couldntLoadUpdate: 'No pudimos cargar este aviso', checkAccess: 'Inicia sesión de nuevo para verificar tu acceso actual.',
  seeCurrent: 'Vuelve a esta página para ver el aviso actual.', noLongerAccess: 'Ya no tienes acceso a este aviso. Actualiza para verificar.',
  reviewBeforeConfirming: 'Revisa la versión más reciente antes de confirmarla.', noLongerAvailable: 'Este aviso ya no está disponible.',
  notAllowed: 'Tu permiso actual no te deja ver este aviso. Inicia sesión para verificar tu acceso.',
  gettingLatest: 'Buscando la versión más reciente y el estado de tu revisión.', allUpdates: 'Todos los avisos', update: 'Aviso', loadingUpdateAria: 'Cargando el aviso',
  sentTo: (n: number) => `Enviado a ${n} ${n === 1 ? 'destinatario' : 'destinatarios'}. Que se entregue no confirma que se leyó.`,
  withdrawFor: (n: number) => `¿Retirar este aviso para ${n} ${n === 1 ? 'persona' : 'personas'}? Ya no lo verán.`,
  withdrawAsk: '¿Retirar este aviso? Ya nadie lo verá.', withdrawing: 'Retirando…', withdrawUpdate: 'Retirar aviso',
  keepUpdate: 'Mantener aviso', withdraw: 'Retirar', updateContent: 'Contenido del aviso', confirmed: 'Confirmado', markedRead: 'Marcado como leído',
  forYourInformation: 'Para tu información', editedVersion: 'Versión editada · ', availableUntil: 'Disponible hasta ',
  yourReviewStatus: 'Estado de tu revisión', confirmingReview: 'Confirmando tu revisión…',
  confirmedOnBefore: 'Confirmaste que recibiste esta versión el ', sentenceEnd: '.',
  informational: 'Aviso informativo', mustConfirm: 'Los destinatarios deben revisar y confirmar esta versión.', dontHaveTo: 'Los destinatarios no tienen que confirmarlo.',
  confirmReceived: 'Confirma que recibiste este aviso',
  confirmingRecords: 'Al confirmar, queda registrado que recibiste esta versión. No indica que estés de acuerdo ni que asistirás.',
  recordedOn: 'Registrado el ', noConfirmationIsNeeded: '. No hace falta confirmar.', noConfirmationNeeded: 'No hace falta confirmar',
  canMarkThisRead: 'Puedes marcar este aviso como leído para tener tus avisos en orden.', iReviewed: 'Revisé este aviso',
  confirming: 'Confirmando…', confirmIRead: 'Confirmar que lo leí', saving: 'Guardando…', markRead: 'Marcar como leído',
  confirmationStatus: 'Estado de confirmación', recipientStatus: 'Estado de los destinatarios', countConfirmed: (count: number, total: number) => `${count} de ${total} confirmaron`,
  acknowledged: 'Confirmado', notConfirmedYet: 'Aún sin confirmar', noRecipientsCurrent: 'No hay destinatarios disponibles en tu vista actual.',
  resultNotConfirmed: 'Resultado aún sin confirmar', unableToConfirm: 'No pudimos confirmar', couldntCheckUpdate: 'No pudimos verificar este aviso. Inténtalo de nuevo.',
  tryAgainSentence: 'Inténtalo de nuevo.', published: (stamp: string) => `Publicado ${stamp}`, edited: (stamp: string) => `Editado ${stamp}`,
  availableUntilStamp: (stamp: string) => `Disponible hasta ${stamp}`, countOf: (count: number, total: number) => `${count} de ${total}`,
  recipients: 'Destinatarios', notYet: 'Aún no', noRecipients: 'No hay destinatarios disponibles en tu vista.',
  publishedTo: (n: number) => `Publicado para ${n} ${n === 1 ? 'persona' : 'personas'}`, updatePublished: 'Aviso publicado',
  confirmedBy: (count: number, total: number) => `Confirmado por ${count} de ${total} hasta ahora`,
};

export const COMMUNICATION_COPY: Record<CommunicationLang, typeof en> = { en, es };
export const communicationCopy = (lang: CommunicationLang = 'en') => COMMUNICATION_COPY[lang];
