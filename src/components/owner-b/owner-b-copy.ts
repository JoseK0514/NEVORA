import { withSpanishHourArticle } from "@/lib/i18n/spanish-clock-time";
import { workCopy } from "../employee-b/work-copy";

/* Signed-in Spanish (Jose's gap closure, Nov 23, 2026): the words of Direction B's Owner and Manager Home, Things to do,
 * Team and the plan and billing notice, in English and in Puerto Rico Spanish (docs/design/voice.md: tú, sentence case,
 * the glossary: Pendientes, Turno disponible, Días libres, En turno, Tarjeta de tiempo, Aviso, Dueño). The English is the
 * screens' own wording, moved here unchanged; each view takes the person's language (usePortalLang) and reads one half.
 * Both halves have the same keys (owner-b-copy.test.ts). */
export type OwnerBLang = "en" | "es";

const plural = (n: number, one: string, many: string) => `${n}\u00a0${n === 1 ? one : many}`;
const NB = " ";

const en = {
  locale: "en-US",
  /** The kit's greeting (partOfDay) in this language. */
  greeting: { "Good morning": "Good morning", "Good afternoon": "Good afternoon", "Good evening": "Good evening" } as Record<string, string>,
  home: {
    shortcuts: "Shortcuts",
    shortcut: { shift: "Add shift", employee: "Add employee", update: "Send update", timeOff: "Time off" },
    // home-b.tsx:83 — English already names the action in full.
    shiftShortcutShort: "Add shift",
    employeeShortcutDescription: "",
    allSet: "You’re all set", offline: "You’re offline", paused: "Paused while you’re away", checkingToday: "Checking today…",
    // src/components/owner-b/home-b.tsx:184
    notClockedInShort: "Not clocked in",
    rightNow: "Right now", clockedIn: "Clocked in", openShifts: "Open shifts", openShiftsShort: "Open shifts", timeClock: "Time clock", notSetUp: "Not set up",
    finishSetup: "Finish setting up",
    thingsToDo: "Things to do", didntLoad: "Things to do didn’t load", checkConnection: "Check your connection, then try again.", tryAgain: "Try again",
    updatesReconnect: "Updates when you reconnect.", updatesBack: "Updates when you’re back.", signInAgain: "Sign in again to see what needs you.",
    noAccess: "You don’t have access to Things to do. Ask the Owner if you need it.", checkingNeeds: "Checking what needs you…",
    coverOne: "Cover an open shift", coverMany: "Cover open shifts", next: "Next: ", nextToday: "today, ", openAllDay: "Open all day",
    findCover: "Find cover", findCoverFor: (what: string) => `Find cover: ${what}`,
    fillShift: "Fill shift", fillPersonShift: (name: string) => `Fill ${name}’s shift`, fillMany: (n: number) => `Fill ${plural(n, "shift", "shifts")} for approved time off`,
    fillManyLabel: (n: number) => `Shifts to fill for approved time off, ${n}`,
    /** "Fill Maria Rivera’s shift" → the name, for "Next: …". */
    fillPrefix: /^Fill /,
    people: (n: number) => `${n}${NB}people`, shiftBegan: "shift began", shiftEnded: "shift ended",
    missedClockIns: (n: number) => plural(n, "missed clock-in", "missed clock-ins"), missedClockIn: "Missed clock-in",
    corrections: (n: number) => plural(n, "time correction", "time corrections"),
    toReview: (n: number) => plural(n, "item to review", "items to review"), toReviewSub: "Time corrections and timecards",
    seeAll: "See all", seeAllAria: "See all things to do",
    clockInsUnchecked: "Clock-ins can’t be checked right now.", nothing: "Nothing needs you right now.",
    notAllCheckedLine: "Some of this list could not be checked. Try again in a moment.",
    requestKind: { TIME_OFF: "Time-off request", EXCHANGE: "Shift request", CALLOUT: "Can’t-work request" } as Record<string, string>,
    requestWord: { TIME_OFF: "Time off", EXCHANGE: "Shift swap", CALLOUT: "Can’t work" } as Record<string, string>,
    today: "Today", seeEveryone: "See everyone", seeEveryoneAria: "See everyone working today",
    clockedInNow: "Clocked in now", clockedInCount: (n: number) => `${n} clocked in`, onNow: "On now", onBreak: "On break",
    stillClockedIn: "Still clocked in", stillClockedInSince: workCopy("en").stillClockedIn, inSince: (time: string) => `In since ${time}`,
    nobody: "Nobody is working right now.", nobodyNext: (time: string) => `Nobody is working right now. Next shift starts ${time}.`,
    seeMore: (n: number) => `See ${n} more`, seeMoreAria: (n: number) => `See ${n} more working today`,
    person: "Person", personMany: "People", scheduled: "Scheduled", peak: (time: string) => `Peak, ${time}`,
    byHour: "People scheduled by hour", now: "Now",
    payroll: "Payroll", payrollUnavailable: "Payroll status isn’t available right now", openPayroll: "Open payroll",
    overdueLabel: "Pay periods with no payroll", reviewLabel: "Payroll schedule needs review",
    hasNoPayroll: (range: string) => `${range} has no payroll`,
    paydayWas: (day: string) => `Scheduled payday was ${day}`,
    periodAndPayday: (range: string, day: string) => `Pay period ${range} · Scheduled payday ${day}`,
    prepare: (range: string) => `Prepare ${range}`,
    todayWord: "Today", tomorrow: "Tomorrow", inDays: (n: number) => `In ${n} days`,
    scheduledPayday: "Scheduled payday", scheduledPaydayOn: (day: string) => `Scheduled payday ${day}`,
    timecards: "Timecards", checking: "Checking…", notAvailable: "Not available right now",
    periodsEnded: "Pay periods ended", periodEnded: "Pay period ended", periodNamedEnded: (range: string) => `Pay period ${range} ended`,
    openNow: "Open now", opens: (day: string) => `Opens ${day}`, approval: "Timecard approval", noneWaiting: "None waiting",
    reviewTimecards: "Review timecards", seeWeekHours: "See this week’s hours",
    // home-b.tsx:591
    reviewTimecardsShort: "Review timecards",
    // home-b.tsx:591
    seeWeekHoursShort: "See this week’s hours",
    payPeriod: (range: string) => `Pay period ${range}`, approveTimecards: "Approve timecards", from: (day: string) => `From ${day}`,
    preparePayroll: "Prepare payroll", openTimecards: "Open timecards",
    otherReviewerYours: "Another reviewer approves your timecard",
    covered: "Covered this week", staffing: "Staffing", of: (a: string, b: string) => `${a} of ${b}`,
    positions: "Positions", lead: "Lead",
    staffingExplain: "Staffing compares the staff time on the schedule with the staff time your staffing needs ask for. It is not hours worked and not pay.",
    thisWeek: "This week", schedule: "Schedule", planned: "Planned", shift: "Shift", shifts: "Shifts", staff: "Staff",
    byDay: "Shifts by day", perDay: (list: string) => `Shifts per day: ${list}`, byHourList: (list: string) => `People scheduled by hour: ${list}`,
  },
  inbox: {
    filter: { "card-open": "Shifts", review: "Time", "card-requests": "Requests" } as Record<string, string>,
    offlineTitle: "You’re offline", offlineLine: "Things to do updates when you reconnect.",
    pausedTitle: "Paused while you’re away", pausedLine: "It updates when you come back to this page.",
    endedTitle: "Your session ended", endedLine: "Sign in again to see what needs you.", signIn: "Sign in",
    deniedTitle: "You don’t have access to Things to do", deniedLine: "Ask the Owner if you need it.",
    failedTitle: "Things to do didn’t load", failedLine: "Check your connection, then try again.", tryAgain: "Try again",
    laterNone: "Nothing later or done", laterAll: "Plan ahead and earlier this week",
    planned: (n: number) => `${n} planned`, done: (n: number) => `${n} done`,
    nothing: "Nothing needs you right now", nothingLine: "Nothing needs you right now.", allSet: "You’re all set",
    timecardsToApprove: (n: number) => `${plural(n, "timecard", "timecards")} to approve`,
    home: "Home", title: "Things to do", show: "Show", all: "All",
    clockIns: "Clock-ins", clockInsTitle: "Clock-ins can’t be checked right now", clockInsLine: "People who haven’t clocked in may not be listed.",
    more: "More", timeOff: "Time off requests", timeOffSub: "Waiting and decided", shiftRequests: "Shift requests", shiftRequestsSub: "Swaps and covers",
    availability: "Availability", availabilitySub: "Who can work and when", later: "Later and done", laterEmpty: "Planning items and earlier gaps appear here.",
    findCover: "Find cover", findCoverFor: (what: string) => `Find cover: ${what}`,
    /** "Needs 1 person" → "Needs 1" (the facts line under an open shift). */
    needs: (n: string) => `Needs ${n}`,
    approvedTimeOff: "Approved time off", fill: "Fill", fillFor: (what: string) => `Fill shift: ${what}`,
    onSchedule: (shift: string) => `On the schedule: ${shift}`, checkOnPage: "Check the schedule on its page",
    checkExpired: "Schedule check expired", checkPaused: "Schedule check paused", checkFailed: "Couldn’t check the schedule",
    review: "Review", reviewFor: (a: string, b?: string) => `Review ${a}${b ? ` and ${b}` : ""}`,
    declineAsk: (name: string) => `Decline time off for ${name}?`, keepFor: (name: string) => `Keep time off request for ${name}`,
    declineFor: (name: string) => `Decline time off for ${name}`, approveFor: (name: string) => `Approve time off for ${name}`,
    reviewTimeOff: (name: string) => `Review time off for ${name}`,
    decline: "Decline", approve: "Approve", declining: "Declining…", approving: "Approving…", saving: "Saving your decision…",
  },
  team: {
    title: "Team", add: "Add", addPerson: (word: string) => `Add ${word}`, apply: "Apply search", search: (people: string) => `Search ${people}`,
    searchPlaceholder: "Search people", inactive: "Inactive", matches: (n: number) => `${n} ${n === 1 ? "match" : "matches"}`,
    show: "Show", all: "All", onClock: "On the clock", notClockedIn: "Not clocked in", offToday: "Off today",
    noneOn: "No one is clocked in right now.", allIn: "Everyone on shift has clocked in.", noneOff: "No one is off today.",
    noMatch: (people: string, query: string) => `No ${people} match “${query}”.`, noSearchMatch: "No one matches this search.", none: (people: string) => `No ${people} yet.`,
    clear: "Clear search", inactivePeople: (people: string) => `Inactive ${people}`, tools: "Team tools",
  },
  billing: {
    card: "Plan and billing", cardFor: (title: string) => `Plan and billing: ${title}`,
    trialEnds: (day: string) => `Your free trial ends ${day}`, trialSoon: "Your free trial ends soon",
    lastDay: "Last day. ", oneLeft: "1 day left. ", left: (n: number) => `${n} days left. `, choosePlan: "Choose a plan to keep using NEVORA.",
    chargeFailed: "We couldn’t charge your card", update: "Update your payment method.", until: (day: string) => ` Access continues until ${day}.`,
    paused: "Access is paused", openBilling: "Open Plan and billing to see what’s needed.",
  },
};

export type OwnerBCopy = typeof en;

const es: OwnerBCopy = {
  locale: "es-PR",
  greeting: { "Good morning": "Buenos días", "Good afternoon": "Buenas tardes", "Good evening": "Buenas noches" },
  home: {
    shortcuts: "Atajos",
    shortcut: { shift: "Añadir turno", employee: "Empleado", update: "Enviar aviso", timeOff: "Días libres" },
    // home-b.tsx:83 — The visible label names the person and the description explains the action.
    shiftShortcutShort: "Turno",
    employeeShortcutDescription: "Añadir empleado",
    allSet: "Estás al día", offline: "No tienes conexión", paused: "En pausa mientras no estás", checkingToday: "Revisando el día…",
    // src/components/owner-b/home-b.tsx:184
    notClockedInShort: "Sin ponchar",
    rightNow: "Ahora mismo", clockedIn: "En turno", openShifts: "Turnos disponibles", openShiftsShort: "Sin cubrir", timeClock: "Clocker", notSetUp: "Sin configurar",
    finishSetup: "Termina la configuración",
    thingsToDo: "Pendientes", didntLoad: "No pudimos cargar Pendientes", checkConnection: "Revisa tu conexión e inténtalo de nuevo.", tryAgain: "Intentar de nuevo",
    updatesReconnect: "Se actualiza cuando vuelvas a conectarte.", updatesBack: "Se actualiza cuando regreses.", signInAgain: "Inicia sesión otra vez para ver lo que te espera.",
    noAccess: "No tienes acceso a Pendientes. Pídeselo al dueño si lo necesitas.", checkingNeeds: "Revisando lo que te espera…",
    coverOne: "Cubrir turno", coverMany: "Cubrir turnos", next: "Próximo: ", nextToday: "hoy, ", openAllDay: "disponible todo el día",
    findCover: "Cubrir", findCoverFor: what => `Cubrir turno: ${what}`,
    fillShift: "Cubrir turno", fillPersonShift: name => `Cubrir el turno de ${name}`, fillMany: n => `Cubrir ${plural(n, "turno", "turnos")} por días libres aprobados`,
    fillManyLabel: n => `Turnos por cubrir por días libres aprobados, ${n}`,
    fillPrefix: /^Cubrir (el turno de )?/,
    people: n => `${n}${NB}personas`, shiftBegan: "turno desde", shiftEnded: "turno hasta",
    missedClockIns: n => plural(n, "entrada sin ponchar", "entradas sin ponchar"), missedClockIn: "Entrada sin ponchar",
    corrections: n => `${n} ${n === 1 ? "corrección de tiempo" : "correcciones de tiempo"}`,
    toReview: n => plural(n, "asunto por revisar", "asuntos por revisar"), toReviewSub: "Correcciones de tiempo y tarjetas de tiempo",
    seeAll: "Ver todo", seeAllAria: "Ver todo en Pendientes",
    clockInsUnchecked: "No pudimos verificar las entradas ahora.", nothing: "No tienes nada pendiente ahora.",
    notAllCheckedLine: "No pudimos verificar parte de la lista. Inténtalo de nuevo en un momento.",
    requestKind: { TIME_OFF: "Solicitud de días libres", EXCHANGE: "Cambio de turno", CALLOUT: "No puedo trabajar" },
    requestWord: { TIME_OFF: "Días libres", EXCHANGE: "Cambio de turno", CALLOUT: "No puedo trabajar" },
    today: "Hoy", seeEveryone: "Ver a todos", seeEveryoneAria: "Ver a todos los que trabajan hoy",
    clockedInNow: "En turno ahora", clockedInCount: n => `${n} en turno`, onNow: "Trabajando ahora", onBreak: "En descanso",
    stillClockedIn: "Sigue en turno", stillClockedInSince: time => `Turno activo desde ${withSpanishHourArticle(time)}`, inSince: time => `En turno desde ${withSpanishHourArticle(time)}`,
    nobody: "Nadie está trabajando ahora.", nobodyNext: time => `Nadie está trabajando ahora. El próximo turno empieza a las ${time}.`,
    seeMore: n => `Ver ${n} más`, seeMoreAria: n => `Ver ${n} más que trabajan hoy`,
    person: "Persona", personMany: "Personas", scheduled: "Programado", peak: time => `Máximo, ${time}`,
    byHour: "Personas programadas por hora", now: "Ahora",
    payroll: "Nómina", payrollUnavailable: "El estado de la nómina no está disponible ahora", openPayroll: "Abrir nómina",
    overdueLabel: "Períodos de pago sin nómina", reviewLabel: "El calendario de nómina necesita revisión",
    hasNoPayroll: range => `${range} no tiene nómina`,
    paydayWas: day => `El día de pago programado era ${day}`,
    periodAndPayday: (range, day) => `Período de pago ${range} · Día de pago programado ${day}`,
    prepare: range => `Preparar ${range}`,
    todayWord: "Hoy", tomorrow: "Mañana", inDays: n => `En ${n} días`,
    scheduledPayday: "Día de pago programado", scheduledPaydayOn: day => `Día de pago programado ${day}`,
    timecards: "Tarjetas de tiempo", checking: "Verificando…", notAvailable: "No disponible ahora",
    periodsEnded: "Períodos de pago terminados", periodEnded: "Período de pago terminado", periodNamedEnded: range => `Período de pago ${range} terminado`,
    openNow: "Abierto ahora", opens: day => `Abre el ${day}`, approval: "Aprobación de tarjetas", noneWaiting: "Nada pendiente",
    reviewTimecards: "Revisar tarjetas de tiempo", seeWeekHours: "Ver las horas de la semana",
    // home-b.tsx:591
    reviewTimecardsShort: "Revisar",
    // home-b.tsx:591
    seeWeekHoursShort: "Ver horas",
    payPeriod: range => `Período de pago ${range}`, approveTimecards: "Aprobar tarjetas de tiempo", from: day => `Desde el ${day}`,
    preparePayroll: "Preparar nómina", openTimecards: "Abrir tarjetas de tiempo",
    otherReviewerYours: "Otra persona aprueba tu tarjeta de tiempo",
    covered: "Cubierto esta semana", staffing: "Personal", of: (a, b) => `${a} de ${b}`,
    positions: "Puestos", lead: "Líder",
    staffingExplain: "Compara las horas del horario con las horas de personal que necesitas. No representa horas trabajadas ni paga.",
    thisWeek: "Esta semana", schedule: "Horario", planned: "Planificado", shift: "Turno", shifts: "Turnos", staff: "Personal",
    byDay: "Turnos por día", perDay: list => `Turnos por día: ${list}`, byHourList: list => `Personas programadas por hora: ${list}`,
  },
  inbox: {
    filter: { "card-open": "Turnos", review: "Tiempo", "card-requests": "Solicitudes" },
    offlineTitle: "No tienes conexión", offlineLine: "Pendientes se actualiza cuando vuelvas a conectarte.",
    pausedTitle: "En pausa mientras no estás", pausedLine: "Se actualiza cuando regreses a esta página.",
    endedTitle: "Tu sesión terminó", endedLine: "Inicia sesión otra vez para ver lo que te espera.", signIn: "Iniciar sesión",
    deniedTitle: "No tienes acceso a Pendientes", deniedLine: "Pídeselo al dueño si lo necesitas.",
    failedTitle: "No pudimos cargar Pendientes", failedLine: "Revisa tu conexión e inténtalo de nuevo.", tryAgain: "Intentar de nuevo",
    laterNone: "Nada para después ni hecho", laterAll: "Lo que viene y lo anterior de esta semana",
    planned: n => `${n} ${n === 1 ? "planificado" : "planificados"}`, done: n => `${n} ${n === 1 ? "hecho" : "hechos"}`,
    nothing: "No tienes nada pendiente ahora", nothingLine: "No tienes nada pendiente ahora.", allSet: "Estás al día",
    timecardsToApprove: n => `${plural(n, "tarjeta de tiempo", "tarjetas de tiempo")} por aprobar`,
    home: "Inicio", title: "Pendientes", show: "Mostrar", all: "Todo",
    clockIns: "Entradas", clockInsTitle: "No pudimos verificar las entradas ahora", clockInsLine: "Puede que falten personas que no han ponchado entrada.",
    more: "Más", timeOff: "Solicitudes de días libres", timeOffSub: "En espera y decididas", shiftRequests: "Cambios de turno", shiftRequestsSub: "Intercambios y coberturas",
    availability: "Disponibilidad", availabilitySub: "Quién puede trabajar y cuándo", later: "Después y hecho", laterEmpty: "Aquí aparecen lo que hay que planificar y los turnos sin cubrir anteriores.",
    findCover: "Cubrir", findCoverFor: what => `Cubrir turno: ${what}`,
    needs: n => `${n === "1" ? "Falta" : "Faltan"} ${n}`,
    approvedTimeOff: "Días libres aprobados", fill: "Cubrir", fillFor: what => `Cubrir turno: ${what}`,
    onSchedule: shift => `En el horario: ${shift}`, checkOnPage: "Revisa el horario en su página",
    checkExpired: "La revisión del horario venció", checkPaused: "Revisión del horario en pausa", checkFailed: "No pudimos revisar el horario",
    review: "Revisar", reviewFor: (a, b) => `Revisar ${a}${b ? ` y ${b}` : ""}`,
    declineAsk: name => `¿Rechazar los días libres de ${name}?`, keepFor: name => `Conservar la solicitud de días libres de ${name}`,
    declineFor: name => `Rechazar los días libres de ${name}`, approveFor: name => `Aprobar los días libres de ${name}`,
    reviewTimeOff: name => `Revisar los días libres de ${name}`,
    decline: "Rechazar", approve: "Aprobar", declining: "Rechazando…", approving: "Aprobando…", saving: "Guardando tu decisión…",
  },
  team: {
    title: "Equipo", add: "Añadir", addPerson: word => `Añadir ${word}`, apply: "Aplicar búsqueda", search: people => `Buscar ${people}`,
    searchPlaceholder: "Buscar personas", inactive: "Inactivo", matches: n => `${n} ${n === 1 ? "resultado" : "resultados"}`,
    show: "Mostrar", all: "Todos", onClock: "En turno", notClockedIn: "Sin ponchar", offToday: "Libre hoy",
    noneOn: "Nadie está en turno ahora.", allIn: "Todos los que tienen turno poncharon entrada.", noneOff: "Nadie está libre hoy.",
    noMatch: (people, query) => `Ningún resultado en ${people} para “${query}”.`, noSearchMatch: "Nadie coincide con esta búsqueda.", none: people => `Todavía no hay ${people}.`,
    clear: "Borrar búsqueda", inactivePeople: people => `${people} inactivos`, tools: "Herramientas del equipo",
  },
  billing: {
    card: "Plan y facturación", cardFor: title => `Plan y facturación: ${title}`,
    trialEnds: day => `Tu prueba gratis termina el ${day}`, trialSoon: "Tu prueba gratis termina pronto",
    lastDay: "Último día. ", oneLeft: "Queda 1 día. ", left: n => `Quedan ${n} días. `, choosePlan: "Elige un plan para seguir usando NEVORA.",
    chargeFailed: "No pudimos cobrar a tu tarjeta", update: "Actualiza tu método de pago.", until: day => ` El acceso sigue hasta el ${day}.`,
    paused: "El acceso está en pausa", openBilling: "Abre Plan y facturación para ver lo que hace falta.",
  },
};

export const OWNER_B_COPY: Record<OwnerBLang, OwnerBCopy> = { en, es };
export const ownerBCopy = (lang: OwnerBLang = "en"): OwnerBCopy => OWNER_B_COPY[lang];

/** "7:02 AM" → "7:02 a. m." (kept whole) in Spanish; English is returned as it came. */
export function clockIn(lang: OwnerBLang, text: string) {
  return lang === "es" ? text.replace(/([\s  ])?\bAM\b/g, `${NB}a.${NB}m.`).replace(/([\s  ])?\bPM\b/g, `${NB}p.${NB}m.`) : text;
}

/** The attendance words (lib/action-center/present's ATTENDANCE_WORDS) in this language. */
export const ATTENDANCE: Record<OwnerBLang, { notClockedIn: string; late: string; missed: string }> = {
  en: { notClockedIn: "Not clocked in", late: "Clocked in late", missed: "Missed" },
  es: { notClockedIn: "Sin ponchar", late: "Ponchó entrada tarde", missed: "No ponchó entrada" },
};

/** Decline's question on a time off row (time-off-waiting-list's ASK), in Spanish; English uses ASK itself. */
export const ASK_ES = { question: "¿Rechazar esta solicitud?", consequence: (first: string) => `A ${first} se le avisa que se rechazó.`, consequenceAnyone: "Se le avisa que se rechazó.", keep: "Conservar solicitud", decline: "Rechazar" };
