import type { PortalLang } from "@/lib/i18n/portal-lang";

/** Things to do (manager-inbox-corp): the page's words in each portal language. Signed-in Spanish: English unchanged, tú,
 * Puerto Rico Spanish. The key sets must match (portal-requests-copy.test.ts). */
const en = {
  locale: "en-US",
  status: {
    loading: "Checking what needs you…", reconnecting: "Reconnecting…", offline: "You’re offline. This updates when you reconnect.",
    paused: "Paused while you’re away. It updates when you come back.", unavailable: "Things to do isn’t available right now.",
    access_lost: "Sign in again to see what needs you.", not_allowed: "You don’t have access to Things to do. Ask the Owner if you need it.", ready: "Things to do isn’t available right now.",
  },
  needs: (n: string) => `Needs ${n} ${n === "1" ? "person" : "people"}`,
  coverRequest: "Cover request · ",
  days: (n: number) => `${n} days`,
  allDay: "All day",
  withPerson: (label: string, other: string) => `${label}, with ${other}`,
  today: "Today",
  openAllDay: "Open all day",
  openCountOne: "{count} open",
  openCountOther: "{count} open",
  contactFor: (name: string, status: string) => `Contact for ${name}: ${status}`,
  reviewTimecardFor: (name: string, status: string) => `Review timecard for ${name}: ${status}`,
  thisPayPeriod: "This pay period",
  periodEnded: "Pay period ended",
  periodOpen: "Pay period open",
  timecards: (shown: number, all: number) => `${shown === all ? shown : `${shown} of ${all}`} ${all === 1 ? "timecard" : "timecards"}`,
  opens: (day: string) => `Opens ${day}`,
  shiftBegan: (time: string) => `Shift began ${time}`,
  shiftEnded: (time: string) => `Shift ended ${time}`,
  viewShiftFor: (name: string) => `View scheduled shift for ${name}`,
  notAssigned: "Not assigned",
  groups: {
    repair: "Shifts to fill", open: "Open shifts", missed: "Missed clock-ins", now: "Needs attention now", corrections: "Time corrections",
    timecards: "Timecards to approve", timeOff: "Time off", swaps: "Shift requests", cantWork: "Can’t work", requests: "Other requests",
    stillOpen: "Pay period still open", plan: "Plan ahead", earlier: "Earlier this week",
  },
  families: { open: "Open shifts", time: "Time", requests: "Requests" },
  approveFrom: (day: string) => `You can approve these from ${day}.`,
  gapsEarlier: (n: number) => `Coverage gaps earlier this week, ${n}`,
  coverageGaps: "Coverage gaps",
  nothingToDo: "Nothing to do right now.",
  thingsToDo: (n: number) => `${n} ${n === 1 ? "thing" : "things"} to do today.`,
  seeAllTimeOffLabel: "See all time off requests", seeAllTimeOff: "See all time off",
  more: "More", allTimeOffLabel: "All time off requests", timeOffRequests: "Time off requests",
  allShiftRequestsLabel: "All shift requests", shiftRequests: "Shift requests",
  laterLabel: "Later and done: plan ahead and earlier this week", later: "Later and done",
  title: "Things to do", home: "Home",
  failedTitle: "Things to do isn’t available", failedLine: "Check your connection, then try again.", tryAgain: "Try again", signIn: "Sign in",
  nothingLater: "Nothing later or done", nothingLaterLine: "Planning items and earlier gaps appear here.",
  allSet: "You’re all set", nothingLine: "Nothing needs you right now.",
  waiting: "Waiting for review",
  clockInsFailed: "Clock-ins can’t be checked right now.", clockIns: "Clock-ins",
  limited: "Some attendance comparisons are unavailable.", whoIsWorking: "See who’s working",
  plan: {
    COVERAGE_GAP: "Open shifts later this week", TARGET_MISSING: "People without hour targets", DEADLINE_MISSING: "Availability deadline",
    AVAILABILITY_MISSING: "Availability not sent", ACKNOWLEDGEMENT_MISSING: "Schedule not confirmed", TIMECARD: "Timecards to review",
    HOURS_REVIEW: "Hours outside targets", COVERAGE_RULES_MISSING: "Coverage rules not set", TIME_CORRECTION: "Time corrections", ATTENDANCE: "Attendance to review",
  } as Record<string, string>,
};

export type InboxCopy = typeof en;

const es: InboxCopy = {
  locale: "es-PR",
  status: {
    loading: "Revisando qué necesita tu atención…", reconnecting: "Reconectando…", offline: "Estás sin conexión. Esto se actualiza cuando vuelvas a conectarte.",
    paused: "En pausa mientras no estás. Se actualiza cuando regreses.", unavailable: "Pendientes no está disponible en este momento.",
    access_lost: "Vuelve a iniciar sesión para ver qué necesita tu atención.", not_allowed: "No tienes acceso a Pendientes. Pídeselo al Dueño si lo necesitas.", ready: "Pendientes no está disponible en este momento.",
  },
  needs: (n: string) => `Falta${n === "1" ? "" : "n"} ${n} ${n === "1" ? "persona" : "personas"}`,
  coverRequest: "Solicitud de cobertura · ",
  days: (n: number) => `${n} días`,
  allDay: "Todo el día",
  withPerson: (label: string, other: string) => `${label}, con ${other}`,
  today: "Hoy",
  openAllDay: "Disponible todo el día",
  openCountOne: "{count} sin cubrir",
  openCountOther: "{count} sin cubrir",
  contactFor: (name, status) => `Contactar a ${name}: ${status}`,
  reviewTimecardFor: (name, status) => `Revisar la tarjeta de tiempo de ${name}: ${status}`,
  thisPayPeriod: "Este período de pago",
  periodEnded: "Período de pago terminado",
  periodOpen: "Período de pago abierto",
  timecards: (shown: number, all: number) => `${shown === all ? shown : `${shown} de ${all}`} ${all === 1 ? "tarjeta de tiempo" : "tarjetas de tiempo"}`,
  opens: (day: string) => `Abre el ${day}`,
  shiftBegan: (time: string) => `El turno empezó a las ${time}`,
  shiftEnded: (time: string) => `El turno terminó a las ${time}`,
  viewShiftFor: (name: string) => `Ver el turno programado de ${name}`,
  notAssigned: "Sin asignar",
  groups: {
    repair: "Turnos por cubrir", open: "Turnos disponibles", missed: "Entradas no marcadas", now: "Necesita atención ahora", corrections: "Correcciones de tiempo",
    timecards: "Tarjetas de tiempo por aprobar", timeOff: "Días libres", swaps: "Cambios de turno", cantWork: "No puedo trabajar", requests: "Otras solicitudes",
    stillOpen: "Período de pago aún abierto", plan: "Por planificar", earlier: "Antes esta semana",
  },
  families: { open: "Turnos disponibles", time: "Tiempo", requests: "Solicitudes" },
  approveFrom: (day: string) => `Puedes aprobarlas desde el ${day}.`,
  gapsEarlier: (n: number) => `Turnos sin cubrir antes esta semana, ${n}`,
  coverageGaps: "Turnos sin cubrir",
  nothingToDo: "No hay nada pendiente ahora.",
  thingsToDo: (n: number) => `${n} ${n === 1 ? "pendiente" : "pendientes"} para hoy.`,
  seeAllTimeOffLabel: "Ver todas las solicitudes de días libres", seeAllTimeOff: "Ver todos los días libres",
  more: "Más", allTimeOffLabel: "Todas las solicitudes de días libres", timeOffRequests: "Solicitudes de días libres",
  allShiftRequestsLabel: "Todos los cambios de turno", shiftRequests: "Cambios de turno",
  laterLabel: "Después y hecho: lo que viene y lo anterior de esta semana", later: "Después y hecho",
  title: "Pendientes", home: "Inicio",
  failedTitle: "No pudimos cargar Pendientes", failedLine: "Revisa tu conexión y vuelve a intentarlo.", tryAgain: "Intentar de nuevo", signIn: "Iniciar sesión",
  nothingLater: "Nada para después ni hecho", nothingLaterLine: "Aquí aparecen lo que hay que planificar y los turnos sin cubrir anteriores.",
  allSet: "Estás al día", nothingLine: "No tienes nada pendiente ahora.",
  waiting: "Esperando revisión",
  clockInsFailed: "No pudimos verificar las entradas ahora.", clockIns: "Entradas",
  limited: "Algunas comparaciones de asistencia no están disponibles.", whoIsWorking: "Ver quién está en turno",
  plan: {
    COVERAGE_GAP: "Turnos disponibles más adelante esta semana", TARGET_MISSING: "Personas sin meta de horas", DEADLINE_MISSING: "Fecha límite de disponibilidad",
    AVAILABILITY_MISSING: "Disponibilidad no enviada", ACKNOWLEDGEMENT_MISSING: "Horario no confirmado", TIMECARD: "Tarjetas de tiempo por revisar",
    HOURS_REVIEW: "Horas fuera de la meta", COVERAGE_RULES_MISSING: "Reglas de cobertura sin configurar", TIME_CORRECTION: "Correcciones de tiempo", ATTENDANCE: "Asistencia por revisar",
  },
};

export const MANAGER_INBOX_COPY: Record<PortalLang, InboxCopy> = { en, es };
export const managerInboxCopy = (lang: PortalLang = "en") => MANAGER_INBOX_COPY[lang];

export const copy = {
  en: {
    // src/components/manager-inbox.tsx:30
    loading: 'Loading your Inbox…',
    // src/components/manager-inbox.tsx:30
    reconnecting: 'Reconnecting…',
    // src/components/manager-inbox.tsx:30
    offline: 'You’re offline. This updates when you reconnect.',
    // src/components/manager-inbox.tsx:30
    paused: 'Paused while you’re away. It updates when you come back.',
    // src/components/manager-inbox.tsx:31
    unavailable: 'The Inbox isn’t available right now.',
    // src/components/manager-inbox.tsx:31
    signInAgainSeeInbox: 'Sign in again to see your Inbox.',
    // src/components/manager-inbox.tsx:31
    donHaveAccessInboxAskOwner: 'You don’t have access to the Inbox. Ask the Owner if you need it.',
    // src/components/manager-inbox.tsx:35, src/components/manager-inbox.tsx:306, src/components/manager-inbox.tsx:338, src/components/manager-inbox.tsx:407, src/components/manager-inbox.tsx:420, src/components/manager-inbox.tsx:457
    exampleNow: 'now',
    // src/components/manager-inbox.tsx:35, src/components/manager-inbox.tsx:420
    actNow: 'Act now',
    // src/components/manager-inbox.tsx:35, src/components/manager-inbox.tsx:462
    requests: 'Requests',
    // src/components/manager-inbox.tsx:35, src/components/manager-inbox.tsx:469
    planAhead: 'Plan ahead',
    // src/components/manager-inbox.tsx:39, src/components/manager-inbox.tsx:455
    nothing: 'Nothing needs you right now.',
    // src/components/manager-inbox.tsx:40
    now: 'Nothing to act on now.',
    // src/components/manager-inbox.tsx:41
    requests2: 'No requests are waiting.',
    // src/components/manager-inbox.tsx:42
    planning: 'Nothing to plan ahead right now.',
    // src/components/manager-inbox.tsx:103
    requestNote: 'The dates, the length and any note are on the request. Approve or decline it there.',
    // src/components/manager-inbox.tsx:106
    shiftStillNeedsPeopleOpenCoverage: 'This shift still needs people. Open the coverage gap to fill it.',
    // src/components/manager-inbox.tsx:107
    setWeeklyHourTargetInScheduling: 'Set a weekly hour target in Scheduling rules.',
    // src/components/manager-inbox.tsx:108
    theirScheduledHoursAreOutsideTheir: 'Their scheduled hours are outside their weekly target. Check the schedule.',
    // src/components/manager-inbox.tsx:109
    onlyTheyCanSendOpenAvailability: 'Only they can send it. Open Availability to see who hasn’t.',
    // src/components/manager-inbox.tsx:110
    onlyTheyCanConfirmOpenSchedule: 'Only they can confirm it. Open the schedule to see who hasn’t.',
    // src/components/manager-inbox.tsx:111
    setWhenAvailabilityDueWeekOn: 'Set when availability is due for this week, on the Schedule.',
    // src/components/manager-inbox.tsx:112
    setHowManyPeopleEachShift: 'Set how many people each shift needs in Scheduling rules.',
    // src/components/manager-inbox.tsx:113
    openTimecardCheckBeforeApproved: 'Open the timecard to check it before it’s approved.',
    // src/components/manager-inbox.tsx:114
    openSeeChangeTheyAsked: 'Open it to see the change they asked for.',
    // src/components/manager-inbox.tsx:115
    openAttendanceSeeWhatWasRecorded: 'Open Attendance to see what was recorded.',
    // src/components/manager-inbox.tsx:118
    scheduling: 'Open it to fix it on the schedule.',
    // src/components/manager-inbox.tsx:119
    timekeeping: 'Open it to see the recorded time.',
    // src/components/manager-inbox.tsx:128
    fullDay: 'Full day',
    // src/components/manager-inbox.tsx:128
    fullDays: '{days} full days',
    // src/components/manager-inbox.tsx:134
    dates: 'Dates',
    // src/components/manager-inbox.tsx:135
    time: 'Time',
    // src/components/manager-inbox.tsx:137
    length: 'Length',
    // src/components/manager-inbox.tsx:138
    worksAt: 'Works at',
    // src/components/manager-inbox.tsx:139
    note: 'Note',
    // src/components/manager-inbox.tsx:144
    timeOffApprovedPublishedShiftKept: 'The time off is approved and the published shift is kept. Assign a replacement or change the shift, then publish. {item}',
    // src/components/manager-inbox.tsx:157
    waiting: 'Waiting',
    // src/components/manager-inbox.tsx:157
    needsReplacement: 'Needs a replacement',
    // src/components/manager-inbox.tsx:157
    notCovered: 'Not covered',
    // src/components/manager-inbox.tsx:159
    timeHasPassedReviewRecordDoesn: 'This time has passed. Review it for the record; it doesn’t need action now.',
    // src/components/manager-inbox.tsx:160
    approveDeclineOnFullRequest: 'Approve or decline it on the full request.',
    // src/components/manager-inbox.tsx:174
    hMin: '{h} h {m} min',
    // src/components/manager-inbox.tsx:174
    min: '{m} min',
    // src/components/manager-inbox.tsx:181
    contact: 'Contact',
    // src/components/manager-inbox.tsx:181
    reviewTimecard: 'Review timecard',
    // src/components/manager-inbox.tsx:183
    shiftBeganAt: 'Shift began at {startAt}',
    // src/components/manager-inbox.tsx:183
    shiftEndedAt: 'Shift ended at {endAt}',
    // src/components/manager-inbox.tsx:184, src/components/manager-inbox.tsx:408
    notClockedIn: 'Not clocked in',
    // src/components/manager-inbox.tsx:184
    no: 'No {CLOCK_IN}',
    // src/components/manager-inbox.tsx:185
    copy: '{action} for {employeeName}: {condition}',
    // src/components/manager-inbox.tsx:193
    shift: 'Shift',
    // src/components/manager-inbox.tsx:193
    location: 'Location',
    // src/components/manager-inbox.tsx:194
    role: 'Role',
    // src/components/manager-inbox.tsx:195
    phone: 'Phone',
    // src/components/manager-inbox.tsx:197
    checkInThemLookAtClocker: 'Check in with them, or look at the Clocker.',
    // src/components/manager-inbox.tsx:197
    checkTimecardBeforeApprove: 'Check the timecard before you approve it.',
    // src/components/manager-inbox.tsx:200
    openTimecard: 'Open timecard',
    // src/components/manager-inbox.tsx:202
    viewProfile: 'View profile',
    // src/components/manager-inbox.tsx:215
    findCover: 'Find cover',
    // src/components/manager-inbox.tsx:237
    openShiftsLaterWeek: 'Open shifts later this week',
    // src/components/manager-inbox.tsx:237
    peopleWithoutHourTargets: 'People without hour targets',
    // src/components/manager-inbox.tsx:237
    availabilityDeadline: 'Availability deadline',
    // src/components/manager-inbox.tsx:238
    availabilityNotSent: 'Availability not sent',
    // src/components/manager-inbox.tsx:238
    scheduleNotConfirmed: 'Schedule not confirmed',
    // src/components/manager-inbox.tsx:238
    timecardsReview: 'Timecards to review',
    // src/components/manager-inbox.tsx:239
    hoursOutsideTargets: 'Hours outside targets',
    // src/components/manager-inbox.tsx:239
    coverageRulesNotSet: 'Coverage rules not set',
    // src/components/manager-inbox.tsx:239
    timeCorrections: 'Time corrections',
    // src/components/manager-inbox.tsx:239
    attendanceReview: 'Attendance to review',
    // src/components/manager-inbox.tsx:245
    notSet: 'Not set',
    // src/components/manager-inbox.tsx:413
    showMore: 'Show {noClockInCount} more',
    // src/components/manager-inbox.tsx:420
    openShifts: 'Open shifts',
    // src/components/manager-inbox.tsx:435
    inbox: 'Inbox',
    // src/components/manager-inbox.tsx:437
    show: 'Show',
    // src/components/manager-inbox.tsx:452
    signIn: 'Sign in',
    // src/components/manager-inbox.tsx:453, src/components/manager-inbox.tsx:459
    tryAgain: 'Try again',
    // src/components/manager-inbox.tsx:455
    nothingNeedsRightNowSomeAttendance: 'Nothing needs you right now. Some attendance comparisons are unavailable.',
    // src/components/manager-inbox.tsx:458
    clockInsUnchecked: 'Clock-ins can’t be checked right now.',
    // src/components/manager-inbox.tsx:476
    earlierWeek: 'Earlier this week',
    // src/components/manager-inbox.tsx:483
    someAttendanceComparisonsAreUnavailable: 'Some attendance comparisons are unavailable.',
    // src/components/manager-inbox.tsx:533
    call: 'Call {name}',
    // src/components/manager-inbox.tsx:533
    call2: 'Call',
    // src/components/manager-inbox.tsx:534
    text: 'Text {name}',
    // src/components/manager-inbox.tsx:534
    text2: 'Text',
    // src/components/manager-inbox.tsx:554
    done: 'Done',
    // src/components/manager-inbox.tsx:571
    timeOff: 'Time off',
    // src/components/manager-inbox.tsx:571
    meta: 'Pending, approved and declined',
    // src/components/manager-inbox.tsx:572
    shiftRequests: 'Shift requests',
    // src/components/manager-inbox.tsx:572
    meta2: 'Swaps and shifts people can’t work',
    // src/components/manager-inbox.tsx:573
    availability: 'Availability',
    // src/components/manager-inbox.tsx:573
    meta3: 'When people can work',
    // src/components/manager-inbox.tsx:579
    allRequests: 'All requests',
  },
  es: {
    // src/components/manager-inbox.tsx:30
    loading: 'Revisando lo que te necesita…',
    // src/components/manager-inbox.tsx:30
    reconnecting: 'Reconectando…',
    // src/components/manager-inbox.tsx:30
    offline: 'Estás fuera de línea. Esto se actualiza cuando te reconectas',
    // src/components/manager-inbox.tsx:30
    paused: 'Se ha pausado mientras estás fuera. Se actualiza cuando vuelvas',
    // src/components/manager-inbox.tsx:31
    unavailable: 'El buzón de entrada no está disponible en este momento',
    // src/components/manager-inbox.tsx:31
    signInAgainSeeInbox: 'Inicia sesión de nuevo para ver tus pendientes',
    // src/components/manager-inbox.tsx:31
    donHaveAccessInboxAskOwner: 'No tienes acceso al buzón de entrada. Pregunta al dueño si lo necesitas',
    // src/components/manager-inbox.tsx:35, src/components/manager-inbox.tsx:306, src/components/manager-inbox.tsx:338, src/components/manager-inbox.tsx:407, src/components/manager-inbox.tsx:420, src/components/manager-inbox.tsx:457
    exampleNow: 'ahora',
    // src/components/manager-inbox.tsx:35, src/components/manager-inbox.tsx:420
    actNow: 'Actúa ahora',
    // src/components/manager-inbox.tsx:35, src/components/manager-inbox.tsx:462
    requests: 'Solicitudes',
    // src/components/manager-inbox.tsx:35, src/components/manager-inbox.tsx:469
    planAhead: 'Planifica con anticipación',
    // src/components/manager-inbox.tsx:39, src/components/manager-inbox.tsx:455
    nothing: 'No tienes nada pendiente ahora.',
    // src/components/manager-inbox.tsx:40
    now: 'Nada para actuar ahora',
    // src/components/manager-inbox.tsx:41
    requests2: 'No hay solicitudes pendientes.',
    // src/components/manager-inbox.tsx:42
    planning: 'No hay nada que planificar de antemano en este momento',
    // src/components/manager-inbox.tsx:103
    requestNote: 'Las fechas, la duración y cualquier nota están en la solicitud. Aprobándola o rechazándola allí',
    // src/components/manager-inbox.tsx:106
    shiftStillNeedsPeopleOpenCoverage: 'Este turno todavía necesita gente. Abre lo que falta por cubrir para completarlo',
    // src/components/manager-inbox.tsx:107
    setWeeklyHourTargetInScheduling: 'Establezca una hora objetivo semanal en las reglas de programación',
    // src/components/manager-inbox.tsx:108
    theirScheduledHoursAreOutsideTheir: 'Sus horas programadas están fuera de su objetivo semanal. Consulta el horario',
    // src/components/manager-inbox.tsx:109
    onlyTheyCanSendOpenAvailability: 'Solo cada persona puede enviar su disponibilidad. Abre Disponibilidad para ver quién falta.',
    // src/components/manager-inbox.tsx:110
    onlyTheyCanConfirmOpenSchedule: 'Solo cada persona puede confirmar su horario. Abre Horario para ver quién falta.',
    // src/components/manager-inbox.tsx:111
    setWhenAvailabilityDueWeekOn: 'Establecido cuando la disponibilidad está programada para esta semana, en el calendario',
    // src/components/manager-inbox.tsx:112
    setHowManyPeopleEachShift: 'Configura cuántas personas necesita cada turno en las reglas de programación',
    // src/components/manager-inbox.tsx:113
    openTimecardCheckBeforeApproved: 'Abre la tarjeta de tiempo para comprobarla antes de que sea aprobada',
    // src/components/manager-inbox.tsx:114
    openSeeChangeTheyAsked: 'Ábrelo para ver el cambio que pidieron',
    // src/components/manager-inbox.tsx:115
    openAttendanceSeeWhatWasRecorded: 'Abre Asistencia para ver qué se registró.',
    // src/components/manager-inbox.tsx:118
    scheduling: 'Ábrelo para arreglarlo en el horario',
    // src/components/manager-inbox.tsx:119
    timekeeping: 'Ábrelo para ver el tiempo registrado',
    // src/components/manager-inbox.tsx:128
    fullDay: 'Día completo',
    // src/components/manager-inbox.tsx:128
    fullDays: '{days} días completos',
    // src/components/manager-inbox.tsx:134
    dates: 'Fechas',
    // src/components/manager-inbox.tsx:135
    time: 'Tiempo',
    // src/components/manager-inbox.tsx:137
    length: 'Longitud',
    // src/components/manager-inbox.tsx:138
    worksAt: 'Trabaja en',
    // src/components/manager-inbox.tsx:139
    note: 'Nota',
    // src/components/manager-inbox.tsx:144
    timeOffApprovedPublishedShiftKept: 'Los días libres están aprobados y el turno publicado se mantiene. Asigna un reemplazo o cambia el turno y luego publica. {item}',
    // src/components/manager-inbox.tsx:157
    waiting: 'En espera',
    // src/components/manager-inbox.tsx:157
    needsReplacement: 'Necesita reemplazo',
    // src/components/manager-inbox.tsx:157
    notCovered: 'Sin cubrir',
    // src/components/manager-inbox.tsx:159
    timeHasPassedReviewRecordDoesn: 'Este tiempo ha pasado. Revíselo para el registro; no necesita acción ahora',
    // src/components/manager-inbox.tsx:160
    approveDeclineOnFullRequest: 'Aprobarlo o rechazarlo en la solicitud completa',
    // src/components/manager-inbox.tsx:174
    hMin: '{h} h {m} min',
    // src/components/manager-inbox.tsx:174
    min: '{m} min',
    // src/components/manager-inbox.tsx:181
    contact: 'Contacto',
    // src/components/manager-inbox.tsx:181
    reviewTimecard: 'Tarjeta de tiempo de revisión',
    // src/components/manager-inbox.tsx:183
    shiftBeganAt: 'El turno comenzó en {startAt}',
    // src/components/manager-inbox.tsx:183
    shiftEndedAt: 'Turno finalizado en {endAt}',
    // src/components/manager-inbox.tsx:184, src/components/manager-inbox.tsx:408
    notClockedIn: 'Sin marcar entrada',
    // src/components/manager-inbox.tsx:184
    no: 'Sin {CLOCK_IN}',
    // src/components/manager-inbox.tsx:185
    copy: '{action} para {employeeName}: {condition}',
    // src/components/manager-inbox.tsx:193
    shift: 'Turno',
    // src/components/manager-inbox.tsx:193
    location: 'Localidad',
    // src/components/manager-inbox.tsx:194
    role: 'Rol',
    // src/components/manager-inbox.tsx:195
    phone: 'Teléfono',
    // src/components/manager-inbox.tsx:197
    checkInThemLookAtClocker: 'Comunícate con la persona o revisa Clocker.',
    // src/components/manager-inbox.tsx:197
    checkTimecardBeforeApprove: 'Comprueba la tarjeta de tiempo antes de aprobarla',
    // src/components/manager-inbox.tsx:200
    openTimecard: 'Tarjeta de tiempo de apertura',
    // src/components/manager-inbox.tsx:202
    viewProfile: 'Ver perfil',
    // src/components/manager-inbox.tsx:215
    findCover: 'Buscar quién cubra',
    // src/components/manager-inbox.tsx:237
    openShiftsLaterWeek: 'Turnos disponibles el resto de la semana',
    // src/components/manager-inbox.tsx:237
    peopleWithoutHourTargets: 'Personas sin objetivos de horas',
    // src/components/manager-inbox.tsx:237
    availabilityDeadline: 'Fecha límite de disponibilidad',
    // src/components/manager-inbox.tsx:238
    availabilityNotSent: 'Disponibilidad sin enviar',
    // src/components/manager-inbox.tsx:238
    scheduleNotConfirmed: 'Horario por confirmar',
    // src/components/manager-inbox.tsx:238
    timecardsReview: 'Tarjetas de tiempo por revisar',
    // src/components/manager-inbox.tsx:239
    hoursOutsideTargets: 'Horas fuera de objetivos',
    // src/components/manager-inbox.tsx:239
    coverageRulesNotSet: 'Las reglas de cobertura no están establecidas',
    // src/components/manager-inbox.tsx:239
    timeCorrections: 'Correcciones de tiempo',
    // src/components/manager-inbox.tsx:239
    attendanceReview: 'Asistencia a la revisión',
    // src/components/manager-inbox.tsx:245
    notSet: 'Sin indicar',
    // src/components/manager-inbox.tsx:413
    showMore: 'Mostrar más {noClockInCount}',
    // src/components/manager-inbox.tsx:420
    openShifts: 'Turnos disponibles',
    // src/components/manager-inbox.tsx:435
    inbox: 'Carpeta de entrada',
    // src/components/manager-inbox.tsx:437
    show: 'Mostrar',
    // src/components/manager-inbox.tsx:452
    signIn: 'Iniciar sesión',
    // src/components/manager-inbox.tsx:453, src/components/manager-inbox.tsx:459
    tryAgain: 'Intentar de nuevo',
    // src/components/manager-inbox.tsx:455
    nothingNeedsRightNowSomeAttendance: 'No necesitas nada ahora mismo. Algunas comparaciones de asistencia no están disponibles',
    // src/components/manager-inbox.tsx:458
    clockInsUnchecked: 'No pudimos verificar las entradas ahora.',
    // src/components/manager-inbox.tsx:476
    earlierWeek: 'A principios de esta semana',
    // src/components/manager-inbox.tsx:483
    someAttendanceComparisonsAreUnavailable: 'Algunas comparaciones de asistencia no están disponibles',
    // src/components/manager-inbox.tsx:533
    call: 'Llama a {name}',
    // src/components/manager-inbox.tsx:533
    call2: 'Llamar',
    // src/components/manager-inbox.tsx:534
    text: 'Escribe {name}',
    // src/components/manager-inbox.tsx:534
    text2: 'Texto',
    // src/components/manager-inbox.tsx:554
    done: 'Listo',
    // src/components/manager-inbox.tsx:571
    timeOff: 'Días libres',
    // src/components/manager-inbox.tsx:571
    meta: 'Pendiente, aprobado y rechazado',
    // src/components/manager-inbox.tsx:572
    shiftRequests: 'Cambios de turno',
    // src/components/manager-inbox.tsx:572
    meta2: 'Los turnos y los cambios de personal no pueden trabajar',
    // src/components/manager-inbox.tsx:573
    availability: 'Disponibilidad',
    // src/components/manager-inbox.tsx:573
    meta3: 'Cuando la gente puede trabajar',
    // src/components/manager-inbox.tsx:579
    allRequests: 'Todas las solicitudes',
  },
} as const;
