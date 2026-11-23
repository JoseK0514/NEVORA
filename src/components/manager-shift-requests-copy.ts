/* Signed-in Spanish (Nov 23, 2026): the words of the Owner/Manager Shift requests page (manager-shift-requests.tsx) in
 * English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, "¿…?", no "¡", lower-case days and months,
 * "6:00 a. m. – 2:00 p. m."; the glossary: "Solicitudes de turno", "Intercambio", "Solicitud de reemplazo", "No puedo
 * trabajar", "localidad"). The English is the text the page already said, moved here unchanged. Lines another table
 * already has (the can't-work reasons, request history, Decline and Approve) come from that table. */
import { formatTimeRange } from '@/lib/date-utils';
import { esTimes } from './copy-receipt-copy';
import { exchangeCopy, exchangeDay } from '@/app/app/exchange/exchange-copy';
import { reviewCopy, type ReviewCopy } from './review-details/copy';
import { shiftCopy } from './shift-copy';

export type ShiftRequestsLang = 'en' | 'es';

/** "Tue, Nov 17" / "mar, 17 nov"; the year only when it is not this one (OW-003). */
function enDay(date: string, year: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...(date.slice(0, 4) === year ? {} : { year: 'numeric' as const }), timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}
const esDay = (date: string, year: string) => `${exchangeDay(date, 'es')}${date.slice(0, 4) === year ? '' : ` ${date.slice(0, 4)}`}`;
/** "8:00 AM – 4:00 PM" / "8:00 a. m. – 4:00 p. m."; 00:00 to 24:00 is "All day" / "Todo el día". */
const esHours = (start: string, end: string) => { const text = formatTimeRange(start, end); return text === 'All day' ? 'Todo el día' : esTimes(text); };

const ES_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** A history step's moment in the company's zone: "Nov 23, 8:28 AM" / "23 nov, 8:28 a. m.". A value it can't read is shown as it came. */
function enAt(iso: string, timeZone: string) {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date) : iso;
}
function esAt(iso: string, timeZone: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return iso;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.day} ${ES_MONTHS[Number(parts.month) - 1]}, ${parts.hour}:${parts.minute} ${String(parts.dayPeriod).toUpperCase() === 'PM' ? 'p.\u00a0m.' : 'a.\u00a0m.'}`;
}

/** The status words of a decided request ("Declined"; an unknown code in title case, as before). */
function enStatus(status: string) {
  if (status === 'DENIED') return 'Declined';
  if (status === 'APPROVED') return 'Approved';
  if (status === 'CANCELLED') return 'Withdrawn';
  return status.toLowerCase().replaceAll('_', ' ').replace(/^./, first => first.toUpperCase());
}
/** A history step from the server's event ("completed"); one it doesn't know is shown as it came, capitalized. */
const capital = (text: string) => text[0].toUpperCase() + text.slice(1);
const ES_EVENTS: Record<string, string> = {
  'legacy imported': 'Importada', created: 'Creada', consent: 'Aceptada', completed: 'Completada', declined: 'Rechazada',
  cancelled: 'Retirada', expired: 'Vencida', escalated: 'Enviada a un gerente', stale: 'Desactualizada',
};

const en = {
  back: 'Things to do',
  title: 'Shift requests',
  sections: 'Shift request sections',
  tabs: { pending: 'Waiting', coverage: 'Open cover', activity: 'Done' },
  waitingCount: (n: number) => `Waiting (${n})`,
  errors: {
    EXCHANGE_CHANGED: 'The schedule changed before you decided. Check the request again.',
    SHIFT_OVERLAP: 'It would give someone two shifts at the same time.',
    APPROVED_TIME_OFF: 'It runs into approved time off.',
    OUTSIDE_AVAILABILITY: 'It’s outside the person’s availability.',
    LOCATION_NOT_ELIGIBLE: 'The person can’t work at that location.',
    EMPLOYEE_INACTIVE: 'Someone on this request is inactive.',
    CALLOUT_EXISTS: 'This shift already has a can’t-work request.',
  } as Record<string, string>,
  errorFallback: 'The request may have changed. Check it and decide again.',
  // The kind of request beside the name, and who else is on it.
  swap: 'Swap',
  cantWork: 'Can’t work',
  withName: (name: string) => `With ${name}`,
  // What opens under a request.
  shiftOf: (name: string) => `${name}’${name.endsWith('s') ? '' : 's'} shift`,
  position: (id: string) => `Position ${id}`,
  shiftLead: 'Shift lead',
  endsOn: (day: string) => `ends ${day}`,
  endsDay: (day: string) => `Ends ${day}`,
  tradesBoth: 'Approving trades these two shifts.',
  otherShiftGone: 'The other shift isn’t available right now. Reload to see the latest.',
  givesShift: 'Approving gives this shift to the person who picked it up.',
  closingStops: (name: string) => `Closing stops anyone else from picking it up. The shift stays with ${name}.`,
  reason: 'Reason',
  note: 'Note',
  calloutHelp: 'Approving takes the shift off their schedule. It will still need someone to cover it.',
  earlierVersion: 'This approval was for an earlier version of the shift. Check who is assigned now.',
  // Screen-reader hints on a row.
  showBoth: 'Show both shifts',
  showShift: 'Show the shift',
  showHistory: 'Show the history',
  // Request history.
  modes: { MANAGER: 'by a manager', MANAGER_REVIEW: 'by a manager', AUTOMATIC: 'automatically', AUTOMATIC_WHEN_VALID: 'automatically' } as Record<string, string>,
  step: (event: string) => event ? capital(event) : 'Changed',
  historyShift: (shift: string) => `Shift: ${shift}`,
  historyOther: (shift: string) => `Other shift: ${shift}`,
  // Decline and Approve: what each names for a screen reader, and the question before a Decline.
  publishChanges: 'Publish changes',
  exchangeWhat: (swap: boolean, name: string) => `${swap ? 'swap' : 'coverage'} request from ${name}`,
  calloutWhat: (name: string) => `the report from ${name}`,
  declineWhat: (what: string) => `Decline ${what}`,
  approveWhat: (what: string) => `Approve ${what}`,
  askWhat: (what: string) => `Decline the ${what}?`,
  keepWhat: (what: string) => `Keep the ${what}`,
  goWhat: (what: string) => `Decline the ${what}`,
  calloutAsk: (name: string) => `Decline the call-out from ${name}?`,
  calloutKeep: (name: string) => `Keep the call-out from ${name}`,
  calloutGo: (name: string) => `Decline the call-out from ${name}`,
  // Close request on Open cover.
  closing: 'Closing…',
  closeLabel: (name: string) => `Close the coverage request from ${name}. The shift stays with them.`,
  closeAsk: (name: string) => `Close the coverage request from ${name}?`,
  closeKeep: (name: string) => `Keep the coverage request from ${name}`,
  closeGo: (name: string) => `Close the coverage request from ${name}`,
  // Cards, empty states and the page that couldn't be read.
  unavailableTitle: 'Team shift requests unavailable',
  waitingCard: 'Waiting shift requests',
  coverageCard: 'Open cover',
  doneCard: 'Done',
  caughtUp: 'You’re all caught up',
  caughtUpLine: 'New shift requests show up here.',
  noCover: 'No open cover',
  noCoverLine: 'Cover requests nobody has picked up show up here.',
  nothingDecided: 'Nothing decided yet',
  nothingDecidedLine: 'Requests you approve or decline show up here.',
  // Formats.
  status: enStatus,
  day: enDay,
  hours: (start: string, end: string) => formatTimeRange(start, end),
  at: enAt,
  /** "5 min ago", as agoLabel writes it. */
  ago: (text: string) => text,
  // Lines other tables already have, in the same language.
  reasons: exchangeCopy('en').calloutReasons,
  checkFailed: exchangeCopy('en').checkFailed,
  requestChanged: exchangeCopy('en').requestChanged,
  history: { title: shiftCopy('en').history.title, unavailable: shiftCopy('en').history.unavailable },
  review: reviewCopy('en') as ReviewCopy,
};

export type ShiftRequestsCopy = typeof en;

/* The Spanish review lines this page shows, in this page's glossary (tú, "Intercambio", "reemplazo", "La tomó"); the
 * rest of review-details/copy.ts's Spanish is used as it is. */
const review: ReviewCopy = {
  ...reviewCopy('es'),
  coverRequest: 'Reemplazo',
  pickedUpBy: name => `La tomó ${name}`,
  pickedUp: 'Alguien la tomó. La persona no se muestra aquí.',
  nobodyYet: 'Nadie la ha tomado todavía',
  otherShiftMissing: 'El otro turno no se muestra aquí. Abre la solicitud para verlo.',
  coverHistory: 'Reemplazo, según el registro',
  coverNotRequested: 'No se pidió reemplazo',
  coverPending: 'Se pidió reemplazo. Todavía no hay nadie confirmado.',
  coverClosed: 'La solicitud de reemplazo se cerró sin que nadie tomara el turno',
  swapApproved: 'Intercambio aprobado',
  swapApprovedLine: 'El horario ya muestra el intercambio.',
  swapDeclined: 'Intercambio rechazado',
  coverApproved: 'Reemplazo aprobado',
  coverDeclined: 'Reemplazo rechazado',
  askDeclineSwap: '¿Rechazar este intercambio?',
  askDeclineCover: '¿Rechazar esta solicitud de reemplazo?',
  askCloseCover: '¿Cerrar esta solicitud de reemplazo?',
};

const es: ShiftRequestsCopy = {
  back: 'Pendientes',
  title: 'Solicitudes de turno',
  sections: 'Secciones de solicitudes de turno',
  tabs: { pending: 'En espera', coverage: 'Por cubrir', activity: 'Terminadas' },
  waitingCount: n => `En espera (${n})`,
  errors: {
    EXCHANGE_CHANGED: 'El horario cambió antes de que decidieras. Revisa la solicitud otra vez.',
    SHIFT_OVERLAP: 'Alguien tendría dos turnos a la misma hora.',
    APPROVED_TIME_OFF: 'Choca con días libres aprobados.',
    OUTSIDE_AVAILABILITY: 'Está fuera de la disponibilidad de la persona.',
    LOCATION_NOT_ELIGIBLE: 'La persona no puede trabajar en esa localidad.',
    EMPLOYEE_INACTIVE: 'Alguien en esta solicitud está inactivo.',
    CALLOUT_EXISTS: 'Este turno ya tiene una solicitud de No puedo trabajar.',
  },
  errorFallback: 'Puede que la solicitud haya cambiado. Revísala y decide otra vez.',
  swap: 'Intercambio',
  cantWork: 'No puedo trabajar',
  withName: name => `Con ${name}`,
  shiftOf: name => `Turno de ${name}`,
  position: id => `Puesto ${id}`,
  shiftLead: 'Líder de turno',
  endsOn: day => `termina el ${day}`,
  endsDay: day => `Termina el ${day}`,
  tradesBoth: 'Al aprobar, se intercambian estos dos turnos.',
  otherShiftGone: 'El otro turno no está disponible ahora. Vuelve a cargar para ver lo más reciente.',
  givesShift: 'Al aprobar, el turno pasa a la persona que lo tomó.',
  closingStops: name => `Al cerrarla, nadie más puede tomar el turno. El turno sigue siendo de ${name}.`,
  reason: 'Motivo',
  note: 'Nota',
  calloutHelp: 'Al aprobar, el turno sale de su horario. Todavía necesitará a alguien que lo cubra.',
  earlierVersion: 'Esta aprobación era para una versión anterior del turno. Revisa quién está asignado ahora.',
  showBoth: 'Mostrar ambos turnos',
  showShift: 'Mostrar el turno',
  showHistory: 'Mostrar el historial',
  modes: { MANAGER: 'por un gerente', MANAGER_REVIEW: 'por un gerente', AUTOMATIC: 'automáticamente', AUTOMATIC_WHEN_VALID: 'automáticamente' },
  step: event => event ? ES_EVENTS[event] ?? capital(event) : 'Cambió',
  historyShift: shift => `Turno: ${shift}`,
  historyOther: shift => `Otro turno: ${shift}`,
  publishChanges: 'Publicar cambios',
  exchangeWhat: (swap, name) => `la solicitud de ${swap ? 'intercambio' : 'reemplazo'} de ${name}`,
  calloutWhat: name => `la solicitud de No puedo trabajar de ${name}`,
  declineWhat: what => `Rechazar ${what}`,
  approveWhat: what => `Aprobar ${what}`,
  askWhat: what => `¿Rechazar ${what}?`,
  keepWhat: what => `Conservar ${what}`,
  goWhat: what => `Rechazar ${what}`,
  calloutAsk: name => `¿Rechazar la solicitud de No puedo trabajar de ${name}?`,
  calloutKeep: name => `Conservar la solicitud de No puedo trabajar de ${name}`,
  calloutGo: name => `Rechazar la solicitud de No puedo trabajar de ${name}`,
  closing: 'Cerrando…',
  closeLabel: name => `Cerrar la solicitud de reemplazo de ${name}. El turno sigue siendo suyo.`,
  closeAsk: name => `¿Cerrar la solicitud de reemplazo de ${name}?`,
  closeKeep: name => `Conservar la solicitud de reemplazo de ${name}`,
  closeGo: name => `Cerrar la solicitud de reemplazo de ${name}`,
  unavailableTitle: 'Las solicitudes de turno del equipo no están disponibles',
  waitingCard: 'Solicitudes de turno en espera',
  coverageCard: 'Por cubrir',
  doneCard: 'Terminadas',
  caughtUp: 'Estás al día',
  caughtUpLine: 'Aquí aparecen las nuevas solicitudes de turno.',
  noCover: 'No hay turnos por cubrir',
  noCoverLine: 'Aquí aparecen las solicitudes de reemplazo que nadie ha tomado.',
  nothingDecided: 'Nada decidido todavía',
  nothingDecidedLine: 'Aquí aparecen las solicitudes que apruebas o rechazas.',
  status: status => exchangeCopy('es').status(status),
  day: esDay,
  hours: esHours,
  at: esAt,
  ago: text => text === 'Just now' ? 'Ahora mismo' : text.replace(/^(\d+) (min|h|d) ago$/, 'hace $1 $2'),
  reasons: exchangeCopy('es').calloutReasons,
  checkFailed: exchangeCopy('es').checkFailed,
  requestChanged: exchangeCopy('es').requestChanged,
  history: { title: shiftCopy('es').history.title, unavailable: shiftCopy('es').history.unavailable },
  review,
};

export const SHIFT_REQUESTS_COPY: Record<ShiftRequestsLang, ShiftRequestsCopy> = { en, es };
export const shiftRequestsCopy = (lang: ShiftRequestsLang = 'en'): ShiftRequestsCopy => SHIFT_REQUESTS_COPY[lang];
