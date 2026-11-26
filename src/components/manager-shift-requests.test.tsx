// Signed-in Spanish (Nov 23, 2026): an Owner's or Manager's Shift requests in Puerto Rico Spanish, and in English when
// the page passes no language. Fictional data only.
import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, rs } from "@rstest/core";
import { ManagerShiftRequests } from "./manager-shift-requests";
import { PortalLangProvider } from "@/lib/i18n/portal-lang";
import type { ExchangeRecord } from "@/lib/data/exchanges";
import type { CalloutRecord } from "@/lib/data/callouts";

const f = rs.hoisted(() => ({ pending: [] as unknown[], callouts: [] as unknown[], coverage: [] as unknown[], activity: [] as unknown[], history: [] as unknown[], denied: false }));
rs.mock("@/lib/company-access/operational-scope.server", () => ({ isOperationalAuthorizationError: () => false,
  withOperationalCompany: async (_proof: unknown, load: () => Promise<unknown>) => f.denied ? { state: "unavailable", reason: "access_denied" } : { state: "ready", data: await load(), coverage: { kind: "COMPANY", locationIds: [] }, authority: "fixture", observedAt: "2026-10-14T12:00:00Z", validForMs: 15000 } }));
rs.mock("@/components/company-access/scoped-read-frame", () => ({ ScopedReadFrame: ({ children, unavailable }: { children?: ReactNode; unavailable?: ReactNode }) => children ?? unavailable ?? null }));
rs.mock("@/lib/auth/session", () => ({ requireSession: async () => ({ id: "reviewer", firstName: "Alex", lastName: "Rivera", role: "MANAGER", primaryLocationId: "loc" }),
  requireSessionMutationProof: async () => ({ employee: { id: "reviewer", role: "MANAGER" }, sessionTokenHash: "a".repeat(64) }) }));
rs.mock("@/lib/data/exchanges", () => ({ listManagerPendingExchanges: async () => f.pending, listManagementCoverage: async () => f.coverage, listTeamExchangeActivity: async () => f.activity }));
rs.mock("@/lib/data/callouts", () => ({ listPendingCallouts: async () => f.callouts, listTeamCalloutHistory: async () => f.history }));
rs.mock("@/lib/data/shift-changes", () => ({ readShiftChangeAvailability: async () => ({ allowed: true }) }));
rs.mock("@/lib/data/shift-change-views", () => ({ readShiftChangeHistoryView: async () => [{ revision: 2, event: "completed", at: "2026-10-04T12:28:00Z", source: "2026-10-05 · 08:00 – 12:00", target: null, mode: "MANAGER" }] }));
rs.mock("@/app/app/exchange/actions", () => ({ shiftChangeAction: rs.fn(), reconcileShiftChangeAction: async () => null }));
rs.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }), redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
rs.mock("next/link", () => ({ useLinkStatus: () => ({ pending: false }), default: ({ href, children, prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => { void prefetch; return createElement("a", { href, ...props }, children); } }));

const shift = (over: Record<string, unknown> = {}) => ({ id: "s", scheduleId: "sched", employeeId: "e1", employeeName: "Ana Rivera", locationId: "north", locationName: "Condado", weekStart: "2026-12-07", date: "2026-12-07", startTime: "06:00", endTime: "14:00", ...over });
const swap = { id: "swap", requestRevision: 3, actionable: true, kind: "SWAP", status: "MANAGER_PENDING", requestedByEmployeeId: "e1", requestedByName: "Ana Rivera", requestedByRole: "EMPLOYEE", targetEmployeeId: "e2", targetEmployeeName: "Ben Cruz", createdAt: "2026-10-03T00:00:00Z",
  sourceShift: shift(), targetShift: shift({ id: "t", employeeId: "e2", employeeName: "Ben Cruz", date: "2026-12-09", startTime: "14:00", endTime: "22:00", isDesignatedLead: true }) } as unknown as ExchangeRecord;
const cover = { ...swap, id: "cover", kind: "COVERAGE", targetShift: undefined } as unknown as ExchangeRecord;
const callout = { id: "callout", requestRevision: 4, shiftId: "s", employeeId: "e1", employeeName: "Ana Rivera", locationId: "north", locationName: "Condado", weekStart: "2026-12-07", date: "2026-12-07", startTime: "06:00", endTime: "14:00", reasonCode: "ILLNESS", reasonNote: "Fiebre", status: "PENDING", createdAt: "2026-10-14T11:00:00Z" } as unknown as CalloutRecord;

beforeEach(() => { f.pending = []; f.callouts = []; f.coverage = []; f.activity = []; f.history = []; f.denied = false; });
const text = (html: string) => html.replace(/<span class="b-when-s">[^<]*<\/span>/g, "").replace(/<[^>]+>/g, " ").replace(/[\s  ]+/g, " ").trim();
const render = async (lang: "en" | "es" | undefined, tab?: string) => {
  const page = await ManagerShiftRequests({ timeZone: "America/Puerto_Rico", tab, ...(lang ? { lang } : {}) });
  return renderToStaticMarkup(<PortalLangProvider lang={lang ?? "en"}>{page}</PortalLangProvider>);
};
const hasWord = (s: string, w: string) => new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "u").test(s);

it("renders the waiting requests in Puerto Rico Spanish", async () => {
  f.pending = [swap, cover]; f.callouts = [callout];
  const html = await render("es"), words = text(html);
  for (const w of ["Solicitudes de turno", "Pendientes", "En espera", "Por cubrir", "Terminadas", "Intercambio", "Reemplazo", "No puedo trabajar", "Con Ben Cruz", "La tomó Ben Cruz",
    "lun, 7 dic", "6:00 a. m. – 2:00 p. m.", "Turno de Ben Cruz", "Líder de turno", "Al aprobar, se intercambian estos dos turnos.", "Al aprobar, el turno pasa a la persona que lo tomó.",
    "Motivo", "Enfermedad", "Nota", "Al aprobar, el turno sale de su horario.", "Rechazar", "Aprobar", "hace 11 d", "hace 1 h"]) expect(words).toContain(w);
  expect(html).toContain('aria-label="Rechazar la solicitud de intercambio de Ana Rivera"');
  expect(html).toContain('aria-label="Aprobar la solicitud de No puedo trabajar de Ana Rivera"');
  expect(html).toContain('aria-label="Solicitudes de turno en espera"');
  for (const w of ["Shift requests", "Waiting", "Open cover", "Done", "Swap", "Can’t work", "Picked up by", "Approving", "Reason", "Illness", "Note", "Decline", "Approve", "ago", " AM", " PM", "Mon", "Dec", "Shift lead"])
    expect(hasWord(words, w)).toBe(false);
  expect(words).not.toMatch(/[¡]|\busted\b/);
});

it("renders open cover, Done with its history and the empty states in Spanish", async () => {
  f.coverage = [{ ...cover, status: "OPEN", targetEmployeeId: undefined, targetEmployeeName: undefined }];
  const open = await render("es", "coverage");
  for (const w of ["Cerrar solicitud", "Al cerrarla, nadie más puede tomar el turno. El turno sigue siendo de Ana Rivera."]) expect(text(open)).toContain(w);
  expect(open).toContain('aria-label="Cerrar la solicitud de reemplazo de Ana Rivera. El turno sigue siendo suyo."');
  f.activity = [{ ...cover, status: "APPROVED" }]; f.history = [{ ...callout, status: "DENIED", coverage: { state: "not_requested", basis: "linked_request_history_v1" } }];
  const done = text(await render("es", "activity"));
  for (const w of ["Aprobada", "Rechazada", "Resultado", "Reemplazo, según el registro", "No se pidió reemplazo", "Historial de solicitudes", "Completada por un gerente", "4 oct, 8:28 a. m."]) expect(done).toContain(w);
  for (const w of ["Approved", "Declined", "Result", "Request history", "Completed", "by a manager"]) expect(hasWord(done, w)).toBe(false);
  f.activity = []; f.history = []; f.coverage = [];
  expect(text(await render("es"))).toContain("Estás al día");
  expect(text(await render("es", "coverage"))).toContain("No hay turnos por cubrir");
  expect(text(await render("es", "activity"))).toContain("Nada decidido todavía");
});

it("names the page that couldn't be read in Spanish", async () => {
  f.denied = true;
  const words = text(await render("es"));
  expect(words).not.toContain("Team shift requests unavailable");
});

it("stays in English when no language is passed", async () => {
  f.pending = [swap, cover]; f.callouts = [callout];
  const html = await render(undefined), words = text(html);
  for (const w of ["Shift requests", "Things to do", "Waiting", "Open cover", "Done", "Swap", "Cover request", "Can’t work", "With Ben Cruz", "Picked up by Ben Cruz", "Mon, Dec 7", "6:00 AM – 2:00 PM",
    "Ben Cruz’s shift", "Shift lead", "Approving trades these two shifts.", "Reason", "Illness / sick", "Decline", "Approve", "11 d ago"]) expect(words).toContain(w);
  expect(html).toContain('aria-label="Decline swap request from Ana Rivera"');
  expect(html).toContain('aria-label="Approve the report from Ana Rivera"');
  expect(words).not.toContain("Solicitudes");
});
