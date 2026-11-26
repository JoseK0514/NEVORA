import { describe, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";
import { BUSINESS_UNAVAILABLE_CODES, type BusinessReadResult } from "@/lib/owner-advisor/business/contracts";
import { uiCatalog, uiCatalogResult, uiIds, uiMapRead, uiNow, uiQueryResult } from "@/test/fixtures/rondo-business-ui";
import { createBusinessClient, isWrite, parseBusinessResult, pendingFor, type BusinessWrite } from "./business-client";
import { FiguresPanel, FiguresResult, MapContents, MapReviewContent, MapView, mapDraftErrors } from "./business-map";
import { BusinessPage, IssueCard, businessContext } from "./business-page";
import { BUSINESS_COPY, type BusinessLang } from "./copy";

rs.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }) }));

// Fictional data only. Query answers and map reads are parsed from the wire form before they are rendered.
const wire = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const catalog = uiCatalog(), noop = () => {};
const ctx = (lang: BusinessLang = "en", extra = {}) => businessContext(catalog, lang, uiNow, extra);
const answer = (domain: "SALES" | "FINANCE", extra: Partial<BusinessReadResult> = {}) => parseBusinessResult(wire(uiQueryResult(domain, extra))).result!;
const figures = (result: BusinessReadResult, lang: BusinessLang = "en") => renderToStaticMarkup(<FiguresResult ctx={ctx(lang)} result={result} />);
const mapReview = (lang: BusinessLang = "en", extra: Partial<Parameters<typeof MapReviewContent>[0]> = {}, id = uiIds.mapDraft) =>
  renderToStaticMarkup(<MapReviewContent ctx={ctx(lang)} result={parseBusinessResult(wire(uiMapRead(id)))} acknowledged={false} setAcknowledged={noop} confirmDiscard={false} setConfirmDiscard={noop} onPublish={noop} onDiscard={noop} {...extra} />);
const button = (html: string, label: string) => new RegExp(`<button[^>]*>${label}</button>`).exec(html)?.[0] ?? "";

describe("a query's answer on the wire", () => {
  it("is accepted exactly as the server shapes it, for sales and for cash", () => {
    expect(answer("SALES").sales!.currencies[0].netReceiptsMinor).toMatch(/^\d+$/);
    expect(answer("FINANCE").finance!.currencies[0].reportedClosingMinor).toBe("1744150");
    expect(answer("SALES").citations[0].name).toBe("Square sales");
  });
  it.each([...BUSINESS_UNAVAILABLE_CODES])("accepts unavailable with the reason %s and no figures", reason => {
    expect(answer("SALES", { state: "unavailable", reason, sales: null, citations: [] }).reason).toBe(reason);
  });
  it("fails closed on anything outside the contract", () => {
    const bad: Partial<Record<string, unknown>>[] = [{ state: "partial" }, { reason: "STALE" }, { state: "unavailable", reason: "NEW_REASON" }, { qualifiers: ["NEW_QUALIFIER"] }, { extra: 1 }, { finance: {} },
      { temporalUse: "FORECAST" }, { selection: { kind: "EVERYTHING" } }, { locationScope: { kind: "SELECTED", locationIds: [] } }, { scenario: { anchorRecordId: "x" } }, { timeZone: "UTC" }, { queryHash: "a".repeat(64) },
      { citations: [{ ...uiQueryResult("SALES").result!.citations[0], href: "https://example.invalid/x" }] }, { citations: [{ ...uiQueryResult("SALES").result!.citations[0], secret: 1 }] }, { observedAt: "yesterday" }];
    for (const change of bad) expect(() => parseBusinessResult(wire({ ...uiQueryResult("SALES"), result: { ...uiQueryResult("SALES").result!, ...change } })), JSON.stringify(change).slice(0, 80)).toThrow();
    const money = wire(uiQueryResult("SALES")); (money.result!.sales!.currencies[0] as unknown as Record<string, unknown>).taxMinor = 134.6;
    expect(() => parseBusinessResult(money)).toThrow();
  });
  it("is a read: a lost reply means nothing happened, never an uncertain write", async () => {
    const query = { op: "query_sales" as const, requestId: "50000000-0000-4000-8000-000000000001", query: { window: catalog.versions[0].metadata!.window, selection: { kind: "PRIMARY_PERIMETER" as const }, locationScope: { kind: "ALL" as const }, temporalUse: "CURRENT" as const } };
    expect(isWrite(query)).toBe(false);
    expect(await createBusinessClient(async () => { throw new TypeError("network"); }).send(query)).toEqual({ kind: "unavailable" });
    const sent: unknown[] = [];
    const ok = await createBusinessClient(async (_input, init) => { sent.push(JSON.parse(String(init.body))); return new Response(JSON.stringify(uiQueryResult("SALES"))); }).send(query);
    expect(ok.kind === "ok" && ok.result.result?.state).toBe("ready");
    expect(sent[0]).toEqual(query);
  });
});

describe("the figures check", () => {
  it("offers exactly the contract's choices, in words", () => {
    const html = renderToStaticMarkup(<FiguresPanel ctx={ctx()} />);
    for (const text of ["Sales", "Cash and bills", "Read as", "Current", "A past period", "First day", "Last day", "Read from", "Main records", "One record", "Locations", "All locations", "Choose locations", "Show figures"]) expect(html, text).toContain(text);
    for (const id of ["be-q-domain", "be-q-time", "be-q-first", "be-q-last", "be-q-use", "be-q-places"]) expect(html).toContain(`for="${id}"`);
    expect(html).not.toContain("be-num");   // nothing is shown before the server answers
  });
  it("shows the server's figures in tabular money with the record, its period and its state", () => {
    const result = answer("SALES"), html = figures(result);
    for (const text of ["Sales · USD", "Nov 9–15, 2026", "Net sales", "Collected on sales", "Refunds", "Net receipts", "not profit", "not tax due", "From these records", "Square sales", ">In use<", "Good to know",
      "A subtotal of this record, not the whole business", "This record only", `href="/app/ai-manager/business?view=version&amp;record=${uiIds.sales}&amp;version=${uiIds.salesCurrent}"`]) expect(html, text).toContain(text);
    expect(html.match(/class="be-num"/g)!.length).toBeGreaterThanOrEqual(8);
    const cash = figures(answer("FINANCE"));
    for (const text of ["Cash and bills · USD", "Oct 1–31, 2026", "Money in", "Money out", "Owed to you", "not cash", "Operating account", ">Past period<", "Past period, as recorded then", "Things to check"]) expect(cash, text).toContain(text);
  });
  it.each([...BUSINESS_UNAVAILABLE_CODES])("says unavailable (%s) in one card with its reason, no figures and no zero", reason => {
    const html = figures(answer("SALES", { state: "unavailable", reason, sales: null, citations: [] }));
    expect(html).toContain("Figures not available");
    expect(html).toContain(BUSINESS_COPY.en.unavailable[reason]);
    expect(html).not.toContain("be-num");
    expect(html).not.toContain("USD 0.00");
    expect(html.includes("Set up main records")).toBe(reason === "MISSING_MAP");
  });
  it("says partial and empty honestly", () => {
    const partial = figures(answer("SALES", { sourceSubtotal: false, completeScope: false, selection: { kind: "PRIMARY_PERIMETER" } }));
    expect(partial).toContain("Part of what you asked isn’t covered");
    expect(partial).toContain("Your main records");
    const empty = figures(answer("SALES", { sales: { currencies: [], findings: [], excludedRows: 0 } }));
    expect(empty).toContain("No figures for this period");
    expect(empty).not.toContain("USD");
  });
  it("renders in Spanish with no English label", () => {
    const html = [figures(answer("SALES"), "es"), figures(answer("FINANCE"), "es"), figures(answer("SALES", { state: "unavailable", reason: "STALE", sales: null, citations: [] }), "es"),
      figures(answer("SALES", { sales: { currencies: [], findings: [], excludedRows: 0 } }), "es"), renderToStaticMarkup(<FiguresPanel ctx={ctx("es")} />)].join(" ");
    for (const text of ["Ventas netas", "De estos registros", "En uso", "Cifras no disponibles", "No hay cifras para este período", "Mostrar cifras", "Leer de", "Un período pasado", "Verificado"]) expect(html, text).toContain(text);
    const text = html.replace(/<[^>]+>/g, " ").replace(/Square sales|Operating account|USD|Rondo|NEVORA|Condado Café|Santurce Bakery/g, " ");
    for (const word of ["Net sales", "Refunds", "From these", "In use", "Past period", "Good to know", "Show figures", "Read from", "Main records", "Locations", "First day", "Checked", "Current", "Sales", "Things to check"])
      expect(new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "u").test(text), word).toBe(false);
    expect(text).not.toMatch(/undefined|\[object|NaN/);
  });
});

describe("main records", () => {
  it("reads a staged map and a published one exactly, and fails closed on anything else", () => {
    const draft = parseBusinessResult(wire(uiMapRead()));
    expect(draft.map!.input!.cells).toHaveLength(3);
    expect(draft.receipt!.revision).toBe(2);
    expect(draft.readReceiptId).not.toBeNull();
    const edit = (change: (v: Record<string, any>) => void) => { const value = wire(uiMapRead()) as unknown as Record<string, any>; change(value); return () => parseBusinessResult(value); };
    expect(edit(v => { v.map.status = "LIVE"; })).toThrow();
    expect(edit(v => { v.map.input.cells[0].role = "MAIN"; })).toThrow();
    expect(edit(v => { v.map.input.accounts[0].ownership = { kind: "SPLIT" }; })).toThrow();
    expect(edit(v => { v.map.extra = 1; })).toThrow();
  });
  it("keeps only identifiers for an unconfirmed map publish", () => {
    const publish: BusinessWrite = { op: "publish_coverage_map", requestId: "50000000-0000-4000-8000-000000000001", mapVersionId: uiIds.mapDraft, readReceiptId: "50000000-0000-4000-8000-000000000042", expectedRevision: 2, digest: "8".repeat(64), acknowledged: true };
    expect(pendingFor(publish, "owner")).toEqual({ operationId: publish.requestId, op: "publish_coverage_map", sourceId: null, versionId: null, mapVersionId: uiIds.mapDraft, authority: "owner" });
    expect(isWrite(publish)).toBe(true);
    expect(isWrite({ op: "read_coverage_map", requestId: publish.requestId, mapVersionId: uiIds.mapDraft })).toBe(false);
  });
  it("has one next step when nothing is set up", () => {
    const html = renderToStaticMarkup(<MapView ctx={businessContext(uiCatalog("empty"), "en", uiNow)} />);
    expect(html).toContain("Not set up");
    expect(html).toContain("Until then Rondo reads one record at a time.");
    expect(html.match(/Set up main records/g)).toHaveLength(1);
  });
  it("shows what is in use, a draft waiting, and names instead of IDs", () => {
    const html = renderToStaticMarkup(<MapView ctx={ctx()} />);
    for (const text of ["In use by Rondo", "2 entries", "Draft waiting for review", `href="/app/ai-manager/business?view=map&amp;map=${uiIds.mapDraft}"`, "What counts", "Square sales", "Sales · USD · Nov 9–15, 2026 · Condado Café, Santurce Bakery",
      "Operating account", "Cash · USD · Oct 1–31, 2026 · operating", ">Main<", "Accounts", "The whole company", "Change main records",
      "Rondo only knows the accounts you list. Shared cash isn’t split by location. Main records are counted once. A cross-check is never added to them."]) expect(html, text).toContain(text);
    expect(html).not.toContain("loc-1");
    expect(button(renderToStaticMarkup(<MapView ctx={ctx("en", { locked: true })} />), "Change main records")).toContain('disabled=""');
  });
  it("edits accounts and entries with every field labelled, one summary row each for a phone", () => {
    const html = renderToStaticMarkup(<MapView ctx={ctx()} initialEditing />);
    for (const text of ["Account name", "As written in your cash files", "Belongs to", "The whole company", "Condado Café", "Add an account", "Record", "Covers", "Counts as", "Main", "Cross-check", "First day", "Last day",
      "Add an entry", "Remove", "Save draft", "Saved as a draft. Rondo doesn’t use it until you publish."]) expect(html, text).toContain(text);
    expect(html.match(/class="be-item2__sum"/g)).toHaveLength(3);     // one account and two entries, each a summary row
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(3);
    for (const id of ["be-acc-0", "be-acc-owner-0", "be-cell-0", "be-cell-metric-0", "be-cell-role-0", "be-cell-first-0", "be-cell-last-0"]) expect(html, id).toContain(`for="${id}"`);
    expect(html).toContain('value="2026-10-01"');
    expect(html).toContain('value="2026-10-31"');
    expect(html).not.toContain("Old register</option>");                // a withdrawn record can't be counted
    expect(html).not.toContain("Catering invoices</option>");           // nor one with nothing published
  });
  it("checks a draft before sending it", () => {
    const t = BUSINESS_COPY.en, cell = { sourceId: uiIds.sales, metric: "SALES" as const, role: "PRIMARY" as const, first: "2026-11-09", last: "2026-11-15", accountRefs: [], locationIds: ["loc-1"] };
    expect(mapDraftErrors(t, [{ accountRef: "operating", owner: "" }], [cell], "America/Puerto_Rico")).toEqual({ accounts: {}, cells: {} });
    expect(mapDraftErrors(t, [{ accountRef: " ", owner: "" }, { accountRef: "a", owner: "" }, { accountRef: "a", owner: "" }], [], "UTC").accounts).toEqual({ 0: "Enter an account name", 2: "Use each account name once" });
    expect(mapDraftErrors(t, [], [{ ...cell, sourceId: "" }, { ...cell, last: "" }, { ...cell, last: "2026-11-01" }, { ...cell, locationIds: [] }], "UTC").cells)
      .toEqual({ 0: "Choose a record", 1: "Choose the first and last day", 2: "Last day after the first", 3: "Choose at least one" });
  });
  it("reviews a staged map with its own acknowledgement; publish waits for it", () => {
    const html = mapReview();
    for (const text of ["What counts", ">Cross-check<", "till-condado", "Condado Café", "Rondo uses this as the whole picture, for every Owner.",
      "I reviewed the accounts and entries, and I want Rondo to count these as my main records", "You choose what is listed. NEVORA can’t tell if an account is missing.", "Discard draft"]) expect(html, text).toContain(text);
    expect(button(html, "Publish for Rondo")).toContain('disabled=""');
    expect(button(mapReview("en", { acknowledged: true }), "Publish for Rondo")).toMatch(/^<button(?![^>]*disabled)/);
    expect(button(renderToStaticMarkup(<MapReviewContent ctx={ctx("en", { busy: true, locked: true })} result={parseBusinessResult(wire(uiMapRead()))} acknowledged setAcknowledged={noop} confirmDiscard={false} setConfirmDiscard={noop} onPublish={noop} onDiscard={noop} />), "Publishing…")).toContain('disabled=""');
    expect(mapReview("en", { confirmDiscard: true })).toContain("Discard this draft?");
    const published = mapReview("en", {}, uiIds.mapCurrent);
    expect(published).not.toContain("Publish for Rondo");
    expect(published).not.toContain("Discard draft");
  });
  it("leads a map conflict back to what is current, and opens from the page", () => {
    const html = renderToStaticMarkup(<IssueCard t={BUSINESS_COPY.en} issue={{ code: "conflict", op: "publish", detail: null, sourceId: null, mapOp: true }} />);
    expect(html).toContain("A newer version exists. Review it again.");
    expect(html).toContain('href="/app/ai-manager/business?view=map"');
    const page = renderToStaticMarkup(<BusinessPage timeZone="America/Puerto_Rico" view={{ name: "map" }} importsEnabled retrievalEnabled initial={{ state: "ready", catalog: parseBusinessResult(wire(uiCatalogResult())).catalog!, authority: "a" }} />);
    expect(page).toContain("Main records</h1>");
    expect(page).toContain("What Rondo counts as the whole picture");
    for (const state of ["loading", "failed", "offline"] as const) expect(renderToStaticMarkup(<BusinessPage timeZone="UTC" view={{ name: "map" }} importsEnabled retrievalEnabled initial={{ state }} />)).toContain("Main records</h1>");
  });
  it("renders every map state in Spanish with no English label", () => {
    const html = [renderToStaticMarkup(<MapView ctx={businessContext(uiCatalog("empty"), "es", uiNow)} />), renderToStaticMarkup(<MapView ctx={ctx("es")} />), renderToStaticMarkup(<MapView ctx={ctx("es")} initialEditing />),
      mapReview("es"), mapReview("es", { confirmDiscard: true }), mapReview("es", {}, uiIds.mapCurrent), renderToStaticMarkup(<MapContents ctx={ctx("es")} map={{ expectedRevision: 0, accounts: [], cells: [] }} />)].join(" ");
    for (const text of ["Sin configurar", "En uso por Rondo", "Borrador por revisar", "Lo que cuenta", "Cuentas", "Toda la empresa", "Añadir una entrada", "Comparación", "Publicar para Rondo", "Aún no hay entradas"]) expect(html, text).toContain(text);
    const text = html.replace(/<[^>]+>/g, " ").replace(/Square sales|Operating account|Catering invoices|Old register|Condado Café|Santurce Bakery|USD|Rondo|NEVORA|operating|till-condado/g, " ");
    for (const word of ["Main", "Cross-check", "Accounts", "What counts", "In use", "Draft", "Record", "Covers", "Counts as", "Remove", "Edit", "Add an", "Save draft", "Cancel", "Belongs to", "First day", "Publish", "Discard", "Status", "Sales", "Cash", "Not set up", "Choose"])
      expect(new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "u").test(text), word).toBe(false);
    expect(text).not.toMatch(/undefined|\[object|NaN/);
  });
});
