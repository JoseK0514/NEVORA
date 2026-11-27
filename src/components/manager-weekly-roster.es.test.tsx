import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from "@rstest/core";
import { ManagerWeeklyRoster } from "./manager-weekly-roster";
import { PortalLangProvider } from "@/lib/i18n/portal-lang";
import type { RosterEmployee } from "../lib/scheduling/manager-roster-presentation";
import { weekDates } from "../lib/date-utils";

rs.mock("next/link", () => ({ default: ({ children, ...props }: React.ComponentProps<"a">) => createElement("a", props, children) }));

/* Signed-in Spanish: the Schedule week grid, the phone day card and the Direction B day read in Puerto Rico Spanish. */
const employees: RosterEmployee[] = [{ id: "ana", name: "Ana Colón", role: "Employee", hours: { week: 44, target: 30, maximum: 40 }, shifts: [
  { id: "overnight", date: "2026-10-05", startTime: "22:00", endTime: "06:00", location: "Condado", position: "Caja", status: "PUBLISHED", lead: false },
  { id: "draft", date: "2026-10-06", startTime: "08:00", endTime: "16:00", location: "Condado", status: "DRAFT", lead: false },
  { id: "allday", date: "2026-10-07", startTime: "00:00", endTime: "24:00", location: "Condado", status: "PUBLISHED", lead: false },
] }, { id: "luis", name: "Luis Rivera", role: "Employee", shifts: [] }];
const openShifts = [
  { id: "past", date: "2026-10-05", startTime: "06:00", endTime: "10:00", location: "Condado", href: "/app/schedule/coverage?shift=past" },
  { id: "early", date: "2026-10-06", startTime: "06:00", endTime: "10:00", location: "", href: "/app/schedule/coverage?shift=early" },
  { id: "later", date: "2026-10-06", startTime: "16:00", endTime: "20:00", location: "Condado", href: "/app/schedule/coverage?shift=later" },
];
const corp = { weekLabel: "5–11 oct", previousHref: "/p", nextHref: "/n", addShiftHref: "/app/schedule/new?week=2026-10-05", observedAt: "2026-10-06T19:13:00Z", todayHref: "/app/schedule?week=2026-10-12" };
const b = { sub: null, actions: null, location: null, weekState: null, toPlan: [{ id: "x", href: "/x", title: "Condado", detail: "Borrador", action: "Revisar", label: "Revisar Condado" }],
  coverage: { state: "ready" as const, staffing: { required: 480, covered: 240, percent: 50 }, positions: { required: 0, covered: 0, percent: null }, lead: { required: 0, covered: 0, percent: null } } };
type Props = ComponentProps<typeof ManagerWeeklyRoster>;
const render = (props: Partial<Props>, lang: "en" | "es" = "es") => renderToStaticMarkup(createElement(PortalLangProvider, { lang } as ComponentProps<typeof PortalLangProvider>,
  createElement(ManagerWeeklyRoster, { employees, dates: weekDates("2026-10-05"), today: "2026-10-06", timeZone: "America/Puerto_Rico", openShifts, ...props })));
const visible = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

it("reads the week grid, its open shifts and its people in Spanish", () => {
  const out = render({ corp, b, absences: { state: "ready", employeeIds: ["ana", "luis"], rows: [] } });
  for (const words of ["Turnos disponibles", " esta semana", "2 disp.", "2 turnos disponibles, mar 6 oct, 1 ya pasó", "1 turno disponible, lun 5 oct, el día ya pasó",
    "Editar el turno de Ana Colón, lun 5 oct, 10:00 p. m. a 6:00 a. m., Condado", ", termina el 6 oct", ", Publicado", ", borrador", "Todo el día",
    "4 h por encima del límite de 40 h", " · 4 h sobre 40 h", "asignadas esta semana", "1 pers. · ", "Ver 1 sin turnos", ", Sin turnos esta semana",
    "Cubierto esta semana", "aria-label=\"Semana anterior\"", "aria-label=\"Semana siguiente\"", "aria-label=\"Hoy, ir a esta semana\">Hoy</a>",
    "data-k=\"published\">Publicado", "data-k=\"draft\">Borrador", "data-k=\"open\">Disponible", "Horario del equipo", "Añadir un turno para Ana Colón, jue 8 oct", "+ Añadir"]) expect(out).toContain(words);
  // The phone day card and the Direction B day: today, its open shifts, Draft and the counts.
  for (const words of ["Hoy · mar, 6 oct", "Turno disponible", "Sin asignar", "Sin cubrir", "3 turnos · 8 h", "Añadir turno", "aria-label=\"Turnos del martes\"", "aria-label=\"Día del horario\"",
    "martes, 6 oct, hoy, 3 turnos", "Cubrir el turno disponible, 4:00 p. m. a 8:00 p. m.", "Horario", "Localidades que el equipo aún no puede ver", ", hoy, 2 turnos, 1 turno disponible"])
    expect(out).toContain(words);
  expect(visible(out)).toContain(" Borrador ");
  expect(visible(out)).toMatch(/4:00\s*p\.\s*m\. – 8:00\s*p\.\s*m\./);
  for (const english of ["Open shift", "Open shifts", "No one assigned", "Not filled", "Needs cover", "Find cover", "Previous week", "Next week", "Go to this week", ">Today<", "Today ·",
    "Edit Ana", "assigned this week", "over the 40 h limit", "Show 1 unscheduled", "No assignments", "Covered this week", ">Published<", ">Draft<", ">Open<", "Team schedule",
    "Add shift", "+ Add", "Add a shift", " shifts", "1 person ·", "Schedule day", "Shifts on", "Ends Oct", "already over", " AM", " PM", "All day", "Locations the team"])
    expect(out, english).not.toContain(english);
});

it("reads time off, the day view and the empty states in Spanish", () => {
  const leave = render({ reviewDay: "2026-10-06", corp, absences: { state: "ready", employeeIds: ["ana", "luis"], rows: [{ employeeId: "ana", startDate: "2026-10-06", endDate: "2026-10-06" }, { employeeId: "luis", startDate: "2026-10-06", endDate: "2026-10-06", startTime: "09:00", endTime: "12:00" }] } });
  for (const words of ["Semana completa", "martes, 6 oct", "Necesita reemplazo", "Necesita reemplazo (días libres)", "Cubrir el turno de Ana Colón, mar 6 oct", ", días libres ese día",
    "Días libres · Todo el día", "Días libres · 9:00 a. m. – 12:00 p. m.", "Días libres aprobados el martes", ", Sin turnos este día", "Ver 1 sin turno este día"]) expect(leave).toContain(words);
  for (const english of ["Full week", "Needs cover", "Fill Ana", "time off that day", "Time off", "Approved time off", "not scheduled this day"]) expect(leave, english).not.toContain(english);
  const unknown = render({ absences: { state: "unavailable", reason: "read_failed" } });
  expect(unknown).toContain("Días libres no disponibles. Recarga antes de añadir turnos.");
  expect(unknown).toContain(">Días libres no disponibles<");
  expect(unknown).toContain("Buscar cobertura");
  expect(unknown).toMatch(/Disponible · 4:00\sp\.\sm\.\s– 8:00\sp\.\sm\./);
  expect(unknown).not.toContain("Time off unavailable");
  expect(unknown).not.toContain("Find cover");
  const empty = render({ employees: [], openShifts: [], corp, b });
  expect(empty).toContain("Añade personas a tu equipo para empezar a hacer el horario.");
  expect(empty).toContain(">Ir a Equipo</a>");
  expect(empty).not.toContain("Go to Team");
  const quiet = render({ employees: [employees[1]], openShifts: [] , absences: { state: "ready", employeeIds: ["luis"], rows: [] } });
  expect(quiet).toContain("Nada programado.");
  expect(quiet).not.toContain("Nothing scheduled");
});

it("keeps English exactly as it was outside Spanish", () => {
  const out = render({ corp, b, absences: { state: "ready", employeeIds: ["ana", "luis"], rows: [] } }, "en");
  for (const words of ["Today · Tue, Oct 6", "2 open shifts, Tue Oct 6, 1 already over", "Edit Ana Colón’s shift, Mon Oct 5, 10:00\u00a0PM to 6:00\u00a0AM, Condado", ", Ends Oct 6", "4 h over the 40 h limit",
    "aria-label=\"Today, go to this week\">Today</a>", "No one assigned", "Covered this week"]) expect(out).toContain(words);
});

it("keeps the full planning note available on a narrow phone, in both languages", () => {
  const task = { ...b.toPlan[0], detail: "Nada programado esta semana", action: "Planificar" };
  const html = render({ corp, b: { ...b, toPlan: [task] } });
  expect(html).toMatch(/<section[^>]+id="schedule-locations-to-plan"[^>]*>[\s\S]*?<span class="b-row__s">Nada programado esta semana<\/span>/);
  const css = readFileSync(join(__dirname, "../app/app/owner-b-schedule.css"), "utf8");
  expect(css).toMatch(/@media \(max-width: 767px\)\s*\{\s*#schedule-locations-to-plan:not\(\.nv-any-lang\) \.b-row__s\s*\{[^}]*-webkit-line-clamp: none !important;[^}]*overflow: visible !important;/);
});
