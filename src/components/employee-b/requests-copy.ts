/* Signed-in Spanish (Nov 23, 2026): the words on the Employee Requests tab, Time off, and Pick up and swap (requests-b,
 * timeoff-b, exchange-b), in English and Puerto Rico Spanish (docs/design/voice.md: tú, the glossary: "Días libres",
 * "solicitud de días libres", "No puedo trabajar", "Turno disponible", "Cambios de turno"). English is the approved text,
 * unchanged. The screens read `requestsCopy(lang)` with the person's language from usePortalLang(). */
import {esDate, type FormatLang} from './es-format';

export type RequestsLang = FormatLang;

const en = {
  // Shared pieces
  signIn: 'Sign in', tryAgain: 'Try again', refresh: 'Refresh', review: 'Review',
  noOpenShiftsNow: 'No open shifts right now', noOpenShiftsSub: 'When a teammate offers a shift you can work, it shows here.',
  getAlerts: 'Get alerts on this device',
  // Requests (the tab)
  requests: 'Requests', requestTimeOff: 'Request time off', atAGlance: 'Your requests at a glance',
  waiting: 'Waiting', waitingMeta: 'on your manager or a teammate', needsYourAnswer: 'Needs your answer',
  answerMeta: (n: number): string => n === 1 ? 'a swap from a teammate' : 'swaps from teammates',
  swapsForYou: 'Swaps for you', waitingForManager: 'Waiting for your manager',
  nothingWaiting: 'Nothing waiting right now', nothingWaitingSub: 'Requests you send show here until they’re decided.',
  decided: 'Decided', seeAll: 'See all', seeAllDecided: 'See all decided requests',
  shiftRequests: 'Shift requests', pickUpAndSwap: 'Pick up and swap', pickUpAndSwapSub: 'Open shifts, swaps for you, your requests',
  swapOrGiveAway: 'Swap or give away a shift', chooseOneShift: 'Choose one of your shifts',
  swapsCouldntCheck: 'Swaps for you couldn’t be checked.', openSwapsForYou: 'Open swaps for you',
  swapsNeedAnswer: (n: number) => `${n} swaps need your answer`,
  reviewSwap: 'Review the swap request', reviewSwaps: 'Review swap requests',
  // Pick up and swap tabs
  openShifts: 'Open shifts', openTab: 'Open shifts', forYou: 'For you', myRequests: 'My requests', schedule: 'Schedule',
  // The phone's first frame
  swapShift: 'Swap shift', offerForCover: 'Offer for cover', cantWorkThisShift: 'Can’t work this shift',
  hubSub: 'Time off and shift changes you’ve sent', requestDetails: 'Request details', cancel: 'Cancel',
  // Time off
  timeOff: 'Time off', timeOffRequests: 'Time-off requests', allDay: 'All day', days: (n: number) => `${n} days`,
  noTimeOffInNevora: 'Your workplace doesn’t use time off in NEVORA.',
  earlierSubmission: 'An earlier time-off submission still needs to be checked.', returnToSubmission: 'Return to my submission',
  decidedRequests: 'Decided requests', waitingRequests: 'Waiting requests', noDecisionsYet: 'No decisions yet',
  decidedEmptySub: 'Approved, declined and withdrawn requests will appear here.', waitingEmptySub: 'When you send a request, you can follow its status here.',
  requestNotAvailable: 'This request isn’t available to your current account.', backToTimeOff: 'Back to Time off',
  timeOffPaused: 'Time off is paused. Come back to this page or reconnect to refresh.', accessChanged: 'Your access changed. Sign in again to continue.',
  loadingTimeOff: 'Loading your time off…', timeOffDidntLoad: 'Your time off didn’t load.',
  sent: (day: string) => `Sent ${day}`, partOfDay: 'Part of day',
  waitingForYourManager: 'Waiting for your manager', youWithdrewIt: 'You withdrew it', managerDecides: 'Your manager decides on this request',
  approvedBy: (name: string) => `Approved by ${name}`, declinedBy: (name: string) => `Declined by ${name}`, decidedBy: (name: string) => `Decided by ${name}`,
  // Pick up and swap: Open shifts
  ends: (day: string) => `ends ${day}`, nextWeek: 'Next week',
  noShiftPickup: 'Your workplace doesn’t use shift pickup in NEVORA.', openShiftsCouldntCheck: 'Open shifts couldn’t be checked.',
  youCanPickUp: 'You can pick up', stillChecking: 'We’re still checking whether you can take some shifts. Refresh to try again.',
  couldntCheckThese: 'We couldn’t check these shifts', seeEveryPosted: 'See every posted shift', pickupResult: 'Your pickup result',
  // For you and My requests
  withTeammate: 'With teammate', shiftRequestsOff: 'Shift requests are turned off for your company.',
  incomingCouldntCheck: 'Incoming swaps couldn’t be checked. Refresh to try again.', activityCouldntCheck: 'Your request activity couldn’t be checked. Refresh to try again.',
  noSwapsNeedAnswer: 'No swaps need your answer', noSwapsSub: 'A request addressed to you will appear here.',
  recentActivity: 'Recent activity', noRecentRequests: 'No recent shift requests', noRecentSub: 'Start a swap or cover offer from your own schedule.',
  // A request's page
  detailsUnavailable: 'Recorded shift details are unavailable.', shiftLead: 'Shift lead',
  endsAt: (day: string, time: string) => `Ends ${day} at ${time}.`, endsDay: (day: string) => `Ends ${day}`,
  offered: 'Offered', requested: 'Requested', backToList: 'Back to the list',
  currentStatus: 'Current request status', withName: (name: string) => `With ${name}`, fromName: (name: string) => `From ${name}`,
  submitted: (when: string) => `Submitted ${when}`,
  yourCurrentShift: 'Your current shift', youWouldWork: 'You would work', offeredShift: 'Offered shift', reportedShift: 'Reported shift',
  offeredCoverage: 'Offered coverage', requestedShift: 'Requested shift', reportedReason: 'Your reported reason', yourResponse: 'Your response',
  historyCouldntCheck: 'Request history couldn’t be checked. Refresh to try again.', recordedHistory: 'Recorded request history',
  requestHistory: 'Request history', noHistory: 'No recorded history is available for this request.',
  requestNotAvailableReturn: 'This request isn’t available to your current account. Return to your requests to see what is available.',
  /** Chip words that reach these screens from the shared request helpers, in English. */
  pills: {
    Waiting: 'Waiting', Approved: 'Approved', Declined: 'Declined', Withdrawn: 'Withdrawn', 'Open to check': 'Open to check',
    'Waiting on teammate': 'Waiting on teammate', 'With teammate': 'With teammate', 'Waiting for cover': 'Waiting for cover',
    Completed: 'Completed', Recorded: 'Recorded', Cancelled: 'Cancelled', Expired: 'Expired', 'Needs your answer': 'Needs your answer', Decided: 'Decided',
  } as Record<string, string>,
};

const es: typeof en = {
  signIn: 'Iniciar sesión', tryAgain: 'Intentar de nuevo', refresh: 'Actualizar', review: 'Revisar',
  noOpenShiftsNow: 'No hay turnos disponibles ahora', noOpenShiftsSub: 'Cuando un compañero ofrezca un turno que puedes trabajar, aparecerá aquí.',
  getAlerts: 'Recibir alertas en este dispositivo',
  requests: 'Solicitudes', requestTimeOff: 'Pedir días libres', atAGlance: 'Tus solicitudes de un vistazo',
  waiting: 'En espera', waitingMeta: 'de tu gerente o un compañero', needsYourAnswer: 'Por responder',
  answerMeta: (n: number) => n === 1 ? 'un cambio de un compañero' : 'cambios de compañeros',
  swapsForYou: 'Cambios para ti', waitingForManager: 'En espera de tu gerente',
  nothingWaiting: 'Nada en espera ahora', nothingWaitingSub: 'Las solicitudes que envíes aparecen aquí hasta que se decidan.',
  decided: 'Decididas', seeAll: 'Ver todas', seeAllDecided: 'Ver todas las solicitudes decididas',
  shiftRequests: 'Cambios de turno', pickUpAndSwap: 'Tomar y cambiar turnos', pickUpAndSwapSub: 'Turnos disponibles, cambios para ti, tus solicitudes',
  swapOrGiveAway: 'Cambiar o ceder un turno', chooseOneShift: 'Elige uno de tus turnos',
  swapsCouldntCheck: 'No pudimos verificar los cambios para ti.', openSwapsForYou: 'Abrir cambios para ti',
  swapsNeedAnswer: (n: number) => `${n} cambios necesitan tu respuesta`,
  reviewSwap: 'Revisar la solicitud de cambio', reviewSwaps: 'Revisar solicitudes de cambio',
  openShifts: 'Turnos disponibles', openTab: 'Disponibles', forYou: 'Para ti', myRequests: 'Mis solicitudes', schedule: 'Horario',
  swapShift: 'Cambiar turno', offerForCover: 'Ofrecer para cubrir', cantWorkThisShift: 'No puedo trabajar este turno',
  hubSub: 'Días libres y cambios de turno que enviaste', requestDetails: 'Detalles de la solicitud', cancel: 'Cancelar',
  timeOff: 'Días libres', timeOffRequests: 'Solicitudes de días libres', allDay: 'Todo el día', days: (n: number) => `${n} días`,
  noTimeOffInNevora: 'Tu trabajo no usa días libres en NEVORA.',
  earlierSubmission: 'Todavía hay que verificar una solicitud de días libres anterior.', returnToSubmission: 'Volver a mi solicitud',
  decidedRequests: 'Solicitudes decididas', waitingRequests: 'Solicitudes en espera', noDecisionsYet: 'Todavía no hay decisiones',
  decidedEmptySub: 'Las solicitudes aprobadas, rechazadas y retiradas aparecerán aquí.', waitingEmptySub: 'Cuando envíes una solicitud, puedes seguir su estado aquí.',
  requestNotAvailable: 'Esta solicitud no está disponible para tu cuenta actual.', backToTimeOff: 'Volver a Días libres',
  timeOffPaused: 'Días libres está en pausa. Vuelve a esta página o reconéctate para actualizar.', accessChanged: 'Tu acceso cambió. Inicia sesión otra vez para continuar.',
  loadingTimeOff: 'Cargando tus días libres…', timeOffDidntLoad: 'No pudimos cargar tus días libres.',
  sent: (day: string) => `Enviada ${day}`, partOfDay: 'Parte del día',
  waitingForYourManager: 'En espera de tu gerente', youWithdrewIt: 'La retiraste', managerDecides: 'Tu gerente decide esta solicitud',
  approvedBy: (name: string) => `Aprobada por ${name}`, declinedBy: (name: string) => `Rechazada por ${name}`, decidedBy: (name: string) => `Decidida por ${name}`,
  ends: (day: string) => `termina ${day}`, nextWeek: 'Próxima semana',
  noShiftPickup: 'Tu trabajo no usa la opción de tomar turnos en NEVORA.', openShiftsCouldntCheck: 'No pudimos verificar los turnos disponibles.',
  youCanPickUp: 'Puedes tomar', stillChecking: 'Todavía estamos verificando si puedes tomar algunos turnos. Actualiza para intentarlo de nuevo.',
  couldntCheckThese: 'No pudimos verificar estos turnos', seeEveryPosted: 'Ver todos los turnos publicados', pickupResult: 'Resultado de tu solicitud de turno',
  withTeammate: 'Con compañero', shiftRequestsOff: 'Los cambios de turno están desactivados en tu empresa.',
  incomingCouldntCheck: 'No pudimos verificar los cambios que te enviaron. Actualiza para intentarlo de nuevo.', activityCouldntCheck: 'No pudimos verificar la actividad de tus solicitudes. Actualiza para intentarlo de nuevo.',
  noSwapsNeedAnswer: 'Ningún cambio necesita tu respuesta', noSwapsSub: 'Una solicitud dirigida a ti aparecerá aquí.',
  recentActivity: 'Actividad reciente', noRecentRequests: 'No hay cambios de turno recientes', noRecentSub: 'Empieza un cambio o una oferta para cubrir desde tu propio horario.',
  detailsUnavailable: 'Los detalles registrados del turno no están disponibles.', shiftLead: 'Líder de turno',
  endsAt: (day: string, time: string) => `Termina ${day} a las ${time}.`, endsDay: (day: string) => `Termina ${day}`,
  offered: 'Ofrecido', requested: 'Pedido', backToList: 'Volver a la lista',
  currentStatus: 'Estado actual de la solicitud', withName: (name: string) => `Con ${name}`, fromName: (name: string) => `De ${name}`,
  submitted: (when: string) => `Enviada ${when}`,
  yourCurrentShift: 'Tu turno actual', youWouldWork: 'Trabajarías', offeredShift: 'Turno ofrecido', reportedShift: 'Turno reportado',
  offeredCoverage: 'Cobertura ofrecida', requestedShift: 'Turno pedido', reportedReason: 'El motivo que diste', yourResponse: 'Tu respuesta',
  historyCouldntCheck: 'No pudimos verificar el historial de la solicitud. Actualiza para intentarlo de nuevo.', recordedHistory: 'Historial registrado de la solicitud',
  requestHistory: 'Historial de la solicitud', noHistory: 'No hay historial registrado para esta solicitud.',
  requestNotAvailableReturn: 'Esta solicitud no está disponible para tu cuenta actual. Vuelve a tus solicitudes para ver lo que está disponible.',
  pills: {
    Waiting: 'En espera', Approved: 'Aprobada', Declined: 'Rechazada', Withdrawn: 'Retirada', 'Open to check': 'Por verificar',
    'Waiting on teammate': 'En espera de compañero', 'With teammate': 'Con compañero', 'Waiting for cover': 'Buscando cobertura',
    Completed: 'Completada', Recorded: 'Registrada', Cancelled: 'Cancelada', Expired: 'Vencida', 'Needs your answer': 'Por responder', Decided: 'Decidida',
  },
};

export const REQUESTS_COPY: Record<RequestsLang, typeof en> = {en, es};
export type RequestsCopy = typeof en;
export const requestsCopy = (lang: RequestsLang = 'en'): RequestsCopy => REQUESTS_COPY[lang];

/** A chip's words in the person's language (unknown words pass through). */
export const pillIn = (text: string, lang: RequestsLang = 'en') => lang === 'es' ? REQUESTS_COPY.es.pills[text] ?? text : text;

/** A formatted English date, time or range from a shared helper, in the person's language ("Thu – Sat · All day · 3 days"
 * → "jue – sáb · Todo el día · 3 días"; "Part of day · 9:00 AM – 12:00 PM" → "Parte del día · 9:00 a. m. – 12:00 p. m."). */
export function spanIn(text: string, lang: RequestsLang = 'en') {
  if (lang !== 'es') return text;
  return esDate(text, lang).replace(/\bAll day\b/g, es.allDay).replace(/\bPart of day\b/g, es.partOfDay).replace(/\b(\d+) days\b/g, (_m, n: string) => es.days(Number(n)))
    .replace(/(\d{1,2} \w{3}),? at (\d)/g, '$1 a las $2');
}
