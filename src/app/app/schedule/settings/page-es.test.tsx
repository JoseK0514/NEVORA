// Signed-in Spanish: Scheduling rules follows the person's language, read through readPortalLanguage with the page's proof.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, rs } from '@rstest/core';
import { fuelRuleLocations, fuelRuleStaffing, fuelRuleCoverageWindows } from "../../../../test/fixtures/fuel-scheduling-rules";

const f = rs.hoisted(() => ({ language: "es" as "en" | "es" }));
rs.mock("@/lib/activation/language.server", () => ({ readPortalLanguage: async () => ({ state: "ready", savedLanguage: f.language, language: f.language }) }));
rs.mock('@/lib/company-access/operational-scope.server', () => ({ withOperationalCompany: async (_proof: unknown, load: () => Promise<unknown>) => ({ state: 'ready', data: await load(), coverage: { kind: 'COMPANY', locationIds: [] }, authority: 'fixture', observedAt: '2026-12-07T12:00:00Z', validForMs: 15000 }) }));
rs.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: async () => ({ employee: { id: 'reviewer', role: 'MANAGER' }, sessionTokenHash: 'a'.repeat(64) }) }));
rs.mock("@/lib/data/workspaces", () => ({ getWorkspace: async () => ({ timeZone: "America/Puerto_Rico" }) }));
rs.mock("@/lib/data/week-settings", () => ({ getWeekSettings: async () => ({ availabilityDeadline: "2030-10-04T13:00:00.000Z" }) }));
rs.mock("../actions", () => ({ setAvailabilityDeadlineAction: rs.fn() }));
rs.mock("@/lib/data/positions", () => ({ listPositions: async () => [] }));
rs.mock("@/lib/data/shift-change-policy", () => ({ readShiftChangePolicy: async () => null }));
rs.mock("@/lib/data/notification-transactions", () => ({ neonNotificationExecutor: () => ({}) }));
rs.mock("@/lib/workforce/settings.server", () => ({ readWorkforceSettings: async () => { throw Error("unavailable"); } }));
rs.mock("@/lib/auth/permissions", () => ({ MANAGER_ROLES: ["OWNER", "MANAGER"], requireRoles: async () => ({ id: "reviewer", role: "MANAGER" }) }));
rs.mock("@/lib/data/employees", () => ({ listLocations: async () => fuelRuleLocations }));
rs.mock("@/lib/data/schedule-health", () => ({
  listLocationStaffingSettings: async () => fuelRuleStaffing.map((s, i) => ({ ...s, locationName: `Fuel ${i + 1}` })),
  listEmployeeHourTargets: async () => [{ employeeId: "TEAM-1", employeeName: "Avery Chen", role: "EMPLOYEE", primaryLocationId: "loc-1", targetWeeklyHours: 32, maximumWeeklyHours: 40, eligibleLocationIds: ["loc-1"], positionIds: [] }],
  listCoverageWindows: async () => fuelRuleCoverageWindows,
}));
rs.mock("@/app/app/schedule/settings/actions", () => ({
  saveScheduleHealthSettingsAction: rs.fn(), saveScheduleHealthSettingsFormAction: rs.fn(), addCoverageWindowFormAction: rs.fn(),
  replaceCoverageWindowPositionRequirementsAction: rs.fn(), addCoverageWindowAction: rs.fn(), deleteCoverageWindowAction: rs.fn(), saveShiftChangePolicyAction: async () => ({ status: 'conflict' }),
}));
rs.mock("@/components/company-access/scoped-read-frame", () => ({ ScopedReadFrame: ({ children }: { children: React.ReactNode }) => children }));
rs.mock("next/link", () => ({ default: ({ href, children, ...props }: ComponentProps<"a">) => createElement("a", { href, ...props }, children) }));
const { default: ScheduleSettingsPage } = await import("./page");
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/[\s ⁠ ]+/g, " ").trim();
beforeEach(() => { f.language = "es"; });

it("draws Scheduling rules in Puerto Rico Spanish, with the language set on the page", async () => {
  const html = renderToStaticMarkup(await ScheduleSettingsPage({ searchParams: Promise.resolve({ week: "2026-12-07", error: "duplicate_window", windowDeleted: "1" }) }));
  expect(html).toContain('lang="es"');
  expect(html).toMatch(/<h1[^>]*>Reglas de horarios<\/h1>/);
  expect(html).toContain('aria-label="FUEL – 2: personal mínimo por turno"');
  const out = text(html);
  for (const words of ["Horas por semana", "Meta por persona", "Personal mínimo por turno", "Turnos semanales", "Guardar personal y horas", "1 persona", "Empleado · ", "Personal por localidad", "Personal mínimo", "Líder de turno", "Cobertura recurrente",
    "Añadir período de cobertura", "La semana empieza el", "No disponible", "Fecha límite de disponibilidad", "vie, 4 oct", "Semana del 7–13 dic",
    "Hora de America/Puerto Rico. Déjalo en blanco para borrarla.", "Solicitudes de turnos", "Ese período de cobertura ya existe.", "Período de cobertura quitado.", "lunes", "a. m."])
    expect(out).toContain(words);
  for (const english of ["Scheduling rules", "Save staffing and hours", "Weekly hour targets", "Staffing per location", "Recurring coverage", "Week starts on", "Availability deadline",
    "Shift requests", "That coverage period already exists.", "Monday", " AM", " PM"])
    expect(out).not.toContain(english);
});

it("keeps the English page as it was", async () => {
  f.language = "en";
  const html = renderToStaticMarkup(await ScheduleSettingsPage({ searchParams: Promise.resolve({ week: "2026-12-07" }) }));
  expect(html).not.toContain('lang="es"');
  expect(html).toMatch(/<h1[^>]*>Scheduling rules<\/h1>/);
  expect(text(html)).toContain("Week of Dec 7–13");
  expect(text(html)).toContain("1 person");
});
