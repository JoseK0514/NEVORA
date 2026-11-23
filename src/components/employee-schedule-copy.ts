/* Signed-in Spanish (Nov 23, 2026): the words on an Employee's and a Lead's Schedule (the week, Open shifts, the shift
 * sheet, the weekly confirmation), their Requests card and the scheduling fields, in English and Puerto Rico Spanish
 * (docs/design/voice.md: tú, sentence case, the glossary: Horario, Turno disponible, Días libres, localidad, Líder de
 * turno, No puedo trabajar). English is word for word what these screens said before the table. */
import {emptyScheduleLabel, type EmployeeScheduleState} from '../lib/data/employee-schedule';
import {unpublishedNote} from '../lib/publication-note';

export type ScheduleLang = 'en' | 'es';

const shiftsEn = (n: number) => `${n} ${n === 1 ? 'shift' : 'shifts'}`;
const shiftsEs = (n: number) => `${n} ${n === 1 ? 'turno' : 'turnos'}`;
/* The v5 week keeps a count with its noun on one line (a no-break space). */
const shiftsEnNb = (n: number) => `${n}\u00a0${n === 1 ? 'shift' : 'shifts'}`;
const shiftsEsNb = (n: number) => `${n}\u00a0${n === 1 ? 'turno' : 'turnos'}`;

/** Spanish names joined as the English note joins them ("A, B y C"). */
function joinEs(names: readonly string[]) {
  const list = [...new Set(names.map(name => name.trim()).filter(Boolean))];
  if (list.length <= 1) return list[0] ?? '';
  return `${list.slice(0, -1).join(', ')} y ${list.at(-1)}`;
}
function unpublishedNoteEs(unpublished: readonly string[], published: readonly string[] = []) {
  const waiting = joinEs(unpublished), ready = joinEs(published);
  const many = new Set(unpublished.map(name => name.trim()).filter(Boolean)).size > 1;
  const pending = waiting ? `${waiting} todavía no ${many ? 'han' : 'ha'} publicado esta semana.` : 'Otra localidad donde trabajas todavía no ha publicado esta semana.';
  return ready ? `Tus turnos de ${ready} están publicados. ${pending}` : `${pending} Los turnos que ves están publicados.`;
}

const en = {
  // The week
  schedule: 'Schedule', today: 'Today', tomorrow: 'Tomorrow', inDays: (n: number) => `In ${n} days`,
  now: 'Now', startsInMin: (n: number) => `Starts in ${n} min`, startsInH: (n: number) => `Starts in ${n} h`, startsPrefix: 'Starts in ', inShort: (rest: string) => `In ${rest}`,
  leadAll: (n: number) => `You lead all ${n} shifts`,
  shifts: shiftsEn, shiftsNb: shiftsEnNb, hoursWord: (n: number) => `${n} ${n === 1 ? 'hour' : 'hours'}`,
  comingUp: 'Coming up', thisWeek: 'This week', shiftsTitle: 'Shifts', laterThisWeek: 'Later this week',
  cantCheckSchedule: 'Your schedule couldn’t be checked', noPublished: 'No published shifts', thisWeekSuffix: ' this week',
  shiftLead: 'Shift lead', shiftLeadLower: ', shift lead', locationUnavailable: 'Location unavailable', ends: (day: string) => `Ends ${day}`,
  cantWorkApproved: 'Can’t work · approved', calloutApproved: 'Call-out approved',
  confirmWeek: 'Confirm this week', scheduleReview: 'Schedule review', managerAsked: 'Your manager asked you to check it',
  noAssignments: 'No assignments remain this week. Review the changes, then confirm.', reviewAgain: 'Review the current week again.',
  confirm: 'Confirm', confirmed: 'Confirmed', upToDate: 'You’re up to date', youConfirmed: 'You’ve confirmed this week.',
  swapTitle: 'Choose the shift you want to swap', swapNone: 'No shifts to swap this week', swapTap: 'Tap the shift, then Swap with someone.',
  swapTapTeammate: 'Tap the shift, then Swap with a teammate.', swapOnly: 'Only upcoming shifts can be swapped.',
  calloutTitle: 'Choose the shift you can’t work', calloutNone: 'No shifts to report this week', calloutTap: 'Tap the shift, then Can’t work this shift.',
  calloutOnly: 'Only shifts that haven’t ended can be reported.', done: 'Done',
  confirmFailed: 'Confirmation could not be completed.', reviewTryAgain: 'Review the current schedule and try again.', scheduleConfirmed: 'Schedule confirmed.',
  couldntCheck: 'Couldn’t check right now', noneRightNow: 'None right now', and: ' and ',
  dayOffToday: 'Day off today.', dayOff: 'Day off.', dayOffShort: 'Day off', noMoreThisWeek: 'No more shifts this week.', dayOffAllWeek: 'Day off all week.',
  noShiftToday: 'No shift today.', noShiftThisDay: 'No shift this day.',
  emptyDayNote: 'An empty day isn’t a day off yet.',
  unpublished: (unpublished: readonly string[], published?: readonly string[]) => unpublishedNote(unpublished, published),
  emptyLabel: (state: EmployeeScheduleState): string => emptyScheduleLabel(state),
  availability: 'Availability', previousWeek: 'Previous week', nextWeekNav: 'Next week', daysInWeek: 'Days in this week', week: 'Week',
  srToday: ', today', srAssigned: ', assigned shift', srSelectedWhole: ', selected day, show the whole week', srSelected: ', selected day',
  zoneTime: (year: string, zone: string) => `, ${year}, ${zone} time`,
  unavailableTitle: 'Schedule unavailable', unavailableSr: 'Schedule unavailable. ', couldntLoad: 'We couldn’t load your schedule.', tryAgain: 'Try again', tryAgainSr: ' to load your schedule',
  wholeWeek: 'Whole week', addToCalendar: 'Add shifts to your calendar', views: 'Schedule views', myShifts: 'My shifts',
  // Open shifts
  openShifts: 'Open shifts', openShiftsCount: (n: number) => `Open shifts · ${n}`, openYouCanPick: (n: number) => `${n} open ${n === 1 ? 'shift' : 'shifts'} you can pick up`,
  teamOffers: 'Shifts your team offers', couldntCheckOpen: 'We couldn’t check open shifts right now.', openRequests: 'Open shift requests',
  openUnavailable: 'Open shifts unavailable', waitingApproval: 'Waiting for approval', waiting: 'Waiting', youCanClaim: 'Shifts you can claim',
  noneFit: 'No open shifts fit your schedule right now.', noOpen: 'No open shifts right now',
  offersShowUp: 'When a teammate offers a shift you can work, it shows up here.', offersShow: 'When a teammate offers a shift you can work, it shows here.',
  claimNote: 'Claiming sends a request to your manager. The shift is yours once it’s approved.',
  viewRequest: 'View request', viewAndClaim: 'View and claim', pickUp: 'Pick up', view: 'View',
  waitingManager: 'Waiting for your manager', nextWeek: 'Next week', getAlerts: 'Get alerts on this device',
  atYourLocations: 'Shifts at your locations you can pick up', yourOpenRequests: 'Your requests for open shifts',
  confirmsNote: 'Your manager confirms before the shift is yours. You’ll get a notification either way.',
  // The shift sheet
  shift: 'Shift', endsLower: (day: string) => `ends ${day}`, location: 'Location', position: 'Position', you: 'You', cantWork: 'Can’t work', approved: 'Approved',
  changeShift: 'Change this shift', swapTeammate: 'Swap with a teammate', offerCover: 'Offer it for cover', cantWorkShift: 'Can’t work this shift',
  staysYours: 'It stays your shift until a swap completes or your manager approves your request.',
  youreLead: 'You’re shift lead', swapSomeone: 'Swap with someone', offerForCover: 'Offer for cover', iCantWork: 'I can’t work this shift', tellsManager: 'Tells your manager right away',
  // Weekly confirmation
  retryConfirmation: 'Retry confirmation', confirmSchedule: 'Confirm schedule', confirming: 'Confirming…', retry: 'Retry',
  confirmPreparing: 'Confirm schedule, preparing', preparing: 'Preparing confirmation…',
  conflict: 'The schedule changed. Review the current week before confirming.',
  blocked: 'This review is no longer authorized. Sign in and review the schedule again.',
  unknown: 'Confirmation outcome unknown. Retry to check the original confirmation.',
  unavailable: 'Confirmation unavailable. Retry the original confirmation.',
  checking: 'Checking the current schedule confirmation…', reviewCurrent: 'Review current schedule',
  // Requests (corporate card)
  allDay: 'All day', days: (n: number) => `${n} days`,
  pill: {waiting: 'Waiting', approved: 'Approved', declined: 'Declined', withdrawn: 'Withdrawn', openToCheck: 'Open to check', waitingTeammate: 'Waiting on teammate',
    waitingCover: 'Waiting for cover', completed: 'Completed', recorded: 'Recorded', cancelled: 'Cancelled', expired: 'Expired'},
  subAll: 'Time off and shift changes you’ve sent', subTimeOff: 'Time off you’ve asked for', subShifts: 'Shift changes you’ve sent',
  requests: 'Requests', requestTimeOff: 'Request time off', nothingWaiting: 'Nothing waiting right now.', decided: 'Decided',
  seeAllDecided: 'See all decided requests', seeAll: 'See all',
  // Scheduling fields (Team: a person's positions and locations)
  inactivePosition: 'Inactive position, kept as a qualification', inactive: 'Inactive', primaryIncluded: 'Primary location, always included',
  available: (n: number) => `${n} available`, positions: 'Positions', positionsHelp: 'What they’re qualified to do. This is separate from their access role.',
  positionQualifications: 'Position qualifications', noPositions: 'No active positions available. Positions are optional.',
  locationsTitle: 'Locations they can work at', locationsHelp: 'Their primary location is always included.', eligibleLocations: 'Eligible locations',
};

const es: typeof en = {
  schedule: 'Horario', today: 'Hoy', tomorrow: 'Mañana', inDays: (n: number) => `En ${n} días`,
  now: 'Ahora', startsInMin: (n: number) => `Empieza en ${n} min`, startsInH: (n: number) => `Empieza en ${n} h`, startsPrefix: 'Empieza en ', inShort: (rest: string) => `En ${rest}`,
  leadAll: (n: number) => `Lideras los ${n} turnos`,
  shifts: shiftsEs, shiftsNb: shiftsEsNb, hoursWord: (n: number) => `${n} ${n === 1 ? 'hora' : 'horas'}`,
  comingUp: 'Próximos', thisWeek: 'Esta semana', shiftsTitle: 'Turnos', laterThisWeek: 'Más adelante esta semana',
  cantCheckSchedule: 'No pudimos verificar tu horario', noPublished: 'Sin turnos publicados', thisWeekSuffix: ' esta semana',
  shiftLead: 'Líder de turno', shiftLeadLower: ', líder de turno', locationUnavailable: 'Localidad no disponible', ends: (day: string) => `Termina ${day}`,
  cantWorkApproved: 'No puedo trabajar · aprobado', calloutApproved: 'No puedo trabajar · aprobado',
  confirmWeek: 'Confirma esta semana', scheduleReview: 'Revisión del horario', managerAsked: 'Tu gerente te pidió revisarla',
  noAssignments: 'No te quedan turnos esta semana. Revisa los cambios y luego confirma.', reviewAgain: 'Revisa otra vez la semana actual.',
  confirm: 'Confirmar', confirmed: 'Confirmado', upToDate: 'Estás al día', youConfirmed: 'Ya confirmaste esta semana.',
  swapTitle: 'Elige el turno que quieres cambiar', swapNone: 'No hay turnos para cambiar esta semana', swapTap: 'Toca el turno y luego Cambiar con alguien.',
  swapTapTeammate: 'Toca el turno y luego Cambiar con un compañero.', swapOnly: 'Solo puedes cambiar turnos que todavía no han llegado.',
  calloutTitle: 'Elige el turno que no puedes trabajar', calloutNone: 'No hay turnos para reportar esta semana', calloutTap: 'Toca el turno y luego No puedo trabajar este turno.',
  calloutOnly: 'Solo puedes reportar turnos que no han terminado.', done: 'Listo',
  confirmFailed: 'No pudimos completar la confirmación.', reviewTryAgain: 'Revisa el horario actual e inténtalo de nuevo.', scheduleConfirmed: 'Horario confirmado.',
  couldntCheck: 'No pudimos verificar ahora', noneRightNow: 'Ninguno por ahora', and: ' y ',
  dayOffToday: 'Hoy es tu día libre.', dayOff: 'Día libre.', dayOffShort: 'Día libre', noMoreThisWeek: 'No quedan turnos esta semana.', dayOffAllWeek: 'Libre toda la semana.',
  noShiftToday: 'No tienes turno hoy.', noShiftThisDay: 'No tienes turno este día.',
  emptyDayNote: 'Un día vacío todavía no es un día libre.',
  unpublished: (unpublished: readonly string[], published?: readonly string[]) => unpublishedNoteEs(unpublished, published),
  emptyLabel: (state: EmployeeScheduleState) => state === 'published' ? 'Libre, sin turno asignado' : state === 'unpublished' ? 'Horario sin publicar todavía' : '–',
  availability: 'Disponibilidad', previousWeek: 'Semana anterior', nextWeekNav: 'Semana siguiente', daysInWeek: 'Días de esta semana', week: 'Semana',
  srToday: ', hoy', srAssigned: ', turno asignado', srSelectedWhole: ', día seleccionado, mostrar toda la semana', srSelected: ', día seleccionado',
  zoneTime: (year: string, zone: string) => `, ${year}, hora de ${zone}`,
  unavailableTitle: 'Horario no disponible', unavailableSr: 'Horario no disponible. ', couldntLoad: 'No pudimos cargar tu horario.', tryAgain: 'Intentar de nuevo', tryAgainSr: ' para cargar tu horario',
  wholeWeek: 'Toda la semana', addToCalendar: 'Añadir turnos a tu calendario', views: 'Vistas del horario', myShifts: 'Mis turnos',
  openShifts: 'Turnos disponibles', openShiftsCount: (n: number) => `Turnos disponibles · ${n}`, openYouCanPick: (n: number) => `${n} ${n === 1 ? 'turno disponible' : 'turnos disponibles'} que puedes tomar`,
  teamOffers: 'Turnos que ofrece tu equipo', couldntCheckOpen: 'No pudimos verificar los turnos disponibles ahora.', openRequests: 'Solicitudes de turnos disponibles',
  openUnavailable: 'No pudimos ver los turnos disponibles', waitingApproval: 'Esperando aprobación', waiting: 'En espera', youCanClaim: 'Turnos que puedes pedir',
  noneFit: 'Ningún turno disponible encaja con tu horario ahora.', noOpen: 'No hay turnos disponibles ahora',
  offersShowUp: 'Cuando un compañero ofrezca un turno que puedas trabajar, aparecerá aquí.', offersShow: 'Cuando un compañero ofrezca un turno que puedas trabajar, aparecerá aquí.',
  claimNote: 'Al pedirlo, le envías una solicitud a tu gerente. El turno es tuyo cuando lo apruebe.',
  viewRequest: 'Ver solicitud', viewAndClaim: 'Ver y pedir', pickUp: 'Tomar', view: 'Ver',
  waitingManager: 'Esperando a tu gerente', nextWeek: 'Próxima semana', getAlerts: 'Recibir alertas en este dispositivo',
  atYourLocations: 'Turnos en tus localidades que puedes tomar', yourOpenRequests: 'Tus solicitudes de turnos disponibles',
  confirmsNote: 'Tu gerente confirma antes de que el turno sea tuyo. Recibirás una notificación en cualquier caso.',
  shift: 'Turno', endsLower: (day: string) => `termina ${day}`, location: 'Localidad', position: 'Puesto', you: 'Tú', cantWork: 'No puedo trabajar', approved: 'Aprobado',
  changeShift: 'Cambiar este turno', swapTeammate: 'Cambiar con un compañero', offerCover: 'Ofrecerlo para cubrir', cantWorkShift: 'No puedo trabajar este turno',
  staysYours: 'Sigue siendo tu turno hasta que se complete un cambio o tu gerente apruebe tu solicitud.',
  youreLead: 'Eres líder de turno', swapSomeone: 'Cambiar con alguien', offerForCover: 'Ofrecer para cubrir', iCantWork: 'No puedo trabajar este turno', tellsManager: 'Le avisa a tu gerente enseguida',
  retryConfirmation: 'Reintentar confirmación', confirmSchedule: 'Confirmar horario', confirming: 'Confirmando…', retry: 'Reintentar',
  confirmPreparing: 'Confirmar horario, preparando', preparing: 'Preparando la confirmación…',
  conflict: 'El horario cambió. Revisa la semana actual antes de confirmar.',
  blocked: 'Ya no tienes autorización para esta revisión. Inicia sesión y revisa el horario otra vez.',
  unknown: 'No sabemos si se confirmó. Reintenta para verificar la confirmación original.',
  unavailable: 'La confirmación no está disponible. Reintenta la confirmación original.',
  checking: 'Verificando la confirmación del horario actual…', reviewCurrent: 'Revisar horario actual',
  allDay: 'Todo el día', days: (n: number) => `${n} días`,
  pill: {waiting: 'En espera', approved: 'Aprobada', declined: 'Rechazada', withdrawn: 'Retirada', openToCheck: 'Abrir para verificar', waitingTeammate: 'Esperando a un compañero',
    waitingCover: 'Esperando cobertura', completed: 'Completada', recorded: 'Registrada', cancelled: 'Cancelada', expired: 'Vencida'},
  subAll: 'Días libres y cambios de turno que enviaste', subTimeOff: 'Días libres que pediste', subShifts: 'Cambios de turno que enviaste',
  requests: 'Solicitudes', requestTimeOff: 'Pedir días libres', nothingWaiting: 'Nada en espera ahora.', decided: 'Decididas',
  seeAllDecided: 'Ver todas las solicitudes decididas', seeAll: 'Ver todas',
  inactivePosition: 'Puesto inactivo, se mantiene como calificación', inactive: 'Inactiva', primaryIncluded: 'Localidad principal, siempre incluida',
  available: (n: number) => `${n} disponibles`, positions: 'Puestos', positionsHelp: 'Lo que está preparado para hacer. Es aparte de su rol de acceso.',
  positionQualifications: 'Calificaciones de puesto', noPositions: 'No hay puestos activos. Los puestos son opcionales.',
  locationsTitle: 'Localidades donde puede trabajar', locationsHelp: 'Su localidad principal siempre está incluida.', eligibleLocations: 'Localidades elegibles',
};

export type ScheduleCopy = typeof en;
export const EMPLOYEE_SCHEDULE_COPY: Record<ScheduleLang, ScheduleCopy> = {en, es};
export const employeeScheduleCopy = (lang: ScheduleLang = 'en'): ScheduleCopy => EMPLOYEE_SCHEDULE_COPY[lang];
export const SCHEDULE_LOCALE: Record<ScheduleLang, string> = {en: 'en-US', es: 'es-PR'};
