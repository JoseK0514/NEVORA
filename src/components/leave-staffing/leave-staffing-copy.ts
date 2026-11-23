/* Signed-in Spanish (es-rest): the words of the leave and staffing notes (the conflict check before Approve, the schedule's
 * repair note and the page's failure notice) in English and Puerto Rico Spanish (docs/design/voice.md: tú, "Días libres",
 * times "7:00 a. m. – 3:00 p. m.", dates "jue, 12 nov"). The English shift and duration lines are the ones in
 * src/lib/time-off-staffing/present.ts; the Spanish ones are written here from the same facts. */
import type {StaffingConflict} from '@/lib/time-off-staffing/model';
import {conflictConsequence, conflictShift, conflictTotal, dayText, minutesText, rangeText} from '@/lib/time-off-staffing/present';
import {FAILURE_MESSAGES, NOT_ALLOWED_MESSAGE} from '@/lib/http/nevora-failure';
import {esTimes} from '@/components/copy-receipt-copy';

const NBSP = ' ';
const esDay = (date: string) => new Intl.DateTimeFormat('es-PR', {timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short'})
  .format(new Date(`${date}T12:00:00Z`)).replace(/\./g, '');
const esRange = (start: string, end: string) => start === '00:00' && (end === '00:00' || end === '24:00') ? 'Todo el día' : esTimes(rangeText(start, end));
const wholeShift = (item: StaffingConflict) => {
  const [sh, sm] = item.startTime.split(':').map(Number), [eh, em] = item.endTime.split(':').map(Number);
  const start = sh * 60 + sm, end = eh * 60 + em;
  return item.overlapMinutes >= (end > start ? end - start : end + 1440 - start);
};
const possessive = (name: string) => `${name}’${/s$/i.test(name) ? '' : 's'}`;

const en = {
  shift: conflictShift,
  consequence: conflictConsequence,
  total: conflictTotal,
  // The conflict check (a pending request).
  publishedShifts: 'Published shifts',
  tooLong: 'Too long to check here',
  tooLongSub: 'This request spans more than six weeks. Check each week’s schedule before you decide.',
  checking: 'Checking the published schedule…',
  paused: 'Paused while you’re away. It checks again when you come back.',
  expired: 'This check expired',
  expiredSub: 'Check again before you decide.',
  checkAgain: 'Check again',
  accessChanged: 'Your access changed',
  accessChangedSub: 'Reload the page to check this request with your current access.',
  couldntCheck: 'Couldn’t check for shift conflicts',
  couldntCheckSub: 'This doesn’t mean there are none. Try again before you decide.',
  tryAgain: 'Try again',
  noOverlap: 'No published shifts overlap',
  notOnSchedule: (first: string) => `${first} isn’t on the published schedule during this time off.`,
  onScheduleThen: (first: string) => `${first} is on the schedule then`,
  wouldNeed: (total: string) => `${total} would need someone else.`,
  overlapping: 'Overlapping published shifts',
  ifApprove: 'If you approve, the time off is approved and these shifts stay published. Each becomes a shift to fill on the schedule, assigned to you.',
  // The repair note on the schedule.
  repairChecking: 'Checking this repair…',
  repairCheckingSub: 'Reading the approved time off and the published shift.',
  repairPaused: 'Repair check paused',
  repairPausedSub: 'It checks again when you come back.',
  repairExpiredSub: 'Check again to see whether this shift still needs a replacement.',
  repairCouldntCheck: 'Couldn’t check this repair',
  repairDeniedSub: 'Reload the page to see the schedule with your current access.',
  repairFailedSub: 'This doesn’t mean it’s fixed. Try again.',
  repairCleared: 'This shift no longer needs a replacement',
  repairClearedSub: 'A published schedule changed it, or the time off changed. Nothing else to do here.',
  they: 'they',
  fillShift: (person: string) => `Fill ${possessive(person)} shift`,
  overlapsFact: (first: string, item: StaffingConflict) => `${first}’s time off is approved and overlaps this published shift: ${conflictShift(item)} (${minutesText(item.overlapMinutes)}).`,
  assignElse: (first: string) => `Assign someone else or change the shift, then publish. Draft changes don’t clear this; it clears once a published schedule no longer has ${first} on it.`,
  noOneAssigned: 'No one is assigned yet. An Owner can take it.',
  yoursToFill: 'You approved this time off, so this shift is yours to fill.',
  assignedToManager: 'Assigned to the manager who approved the time off.',
  openShift: 'Open the shift',
  // An Employee's own request.
  day: (date: string) => dayText(date),
  range: (start: string, end: string) => rangeText(start, end),
  yourShifts: 'Your shifts during this time off',
  ownExpired: 'This check of your shifts expired.',
  ownCouldntCheck: 'We couldn’t check your scheduled shifts for these dates.',
  approvedTitle: 'Your time off is approved',
  approvedSub: 'You don’t need to come in for these hours.',
  publishedDuring: 'Published shifts during this time off',
  stillOnSchedule: 'Still on the published schedule',
  onPublished: 'On the published schedule',
  managerTakesCare: 'Your manager will take care of these shifts. You don’t need to find cover or swap them.',
  managerWillSee: 'Your manager will see these shifts when they decide. You don’t need to do anything now.',
  // The page's failure notice.
  failures: FAILURE_MESSAGES,
  notAllowed: NOT_ALLOWED_MESSAGE,
  signIn: 'Sign in',
  reload: 'Reload',
  closeMessage: 'Close this message',
  close: 'Close',
};
const es: typeof en = {
  shift: item => [esDay(item.date), esRange(item.startTime, item.endTime), item.locationName].join(' · '),
  consequence: item => wholeShift(item)
    ? `El turno completo (${minutesText(item.overlapMinutes)}) necesitaría a otra persona`
    : `${minutesText(item.overlapMinutes)} de este turno necesitarían a otra persona`,
  total: items => {
    const minutes = items.reduce((sum, item) => sum + item.overlapMinutes, 0);
    return `${minutesText(minutes)} en ${items.length}${NBSP}${items.length === 1 ? 'turno' : 'turnos'}`;
  },
  publishedShifts: 'Turnos publicados',
  tooLong: 'Muy largo para revisarlo aquí',
  tooLongSub: 'Esta solicitud cubre más de seis semanas. Revisa el horario de cada semana antes de decidir.',
  checking: 'Revisando el horario publicado…',
  paused: 'En pausa mientras no estás. Se revisa otra vez cuando vuelvas.',
  expired: 'Esta revisión venció',
  expiredSub: 'Revisa otra vez antes de decidir.',
  checkAgain: 'Revisar otra vez',
  accessChanged: 'Tu acceso cambió',
  accessChangedSub: 'Vuelve a cargar la página para revisar esta solicitud con tu acceso actual.',
  couldntCheck: 'No pudimos revisar si hay turnos en conflicto',
  couldntCheckSub: 'Esto no quiere decir que no haya. Inténtalo de nuevo antes de decidir.',
  tryAgain: 'Intentar de nuevo',
  noOverlap: 'No hay turnos publicados que coincidan',
  notOnSchedule: (first: string) => `${first} no está en el horario publicado durante estos días libres.`,
  onScheduleThen: (first: string) => `${first} está en el horario esos días`,
  wouldNeed: (total: string) => `${total} necesitarían a otra persona.`,
  overlapping: 'Turnos publicados que coinciden',
  ifApprove: 'Si apruebas, los días libres quedan aprobados y estos turnos siguen publicados. Cada uno pasa a ser un turno por cubrir en el horario, asignado a ti.',
  repairChecking: 'Revisando este arreglo…',
  repairCheckingSub: 'Leyendo los días libres aprobados y el turno publicado.',
  repairPaused: 'Revisión del arreglo en pausa',
  repairPausedSub: 'Se revisa otra vez cuando vuelvas.',
  repairExpiredSub: 'Revisa otra vez para ver si este turno todavía necesita a otra persona.',
  repairCouldntCheck: 'No pudimos revisar este arreglo',
  repairDeniedSub: 'Vuelve a cargar la página para ver el horario con tu acceso actual.',
  repairFailedSub: 'Esto no quiere decir que esté resuelto. Inténtalo de nuevo.',
  repairCleared: 'Este turno ya no necesita a otra persona',
  repairClearedSub: 'Un horario publicado lo cambió, o cambiaron los días libres. No hay nada más que hacer aquí.',
  they: 'esa persona',
  fillShift: (person: string) => `Cubrir el turno de ${person}`,
  overlapsFact: (first: string, item: StaffingConflict) => `Los días libres de ${first} están aprobados y coinciden con este turno publicado: ${es.shift(item)} (${minutesText(item.overlapMinutes)}).`,
  assignElse: (first: string) => `Asigna a otra persona o cambia el turno y luego publica. Los cambios en borrador no lo resuelven; se resuelve cuando un horario publicado ya no tenga a ${first}.`,
  noOneAssigned: 'Aún no hay nadie asignado. Un dueño puede tomarlo.',
  yoursToFill: 'Tú aprobaste estos días libres, así que te toca cubrir este turno.',
  assignedToManager: 'Asignado al gerente que aprobó los días libres.',
  openShift: 'Abrir el turno',
  day: esDay,
  range: esRange,
  yourShifts: 'Tus turnos durante estos días libres',
  ownExpired: 'Esta revisión de tus turnos venció.',
  ownCouldntCheck: 'No pudimos revisar tus turnos programados para estas fechas.',
  approvedTitle: 'Tus días libres están aprobados',
  approvedSub: 'No tienes que venir en estas horas.',
  publishedDuring: 'Turnos publicados durante estos días libres',
  stillOnSchedule: 'Todavía en el horario publicado',
  onPublished: 'En el horario publicado',
  managerTakesCare: 'Tu gerente se encargará de estos turnos. No tienes que buscar quién te cubra ni cambiarlos.',
  managerWillSee: 'Tu gerente verá estos turnos cuando decida. No tienes que hacer nada ahora.',
  failures: {
    sign_in: {title: 'Tu sesión terminó', body: 'Inicia sesión otra vez para seguir trabajando.'},
    access_ended: {title: 'Tu acceso cambió', body: 'Borramos esta información de la pantalla. Pregúntale a tu gerente si todavía la necesitas.'},
    refresh_view: {title: 'Esta página no estaba al día', body: 'La borramos y se está actualizando con tu acceso actual.'},
    origin: {title: 'Esta conexión no es segura', body: 'Borramos esta página para proteger tu información. Iniciar sesión otra vez no lo resuelve. Pídele a tu dueño que revise la dirección web de NEVORA que estás usando.'},
    contract: {title: 'Eso no se completó', body: 'No se guardó nada. Vuelve a cargar la página e inténtalo de nuevo.'},
  },
  notAllowed: {title: 'No tienes acceso a esto', body: 'Pídeselo al dueño si lo necesitas.'},
  signIn: 'Iniciar sesión',
  reload: 'Volver a cargar',
  closeMessage: 'Cerrar este mensaje',
  close: 'Cerrar',
};
export const LEAVE_STAFFING_COPY = {en, es};
