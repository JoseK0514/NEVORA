/* Signed-in Spanish (Nov 23, 2026): the words on the Employee and Lead Home (the corporate view, the v5 quiet view, the
 * Signature view in the UI preview, and the original Home view) in English and Puerto Rico Spanish (docs/design/voice.md:
 * tú, sentence case, the glossary: "Días libres", "Horario", "Turno disponible", "Líder de turno", "Aviso"). English is
 * exactly what the screens said before the move. Home's row labels come from the server in English; `label` writes the
 * known ones in Spanish and leaves anything else as it came. */
import type {HomeSource} from '../lib/employee-home/types';
import {unpublishedNote} from '../lib/publication-note';
import {esDate} from './employee-b/es-format';

export type HomeLang = 'en' | 'es';

const en = {
  sources: {
    schedule: 'Schedule', acknowledgements: 'Schedule reviews', exchanges: 'Shift requests',
    timeOff: 'Time off', ownTime: 'Recorded time and corrections', communications: 'Communications',
  } as Record<HomeSource, string>,
  open: (name: string) => `Open ${name.toLowerCase()}`,
  openWithState: (name: string, state: string) => `Open ${name.toLowerCase()}, ${state.toLowerCase()}`,
  goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening',
  greet: (greeting: string, name: string) => `${greeting}, ${name}`,
  today: 'Today', tomorrow: 'Tomorrow',
  ends: (day: string) => `ends ${day}`, endsCap: 'Ends',
  confirmSchedule: 'Confirm your schedule', readUpdate: 'Read the team update', reviewSchedule: 'Review your schedule',
  confirmThisWeek: 'Confirm this week’s schedule', confirmNextWeek: 'Confirm next week’s schedule',
  and: ' and ', moreWeeks: (count: number) => ` and ${count} more weeks`,
  respondBy: (when: string) => `Respond by ${when}`, respondByLead: 'Respond by', recorded: 'Recorded', reviewNeeded: 'Review needed', requiredReview: 'Required review', weekOf: 'Week of',
  needsReview: 'A changed schedule needs review', couldntCheck: 'Couldn’t be checked',
  partiallyShown: 'Partially shown — more records are available', partlyShown: 'Partly shown — more records are available', partlyChecked: 'Partly checked',
  nextShift: 'Next shift', nextShiftTitle: 'Next Shift', scheduleUnavailable: 'Schedule unavailable', scheduleNotChecked: 'Your schedule couldn’t be checked.',
  viewScheduleNoShift: 'View schedule, no upcoming shift', noUpcomingShift: 'No upcoming shift', newShiftsShow: 'New shifts show here once they’re published.',
  noUpcomingShiftLong: 'No upcoming shift. New shifts show here once they’re published.',
  shiftLead: 'Shift lead', designatedLead: 'Designated lead',
  nextLabel: (now: boolean, day: string, start: string, end: string, where: string) => `View schedule, ${now ? 'scheduled now, ' : ''}${day}, ${start} to ${end}, ${where}`,
  scheduledNow: 'Scheduled now', until: (time: string) => `Until ${time}`, to: ' to ',
  viewTodaysShift: 'View today’s shift', viewShiftDetails: 'View shift details',
  dayLabel: (day: string, today: boolean, count: number) => `${day}${today ? ', today' : ''}, ${count ? `${count} ${count === 1 ? 'shift' : 'shifts'}` : 'no shifts'}`,
  pausedAway: 'Paused while you’re away.', offline: 'You’re offline.', sessionEnded: 'Your session ended.', loadingHome: 'Loading Home…', couldntLoadHome: 'Couldn’t load Home.',
  updatesWhenBack: 'Your shift updates when you come back.', updatesWhenReconnect: 'Your shift updates when you reconnect.',
  signInToSee: 'Sign in again to see your shift.', couldntLoadShift: 'Couldn’t load your shift.',
  waitingPausedAway: 'Paused while you’re away. Your shift updates when you come back.', waitingOffline: 'You’re offline. Your shift updates when you reconnect.',
  waitingEnded: 'Your session ended. Sign in again to see your shift.', loadingShift: 'Loading your shift…',
  notifications: 'Notifications', home: 'Home', yourShift: 'Your shift', ownRecordedTime: 'Own recorded time', yourTimeToday: 'Your time today',
  signIn: 'Sign in', checking: 'Checking…', tryAgain: 'Try again', toLoadHome: ' to load Home',
  needsYou: 'Needs you', knownItems: (count: number) => `${count} known ${count === 1 ? 'item' : 'items'}`,
  allSetShort: 'You’re all set', allSet: 'You’re all set.', nothingNow: 'Nothing to do right now', nothingNowDot: 'Nothing to do right now.',
  inCheckedSections: 'In the sections that could be checked.', nothingNeedsReview: 'Nothing needs your review.',
  showFewer: 'Show fewer', showAll: (count: number) => `Show all ${count}`,
  todaysTeam: 'Today’s team', messageTeam: 'Message today’s team', everyoneToday: 'Everyone on shift today',
  thisWeek: 'This week', weekShifts: (count: number) => `${count} ${count === 1 ? 'shift' : 'shifts'}`, shifts: (count: number) => `${count} ${count === 1 ? 'shift' : 'shifts'}`, noShifts: 'No shifts',
  updatedIn: (zone: string) => `, times in ${zone} time`, updated: 'Updated',
  startsInMin: (minutes: number) => `Starts in ${minutes} min`, startsInHours: (hours: number) => `Starts in ${hours} h`,
  onShiftNow: 'On shift now', todaysShift: 'Today’s shift', clockInOn: (place: string) => `Clock in on the ${place} tablet`, shiftDetails: 'Shift details',
  comingUp: 'Coming up', seeAllShifts: 'See all shifts', seeAll: 'See all', seeAllCount: (count: number) => `See all ${count}`,
  rowLabel: (day: string, start: string, end: string, where?: string) => `${day}, ${start} to ${end}${where ? `, ${where}` : ''}`,
  welcomeBack: (name: string) => `Welcome back, ${name}`, thingsToDo: 'Things to do', review: 'Review', allSetNothing: 'You’re all set. Nothing needs you right now.',
  // The original Home view (employee-home-actions).
  viewSchedule: 'View schedule', yourSchedule: 'Your schedule', noPublishedShift: 'No upcoming published shift',
  clockStatusBelow: 'Clock status below shows whether you’re clocked in.', clockStatusBelowPlain: 'Clock status below shows whether you\'re clocked in.',
  homePaused: 'Home paused — return online to refresh.', signInToView: 'Sign in again to view Home.', homeUnavailable: 'Home unavailable — try again.',
  needsAttention: 'Needs your attention', someNotChecked: 'Some Home sections could not be fully checked.',
  showAllItems: (count: number, more: number) => `Show all ${count} items (${more} more)`, noItemsAvailable: 'No items in the available sections.',
  srcUnavailableReview: 'unavailable — a changed schedule needs review', srcUnavailable: 'unavailable', srcPartiallyShown: 'partially shown — more records are available', srcPartial: 'partial',
  retryHome: 'Retry home',
  // The Signature view (employee-home-reviewed, UI preview).
  daysCount: (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`, left: (span: string) => `${span} left`, startsIn: (span: string) => `Starts in ${span}`,
  toDo: 'To do', recentActivity: 'Recent activity', itemsSr: (count: number, partial: boolean) => `${count}${partial ? ' known' : ''} ${count === 1 ? 'item' : 'items'}`,
  viewAllItems: (more: number) => `View all items (${more} more)`, viewAllActivity: (more: number) => `View all activity (${more} more)`,
  showFewerItems: 'Show fewer actions', showFewerActivity: 'Show fewer updates',
  nothingChecked: 'Nothing to do in the checked sources.', noActivityChecked: 'No activity in the checked sources.', noRecentActivity: 'No recent activity.',
  sourceAvailability: 'Home source availability', timesIn: (zone: string) => `Times in ${zone} time`,
  yourShifts: 'Your shifts', laterToday: 'Later today', noMoreToday: 'No more shifts today', enjoyTimeOff: 'Enjoy your time off.', nextShiftAt: (when: string) => `Next shift · ${when}`,
  toReview: 'To review', none: 'None', viewScheduleFor: (date: string) => `View schedule, ${date}`, laterOnSchedule: 'Your later shifts are on your schedule.',
  partialWarn: 'Some Home sections could not be fully checked. Counts show known items. Refresh Home below to check again.', refreshHome: 'Refresh home',
  // A location that hasn't published (lib/publication-note's sentence, said in this language).
  unpublishedNote: unpublishedNote as (unpublished: readonly string[], published?: readonly string[]) => string,
  /** A server row label in this language (English: as it came). */
  label: (text: string) => text,
};

const join = (names: readonly string[]) => {
  const list = [...new Set(names.map(name => name.trim()).filter(Boolean))];
  return list.length <= 1 ? list[0] ?? '' : `${list.slice(0, -1).join(', ')} y ${list.at(-1)}`;
};

const exchangeStatus: Record<string, [string, string]> = {
  approved: ['aprobado', 'aprobada'], waiting: ['en espera', 'en espera'], requested: ['solicitado', 'solicitada'], declined: ['rechazado', 'rechazada'], withdrawn: ['retirado', 'retirada'], pending: ['en espera', 'en espera'],
  open: ['abierto', 'abierta'], manager_pending: ['en espera del gerente', 'en espera del gerente'], expired: ['vencido', 'vencida'],
};
const timeOffStatus: Record<string, string> = {waiting: 'en espera', requested: 'solicitados', approved: 'aprobados', declined: 'rechazados', withdrawn: 'retirados', pending: 'en espera', denied: 'rechazados', rejected: 'rechazados', cancelled: 'retirados'};
const correctionStatus: Record<string, string> = {waiting: 'en espera', requested: 'solicitada', approved: 'aprobada', declined: 'rechazada', withdrawn: 'retirada', pending: 'en espera', denied: 'rechazada', rejected: 'rechazada', cancelled: 'retirada'};
const fixed: Record<string, string> = {
  'Schedule published': 'Horario publicado', 'Schedule updated': 'Horario actualizado', 'Review schedule': 'Revisar horario',
  'Review swap request': 'Revisar solicitud de cambio', 'Review coverage offer': 'Revisar oferta de cobertura',
  'Shift request awaiting manager review': 'Cambio de turno en espera del gerente', 'Shift request waiting': 'Cambio de turno en espera',
};
const spanishPeriod = (text: string) => esDate(text).replace(/, (\d{4})/g, ' $1');

/** The server's English row labels (lib/data/employee-home.server.ts), written in Spanish. */
function spanishLabel(text: string): string {
  let rest = text, tail = '';
  const review = / — review (required|unavailable)$/.exec(rest);
  if (review) { rest = rest.slice(0, review.index); tail = review[1] === 'required' ? ' · requiere revisión' : ' · revisión no disponible'; }
  if (rest === 'Schedule removed') return `Turno quitado del horario${tail}`;
  if (fixed[rest]) return `${fixed[rest]}${tail}`;
  const update = /^(Review update|Update): ([\s\S]*)$/.exec(rest);
  if (update) return `${update[1] === 'Review update' ? 'Revisar aviso' : 'Aviso'}: ${update[2]}${tail}`;
  const exchange = /^(Swap|Coverage) (\w+)$/.exec(rest);
  if (exchange && exchangeStatus[exchange[2]]) return `${exchange[1] === 'Swap' ? `Cambio ${exchangeStatus[exchange[2]][0]}` : `Cobertura ${exchangeStatus[exchange[2]][1]}`}${tail}`;
  const own = /^(Time off|Time correction|Shift request) (\w+)( · [\s\S]*)?$/.exec(rest);
  if (own) {
    const period = own[3] ? spanishPeriod(own[3]) : '';
    if (own[1] === 'Time off' && timeOffStatus[own[2]]) return `Días libres ${timeOffStatus[own[2]]}${period}${tail}`;
    if (own[1] === 'Time correction' && correctionStatus[own[2]]) return `Corrección de tiempo ${correctionStatus[own[2]]}${period}${tail}`;
    if (own[1] === 'Shift request' && exchangeStatus[own[2]]) return `Cambio de turno ${exchangeStatus[own[2]][0]}${period}${tail}`;
  }
  return text;
}

const es: typeof en = {
  sources: {
    schedule: 'Horario', acknowledgements: 'Revisiones del horario', exchanges: 'Cambios de turno',
    timeOff: 'Días libres', ownTime: 'Tiempo registrado y correcciones', communications: 'Avisos',
  },
  open: (name: string) => `Abrir ${name.toLowerCase()}`,
  openWithState: (name: string, state: string) => `Abrir ${name.toLowerCase()}, ${state.toLowerCase()}`,
  goodMorning: 'Buenos días', goodAfternoon: 'Buenas tardes', goodEvening: 'Buenas noches',
  greet: (greeting: string, name: string) => `${greeting}, ${name}`,
  today: 'Hoy', tomorrow: 'Mañana',
  ends: (day: string) => `termina ${day}`, endsCap: 'Termina',
  confirmSchedule: 'Confirma tu horario', readUpdate: 'Lee el aviso del equipo', reviewSchedule: 'Revisa tu horario',
  confirmThisWeek: 'Confirma el horario de esta semana', confirmNextWeek: 'Confirma el horario de la próxima semana',
  and: ' y ', moreWeeks: (count: number) => ` y ${count} semanas más`,
  respondBy: (when: string) => `Responde antes del ${when}`, respondByLead: 'Responde antes del', recorded: 'Registrado', reviewNeeded: 'Requiere revisión', requiredReview: 'Revisión requerida', weekOf: 'Semana del',
  needsReview: 'Un cambio en el horario necesita revisión', couldntCheck: 'No pudimos verificarlo',
  partiallyShown: 'Se muestra en parte; hay más registros', partlyShown: 'Se muestra en parte; hay más registros', partlyChecked: 'Verificado en parte',
  nextShift: 'Próximo turno', nextShiftTitle: 'Próximo turno', scheduleUnavailable: 'Horario no disponible', scheduleNotChecked: 'No pudimos verificar tu horario.',
  viewScheduleNoShift: 'Ver horario, no tienes turnos próximos', noUpcomingShift: 'No tienes turnos próximos', newShiftsShow: 'Los turnos nuevos aparecen aquí cuando se publican.',
  noUpcomingShiftLong: 'No tienes turnos próximos. Los turnos nuevos aparecen aquí cuando se publican.',
  shiftLead: 'Líder de turno', designatedLead: 'Líder de turno',
  nextLabel: (now: boolean, day: string, start: string, end: string, where: string) => `Ver horario, ${now ? 'turno en curso, ' : ''}${day}, ${start} a ${end}, ${where}`,
  scheduledNow: 'Turno en curso', until: (time: string) => `Hasta ${/^1:/.test(time) ? 'la' : 'las'} ${time}`, to: ' a ',
  viewTodaysShift: 'Ver el turno de hoy', viewShiftDetails: 'Ver detalles del turno',
  dayLabel: (day: string, today: boolean, count: number) => `${day}${today ? ', hoy' : ''}, ${count ? `${count} ${count === 1 ? 'turno' : 'turnos'}` : 'sin turnos'}`,
  pausedAway: 'En pausa mientras no estás.', offline: 'Estás sin conexión.', sessionEnded: 'Tu sesión terminó.', loadingHome: 'Cargando Inicio…', couldntLoadHome: 'No pudimos cargar Inicio.',
  updatesWhenBack: 'Tu turno se actualiza cuando regreses.', updatesWhenReconnect: 'Tu turno se actualiza cuando te reconectes.',
  signInToSee: 'Inicia sesión de nuevo para ver tu turno.', couldntLoadShift: 'No pudimos cargar tu turno.',
  waitingPausedAway: 'En pausa mientras no estás. Tu turno se actualiza cuando regreses.', waitingOffline: 'Estás sin conexión. Tu turno se actualiza cuando te reconectes.',
  waitingEnded: 'Tu sesión terminó. Inicia sesión de nuevo para ver tu turno.', loadingShift: 'Cargando tu turno…',
  notifications: 'Notificaciones', home: 'Inicio', yourShift: 'Tu turno', ownRecordedTime: 'Tu tiempo registrado', yourTimeToday: 'Tu tiempo hoy',
  signIn: 'Iniciar sesión', checking: 'Verificando…', tryAgain: 'Intentar de nuevo', toLoadHome: ' para cargar Inicio',
  needsYou: 'Pendiente para ti', knownItems: (count: number) => `${count} ${count === 1 ? 'pendiente conocido' : 'pendientes conocidos'}`,
  allSetShort: 'Todo al día', allSet: 'Todo al día.', nothingNow: 'Nada pendiente por ahora', nothingNowDot: 'Nada pendiente por ahora.',
  inCheckedSections: 'En las secciones que pudimos verificar.', nothingNeedsReview: 'Nada necesita tu revisión.',
  showFewer: 'Mostrar menos', showAll: (count: number) => `Mostrar los ${count}`,
  todaysTeam: 'Equipo de hoy', messageTeam: 'Enviar mensaje al equipo de hoy', everyoneToday: 'Todos los que trabajan hoy',
  thisWeek: 'Esta semana', weekShifts: (count: number) => `${count} ${count === 1 ? 'turno' : 'turnos'}`, shifts: (count: number) => `${count} ${count === 1 ? 'turno' : 'turnos'}`, noShifts: 'Sin turnos',
  updatedIn: (zone: string) => `, horas de ${zone}`, updated: 'Actualizado',
  startsInMin: (minutes: number) => `Empieza en ${minutes} min`, startsInHours: (hours: number) => `Empieza en ${hours} h`,
  onShiftNow: 'En turno ahora', todaysShift: 'Turno de hoy', clockInOn: (place: string) => `Poncha entrada en la tableta de ${place}`, shiftDetails: 'Detalles del turno',
  comingUp: 'Próximos turnos', seeAllShifts: 'Ver todos los turnos', seeAll: 'Ver todos', seeAllCount: (count: number) => `Ver los ${count}`,
  rowLabel: (day: string, start: string, end: string, where?: string) => `${day}, ${start} a ${end}${where ? `, ${where}` : ''}`,
  welcomeBack: (name: string) => `Hola de nuevo, ${name}`, thingsToDo: 'Pendientes', review: 'Revisar', allSetNothing: 'Todo al día. No tienes nada pendiente por ahora.',
  viewSchedule: 'Ver horario', yourSchedule: 'Tu horario', noPublishedShift: 'No tienes turnos publicados próximos',
  clockStatusBelow: 'El estado de tu ponche, abajo, indica si estás en turno.', clockStatusBelowPlain: 'El estado de tu ponche, abajo, indica si estás en turno.',
  homePaused: 'Inicio en pausa. Vuelve a conectarte para actualizar.', signInToView: 'Inicia sesión de nuevo para ver Inicio.', homeUnavailable: 'Inicio no disponible. Inténtalo de nuevo.',
  needsAttention: 'Necesita tu atención', someNotChecked: 'No pudimos verificar todas las secciones de Inicio.',
  showAllItems: (count: number, more: number) => `Mostrar los ${count} pendientes (${more} más)`, noItemsAvailable: 'No hay pendientes en las secciones disponibles.',
  srcUnavailableReview: 'no disponible: un cambio en el horario necesita revisión', srcUnavailable: 'no disponible', srcPartiallyShown: 'se muestra en parte; hay más registros', srcPartial: 'en parte',
  retryHome: 'Reintentar Inicio',
  daysCount: (days: number) => `${days} ${days === 1 ? 'día' : 'días'}`, left: (span: string) => `Quedan ${span}`, startsIn: (span: string) => `Empieza en ${span}`,
  toDo: 'Pendientes', recentActivity: 'Actividad reciente', itemsSr: (count: number, partial: boolean) => `${count} ${count === 1 ? (partial ? 'pendiente conocido' : 'pendiente') : (partial ? 'pendientes conocidos' : 'pendientes')}`,
  viewAllItems: (more: number) => `Ver todos los pendientes (${more} más)`, viewAllActivity: (more: number) => `Ver toda la actividad (${more} más)`,
  showFewerItems: 'Mostrar menos pendientes', showFewerActivity: 'Mostrar menos actividad',
  nothingChecked: 'Nada pendiente en las secciones verificadas.', noActivityChecked: 'No hay actividad en las secciones verificadas.', noRecentActivity: 'No hay actividad reciente.',
  sourceAvailability: 'Disponibilidad de las secciones de Inicio', timesIn: (zone: string) => `Horas de ${zone}`,
  yourShifts: 'Tus turnos', laterToday: 'Más tarde hoy', noMoreToday: 'No quedan turnos hoy', enjoyTimeOff: 'Disfruta tu descanso.', nextShiftAt: (when: string) => `Próximo turno · ${when}`,
  toReview: 'Por revisar', none: 'Ninguno', viewScheduleFor: (date: string) => `Ver horario, ${date}`, laterOnSchedule: 'Tus próximos turnos están en tu horario.',
  partialWarn: 'No pudimos verificar todas las secciones de Inicio. Los totales muestran lo que sabemos. Actualiza Inicio abajo para verificar de nuevo.', refreshHome: 'Actualizar Inicio',
  unpublishedNote: (unpublished: readonly string[], published: readonly string[] = []) => {
    const waiting = join(unpublished), ready = join(published);
    const many = new Set(unpublished.map(name => name.trim()).filter(Boolean)).size > 1;
    const pending = waiting ? `${waiting} todavía no ${many ? 'han' : 'ha'} publicado esta semana.` : 'Otra localidad donde trabajas todavía no ha publicado esta semana.';
    return ready ? `Tus turnos de ${ready} están publicados. ${pending}` : `${pending} Los turnos que ves están publicados.`;
  },
  label: spanishLabel,
};

export const EMPLOYEE_HOME_COPY: Record<HomeLang, typeof en> = {en, es};
export const employeeHomeCopy = (lang: HomeLang = 'en') => EMPLOYEE_HOME_COPY[lang];
export type EmployeeHomeCopy = typeof en;
export const HOME_LOCALE: Record<HomeLang, string> = {en: 'en-US', es: 'es-PR'};
