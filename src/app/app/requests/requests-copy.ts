/* Signed-in Spanish (es-rest): the words of Time off (/app/requests), its request sheet and the Requests hub, in English and
 * Puerto Rico Spanish (docs/design/voice.md: tú, "Días libres", buttons in the infinitive). */
const en = {
  // page.tsx:23
  title: 'Time off',
  // page.tsx:71
  requests: 'Requests',
  // page.tsx:55
  sendFailed: 'Your request wasn’t sent. Check that the end date is on or after the start date. A partial day needs one date and an end time after the start time.',
  // page.tsx:56
  submitted: 'Your request was sent for manager review.',
  // page.tsx:56
  reviewed: 'Decision saved.',
  // page.tsx:77
  withdrawRequest: 'Withdraw request',
  // page.tsx:78
  contactManager: 'To change this request, contact your manager.',
  // page.tsx:79
  unavailable: 'This request isn’t available to your current account. Return to Time off to review your requests.',
  // page.tsx:81
  segmentsLabel: 'Time-off requests',
  // page.tsx:82
  waiting: 'Waiting',
  // page.tsx:83
  decided: 'Decided',
  // page.tsx:85
  decidedRequests: 'Decided requests',
  // page.tsx:85
  waitingRequests: 'Waiting requests',
  // page.tsx:88
  noDecisions: 'No decisions yet',
  // page.tsx:88
  nothingWaiting: 'Nothing waiting',
  // page.tsx:88
  decidedEmpty: 'Approved, declined and withdrawn requests will appear here.',
  // page.tsx:88
  waitingEmpty: 'When you send a request, you can follow its status here.',
  // page.tsx:88
  noRequests: 'No time-off requests yet.',
  // page.tsx:90
  requestTimeOff: 'Request time off',
  // The request sheet.
  // time-off-signature.tsx:52
  dateAndTime: 'Date and time',
  // time-off-signature.tsx:46 (SheetCancel default in quiet/quiet-sheet.tsx:162)
  cancel: 'Cancel',
  // time-off-signature.tsx:52
  chooseDates: 'Choose your dates',
  // time-off-signature.tsx:53
  howLong: 'How long',
  // time-off-signature.tsx:54
  allDay: 'All day',
  // time-off-signature.tsx:55
  partOfDay: 'Part of day',
  // time-off-signature.tsx:58
  date: 'Date',
  // time-off-signature.tsx:60
  start: 'Start',
  // time-off-signature.tsx:61
  end: 'End',
  // time-off-signature.tsx:65
  from: 'From',
  // time-off-signature.tsx:66
  to: 'To',
  // time-off-signature.tsx:68
  reasonOptional: 'Reason (optional)',
  // time-off-signature.tsx:71
  endAfterStart: 'End time must be after start time.',
  // time-off-signature.tsx:72
  notSentBefore: 'Your request wasn’t sent. Check your connection and send it again. If this keeps happening, ',
  // time-off-signature.tsx:72
  signInAgain: 'sign in again',
  // time-off-signature.tsx:73
  managerReviews: 'Your manager reviews it. The time is yours once it’s approved.',
  // time-off-signature.tsx:74
  sending: 'Sending…',
  // time-off-signature.tsx:74
  sendRequest: 'Send request',
  // The Requests hub.
  // hub/page.tsx:17
  hubClosedReason: 'This Requests page is for employees',
  // hub/page.tsx:17
  hubClosedHelp: 'Your team’s requests are in Things to do.',
  // hub/page.tsx:17
  openThingsToDo: 'Open Things to do',
  // hub/request-hub.tsx:28
  couldntLoad: 'Couldn’t load your requests',
  // hub/request-hub.tsx:29
  shiftRequests: 'Shift requests',
  // hub/request-hub.tsx:30
  swapsCover: 'Swaps, cover and can’t work',
  // hub/request-hub.tsx:30
  startFromShift: 'Start one from a shift on your schedule',
  // hub/request-hub.tsx:37
  couldntCheck: 'Your time-off requests couldn’t be checked.',
  // hub/request-hub.tsx:38
  openTimeOff: 'Open time off',
};
const es: typeof en = {
  title: 'Días libres',
  requests: 'Solicitudes',
  sendFailed: 'Tu solicitud no se envió. Revisa que la fecha final sea igual o posterior a la inicial. Un día parcial necesita una fecha y una hora final después de la inicial.',
  submitted: 'Tu solicitud se envió a tu gerente para revisión.',
  reviewed: 'Decisión guardada.',
  withdrawRequest: 'Retirar solicitud',
  contactManager: 'Para cambiar esta solicitud, comunícate con tu gerente.',
  unavailable: 'Esta solicitud no está disponible para tu cuenta. Vuelve a Días libres para revisar tus solicitudes.',
  segmentsLabel: 'Solicitudes de días libres',
  waiting: 'En espera',
  decided: 'Decididas',
  decidedRequests: 'Solicitudes decididas',
  waitingRequests: 'Solicitudes en espera',
  noDecisions: 'Aún no hay decisiones',
  nothingWaiting: 'Nada en espera',
  decidedEmpty: 'Aquí aparecerán las solicitudes aprobadas, rechazadas y retiradas.',
  waitingEmpty: 'Cuando envíes una solicitud, puedes seguir su estado aquí.',
  noRequests: 'Aún no hay solicitudes de días libres.',
  requestTimeOff: 'Pedir días libres',
  dateAndTime: 'Fecha y hora',
  cancel: 'Cancelar',
  chooseDates: 'Elige tus fechas',
  howLong: 'Cuánto tiempo',
  allDay: 'Todo el día',
  partOfDay: 'Parte del día',
  date: 'Fecha',
  start: 'Inicio',
  end: 'Fin',
  from: 'Desde',
  to: 'Hasta',
  reasonOptional: 'Motivo (opcional)',
  endAfterStart: 'La hora final tiene que ser después de la inicial.',
  notSentBefore: 'Tu solicitud no se envió. Revisa tu conexión y envíala otra vez. Si sigue pasando, ',
  signInAgain: 'vuelve a iniciar sesión',
  managerReviews: 'Tu gerente la revisa. El tiempo es tuyo cuando se apruebe.',
  sending: 'Enviando…',
  sendRequest: 'Enviar solicitud',
  hubClosedReason: 'Esta página de Solicitudes es para empleados',
  hubClosedHelp: 'Las solicitudes de tu equipo están en Pendientes.',
  openThingsToDo: 'Abrir Pendientes',
  couldntLoad: 'No pudimos cargar tus solicitudes',
  shiftRequests: 'Solicitudes de turnos',
  swapsCover: 'Cambios, cubrir turnos y no puedo trabajar',
  startFromShift: 'Empieza una desde un turno de tu horario',
  couldntCheck: 'No pudimos verificar tus solicitudes de días libres.',
  openTimeOff: 'Abrir días libres',
};
export const REQUESTS_COPY = { en, es };
