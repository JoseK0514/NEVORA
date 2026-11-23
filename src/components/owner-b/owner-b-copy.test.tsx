// Signed-in Spanish (Nov 23, 2026): Owner and Manager Home, Things to do, Team and the billing notice draw every word from
// owner-b-copy.ts. The two halves have the same keys, English renders as before, and Spanish renders with no English left
// in the words this package owns. Fictional data only.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from "@rstest/core";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor } from "@/lib/time-clock";
import type { ActionItem } from "@/lib/action-center/project";
import type { NeedsYou } from "@/lib/action-center/needs-you";
import type { BillingSnapshot } from "@/lib/commerce/billing-snapshot";

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }), usePathname: () => "/app", useSearchParams: () => new URLSearchParams() }));
rs.mock("./owner-b.css", () => ({}));

const { OWNER_B_COPY, ASK_ES, clockIn } = await import("./owner-b-copy");
const { HomeB } = await import("./home-b");
const { InboxB, LaterB } = await import("./inbox-b");
const { TeamB } = await import("./team-b");
const { BillingNoticeView } = await import("./billing-notice-card");
const { ASK } = await import("@/components/time-off-waiting-list");

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/[\s ]+/g, " ").trim();
/** Every key path of a copy table (functions and regular expressions are leaves). */
const paths = (value: unknown, prefix = ""): string[] => value && typeof value === "object" && !(value instanceof RegExp) && !Array.isArray(value)
  ? Object.entries(value).flatMap(([key, inner]) => paths(inner, prefix ? `${prefix}.${key}` : key)) : [prefix];

it("has a Spanish entry for every English one, with the same shape", () => {
  expect(paths(OWNER_B_COPY.es).sort()).toEqual(paths(OWNER_B_COPY.en).sort());
  for (const path of paths(OWNER_B_COPY.en)) {
    const pick = (table: unknown) => path.split(".").reduce<unknown>((at, key) => (at as Record<string, unknown>)[key], table);
    expect(typeof pick(OWNER_B_COPY.es)).toBe(typeof pick(OWNER_B_COPY.en));
  }
  expect(Object.keys(ASK_ES).sort()).toEqual(Object.keys(ASK).sort());
});

it("writes Spanish times the voice guide way and leaves English as it came", () => {
  expect(clockIn("es", "7:00 AM – 3:00 PM").replace(/ /g, " ")).toBe("7:00 a. m. – 3:00 p. m.");
  expect(clockIn("en", "7:00 AM – 3:00 PM")).toBe("7:00 AM – 3:00 PM");
});

const shift = (id: string, status: TodayShift["status"], name: string): TodayShift => ({
  id, employeeId: id, employeeName: name, locationId: "loc-1", locationName: "Condado", positionName: "Barista",
  startAt: "2026-11-22T13:00:00Z", endAt: "2026-11-22T21:00:00Z", status, firstClockInAt: status === "clocked_in" ? "2026-11-22T13:01:00Z" : null, late: false,
});
const shifts = [shift("a", "clocked_in", "Ana Rivera"), shift("b", "not_clocked_in", "Luis Medina"), shift("c", "upcoming", "Carla Pérez")];
const today: Today = { state: "ready", observedAt: "2026-11-22T15:00:00Z", validForMs: 60_000, timeZone: "America/Puerto_Rico", today: "2026-11-22",
  counts: { scheduled: 3, clockedIn: 1, late: 0, notClockedIn: 1 }, shifts, missed: [shifts[1]] } as Today;
const monitor: ClockMonitor = { state: "ready", observedAt: "2026-11-22T15:00:00Z", timeZone: "America/Puerto_Rico", validForMs: 60_000,
  employees: [{ timeEntryId: "t-a", employeeId: "a", employeeName: "Ana Rivera", locationId: "loc-1", locationName: "Condado", deviceId: "d1",
    clockInAt: "2026-11-22T13:01:00Z", state: "ON_FLOOR", elapsedMinutes: 120, breakElapsedMinutes: null, positionName: null, scheduleMatch: "MATCHED" }] } as ClockMonitor;
const gap: ActionItem = { id: "g1", type: "COVERAGE_GAP", priority: "URGENT", category: "scheduling", locationId: "loc-1", title: "Position not covered",
  detail: "2026-11-22 · 6:00 PM–10:00 PM · Barista: 1 open", dateTime: "2026-11-22T18:00", href: "/app/schedule/coverage?shift=s1" } as ActionItem;
const value: NeedsYou = { noClockIn: [shifts[1]], now: [gap], requests: [], corrections: [], planning: [], past: [], count: 2 };
const week = { firstName: "Daniel", shortcuts: ["shift", "employee", "update", "timeOff"] as ("shift" | "employee" | "update" | "timeOff")[],
  days: ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"].map((date, index) => ({ date, weekday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index], shiftCount: 2 })),
  scheduledHours: 112, people: 4 };
const home = (lang?: "en" | "es", extra: Partial<ComponentProps<typeof HomeB>> = {}) => text(renderToStaticMarkup(<HomeB today={today} monitor={monitor} monitorPending={false} offline={false}
  value={value} connection="ready" timecards={[]} timecardsReady businessDay="2026-11-22" dateLabel="Sunday, November 22" summary="" greeting="Welcome back, Daniel" week={week}
  nextPay={{ payday: "2026-11-27", daysUntil: 5, period: { startDate: "2026-11-09", endDate: "2026-11-22" } }} lang={lang} {...extra} />));

it("renders Home in English as before, and in Puerto Rico Spanish when the person's language is Spanish", () => {
  // The greeting follows the workspace's hour (partOfDay reads the clock), so the test fixes it: 2:00 PM in Puerto Rico.
  rs.useFakeTimers({ toFake: ["Date"] });
  rs.setSystemTime(new Date("2026-11-22T18:00:00Z"));
  try {
    const en = home();
    for (const words of ["Clocked in", "Not clocked in", "Open shifts", "Things to do", "Cover an open shift", "Find cover", "Add shift", "Send update", "Today", "This week", "Shifts by day", "Scheduled payday"])
      expect(en).toContain(words);
    const es = home("es");
    for (const words of ["En turno", "Sin marcar entrada", "Turnos dispo\u00adnibles", "Pendientes", "Cubrir un turno dispo\u00adnible", "Cubrir", "Añadir turno",
      "Enviar aviso", "Días libres", "Hoy", "Esta semana", "Turnos por día", "Día de pago programado", "Buenas tardes, Daniel", "a. m."])
      expect(es).toContain(words);
    const pay = home("es", { week: { ...week, payrollHref: "/app/payroll" } });
    for (const words of ["En 5 días", "Período de pago 9–22 nov", "Preparar nómina"]) expect(pay).toContain(words);
    expect(renderToStaticMarkup(<HomeB today={today} monitor={monitor} monitorPending={false} offline={false} value={value} connection="ready" timecards={[]} timecardsReady
      dateLabel="" summary="" greeting="" lang="es" />)).toContain('aria-label="Ahora mismo"');
    for (const english of ["Open shifts", "Things to do", "Find cover", "Add shift", "This week", "Scheduled payday", "Pay period", "Clocked in", " AM", " PM", "Good "])
      expect(es).not.toContain(english);
  } finally {
    rs.useRealTimers();
  }
});

it("says Home's states and the payroll notice in Spanish", () => {
  expect(home("es", { value: null, connection: "unavailable", today: null, monitor: null })).toContain("No pudimos cargar Pendientes");
  expect(home("es", { value: null, connection: "loading" })).toContain("Revisando lo que te espera…");
  const late = home("es", { payrollStatus: { state: "ready", overdue: { period: { startDate: "2026-11-02", endDate: "2026-11-08" }, payday: "2026-11-13" } } as ComponentProps<typeof HomeB>["payrollStatus"], week: { ...week, payrollHref: "/app/payroll" } });
  for (const words of ["2–8 nov no tiene nómina", "Preparar 2–8 nov", "El día de pago programado era"]) expect(late).toContain(words);
});

const inbox = (lang?: "en" | "es", extra: Partial<ComponentProps<typeof InboxB>> = {}) => text(renderToStaticMarkup(<InboxB ready={{ state: "ready", observedAt: "2026-11-22T15:00:00Z", validForMs: 30_000,
  weekStart: "2026-11-16", items: [], counts: { total: 0, scheduling: 0, requests: 0, timekeeping: 0 }, limitedAttendance: false } as ComponentProps<typeof InboxB>["ready"]}
  families={[{ id: "card-open", title: "Open shifts", groups: [{ id: "open", title: "Open shifts", rows: [{ key: "g1", href: "/app/schedule", label: "", title: "6:00 PM – 10:00 PM", detail: "Today · Condado · Needs 1 person" }] }] }]}
  total={1} connection="ready" statusLine="" todayFailed={false} onRefresh={() => {}} back later={{ plan: 3, earlier: 1 }} lang={lang} {...extra} />));

it("renders Things to do in Spanish: band, filters, rows, More and the read states", () => {
  const en = inbox();
  for (const words of ["Things to do", "All", "Shifts", "Find cover", "Needs 1", "Time off requests", "Later and done", "3 planned · 1 done"]) expect(en).toContain(words);
  const es = inbox("es");
  for (const words of ["Pendientes", "Todo", "Turnos", "Cubrir", "6:00 p. m. – 10:00 p. m.", "Solicitudes de días libres", "Cambios de turno", "Disponibilidad", "Después y hecho", "3 planificados · 1 hecho", "Falta 1", "Inicio"])
    expect(es).toContain(words);
  for (const english of ["Things to do", "Find cover", "Needs ", "Time off", "Later and done", " PM"]) expect(es).not.toContain(english);
  expect(inbox("es", { ready: null, connection: "unavailable" })).toContain("No pudimos cargar Pendientes");
  expect(inbox("es", { ready: null, connection: "offline" })).toContain("No tienes conexión");
  expect(text(renderToStaticMarkup(<LaterB ready groups={[]} statusLine="" onRefresh={() => {}} lang="es" />))).toContain("Nada para después ni hecho");
});

const team = (lang?: "en" | "es") => text(renderToStaticMarkup(<TeamB people={[{ id: "a", name: "Ana Rivera", detail: "Barista · Condado", href: "/app/employees/a", active: true }]}
  inactive={[{ id: "z", name: "Zoe Ortiz", detail: "", active: false }]} total={1} query="" filtered={false} people_word="People" person_word="person" status="active"
  tools={[]} lang={lang} />));

it("renders Team in Spanish", () => {
  const en = team();
  for (const words of ["Team", "Add", "Inactive", "Search people"]) expect(en).toContain(words);
  const es = team("es");
  for (const words of ["Equipo", "Añadir", "Inactivo", "Aplicar búsqueda"]) expect(es).toContain(words);
  for (const english of ["Team", "Inactive", "Apply search"]) expect(es).not.toContain(english);
  expect(renderToStaticMarkup(<TeamB people={[]} inactive={[]} total={0} query="" filtered={false} people_word="people" person_word="person" status="active" tools={[]} lang="es" />)).toContain('placeholder="Buscar personas"');
});

it("renders the plan and billing notice in Spanish", () => {
  const snapshot = { state: "ready", observedAt: "2026-11-22T15:00:00Z", validForMs: 60_000, notice: { kind: "TRIAL_ENDING", dueAt: "2026-11-25T12:00:00Z", daysRemaining: 3, href: "/app/billing" },
    status: { state: "trialing", timeZone: "America/Puerto_Rico" } } as unknown as BillingSnapshot;
  const en = text(renderToStaticMarkup(<BillingNoticeView snapshot={snapshot} />));
  expect(en).toContain("Your free trial ends Wed, Nov 25");
  expect(en).toContain("3 days left. Choose a plan to keep using NEVORA.");
  const es = text(renderToStaticMarkup(<BillingNoticeView snapshot={snapshot} lang="es" />));
  for (const words of ["Tu prueba gratis termina el mié, 25 nov", "Quedan 3 días. Elige un plan para seguir usando NEVORA.", "Plan y facturación"]) expect(es).toContain(words);
});

it("follows the person's language from the app layout when the page passes none", async () => {
  const { PortalLangProvider } = await import("@/lib/i18n/portal-lang");
  const html = text(renderToStaticMarkup(<PortalLangProvider lang="es"><InboxB ready={null} families={[]} total={null} connection="unavailable" statusLine="" todayFailed={false} onRefresh={() => {}} back={false} /></PortalLangProvider>));
  expect(html).toContain("No pudimos cargar Pendientes");
  expect(text(renderToStaticMarkup(<PortalLangProvider lang="es"><InboxB ready={null} families={[]} total={null} connection="unavailable" statusLine="" todayFailed={false} onRefresh={() => {}} back={false} lang="en" /></PortalLangProvider>))).toContain("Things to do didn’t load");
});

it("names every loading placeholder in Spanish, and the route error's Try again", async () => {
  const { B_LOADING_TABLE, loadingTitle } = await import("./b-loading");
  const titles = [...B_LOADING_TABLE.management, ...B_LOADING_TABLE.employee].map(([, shape]) => shape.title).filter((title): title is string => typeof title === "string");
  expect(titles.length).toBeGreaterThan(20);
  for (const title of titles) {
    expect(loadingTitle(title, "en")).toBe(title);
    // Only proper nouns may stay the same ("Clocker PINs" becomes "PIN del Clocker").
    if (!["Help"].includes(title)) expect(loadingTitle(title, "es"), title).not.toBe(title);
  }
  const { PortalLangProvider } = await import("@/lib/i18n/portal-lang");
  const { BRouteError } = await import("./b-route-error");
  const html = renderToStaticMarkup(<PortalLangProvider lang="es"><BRouteError title="Equipo" spoken="x" line="y" onRetry={() => {}} /></PortalLangProvider>);
  expect(html).toContain("Intentar de nuevo");
  expect(html).not.toContain("Try again");
});

it("speaks to people with tú in the moments' Spanish, and says tarjeta de tiempo", async () => {
  const { MOMENTS_COPY } = await import("./moments-copy");
  const all = paths(MOMENTS_COPY.es).map(path => path.split(".").reduce<unknown>((at, key) => (at as Record<string, unknown>)[key], MOMENTS_COPY.es))
    .map(value => typeof value === "function" ? String((value as (...a: unknown[]) => unknown)(1, 2)) : String(value)).join(" | ");
  expect(all).not.toMatch(/\b(usted|Su gerente|Revíselo|Apruébelo|Abra|Mantenga|Actualice|suyo)\b|registros? de horas/);
  expect(all).toContain("Tu gerente decide");
  expect(all).toContain("1 tarjeta de tiempo aprobada");
});
