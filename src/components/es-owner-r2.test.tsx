// Signed-in Spanish, second release (es-owner): the notification inbox (Quiet list and the older full inbox), the Quiet
// Home's Right now and Things to do, Team availability's own words, and the action center's row dates. Each table has
// the same keys in both languages; Spanish renders with no English from these files. Fictional data only.
import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from "@rstest/core";
import type { EmployeeNotificationItem } from "@/lib/employee-view";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }), usePathname: () => "/app", useSearchParams: () => new URLSearchParams() }));
// Team availability's page reads the database; only its word table is under test here.
rs.mock("@/lib/activation/language.server", () => ({ readPortalLanguage: async () => ({ language: "es" }) }));
rs.mock("@/lib/data/employees", () => ({}));
rs.mock("@/lib/data/availability", () => ({}));
rs.mock("@/lib/data/availability-submissions", () => ({}));
rs.mock("@/lib/data/week-settings", () => ({}));
rs.mock("@/lib/company-access/operational-scope.server", () => ({}));
rs.mock("@/lib/auth/session", () => ({}));
rs.mock("@/lib/auth/permissions", () => ({ MANAGER_ROLES: [] }));
rs.mock("@/lib/communications/service.server", () => ({}));

const { INBOX_COPY, whenLongFor, clockFor } = await import("./notification-inbox-copy");
const { PREMIUM_HOME_COPY } = await import("./premium-home-copy");
const { NotificationInbox } = await import("./notification-inbox");
const { PremiumHomeSurface } = await import("./premium-home");
const { mobileActionDetail } = await import("./manager-action-center");
const { PortalLangProvider } = await import("@/lib/i18n/portal-lang");
const { MANAGER_AVAILABILITY_WORDS } = await import("./manager-availability");

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/[\s ‑]+/g, " ").trim();
const shape = (value: unknown, prefix = ""): string[] => value && typeof value === "object" && !Array.isArray(value)
  ? Object.entries(value).flatMap(([key, inner]) => shape(inner, prefix ? `${prefix}.${key}` : key)) : [`${prefix}:${typeof value}`];
const es = (node: ReactNode) => text(renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>));

it.each([
  ["notification inbox", INBOX_COPY.en, INBOX_COPY.es],
  ["premium home", PREMIUM_HOME_COPY.en, PREMIUM_HOME_COPY.es],
  ["team availability", MANAGER_AVAILABILITY_WORDS.en, MANAGER_AVAILABILITY_WORDS.es],
])("%s: the Spanish table has the same keys and shape as the English one", (_name, en, spanish) => {
  expect(shape(spanish).sort()).toEqual(shape(en).sort());
});

const item = (id: string, extra: Partial<EmployeeNotificationItem> = {}): EmployeeNotificationItem => ({ id, label: "Schedule published", eventType: "SCHEDULE_PUBLISHED",
  at: "2026-11-23T14:00:00Z", href: `/app/notifications/open?notificationId=${id}`, reviewState: "unread", actionState: "none", ...extra });
const ready = (items: EmployeeNotificationItem[]) => ({ paused: false, refreshing: false, snapshot: { state: "ready" as const, kind: "notifications" as const, coverage: "complete" as const, items,
  observedAt: "2026-11-23T15:00:00Z", validForMs: 30_000, timeZone: "America/Puerto_Rico" } });

it("renders the Quiet notification list in Spanish, its rows, filters and states", () => {
  const list = es(<NotificationInbox state={ready([item("a"), item("b", { reviewState: "read" })])} onRetry={() => {}} quiet />);
  for (const words of ["Todas", "Sin leer", "2 notificaciones", "Abrir una no la completa."]) expect(list).toContain(words);
  for (const english of ["All", "Unread", "notifications", "Opening one"]) expect(list).not.toContain(english);
  const failed = es(<NotificationInbox state={{ paused: false, refreshing: false, snapshot: { state: "unavailable", reason: "read_failed" } }} onRetry={() => {}} quiet />);
  expect(failed).toContain("No pudimos cargar las notificaciones");
  expect(failed).toContain("Intentar de nuevo");
  const empty = es(<NotificationInbox state={ready([])} onRetry={() => {}} quiet />);
  expect(empty).toContain("Todavía no tienes notificaciones.");
});

it("renders the full inbox in Spanish, with the review and action states and the row time", () => {
  const html = renderToStaticMarkup(<PortalLangProvider lang="es"><NotificationInbox state={ready([item("a", { actionState: "required" })])} onRetry={() => {}} /></PortalLangProvider>);
  const words = text(html);
  for (const spanish of ["Tus alertas", "Revisa un aviso. Da el próximo paso.", "Actualizar", "Todas", "Requieren acción", "1 notificación en esta vista", "Sin leer", "Requiere acción", "Solicitudes", "Horario", "a. m."])
    expect(words).toContain(spanish);
  expect(html).toContain('placeholder="Buscar en esta lista"');
  for (const english of ["Your alerts", "Refresh", "Needs action", "in this view", "Action required", "Unread", " AM"]) expect(words).not.toContain(english);
  // English stays as it was.
  expect(text(renderToStaticMarkup(<NotificationInbox state={ready([item("a", { actionState: "required" })])} onRetry={() => {}} />))).toContain("Your alerts");
});

it("writes the inbox's long dates and clock times the voice guide way", () => {
  expect(whenLongFor("es", "2026-11-24T13:02:00Z", "America/Puerto_Rico").replace(/ /g, " ")).toBe("martes, 24 de noviembre, 9:02 a. m.");
  expect(clockFor("es", "2026-11-24T19:02:00Z", "America/Puerto_Rico").replace(/ /g, " ")).toBe("3:02 p. m.");
  expect(clockFor("en", "2026-11-24T19:02:00Z", "America/Puerto_Rico")).toBe("3:02 PM");
});

const shift = (id: string, status: TodayShift["status"], name: string): TodayShift => ({ id, employeeId: id, employeeName: name, locationId: "loc-1", locationName: "Condado", positionName: null,
  startAt: "2026-11-23T13:00:00Z", endAt: "2026-11-23T21:00:00Z", status, firstClockInAt: status === "clocked_in" ? "2026-11-23T13:00:00Z" : null, late: false });
const today: Today = { state: "ready", observedAt: "2026-11-23T15:00:00Z", validForMs: 60_000, timeZone: "America/Puerto_Rico", today: "2026-11-23",
  counts: { scheduled: 3, clockedIn: 1, late: 0, notClockedIn: 1 }, shifts: [shift("a", "clocked_in", "Ana Rivera"), shift("b", "not_clocked_in", "Luis Medina"), shift("c", "upcoming", "Carla Pérez")], missed: [shift("b", "not_clocked_in", "Luis Medina")] } as Today;
const gap = { id: "g1", type: "COVERAGE_GAP", priority: "URGENT", category: "scheduling", locationId: "loc-1", title: "Position not covered at Condado",
  detail: "2026-11-23 · 6:00 PM–10:00 PM · Barista: 1 open", dateTime: "2026-11-23T18:00", href: "/app/schedule" } as ActionItem;
const actions = { state: "ready", observedAt: "2026-11-23T15:00:00Z", validForMs: 30_000, weekStart: "2026-11-23", items: [gap], counts: { total: 1, scheduling: 1, requests: 0, timekeeping: 0 }, limitedAttendance: false } as ActionCenter;
const quietHome = (extra: Partial<ComponentProps<typeof PremiumHomeSurface>> = {}) => <PremiumHomeSurface greeting="" dateLabel="lunes, 23 de noviembre" timeZone="America/Puerto_Rico"
  week={{ weekStart: "2026-11-23", weekLabel: "", plannedShifts: 0, availabilitySubmitted: 0, availabilityEligible: 0, locations: [] }} today={today} actions={actions} actionsConnection="ready" {...extra} />;

it("renders the Quiet Home's Right now and Things to do in Spanish", () => {
  const html = es(quietHome());
  for (const words of ["Hoy", "Ahora mismo", "1 de 3 en turno", "Pendientes", "Sin marcar entrada: Luis Medina", "El turno empezó a las 9:00 a. m.", "1 turno disponible"])
    expect(html).toContain(words);
  for (const english of ["Right now", "on shift", "Things to do", "Not clocked in", "Shift began", "open shift", " AM", " PM"]) expect(html).not.toContain(english);
  expect(es(quietHome({ actions: null, actionsConnection: "unavailable" }))).toContain("Lo que te espera no está disponible ahora.");
  expect(text(renderToStaticMarkup(quietHome()))).toContain("1 of 3 on shift");
});

it("writes an action row's date the Spanish way, and leaves English as it was", () => {
  expect(mobileActionDetail("2026-11-22 · Condado", "es")).toBe("22 nov 2026 · Condado");
  expect(mobileActionDetail("2026-11-22 · Condado")).toBe("Nov 22, 2026 · Condado");
});
