import type { PortalLang } from "@/lib/i18n/portal-lang";

/** Team's list (/app/employees: EmployeeDirectory and a location Manager's ScopedTeam) in each portal language.
 * Signed-in Spanish: English unchanged, tú, Puerto Rico Spanish. `people` and `person` are the company's words
 * (workspace-presentation/words), already lower-cased. The key sets must match (team-list-copy.test.ts). */
const en = {
  team: "Team",
  roles: { OWNER: "Owner", MANAGER: "Manager", LEAD: "Lead", EMPLOYEE: "Employee" } as Record<string, string>,
  inactivePlace: " (Inactive)",
  noLocation: "Location not assigned",
  seeAll: "See all",
  hoursThisWeek: "Hours this week", hoursDetail: "Scheduled hours for each person",
  availability: "Availability", availabilityDetail: "Who can work and when",
  importList: "Import a staff list", importDetail: "Add many people at once",
  helpSignIn: "Help someone sign in", resetPin: "Reset a password or Clocker PIN", resetSignIn: "Reset a password or sign-in",
  inactivePeople: "Inactive people", noLongerActive: (n: number) => `${n} no longer active`,
  add: (person: string) => `Add ${person}`,
  count: (n: number, person: string, people: string) => `${n} ${n === 1 ? person : people}`,
  applySearch: "Apply search",
  searchFor: (people: string) => `Search ${people}`,
  searchPeople: "Search people",
  searchByName: "Search by name",
  ofTotal: (shown: number, total: number, person: string, people: string) => `${shown} of ${total} ${total === 1 ? person : people}`,
  matches: (n: number) => `${n} ${n === 1 ? "match" : "matches"}`,
  people: "People",
  noMatch: (people: string, query: string) => `No ${people} match “${query}”.`,
  noneYet: (people: string) => `No ${people} yet.`,
  noneAt: (people: string, place: string) => `No ${people} at ${place} yet.`,
  clearSearch: "Clear search",
  inactiveCount: (n: number) => `Inactive (${n})`,
  inactiveOf: (people: string) => `Inactive ${people}`,
  tools: "Team tools",
  allYourLocations: "All your locations",
  location: "Location",
  locationIs: (place: string) => `Location: ${place}`,
  updating: "Updating employees…",
};

export type TeamListCopy = typeof en;

const es: TeamListCopy = {
  team: "Equipo",
  roles: { OWNER: "Dueño", MANAGER: "Gerente", LEAD: "Líder", EMPLOYEE: "Empleado" },
  inactivePlace: " (inactiva)",
  noLocation: "Sin localidad asignada",
  seeAll: "Ver todos",
  hoursThisWeek: "Horas esta semana", hoursDetail: "Horas programadas de cada persona",
  availability: "Disponibilidad", availabilityDetail: "Quién puede trabajar y cuándo",
  importList: "Importar una lista de personal", importDetail: "Añade muchas personas a la vez",
  helpSignIn: "Ayudar a alguien a iniciar sesión", resetPin: "Restablecer una contraseña o un PIN del Clocker", resetSignIn: "Restablecer una contraseña o el inicio de sesión",
  inactivePeople: "Personas inactivas", noLongerActive: (n: number) => `${n} ${n === 1 ? "ya no está activa" : "ya no están activas"}`,
  add: (person: string) => `Añadir ${person}`,
  count: (n: number, person: string, people: string) => `${n} ${n === 1 ? person : people}`,
  applySearch: "Aplicar búsqueda",
  searchFor: (people: string) => `Buscar ${people}`,
  searchPeople: "Buscar personas",
  searchByName: "Buscar por nombre",
  ofTotal: (shown: number, total: number, person: string, people: string) => `${shown} de ${total} ${total === 1 ? person : people}`,
  matches: (n: number) => `${n} ${n === 1 ? "resultado" : "resultados"}`,
  people: "Personas",
  noMatch: (people: string, query: string) => `No hay ${people} que coincidan con “${query}”.`,
  noneYet: (people: string) => `Todavía no hay ${people}.`,
  noneAt: (people: string, place: string) => `Todavía no hay ${people} en ${place}.`,
  clearSearch: "Borrar búsqueda",
  inactiveCount: (n: number) => `Inactivos (${n})`,
  inactiveOf: (people: string) => `${people.charAt(0).toUpperCase()}${people.slice(1)} inactivos`,
  tools: "Herramientas del equipo",
  allYourLocations: "Todas tus localidades",
  location: "Localidad",
  locationIs: (place: string) => `Localidad: ${place}`,
  updating: "Actualizando empleados…",
};

export const TEAM_LIST_COPY: Record<PortalLang, TeamListCopy> = { en, es };
