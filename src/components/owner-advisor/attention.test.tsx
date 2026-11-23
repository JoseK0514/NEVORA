import { afterEach, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";
import { AdvisorScreen } from "./advisor";
import { createAdvisorController, initialView, type AdvisorView } from "./controller";
import { parseSnapshot } from "./public-response";
import type { AdvisorSnapshot } from "@/lib/owner-advisor/contracts";

function snapshot(): AdvisorSnapshot {
  const at = new Date().toISOString();
  return { state: "ready", connection: "unavailable", profile: { priorities: "", revision: 0 }, history: [],
    briefing: { observedAt: at, sources: [], partial: false, data: null }, authority: "owner", observedAt: at, validForMs: 15000,
    attention: { state: "ready", date: "2026-10-23", observedAt: at, partial: true, total: 1, hidden: 0, reviewed: [], sources: [], items: [{ id: "a".repeat(64), fingerprint: "b".repeat(64), kind: "clock_in", locationId: "north", locationName: "<script>North</script>", date: "2026-10-23", title: "Check shifts without a clock-in", detail: "2 published shifts started without a recorded clock-in.", basis: "Published shifts and recorded punches", source: { label: "Today", href: "/app", observedAt: at }, reviewRevision: 0, disposition: null, deferredUntil: null }] },
  };
}
const actions = { editQuestion() {}, editPriorities() {}, ask() {}, save() {}, cancel() {}, refresh() {}, reviewConflict() {} };
afterEach(() => { rs.useRealTimers(); });
it("shows sourced priority cards and personal review controls without requiring a model connection", () => {
  const html = renderToStaticMarkup(<AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }} view={{ ...initialView, snapshot: snapshot() }} actions={actions} />);
  expect(html).toContain("Needs your attention");
  expect(html).toContain("Track this issue");
  expect(html).toContain("Later · 1 hour");
  expect(html).toContain("Not relevant today");
  expect(html).toContain("Some sources could not be fully assessed");
  expect(html).toContain("&lt;script&gt;North&lt;/script&gt;");
  expect(html).not.toContain("<script>North");
});
it("rejects malformed attention data instead of showing untrusted action links or unbounded cards", () => {
  const valid = snapshot();
  expect(parseSnapshot(valid).attention!.items).toHaveLength(1);
  expect(() => parseSnapshot({ ...valid, attention: { ...valid.attention, items: Array(4).fill(valid.attention!.items[0]) } })).toThrow();
  expect(() => parseSnapshot({ ...valid, attention: { ...valid.attention, items: [{...valid.attention!.items[0], source: { label: "Evil", href: "https://evil.invalid", observedAt: valid.observedAt }}] } })).toThrow();
});
it("saves an exact current issue and confirms it only after a fresh protected read", async () => {
  rs.useFakeTimers();
  let state: AdvisorView | undefined;
  let posted: unknown;
  let reads = 0;
  const controller = createAdvisorController(v => { state = v; }, async (_url, init) => {
    if (init?.method === "POST") {
      posted = JSON.parse(String(init.body));
      return Response.json({ state: "briefing_reviewed", revision: 1, authority: "owner", observedAt: new Date().toISOString(), validForMs: 15000 });
    }
    reads++;
    return Response.json(snapshot());
  });
  controller.start();
  await rs.advanceTimersByTimeAsync(0);
  await controller.reviewItem("a".repeat(64), "deferred");
  expect(posted).toMatchObject({ op: "review_briefing", issueId: "a".repeat(64), fingerprint: "b".repeat(64), expectedRevision: 0, disposition: "deferred" });
  expect(reads).toBe(2);
  expect(state?.message).toContain("Briefing choice saved");
  controller.pause();
  expect(state?.snapshot).toBeNull();
  controller.stop();
});
it("says what two items share once: one title by place, one day, time and basis line, and one style of action", () => {
  const snap = snapshot(), first = snap.attention!.items[0];
  const second = { ...first, id: "c".repeat(64), fingerprint: "d".repeat(64), locationId: "south", locationName: "South" };
  const html = renderToStaticMarkup(<AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }}
    view={{ ...initialView, snapshot: { ...snap, attention: { ...snap.attention!, total: 2, items: [{ ...first, locationName: "North" }, second] } } }} actions={actions} />);
  expect(html.match(/Check shifts without a clock-in/g)).toHaveLength(1);
  expect(html.match(/Published shifts and recorded punches/g)).toHaveLength(1);
  expect(html.match(/Observed <time/g)).toHaveLength(1);
  expect(html).toContain(">North</h4>");
  expect(html).toContain(">South</h4>");
  expect(html).not.toContain("b-rowact--quiet");
});
it("says a group's draft note and its shared source link once, and keeps each place's own choices", () => {
  const snap = snapshot(), first = snap.attention!.items[0];
  const gap = (id: string, place: string) => ({ ...first, id: id.repeat(64), fingerprint: id.repeat(64), kind: "coverage" as const, locationName: place, title: "Review today's planning gaps",
    detail: "1 planning periods need review, starting 17:00. Maximum staffing shortfall: 1. Includes draft commitments; verify published staffing separately.", basis: "Current planning ledger, including drafts" as const,
    source: { ...first.source, href: "/app/schedule?week=2026-10-19" } });
  const html = renderToStaticMarkup(<AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }}
    view={{ ...initialView, snapshot: { ...snap, attention: { ...snap.attention!, total: 2, items: [gap("c", "West"), gap("d", "Main")] } } }} actions={actions} />);
  expect(html.match(/Includes draft commitments; verify published staffing separately\./g)).toHaveLength(1);
  expect(html.match(/Review source/g)).toHaveLength(1);
  expect(html.match(/Not relevant today/g)).toHaveLength(2);
  expect(html).toContain("1 planning period needs review, starting 5:00 PM. Maximum staffing shortfall:\u00a01.</p>");
});
it("speaks Spanish in the app's own words and keeps the server's English titles, details and basis", async () => {
  const { AdvisorLangProvider } = await import("./lang");
  const snap = snapshot(), first = snap.attention!.items[0];
  const gap = (id: string, place: string) => ({ ...first, id: id.repeat(64), fingerprint: id.repeat(64), kind: "coverage" as const, locationName: place, title: "Review today's planning gaps",
    detail: "1 planning periods need review, starting 17:00. Maximum staffing shortfall: 1. Includes draft commitments; verify published staffing separately.", basis: "Current planning ledger, including drafts" as const,
    source: { ...first.source, href: "/app/schedule?week=2026-10-19" } });
  const reviewed = { id: "e".repeat(64), fingerprint: "e".repeat(64), kind: "clock_in" as const, date: "2026-10-23", locationName: "East", title: "Check shifts without a clock-in", state: "open" as const,
    disposition: "dismissed" as const, deferredUntil: null, evidenceChanged: false, reviewRevision: 1 };
  const html = renderToStaticMarkup(<AdvisorLangProvider lang="es"><AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }}
    view={{ ...initialView, snapshot: { ...snap, attention: { ...snap.attention!, total: 3, hidden: 1, reviewed: [reviewed], items: [gap("c", "West"), gap("d", "Main")] } } }} actions={actions} /></AdvisorLangProvider>);
  for (const text of ["Necesita tu atención", "Verificar de nuevo", "Problemas de hoy con el personal", "Del horario actual, incluidos los borradores", "Revisar fuente", "Dar seguimiento",
    "Más tarde · 1 hora", "No aplica hoy", "Algunas fuentes no se pudieron evaluar", "Incluye compromisos en borrador; verifica aparte el personal publicado.", "Seguimiento",
    '<span class="b-sr">1 revisado</span>', "Marcado como no aplica hoy", "Devolver al resumen", "vie, 23 oct", "Visto <time"]) expect(html, text).toContain(text);
  // The server's own words stay as they came: the title and each place's detail, without the draft note said once above.
  expect(html).toContain("Review today&#x27;s planning gaps");
  expect(html).toContain("1 planning period needs review, starting 5:00 PM. Maximum staffing shortfall: 1.</p>");
  for (const word of ["Includes draft commitments", "Track this issue", "Not relevant today", "Review source", "Follow-through", "From the current schedule", "Observed"]) expect(html, word).not.toContain(word);
});
