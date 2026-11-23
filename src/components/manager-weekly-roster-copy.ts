/* The Owner and Manager Schedule week grid's words (src/components/manager-weekly-roster.tsx) in English and Puerto Rico
 * Spanish (docs/design/voice.md: tú, sentence case, no "¡…!", lower-case weekdays and months, "6:00 a. m. – 2:00 p. m.",
 * the glossary: "Horario", "Turno disponible", "Buscar reemplazo", "Cubrir", "Borrador", "Publicado", "Cambiado",
 * "Días libres", "Hoy", "Sin cubrir", "Sin asignar"). The English is the text the grid already showed and read out, word
 * for word. Dates and times reuse the Schedule's Spanish helpers (src/app/app/schedule/schedule-copy.ts). */
import type { PortalLang } from "@/lib/i18n/portal-lang";
import { formatDayLabel } from "@/lib/date-utils";
import { esDayLabel, shortDay, times } from "@/app/app/schedule/schedule-copy";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const weekdayIn = (locale: string, weekday: "long" | "narrow") => (date: string) =>
  new Intl.DateTimeFormat(locale, { weekday, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const enShortDay = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

const en = {
  /** { weekday: "Mon", day: "Oct 5" }. */
  dayLabel: (date: string) => formatDayLabel(date),
  /** "Monday". */
  longWeekday: weekdayIn("en-US", "long"),
  /** "M". */
  narrowWeekday: weekdayIn("en-US", "narrow"),
  /** The day card's date: "Tue, Oct 6". */
  cardDay: (date: string) => `${formatDayLabel(date).weekday}, ${enShortDay(date)}`,
  /** Times already formatted in English ("6:00 AM – 2:00 PM", "All day") in this language. */
  clock: (text: string) => text,
  allDay: "All day",
  needsCover: "Needs cover", needsCoverHint: "Needs cover (time off)",
  draft: "Draft", archived: "Archived", published: "Published", changed: "Changed", open: "Open",
  draftSr: ", draft",
  editShift: (person: string, weekday: string, day: string, start: string, end: string, location: string) => `Edit ${person}’s shift, ${weekday} ${day}, ${start} to ${end}, ${location}`,
  fillShift: (person: string, weekday: string, day: string, start: string, end: string, location: string) => `Fill ${person}’s shift, ${weekday} ${day}, ${start} to ${end}, ${location}`,
  timeOffThatDay: ", time off that day",
  ends: (day: string) => `, Ends ${day}`,
  timeOff: "Time off", timeOffLead: "Time off · ",
  timeOffUnavailable: "Time off unavailable", timeOffUnavailableReload: "Time off unavailable. Reload before adding shifts.",
  approvedTimeOff: "Approved time off",
  approvedTimeOffOn: (weekday: string) => `Approved time off on ${weekday}`,
  overLimit: (over: string, maximum: number) => `${over} over the ${maximum} h limit`,
  ofTarget: (week: number, target: number) => `${week} of ${target} h target`,
  ofLimit: (week: number, maximum: number) => `${week} of ${maximum} h limit`,
  overShort: (over: string, maximum: number) => ` · ${over} over ${maximum} h`,
  assignedThisWeek: (week: string) => `${week} assigned this week`,
  noAssignmentsWeek: ", No assignments this week", noAssignmentsDay: ", No assignments on this day",
  addFor: (name: string, weekday: string, day: string) => `Add a shift for ${name}, ${weekday} ${day}`, add: "+ Add",
  shifts: (n: number) => plural(n, "shift", "shifts"), noShifts: "no shifts", todaySr: ", today",
  scheduleDay: "Schedule day", week: "Week",
  openShift: "Open shift", openShifts: "Open shifts",
  openDetail: (range: string) => `Open · ${range}`,
  findCover: "Find cover",
  findCoverAria: (start: string, end: string, location: string) => `Find cover for the open shift, ${start} to ${end}${location ? `, ${location}` : ""}`,
  showMore: (n: number) => `Show ${n} more`,
  shiftsOn: (weekday: string) => `Shifts on ${weekday}`,
  nothingScheduled: "Nothing scheduled.",
  previousWeek: "Previous week", nextWeek: "Next week", goToThisWeek: "Go to this week", today: "Today", todayLead: "Today · ",
  noOneAssigned: "No one assigned", notFilled: "Not filled",
  addShift: "Add shift",
  people: (n: number) => plural(n, "person", "people"),
  coveredThisWeek: "Covered this week",
  fullWeek: "Full week",
  caption: (zone: string) => `Team schedule. Times in ${zone}. Select a shift to edit.`,
  thisWeek: " this week", thisDay: " this day",
  openChip: (n: number) => `${n} open`,
  openShiftsCount: (n: number) => plural(n, "open shift", "open shifts"),
  dayOver: ", day already over",
  allOver: (_n: number) => ", already over, not filled",
  someOver: (n: number) => `, ${n} already over`,
  openShiftsOn: (weekday: string, day: string) => `Open shifts, ${weekday}, ${day}`,
  fill: "Fill",
  fillOnDay: (weekday: string, day: string, start: string, end: string, location: string) => `Fill the open shift, ${weekday} ${day}, ${start} to ${end}${location ? `, ${location}` : ""}`,
  fillAria: (start: string, end: string) => `Fill the open shift, ${start} to ${end}`,
  showUnscheduled: (n: number) => `Show ${n} unscheduled`,
  showNotScheduledDay: (n: number) => `Show ${n} not scheduled this day`,
  schedule: "Schedule", teamSchedule: "Team schedule",
  cantSeeYet: "Locations the team can’t see yet",
  team: "Team", addPeople: "Add people to your team to start scheduling.", goToTeam: "Go to Team",
};

const es: typeof en = {
  /** { weekday: "lun", day: "5 oct" }. */
  dayLabel: (date: string) => esDayLabel(date),
  /** "lunes". */
  longWeekday: weekdayIn("es-PR", "long"),
  /** "L". */
  narrowWeekday: weekdayIn("es-PR", "narrow"),
  /** "mar, 6 oct". */
  cardDay: (date: string) => shortDay(date, "es"),
  /** "6:00 a. m. – 2:00 p. m." with "a. m." kept whole; "Todo el día". */
  clock: (text: string) => times(text, "es").replace(/([ap])\. m\./g, "$1. m."),
  allDay: "Todo el día",
  needsCover: "Necesita reemplazo", needsCoverHint: "Necesita reemplazo (días libres)",
  draft: "Borrador", archived: "Archivado", published: "Publicado", changed: "Cambiado", open: "Disponible",
  draftSr: ", borrador",
  editShift: (person: string, weekday: string, day: string, start: string, end: string, location: string) => `Editar el turno de ${person}, ${weekday} ${day}, ${start} a ${end}, ${location}`,
  fillShift: (person: string, weekday: string, day: string, start: string, end: string, location: string) => `Cubrir el turno de ${person}, ${weekday} ${day}, ${start} a ${end}, ${location}`,
  timeOffThatDay: ", días libres ese día",
  ends: (day: string) => `, termina el ${day}`,
  timeOff: "Días libres", timeOffLead: "Días libres · ",
  timeOffUnavailable: "Días libres no disponibles", timeOffUnavailableReload: "Días libres no disponibles. Recarga antes de añadir turnos.",
  approvedTimeOff: "Días libres aprobados",
  approvedTimeOffOn: (weekday: string) => `Días libres aprobados el ${weekday}`,
  overLimit: (over: string, maximum: number) => `${over} por encima del límite de ${maximum} h`,
  ofTarget: (week: number, target: number) => `${week} de ${target} h de meta`,
  ofLimit: (week: number, maximum: number) => `${week} de ${maximum} h de límite`,
  overShort: (over: string, maximum: number) => ` · ${over} sobre ${maximum} h`,
  assignedThisWeek: (week: string) => `${week} asignadas esta semana`,
  noAssignmentsWeek: ", Sin turnos esta semana", noAssignmentsDay: ", Sin turnos este día",
  addFor: (name: string, weekday: string, day: string) => `Añadir un turno para ${name}, ${weekday} ${day}`, add: "+ Añadir",
  shifts: (n: number) => plural(n, "turno", "turnos"), noShifts: "sin turnos", todaySr: ", hoy",
  scheduleDay: "Día del horario", week: "Semana",
  openShift: "Turno disponible", openShifts: "Turnos disponibles",
  openDetail: (range: string) => `Disponible · ${range}`,
  findCover: "Buscar reemplazo",
  findCoverAria: (start: string, end: string, location: string) => `Buscar reemplazo para el turno disponible, ${start} a ${end}${location ? `, ${location}` : ""}`,
  showMore: (n: number) => `Ver ${n} más`,
  shiftsOn: (weekday: string) => `Turnos del ${weekday}`,
  nothingScheduled: "Nada programado.",
  previousWeek: "Semana anterior", nextWeek: "Semana siguiente", goToThisWeek: "Ir a esta semana", today: "Hoy", todayLead: "Hoy · ",
  noOneAssigned: "Sin asignar", notFilled: "Sin cubrir",
  addShift: "Añadir turno",
  people: (n: number) => plural(n, "persona", "personas"),
  coveredThisWeek: "Cubierto esta semana",
  fullWeek: "Semana completa",
  caption: (zone: string) => `Horario del equipo. Horas de ${zone}. Selecciona un turno para editarlo.`,
  thisWeek: " esta semana", thisDay: " este día",
  openChip: (n: number) => `${n} ${n === 1 ? "disponible" : "disponibles"}`,
  openShiftsCount: (n: number) => plural(n, "turno disponible", "turnos disponibles"),
  dayOver: ", el día ya pasó",
  allOver: (n: number) => n === 1 ? ", ya pasó, sin cubrir" : ", ya pasaron, sin cubrir",
  someOver: (n: number) => `, ${n} ${n === 1 ? "ya pasó" : "ya pasaron"}`,
  openShiftsOn: (weekday: string, day: string) => `Turnos disponibles, ${weekday}, ${day}`,
  fill: "Cubrir",
  fillOnDay: (weekday: string, day: string, start: string, end: string, location: string) => `Cubrir el turno disponible, ${weekday} ${day}, ${start} a ${end}${location ? `, ${location}` : ""}`,
  fillAria: (start: string, end: string) => `Cubrir el turno disponible, ${start} a ${end}`,
  showUnscheduled: (n: number) => `Ver ${n} sin turnos`,
  showNotScheduledDay: (n: number) => `Ver ${n} sin turno este día`,
  schedule: "Horario", teamSchedule: "Horario del equipo",
  cantSeeYet: "Localidades que el equipo aún no puede ver",
  team: "Equipo", addPeople: "Añade personas a tu equipo para empezar a hacer el horario.", goToTeam: "Ir a Equipo",
};

export type RosterWords = typeof en;
export const ROSTER_COPY: Record<PortalLang, RosterWords> = { en, es };
export const rosterCopy = (lang: PortalLang = "en"): RosterWords => ROSTER_COPY[lang];
