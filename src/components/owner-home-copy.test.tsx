// Signed-in Spanish (es-rest, Nov 23, 2026): Owner Home's corporate cards (Today, Payday, Things to do) and the setup row
// hold the same words in English and Spanish, and render Puerto Rico Spanish when the person's language is Spanish.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, rs } from '@rstest/core';
import type { Today, TodayShift } from "@/lib/today/project";
import { needsYou } from "@/lib/action-center/needs-you";
import { PortalLangProvider } from "@/lib/i18n/portal-lang";
import { withoutB } from "./owner-b/test-support";
import { OWNER_HOME_COPY } from "./owner-home-copy";
rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }), usePathname: () => "/app" }));
const { OwnerHomeCorp } = await import("./owner-home-corp");
const { OwnerSetupCorp } = await import("./owner-setup-card");

const paths = (value: unknown, prefix = ''): string[] => value && typeof value === 'object'
  ? Object.entries(value).flatMap(([key, inner]) => paths(inner, `${prefix}${key}.`)) : [prefix];
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[\s ]+/g, ' ').trim();
const shift = (id: string, status: TodayShift["status"]): TodayShift => ({ id, employeeId: id, employeeName: `Person ${id}`, locationId: "main", locationName: "Condado", positionName: "Barista",
  startAt: "2026-12-07T13:00:00Z", endAt: "2026-12-07T21:00:00Z", status, firstClockInAt: null, late: false });
const today: Today = { state: "ready", observedAt: "2026-12-07T15:00:00Z", validForMs: 60_000, timeZone: "America/Puerto_Rico", today: "2026-12-07",
  counts: { scheduled: 2, clockedIn: 1, late: 0, notClockedIn: 0 }, shifts: [shift("a", "clocked_in"), shift("b", "upcoming")], missed: [] };
const props = { greeting: "Hola, Carmen", dateLabel: "lunes, 7 de diciembre", summary: "", today, monitor: null, monitorPending: false, todayRefreshing: false, offline: false,
  connection: "ready" as const, value: needsYou([], "2026-12-07", []), timecards: [], timecardsReady: true,
  nextPay: { payday: "2026-12-11", daysUntil: 4, period: { startDate: "2026-11-30", endDate: "2026-12-06" } } };

it('holds the same keys in English and Spanish', () => {
  expect(paths(OWNER_HOME_COPY.es).sort()).toEqual(paths(OWNER_HOME_COPY.en).sort());
});

it('renders Home’s cards in Spanish and keeps English as it was', () => {
  const es = text(withoutB(renderToStaticMarkup(<PortalLangProvider lang="es"><OwnerHomeCorp {...props} /></PortalLangProvider>)));
  for (const words of ['Hoy', 'Quién está trabajando', 'En turno', 'Sin marcar', 'Turnos disponibles', 'Día de pago', 'vie, 11 dic', 'En 4 días', 'Pendientes', 'Todo al día'])
    expect(es).toContain(words);
  for (const english of ['Clocked in', 'Open shifts', 'Payday', 'In 4 days', 'Things to do', 'You’re all set']) expect(es).not.toContain(english);
  const en = text(withoutB(renderToStaticMarkup(<OwnerHomeCorp {...props} />)));
  for (const words of ['Today', 'Who’s working', 'Clocked in', 'Open shifts', 'Payday', 'Fri, Dec 11', 'In 4 days', 'Things to do', 'You’re all set']) expect(en).toContain(words);
});

it('names the next setup step in Spanish', () => {
  const html = text(renderToStaticMarkup(<PortalLangProvider lang="es"><OwnerSetupCorp steps={{ coverageOpen: true, missingTargets: 2 } as never} locationCount={1} /></PortalLangProvider>));
  expect(html).toContain('Termina de configurar');
  expect(html).toContain('0 de 2 listos · Próximo: períodos de cobertura');
});
