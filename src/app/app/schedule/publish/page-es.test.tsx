// Signed-in Spanish: Build and publish follows the person's language, read through readPortalLanguage with the page's proof.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, rs } from '@rstest/core';

const f = rs.hoisted(() => ({ language: "es" as "en" | "es", fail: false, warnings: false, pending: false }));
rs.mock("@/lib/activation/language.server", () => ({ readPortalLanguage: async () => { if (f.fail) throw Error("language_source_unavailable"); return { state: "ready", savedLanguage: f.language, language: f.language }; } }));
rs.mock("next/link", () => ({ default: ({ children, prefetch: _p, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", props, children) }));
rs.mock("@/lib/auth/session", () => ({ requireSessionMutationProof: async () => ({ employee: { id: "QAOWNER", role: "OWNER" } }) }));
rs.mock("@/lib/auth/permissions", () => ({ MANAGER_ROLES: ["OWNER", "MANAGER"], requireRoles: async () => ({ id: "QAOWNER", role: "OWNER" }) }));
rs.mock("@/lib/data/workspaces", () => ({ getWorkspace: async () => ({ id: "w", timeZone: "America/Puerto_Rico" }) }));
rs.mock("@/lib/business-time", () => ({ businessDate: () => "2026-12-07" }));
rs.mock("@/lib/company-access/operational-scope.server", () => ({ withOperationalCompany: async (_proof: unknown, load: () => Promise<unknown>) => ({ state: "ready", data: await load(), authority: "fixture", observedAt: "2026-12-07T12:00:00Z", validForMs: 15000 }) }));
rs.mock("@/components/company-access/scoped-read-frame", () => ({ ScopedReadFrame: ({ children }: { children: React.ReactNode }) => children }));
rs.mock("@/components/company-access/operational-unavailable", () => ({ OperationalUnavailable: ({ title }: { title: string }) => createElement("p", null, title) }));
rs.mock("@/components/schedule-generation-controls", () => ({ ScheduleGenerationControls: () => null }));
rs.mock("@/components/schedule-copy-form", () => ({ ScheduleCopyForm: ({ label }: { label: string }) => createElement("button", null, label) }));
rs.mock("@/lib/data/employees", () => ({ listLocations: async () => [{ id: "loc-1", shortName: "Condado" }, { id: "loc-2", shortName: "Dorado" }, { id: "loc-3", shortName: "Hato Rey" }] }));
rs.mock("@/lib/data/schedules", () => ({ listScheduleStatuses: async () => [{ locationId: "loc-1", status: "PUBLISHED" }, { locationId: "loc-2", status: "DRAFT" }, { locationId: "loc-3", status: "DRAFT" }], listWeekShifts: async () => [{ locationId: "loc-1", isCalloutApproved: false }, { locationId: "loc-1", isCalloutApproved: false }, { locationId: "loc-2", isCalloutApproved: false }] }));
rs.mock("@/lib/data/schedule-generation-review", () => ({ getScheduleGenerationReview: async () => ({ editable: true, attempted: 0, needsSetup: 0, coverage: null, exclusions: [] }) }));
rs.mock("@/lib/data/schedule-publication-review", () => ({ getSchedulePublishReadiness: async () => ({ hasWarnings: f.warnings, coverageGaps: f.warnings ? 1 : 0, missingLeadBlocks: 0, underTargetCount: f.warnings ? 2 : 0, overTargetCount: 0, unconfiguredTargetCount: 0 }) }));
rs.mock("./actions", () => ({ publishDraftsAction: async () => {} }));
rs.mock("../actions", () => ({ publishScheduleAction: async () => {}, publishScheduleChangesAction: async () => {} }));
const value = (startTime: string, endTime: string) => ({ employeeId: "e1", employeeName: "Dana Kim", locationId: "loc-1", date: "2026-12-08", startTime, endTime, positionId: null, positionName: null, isDesignatedLead: false, notes: null });
rs.mock("@/lib/company-access/operational-read.server", () => ({
  readManagerSchedulePublish: async () => ({ state: "unavailable", reason: "access_denied" }),
  readSchedulePendingChanges: async () => f.pending ? { state: "ready", data: { weekStart: "2026-12-07", hasPendingChanges: true, pendingCount: 1, neverCaptured: false, latestRevision: null, canPublish: true, truncated: false,
    locations: [{ locationId: "loc-1", locationName: "Condado", pendingCount: 1 }],
    changes: [{ shiftId: "s1", locationId: "loc-1", employeeId: "e1", employeeName: "Dana Kim", date: "2026-12-08", kind: "CHANGED", fields: ["TIME"], before: value("12:00", "20:00"), after: value("14:00", "20:00"), editCount: 1, lastEditedAt: null, lastEditedBy: null }] } } : { state: "unavailable", reason: "read_failed" } }));
const { default: Page } = await import("./page");
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/[\s ⁠ ]+/g, " ").trim();
const render = async (params: Record<string, string> = {}) => renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ week: "2026-12-07", ...params }) }));
beforeEach(() => { f.language = "es"; f.fail = false; f.warnings = false; f.pending = false; });

it("draws Build and publish in Puerto Rico Spanish, with the language set on the page", async () => {
  const html = await render();
  expect(html).toContain('lang="es"');
  expect(html).toContain('aria-label="Localidades esta semana"');
  const out = text(html);
  for (const words of ["Crear y publicar", "Esta semana", "7–13 dic", "2 borradores", "Empezar desde", "Copiar la semana pasada", "Usar una plantilla",
    "2 turnos", "1 turno", "Nada programado", "Publicado", "Borrador", "Tu equipo recibe un aviso cuando publicas.", "Publicar 2 borradores", "Cancelar"])
    expect(out).toContain(words);
  for (const english of ["Build and publish", "This week", "Start from", "Copy last week", "Nothing scheduled", "Published", "Draft", "Publish 2 drafts", "notified"])
    expect(out).not.toContain(english);
});

it("says the review, the held changes and their times in Spanish", async () => {
  f.warnings = true; f.pending = true;
  const out = text(await render({ review: "1" }));
  for (const words of ["Revisar antes de publicar", "1 bloque de cobertura sin cubrir", "2 empleados por debajo de su meta de horas semanales",
    "Cambios sin publicar", "mar, 8 dic · Cambió la hora · 12:00 p. m. – 8:00 p. m. → 2:00 p. m. – 8:00 p. m.", "Cambiado",
    "Las horas cubren la semana laboral en todas las localidades.", "Publicar 2 borradores y cambios de todos modos", "Volver al horario"])
    expect(out).toContain(words);
  for (const english of ["Review before publishing", "uncovered", "Time changed", "PM", "anyway", "Back to schedule"]) expect(out).not.toContain(english);
});

it("stays in English when the person's language is English or can't be read", async () => {
  f.language = "en";
  const html = await render();
  expect(html).not.toContain('lang="es"');
  expect(text(html)).toContain("Publish 2 drafts");
  f.fail = true;
  expect(text(await render())).toContain("Build and publish");
});
