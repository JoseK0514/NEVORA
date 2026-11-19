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
  const html = renderToStaticMarkup(<AdvisorScreen view={{ ...initialView, loading: false, snapshot, answer: {
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
      <AdvisorScreen view={initialView} actions={actions} />,
    ),
  ).toContain("Loading your briefing");
  expect(
    renderToStaticMarkup(
      <AdvisorScreen
        view={{ ...initialView, loading: false, message: "Access ended" }}
        actions={actions}
      />,
    ),
  ).toContain("Access ended");
});
it("renders disconnected disabled Ask, escaped historical text and labeled editable fields", () => {
  const html = renderToStaticMarkup(
    <AdvisorScreen
      view={{ ...initialView, loading: false, snapshot }}
      actions={actions}
    />,
  );
  expect(html).toContain("Your AI manager isn’t connected yet.");
  expect(html).toMatch(/disabled="">Ask/);
  expect(html).toContain("&lt;script&gt;bad&lt;/script&gt;");
  expect(html).not.toContain('href="https://evil');
  expect(html).toContain("Earlier conversation");
  expect(html).toContain('for="oa-question"');
  expect(html).toContain('maxLength="2000"');
});
it("renders busy cancellation and answer sources separately from historical context", () => {
  const html = renderToStaticMarkup(
    <AdvisorScreen
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
  const fresh=renderToStaticMarkup(<AdvisorScreen view={{...initialView,snapshot,answer}} actions={actions} coverage={coverage}/>);
  expect(fresh).not.toContain("This comparison predates your save");
  plans.observedAt="2026-10-30T12:00:00Z";
  const earlier=renderToStaticMarkup(<AdvisorScreen view={{...initialView,snapshot,answer}} actions={actions} coverage={{...coverage,view:{...coverage.view,stage:"review",result:ownerCoverageAction()}}}/>);
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
    const html = renderToStaticMarkup(<AdvisorScreen view={{ ...initialView, loading: false, snapshot, answer: parsed.answer }} actions={actions} />);
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
    for (const text of ['role="group"', 'aria-label="Figures from Square sales — Owner import (USD)"', 'tabindex="-1"', 'aria-expanded="true"', "Sales<span>Nov 9 – Nov 15, 2026</span>", "not profit", "not tax due",
      "All locations", "This record only", "Current when checked", "A subtotal of this record, not the whole business", "Square sales", "Open record", "Open as plain text", 'aria-label="Close"',
      `href="/app/ai-manager/business?view=version&amp;record=${uiIds.sales}&amp;version=${uiIds.salesCurrent}"`, `href="${href}"`]) expect(html, text).toContain(text);
  });
  it("marks evidence past its time and never offers it as current; a past period says so", () => {
    const lapsed = open([uiEvidence("SALES")], later);
    expect(lapsed).toContain("Checked earlier. Ask again for current figures");
    expect(lapsed).not.toContain("Current when checked");
    const past = open([uiEvidence("FINANCE")], during, "en", { ...source, label: "Operating account", href: uiCitationHref("FINANCE") });
    expect(past).toContain("Past period, as recorded then");
    expect(past).toContain("Cash and bills<span>Oct 1 – Oct 31, 2026</span>");
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
    for (const text of ["Ventas netas", "Ingresos netos", "no es ganancia", "Todos los locales", "Solo este registro", "Verificado antes. Pregunte de nuevo para cifras vigentes", "Abrir registro",
      "Abrir como texto sin formato", "Cifras no disponibles. Los registros principales no están configurados.", 'aria-label="Cerrar"', "9 nov – 15 nov 2026"]) expect(html, text).toContain(text);
    const text = html.replace(/<time[^>]*>[^<]*<\/time>/g, " ").replace(/<[^>]+>/g, " ").replace(/Square sales — Owner import \(USD\)|Square sales|Observed/g, " ");
    for (const word of ["Net sales", "Collected", "Refunds", "Fees", "Net receipts", "Tax recorded", "Locations", "Counts", "Checked", "Open record", "Record", "Figures", "not profit", "Sales"]) expect(text, word).not.toContain(word);
  });
});
