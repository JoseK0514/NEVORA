/* Signed-in Spanish (Jose's gap closure, Nov 23, 2026): Requests and Open shifts on the Employee phone (requests.tsx) in
 * English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, infinitive buttons, the glossary: "Días
 * libres", "No puedo trabajar", "Turno disponible", "Tomar", "Intercambio", "gerente", "localidad"). English is the page's
 * words exactly as they were; dates and times come from mobile-format.ts. A request's status pill keeps its English text
 * for the shared kit's logic and is drawn through `pill` (a request is "una solicitud", so its states are feminine). */
import {dateRange} from '@/lib/duration-format';
import {formatTime} from '@/lib/date-utils';
import {LOCALE,displayDateText,timeText} from '../mobile-format';

const en = {
  timeOff: 'Time off',
  cantWork: 'Can’t work',
  shiftRequest: 'Shift request',
  pills: {
    'Waiting': 'Waiting', 'Approved': 'Approved', 'Declined': 'Declined', 'Withdrawn': 'Withdrawn', 'Open to check': 'Open to check',
    'Waiting on teammate': 'Waiting on teammate', 'With teammate': 'With teammate', 'Waiting for cover': 'Waiting for cover',
    'Completed': 'Completed', 'Recorded': 'Recorded', 'Cancelled': 'Cancelled', 'Expired': 'Expired',
  } as Record<string, string>,
  swapsUnchecked: 'Swaps for you couldn’t be checked. ',
  openSwapsForYou: 'Open swaps for you',
  tryAgain: 'Try again',
  needsAnswer: 'Needs your answer',
  swapsNeedAnswer: (count: number) => `${count} swaps need your answer`,
  reviewShifts: 'Review the shifts before responding',
  submitting: 'Submitting…',
  pickUp: 'Pick up',
  pickUpLabel: (day: string, time: string) => `Pick up ${day}, ${time}`,
  checkingOriginal: 'Checking the original request…',
  checkPickup: 'Check pickup status',
  refreshOptions: 'Refresh shift options',
  nextWeek: 'Next week',
  ends: (day: string) => `ends ${day}`,
  loadingRequests: 'Loading requests…',
  checkingRequests: 'Checking your current requests…',
  statusLabel: 'Requests status',
  paused: 'Requests paused. Return to this page or reconnect to refresh.',
  denied: 'Your access changed. Sign in again to continue.',
  failed: 'We couldn’t load your requests.',
  signIn: 'Sign in',
  historyUnchecked: 'Your request history couldn’t be checked.',
  subtitle: (modules: {timeOff: boolean; marketplace: boolean} | null | undefined): string => !modules || modules.timeOff && modules.marketplace ? 'Time off and shift changes you’ve sent' : modules.timeOff ? 'Time off you’ve asked for' : 'Shift changes you’ve sent',
  noteConfirm: 'Your manager confirms before the shift is yours. You’ll get a notification either way.',
  noteRightAway: 'Picking up a shift makes it yours right away if it’s still open and you still meet the rules.',
  noteMixed: 'Some shifts are yours right away; others need your manager to confirm. You’ll get a notification either way.',
  openShifts: 'Open shifts',
  back: 'Schedule',
  postedOpenShifts: 'Posted open shifts',
  pickupResult: 'Your pickup result',
  openUnchecked: 'Open shifts couldn’t be checked.',
  ledeEligible: 'Shifts at your locations you can pick up',
  ledeUnconfirmed: 'Some shifts still need an eligibility check. Refresh to try again.',
  ledeNone: 'No eligible open shifts right now. Check back when more coverage is offered.',
  refresh: 'Refresh',
  couldntCheck: 'We couldn’t check these shifts',
  whyNot: 'Why other shifts aren’t available ',
  pickupOff: 'Shift pickup is turned off for your company.',
};
const es: typeof en = {
  timeOff: 'Días libres',
  cantWork: 'No puedo trabajar',
  shiftRequest: 'Solicitud de turno',
  pills: {
    'Waiting': 'En espera', 'Approved': 'Aprobada', 'Declined': 'Rechazada', 'Withdrawn': 'Retirada', 'Open to check': 'Ábrela para ver',
    'Waiting on teammate': 'Esperando a tu compañero', 'With teammate': 'Con tu compañero', 'Waiting for cover': 'Esperando quien cubra',
    'Completed': 'Completada', 'Recorded': 'Registrada', 'Cancelled': 'Cancelada', 'Expired': 'Vencida',
  },
  swapsUnchecked: 'No pudimos verificar los intercambios para ti. ',
  openSwapsForYou: 'Abrir intercambios para ti',
  tryAgain: 'Intentar de nuevo',
  needsAnswer: 'Necesita tu respuesta',
  swapsNeedAnswer: (count: number) => `${count} intercambios necesitan tu respuesta`,
  reviewShifts: 'Revisa los turnos antes de responder',
  submitting: 'Enviando…',
  pickUp: 'Tomar',
  pickUpLabel: (day: string, time: string) => `Tomar ${day}, ${time}`,
  checkingOriginal: 'Verificando la solicitud original…',
  checkPickup: 'Verificar estado',
  refreshOptions: 'Actualizar opciones de turno',
  nextWeek: 'Próxima semana',
  ends: (day: string) => `termina el ${day}`,
  loadingRequests: 'Cargando solicitudes…',
  checkingRequests: 'Verificando tus solicitudes…',
  statusLabel: 'Estado de las solicitudes',
  paused: 'Solicitudes en pausa. Vuelve a esta página o reconéctate para actualizar.',
  denied: 'Tu acceso cambió. Inicia sesión de nuevo para continuar.',
  failed: 'No pudimos cargar tus solicitudes.',
  signIn: 'Iniciar sesión',
  historyUnchecked: 'No pudimos verificar tu historial de solicitudes.',
  subtitle: (modules: {timeOff: boolean; marketplace: boolean} | null | undefined): string => !modules || modules.timeOff && modules.marketplace ? 'Días libres y cambios de turno que enviaste' : modules.timeOff ? 'Días libres que pediste' : 'Cambios de turno que enviaste',
  noteConfirm: 'Tu gerente confirma antes de que el turno sea tuyo. Recibirás una notificación en ambos casos.',
  noteRightAway: 'Al tomar un turno, es tuyo enseguida si sigue disponible y aún cumples las reglas.',
  noteMixed: 'Algunos turnos son tuyos enseguida; otros necesitan que tu gerente confirme. Recibirás una notificación en ambos casos.',
  openShifts: 'Turnos disponibles',
  back: 'Horario',
  postedOpenShifts: 'Turnos disponibles publicados',
  pickupResult: 'Resultado de tu solicitud',
  openUnchecked: 'No pudimos verificar los turnos disponibles.',
  ledeEligible: 'Turnos en tus localidades que puedes tomar',
  ledeUnconfirmed: 'Falta verificar si puedes tomar algunos turnos. Actualiza para intentarlo de nuevo.',
  ledeNone: 'No hay turnos disponibles para ti ahora. Vuelve a mirar cuando se ofrezcan más.',
  refresh: 'Actualizar',
  couldntCheck: 'No pudimos verificar estos turnos',
  whyNot: 'Por qué otros turnos no están disponibles ',
  pickupOff: 'Tomar turnos está desactivado en tu trabajo.',
};
export const requestsCopy = {en, es};

/** A time-off request's dates and length in Spanish, as timeOffDetail says them in English: "vie, 13 nov · Todo el día",
 * "11–12 nov · 2 días" or "vie, 13 nov · 9:00 a. m. – 1:00 p. m.". */
export function timeOffDetailEs(request: {startDate: string; endDate: string; startTime?: string | null; endTime?: string | null}) {
  const range = request.startDate === request.endDate ? displayDateText(request.startDate, 'es')
    : dateRange(request.startDate, request.endDate, {year: 'never', locale: LOCALE.es});
  const days = Math.round((Date.parse(`${request.endDate}T12:00:00Z`) - Date.parse(`${request.startDate}T12:00:00Z`)) / 86_400_000) + 1;
  const length = request.startTime && request.endTime ? timeText(`${formatTime(request.startTime)} – ${formatTime(request.endTime)}`, 'es') : days === 1 ? 'Todo el día' : `${days} días`;
  return `${range} · ${length}`;
}
