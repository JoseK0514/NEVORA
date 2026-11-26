import { describe, expect, it } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";
import { AdvisorScreen } from "./advisor";
import { initialView } from "./controller";
import { parseSnapshot } from "./public-response";
const actions = {
  editQuestion: () => {},
  editPriorities: () => {},
  ask: () => {},
  save: () => {},
  cancel: () => {},
  refresh: () => {},
  reviewConflict: () => {},
};
const snapshot = parseSnapshot({
  state: "ready",
  connection: "unavailable",
  profile: { priorities: "", revision: 0 },
  history: [
    { role: "assistant", content: "<script>bad</script> https://evil.invalid" },
  ],
  briefing: {
    observedAt: "2026-10-22T12:00:00Z",
    sources: [],
    partial: true,
    data: null,
  },
  authority: "owner",
  observedAt: "2026-10-22T12:00:00Z",
  validForMs: 15000,
});
it("offers both explicit workflows without a provider and renders server-owned exact proposals", () => {
  const html = renderToStaticMarkup(<AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }} view={{ ...initialView, loading: false, snapshot, answer: {
    text: "Prepared options", sources: [], proposals: [{ employeeName: "Fictional Ana", locationId: "L1", locationName: "North", date: "2026-10-22", startTime: "08:00", endTime: "12:00", positionName: "Barista", isDesignatedLead: false, scheduledHours: 12, targetHours: 20, publication: "DRAFT", review: "abc123" }],
  } }} actions={actions} />);
  expect(html).toContain("Prepare coverage options");
  expect(html).toContain("Review attendance and payroll");
  expect(html).toContain("Fictional Ana");
  expect(html).toContain('/app/schedule/new?review=abc123');
  expect(html).toContain("Draft assignment");
});
it("renders loading and error without exposing prior data", () => {
  expect(
    renderToStaticMarkup(
      <AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }} view={initialView} actions={actions} />,
    ),
  ).toContain("Loading your briefing");
  expect(
    renderToStaticMarkup(
      <AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }}
        view={{ ...initialView, loading: false, message: "Access ended" }}
        actions={actions}
      />,
    ),
  ).toContain("Access ended");
});
it("renders disconnected disabled Ask, escaped historical text and labeled editable fields", () => {
  const html = renderToStaticMarkup(
    <AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }}
      view={{ ...initialView, loading: false, snapshot }}
      actions={actions}
    />,
  );
  expect(html).toContain("Answers to typed questions are off");
  expect(html).toContain("They need an AI service that you approve. The checks on this page work without it.");
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Ask</);
  expect(html).toContain("&lt;script&gt;bad&lt;/script&gt;");
  expect(html).not.toContain('href="https://evil');
  expect(html).toContain("Earlier conversation");
  expect(html).toContain('for="oa-question"');
  expect(html).toContain('maxLength="2000"');
});
it("renders busy cancellation and answer sources separately from historical context", () => {
  const html = renderToStaticMarkup(
    <AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }}
      view={{
        ...initialView,
        snapshot: { ...snapshot, connection: "available" },
        busy: "ask",
        answer: {
          text: "Reason: coverage is missing.",
          sources: [
            {
              label: "Schedule",
              href: "/app/schedule?week=2026-10-19",
              observedAt: snapshot.observedAt,
            },
          ],
        },
      }}
      actions={actions}
    />,
  );
  expect(html).toContain("Investigating…");
  expect(html).toContain("Cancel");
  expect(html).toContain("Reason: coverage is missing.");
  expect(html).toContain('dateTime="2026-10-22T12:00:00Z"');
  expect(html).toContain('href="/app/schedule?week=2026-10-19"');
});

it("dates comparison staleness by its observation instead of the currently visible receipt",async()=>{
  const {ownerCoveragePlan}=await import("@/test/fixtures/owner-coverage-plan");
  const {ownerCoverageAction}=await import("@/test/fixtures/owner-coverage-action");
  const receipt=ownerCoverageAction("coverage_saved");receipt.receipt!.savedAt="2026-10-30T12:01:00Z";
  const coverageActions={acknowledge:()=>{},save:async()=>{},recover:async()=>{},check:async()=>{},dismiss:()=>{}};
  const coverage={view:{stage:"saved" as const,result:receipt,acknowledged:false,message:"",lastSavedAt:receipt.receipt!.savedAt},actions:coverageActions};
  const plans=ownerCoveragePlan();plans.observedAt="2026-10-30T12:02:00Z";
  const answer={text:"Compare current plans",sources:[],coveragePlans:plans};
  const fresh=renderToStaticMarkup(<AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }} view={{...initialView,snapshot,answer}} actions={actions} coverage={coverage}/>);
  expect(fresh).not.toContain("This comparison predates your save");
  plans.observedAt="2026-10-30T12:00:00Z";
  const earlier=renderToStaticMarkup(<AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }} view={{...initialView,snapshot,answer}} actions={actions} coverage={{...coverage,view:{...coverage.view,stage:"review",result:ownerCoverageAction()}}}/>);
  expect(earlier).toContain("This comparison predates your save");
  expect(earlier).toContain("From an earlier comparison");
});

// ---------- Business citations and the evidence card (fictional records; figures from the backend's own calculators) ----------
describe("a business citation in an answer", async () => {
  const { uiEvidence, uiCitationHref, uiIds } = await import("@/test/fixtures/rondo-business-ui");
  const { BusinessCitationItem, evidenceCardModel } = await import("./business/evidence-card");
  const { BUSINESS_COPY } = await import("./business/copy");
  const { parseAnswer } = await import("./public-response");
  const { formatBusinessMinor } = await import("@/lib/owner-advisor/business/metrics");
  const wire = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  const href = uiCitationHref("SALES"), observedAt = "2026-11-17T14:59:50.000Z";
  const source = { label: "Square sales — Owner import (USD)", href, observedAt };
  const during = Date.parse("2026-11-17T15:00:00.000Z"), later = Date.parse("2026-11-17T15:10:00.000Z");
  const open = (evidence: ReturnType<typeof uiEvidence>[], at = during, lang: "en" | "es" = "en", from = source) =>
    renderToStaticMarkup(<ul className="oa-sources"><BusinessCitationItem source={from} evidence={evidence} initialOpenAt={at} lang={lang} /></ul>);

  it("is a real button in the answer's sources once the parser accepted its evidence; other sources stay links", () => {
    const parsed = parseAnswer(wire({ state: "answered", authority: "owner", observedAt, validForMs: 15000,
      answer: { text: "Sales held steady.", sources: [source, { label: "Schedule", href: "/app/schedule?week=2026-11-09", observedAt }], businessEvidence: [uiEvidence("SALES")] } }));
    const html = renderToStaticMarkup(<AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }} view={{ ...initialView, loading: false, snapshot, answer: parsed.answer }} actions={actions} />);
    const button = /<button[^>]*class="be-cite"[^>]*>/.exec(html)?.[0] ?? "";
    expect(button).toContain('type="button"');
    expect(button).toContain('aria-expanded="false"');
    expect(button).toMatch(/aria-controls="[^"]+-card"/);
    expect(button).toContain('aria-label="Square sales — Owner import (USD): show figures"');
    expect(html).not.toContain("be-card");                          // closed until asked for
    expect(html).not.toContain(`<a href="${href}"`);
    expect(html).toContain('href="/app/schedule?week=2026-11-09"');
    expect(html).toContain('href="/app/ai-manager/business"');     // the entry beside Weekly plan and Company knowledge
  });
  it("opens the figures, what they measure, the period, the record and its state, with a link to the record", () => {
    const evidence = uiEvidence("SALES"), c = evidence.sales!.currencies[0], html = open([evidence]);
    for (const [label, amount] of [["Net sales", c.netMerchandiseMinor], ["Collected on sales", c.sales.collectionsMinor], ["Refunds", c.refunds.collectionsMinor], ["Fees", c.feesMinor],
      ["Net receipts", c.netReceiptsMinor], ["Tax recorded", c.taxMinor]]) {
      expect(html).toContain(label);
      expect(html, label).toContain(`<dd>${formatBusinessMinor(amount, "USD")}</dd>`);
    }
    for (const text of ['role="group"', 'aria-label="Figures from Square sales — Owner import (USD)"', 'tabindex="-1"', 'aria-expanded="true"', "Sales<span>Nov 9–15, 2026</span>", "not profit", "not tax due",
      "All locations", "This record only", "Current when checked", "A subtotal of this record, not the whole business", "Square sales", "Open record", "Open as plain text", 'aria-label="Close"',
      `href="/app/ai-manager/business?view=version&amp;record=${uiIds.sales}&amp;version=${uiIds.salesCurrent}"`, `href="${href}"`]) expect(html, text).toContain(text);
  });
  it("marks evidence past its time and never offers it as current; a past period says so", () => {
    const lapsed = open([uiEvidence("SALES")], later);
    expect(lapsed).toContain("Checked earlier. Ask again for current figures");
    expect(lapsed).not.toContain("Current when checked");
    const past = open([uiEvidence("FINANCE")], during, "en", { ...source, label: "Operating account", href: uiCitationHref("FINANCE") });
    expect(past).toContain("Past period, as recorded then");
    expect(past).toContain("Cash and bills<span>Oct 1–31, 2026</span>");
    expect(past).toContain("Owed to you");
    expect(past).toContain("not cash");
    expect(past).not.toContain("Closing balance from the rows");   // the card states the file's own balance, not a calculated one
  });
  it("names unavailable evidence exactly and shows no figures or zeros for it", () => {
    const html = open([uiEvidence("SALES", { state: "unavailable", reason: "STALE", sales: null })]);
    expect(html).toContain("Figures not available. The records are too old to count as current.");
    expect(html).not.toContain("be-figs");
    expect(html).not.toContain("USD 0.00");
  });
  it("shows no card, and keeps the plain private link, when the evidence can't be presented exactly", () => {
    const t = BUSINESS_COPY.en;
    const unknownQualifier = uiEvidence("SALES", { qualifiers: ["BRAND_NEW_QUALIFIER"] as never });
    const badMoney = wire(uiEvidence("SALES")); badMoney.sales!.currencies[0].netReceiptsMinor = "12.50";
    const noFigures = uiEvidence("SALES", { sales: null });
    for (const evidence of [[unknownQualifier], [badMoney], [noFigures], [], [uiEvidence("FINANCE")]]) {
      expect(evidenceCardModel(href, evidence, t, "en-US", during)).toBeNull();
      const html = open(evidence);
      expect(html).toContain(`<a href="${href}">Square sales — Owner import (USD)</a>`);
      expect(html).not.toContain("<button");
      expect(html).not.toContain("be-card");
    }
    expect(evidenceCardModel("/app/schedule?week=2026-11-09", [uiEvidence("SALES")], t, "en-US", during)).toBeNull();
    // An answer whose figures fail the parser's field check never reaches the screen at all.
    expect(() => parseAnswer({ state: "answered", authority: "owner", observedAt, validForMs: 15000, answer: { text: "x", sources: [source], businessEvidence: [badMoney] } })).toThrow();
  });
  it("renders the card in Spanish with no English label", () => {
    const html = open([uiEvidence("SALES"), uiEvidence("SALES", { state: "unavailable", reason: "MISSING_MAP", sales: null, queryHash: "7".repeat(64) })], later, "es");
    for (const text of ["Ventas netas", "Ingresos netos", "no es ganancia", "Todas las localidades", "Solo este registro", "Verificado antes. Pregunta de nuevo para ver cifras vigentes", "Abrir registro",
      "Abrir como texto sin formato", "Cifras no disponibles. Los registros principales no están configurados.", 'aria-label="Cerrar"', "9–15 nov 2026"]) expect(html, text).toContain(text);
    const text = html.replace(/<time[^>]*>[^<]*<\/time>/g, " ").replace(/<[^>]+>/g, " ").replace(/Square sales — Owner import \(USD\)|Square sales|Observed/g, " ");
    for (const word of ["Net sales", "Collected", "Refunds", "Fees", "Net receipts", "Tax recorded", "Locations", "Counts", "Checked", "Open record", "Record", "Figures", "not profit", "Sales"]) expect(text, word).not.toContain(word);
  });
});

// ---------- Spanish (G98 signed-in Spanish, Nov 23, 2026) ----------
describe("the page in Spanish", async () => {
  const { AdvisorLangProvider } = await import("./lang");
  const strip = (html: string) => html.replace(/<time[^>]*>[^<]*<\/time>/g, " ").replace(/<[^>]+>/g, " ");
  it("speaks Spanish from the language provider: tools, briefing, checks, conversation and priorities", () => {
    const html = renderToStaticMarkup(<AdvisorLangProvider lang="es"><AdvisorScreen tools={{ weekly: true, knowledge: true, business: true }} view={{ ...initialView, loading: false, snapshot, answer: {
      text: "Prepared options", sources: [], proposals: [{ employeeName: "Fictional Ana", locationId: "L1", locationName: "North", date: "2026-10-22", startTime: "08:00", endTime: "12:00", positionName: null, isDesignatedLead: true, scheduledHours: 12, targetHours: null, publication: "DRAFT", review: "abc123" }],
    } }} actions={actions} /></AdvisorLangProvider>);
    for (const text of ["Plan semanal", "Conocimiento de la empresa", "Registros del negocio", "Resumen en vivo", "Actualizar historial", "Prepara tu próximo paso", "Preparar opciones de cobertura",
      "Revisar asistencia y nómina", "Idioma de la revisión", '<option value="es" selected="">Español</option>', "Las respuestas a preguntas escritas están desactivadas", "Conversación anterior",
      "Preguntas para empezar", "¿Qué necesita mi atención hoy?", "Tu pregunta", "0/2000 caracteres", ">Preguntar<", "Prioridades del dueño", "Guardar prioridades",
      "Propuestas de cobertura", "jue, 22 oct", "Personal", "Líder de turno", "meta: sin definir", "Asignación en borrador", "Revisar el reemplazo exacto",
      "El resumen operativo actual no está disponible."]) expect(html, text).toContain(text);
    const text = strip(html);
    for (const word of ["Weekly plan", "Company knowledge", "Business records", "Live briefing", "Refresh history", "Prepare coverage options", "Starter questions", "Your question",
      "characters", "Owner priorities", "Save priorities", "Coverage proposals", "Staffing", "Shift lead", "Draft assignment", "Observed", " AM", " PM"]) expect(text, word).not.toContain(word);
    expect(html).toMatch(/8:00\u00a0a\.\u00a0m\.\s–\s12:00\u00a0p\.\u00a0m\./);
    expect(html).toContain("Prepared options");   // the answer itself is shown as it came
  });
  it("lets the lang prop win over the provider, and says loading in Spanish", () => {
    expect(renderToStaticMarkup(<AdvisorScreen lang="es" tools={{ weekly: true, knowledge: true, business: true }} view={initialView} actions={actions} />)).toContain("Cargando tu resumen y la conversación…");
    const english = renderToStaticMarkup(<AdvisorLangProvider lang="es"><AdvisorScreen lang="en" tools={{ weekly: true, knowledge: true, business: true }} view={initialView} actions={actions} /></AdvisorLangProvider>);
    expect(english).toContain("Loading your briefing and conversation…");
  });
  it("keeps a period review in its own language: an English review on a Spanish page, a Spanish one with tú and localidad", () => {
    const period = (language: "en" | "es") => ({ startDate: "2026-10-01", endDate: "2026-10-07", language, observedAt: "2026-10-22T12:00:00Z", readiness: "unverified" as const, partial: false,
      attendance: { state: "ready" as const, total: 1, employees: [{ name: "Fictional Luis", state: "NEEDS_REVIEW", revision: 2, locations: [], issues: ["no_records"], historical: false }] },
      payroll: { state: "ready" as const, runs: [{ id: "r1", revision: 1, startDate: "2026-10-01", endDate: "2026-10-07", status: "BLOCKED", ruleRevision: null, superseded: false, coverageComplete: false, codes: ["SETTINGS_REQUIRED"] }] } });
    const render = (language: "en" | "es") => renderToStaticMarkup(<AdvisorScreen lang="es" tools={{ weekly: true, knowledge: true, business: true }}
      view={{ ...initialView, snapshot, answer: { text: "x", sources: [], periodReview: period(language) } }} actions={actions} />);
    const es = render("es");
    for (const text of ["Excepciones del período", "1–7 oct", "Sin localidad registrada en el período", "Necesita revisión", "revisa la población del período", "Estado registrado: Bloqueado",
      "La cobertura de localidades está incompleta.", "Revisa las correcciones", "No se infieren marcaciones", "Visto"]) expect(es, text).toContain(text);
    for (const word of ["Revise ", "ubicación", "NEEDS_REVIEW", "BLOCKED"]) expect(strip(es), word).not.toContain(word);
    const en = render("en");
    for (const text of ['lang="en"', "Period exceptions", "No recorded location in the period", "Needs review", "Recorded status: Blocked", "Location coverage is incomplete."]) expect(en, text).toContain(text);
    expect(en).toMatch(/Oct\s1–7/);
  });
});
