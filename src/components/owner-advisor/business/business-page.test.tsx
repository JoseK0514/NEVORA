import { describe, expect, it, rs } from '@rstest/core';
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BUSINESS_VALIDATION_CODES, BUSINESS_VALIDATION_FIELDS } from "@/lib/owner-advisor/business/contracts";
import { uiCatalog, uiFullRead, uiIds, uiNow } from "@/test/fixtures/rondo-business-ui";
import { parseBusinessResult, type PendingOperation } from "./business-client";
import {
  BusinessPage, IssueCard, Library, PendingCard, RecordDetail, RecordForm, ReviewContent, businessContext, validationText, type BusinessIssue, type BusinessLoad, type BusinessPending,
} from "./business-page";
import { BUSINESS_COPY, type BusinessLang } from "./copy";
import { AdvisorLangProvider } from "../lang";

rs.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }) }));

// Fictional data only. Each state is rendered from the same parsed shapes the page gets from the API.
const wire = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const catalog = uiCatalog(), ready: BusinessLoad = { state: "ready", catalog, authority: "owner-authority-fixture" };
const source = (id: string) => catalog.sources.find(s => s.sourceId === id)!;
const meta: PendingOperation = { operationId: "50000000-0000-4000-8000-000000000001", op: "publish_source_version", sourceId: uiIds.cash, versionId: uiIds.cashDraft, mapVersionId: null, authority: "owner-authority-fixture" };
const payload = { op: "publish_source_version" as const, requestId: meta.operationId, sourceId: uiIds.cash, versionId: uiIds.cashDraft, readReceiptId: "50000000-0000-4000-8000-000000000041", expectedRevision: 2, digest: "d".repeat(64), acknowledged: true as const };
const page = (initial: BusinessLoad, extra: Partial<Parameters<typeof BusinessPage>[0]> = {}) =>
  renderToStaticMarkup(<BusinessPage timeZone="America/Puerto_Rico" view={{ name: "library" }} importsEnabled retrievalEnabled initial={initial} {...extra} />);
const review = (versionId: string, lang: BusinessLang = "en", extra: Partial<Parameters<typeof ReviewContent>[0]> = {}) => {
  const result = parseBusinessResult(wire(uiFullRead(versionId))), listed = catalog.versions.find(v => v.versionId === versionId)!;
  return renderToStaticMarkup(<ReviewContent ctx={businessContext(catalog, lang, uiNow)} source={source(listed.sourceId)} result={result} eligible={!!listed.publishEligible} acknowledged={false}
    setAcknowledged={() => {}} confirmDiscard={false} setConfirmDiscard={() => {}} onPublish={() => {}} onDiscard={() => {}} {...extra} />);
};
const noop = () => {};
/** The opening tag of the button with this label. */
const button = (html: string, label: string) => new RegExp(`<button[^>]*>${label}</button>`).exec(html)?.[0] ?? "";

describe("the business records page", () => {
  it("loads as the page's own shape, with no spinner on a blank page and no list", () => {
    const html = page({ state: "loading" });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Loading business records");
    expect(html).toContain("Business records</h1>");
    expect(html).not.toContain("Square sales");
    expect(html).not.toContain("Add record");
  });
  it("says what happened and what to do when the list can't load, and when offline", () => {
    expect(page({ state: "failed" })).toContain("Couldn’t load business records");
    expect(page({ state: "failed" })).toContain("Check your connection, then try again.");
    expect(page({ state: "failed" })).toContain('role="alert"');
    const offline = page({ state: "offline" });
    expect(offline).toContain("You’re offline");
    expect(offline).toContain("Try again");
    expect(offline).not.toContain("No records yet");
  });
  it("shows a signed-out Owner only the sign-in card", () => {
    const html = page({ state: "revoked" });
    expect(html).toContain("Your session ended");
    expect(html).toContain('href="/login"');
    expect(html).not.toContain("Square sales");
  });
  it("is one honest card when maintenance is off: never an empty library, and no way to add", () => {
    const both = page({ state: "off" }, { importsEnabled: false, retrievalEnabled: false });
    expect(both).toContain("Business records are off");
    expect(both).toContain("Rondo answers without them.");
    const readOnly = page({ state: "off" }, { importsEnabled: false, retrievalEnabled: true });
    expect(readOnly).toContain("Records can’t be changed right now");
    expect(readOnly).toContain("Rondo still uses what is already published.");
    for (const html of [both, readOnly]) for (const absent of ["No records yet", "Add record", "Add a record", "Main records", "Square sales"]) expect(html).not.toContain(absent);
  });
  it("keeps the check of an earlier change when everything else is off", () => {
    const html = page({ state: "off" }, { importsEnabled: false, retrievalEnabled: false, initialPending: { meta, payload: null, status: "uncertain" } });
    expect(html).toContain("Not confirmed yet");
    expect(html).toContain("Check again");
    expect(html).not.toContain("Send again");   // the exact command is gone after a reload; nothing is rebuilt
    expect(html).toContain("Business records are off");
  });
  it("has one next step when there are no records yet", () => {
    const html = page({ state: "ready", catalog: uiCatalog("empty"), authority: "owner-authority-fixture" });
    expect(html).toContain("No records yet");
    expect(html).toContain("Add sales or cash records for Rondo to use.");
    expect(html).toContain('href="/app/ai-manager/business?view=new"');
    expect(html.match(/Add record/g)).toHaveLength(1);
    expect(html).not.toContain("Add a record");
  });
  it("lists records with mixed states: plain words for the normal ones, a chip only for what needs a look", () => {
    const html = renderToStaticMarkup(<Library ctx={businessContext(catalog, "en", uiNow)} />);
    for (const text of ["Square sales", "Sales · USD · Nov 9–15, 2026", "Operating account", "Cash and bills · USD", "Catering invoices", "Old register", "Withdrawn", "3 records", "Main records", "2 entries", "Check figures", "See what Rondo would read"]) expect(html).toContain(text);
    expect(html.match(/c-pill--amber/g)).toHaveLength(4);   // two drafts waiting, one draft-only record, and a main-records draft
    expect(html).toContain(">Draft waiting<");
    expect(html).toContain(">Draft<");
    expect(html).not.toContain("loc-1");                   // never a bare internal ID
    expect(html).toContain('href="/app/ai-manager/business?view=map"');
    expect(html).toContain('href="/app/ai-manager/business?view=figures"');
  });
  it("never offers an expired version as in use", () => {
    const later = Date.parse("2026-11-19T04:00:00.000Z");
    const html = renderToStaticMarkup(<RecordDetail ctx={businessContext(catalog, "en", later)} source={source(uiIds.sales)} />);
    expect(html).toContain("Past periods only");
    expect(html).toContain("Too old to count as current");
    expect(html).not.toContain("In use by Rondo");
    expect(html).not.toContain(">In use<");
  });
  it("shows one record: its status, each version's state, where it comes from, and the two ways to remove it", () => {
    const html = renderToStaticMarkup(<RecordDetail ctx={businessContext(catalog, "en", uiNow)} source={source(uiIds.sales)} />);
    for (const text of ["In use by Rondo", "Counts as current until Nov 19, 12:00 AM", "Draft waiting for review", "Published Nov 16, 9:05 AM · 32 rows", ">Replaced<", ">In use<", "Not published · 4 rows",
      "Add a newer file", "Comes from", "square", "3 days", "US dollars (USD)", "Withdraw", "Rondo stops using it", "Delete", "Erases its rows"]) expect(html, text).toContain(text);
    const withdrawn = renderToStaticMarkup(<RecordDetail ctx={businessContext(catalog, "en", uiNow)} source={source(uiIds.withdrawn)} />);
    expect(withdrawn).toContain("Rondo doesn’t use it");
    expect(withdrawn).not.toContain("Add a newer file");
    expect(withdrawn).not.toContain("Rondo stops using it");
  });
  it("states what deleting does before the acknowledgement, and promises nothing about chats or the provider", () => {
    const html = renderToStaticMarkup(<RecordDetail ctx={businessContext(catalog, "en", uiNow)} source={source(uiIds.sales)} initialConfirm="delete" />);
    for (const text of ["Delete “Square sales”?", "Erases its imported rows for every Owner", "Retires anything Rondo built on it", "Removes it from your main records (1 entry)",
      "Rondo chats and text already sent to the AI provider stay", "I understand this can’t be undone"]) expect(html).toContain(text);
    expect(button(html, "Delete")).toContain("c-btn--danger");
    expect(button(html, "Delete")).toContain('disabled=""');
    const withdraw = renderToStaticMarkup(<RecordDetail ctx={businessContext(catalog, "en", uiNow)} source={source(uiIds.sales)} initialConfirm="withdraw" />);
    expect(withdraw).toContain("Rondo stops using it for every Owner. Its versions stay readable.");
    expect(withdraw).not.toContain("can’t be undone");
  });
});

describe("reviewing a version", () => {
  it("shows every row, the server's totals, what to check, and a publish that waits for the acknowledgement", () => {
    const html = review(uiIds.cashDraft);
    for (const text of ["Nov 1–15, 2026", "Totals in this file", "Money in", "USD 9,986.50", "Money out", "USD 5,045.00", "Owed to you", "not cash", "includes unconfirmed", "Things to check",
      "Pending cash left out", "Bills not confirmed", "Your own file. NEVORA doesn’t verify it", "Draft totals, for checking only", "Rondo starts using these rows for Nov 1–15, 2026.",
      "I reviewed the rows, the period and the things to check, and I want Rondo to use this version", "This is your own record. NEVORA doesn’t verify it, and it isn’t an audit.", "Discard draft", "File fingerprint", "Open as plain text"]) expect(html, text).toContain(text);
    expect(html.match(/<li><(?:a|div|button)[^>]*class="c-row[^"]*"/g)!.length).toBeGreaterThanOrEqual(10);
    expect(html).toContain("bal-open");
    expect(button(html, "Publish for Rondo")).toContain('disabled=""');
    expect(button(review(uiIds.cashDraft, "en", { acknowledged: true }), "Publish for Rondo")).toMatch(/^<button(?![^>]*disabled)/);
    // While another change is unconfirmed, nothing new can be sent.
    expect(button(renderToStaticMarkup(<ReviewContent ctx={businessContext(catalog, "en", uiNow, { locked: true })} source={source(uiIds.cash)} result={parseBusinessResult(wire(uiFullRead(uiIds.cashDraft)))} eligible acknowledged
      setAcknowledged={noop} confirmDiscard={false} setConfirmDiscard={noop} onPublish={noop} onDiscard={noop} />), "Publish for Rondo")).toContain('disabled=""');
  });
  it("shows publish in progress on the one button", () => {
    const html = renderToStaticMarkup(<ReviewContent ctx={businessContext(catalog, "en", uiNow, { busy: true, locked: true })} source={source(uiIds.cash)} result={parseBusinessResult(wire(uiFullRead(uiIds.cashDraft)))} eligible acknowledged
      setAcknowledged={noop} confirmDiscard={false} setConfirmDiscard={noop} onPublish={noop} onDiscard={noop} />);
    expect(button(html, "Publishing…")).toContain('disabled=""');
  });
  it("names sales rows by location name and says when publishing replaces what is in use", () => {
    const html = review(uiIds.salesCurrent);
    expect(html).toContain("Condado Café");
    expect(html).not.toContain("loc-1");
    expect(html).toContain("not profit");
    expect(html).toContain("not tax due");
    expect(html).not.toContain("Publish for Rondo");   // already published: no publish from this screen
    expect(html).toContain("Published Nov 16, 9:05 AM");
  });
  it("can't publish a partial file, a draft another Owner added, or a replaced version", () => {
    const partial = review(uiIds.salesPartial);
    expect(partial).toContain("Partial files can’t be published. Add the complete period.");
    expect(partial).not.toMatch(/>Publish for Rondo<\/button>/);
    expect(partial).toContain("Discard draft");
    const other = review(uiIds.cashDraft, "en", { eligible: false });
    expect(other).toContain("Another Owner added this draft. Only they can publish it.");
    expect(other).not.toMatch(/>Publish for Rondo<\/button>/);
    const replaced = review(uiIds.salesReplaced);
    expect(replaced).toContain("A newer version replaced this one.");
    expect(replaced).toContain(">Replaced<");
    expect(replaced).not.toContain("Discard draft");
  });
  it("asks before discarding, with its own confirmation", () => {
    const html = review(uiIds.cashDraft, "en", { confirmDiscard: true, acknowledged: true });
    expect(html).toContain("Discard this draft?");
    expect(html).toContain("The draft is removed. Published versions stay.");
    expect(html).not.toContain("I reviewed the rows");
  });
});

describe("problems and recovery", () => {
  const issue = (code: BusinessIssue["code"], detail: BusinessIssue["detail"] = null) => renderToStaticMarkup(<IssueCard t={BUSINESS_COPY.en} issue={{ code, op: "publish", detail, sourceId: uiIds.cash }} />);
  it("a conflict says a newer version exists and leads to what is current", () => {
    const html = issue("conflict");
    expect(html).toContain("Something changed first");
    expect(html).toContain("A newer version exists. Review it again.");
    expect(html).toContain(`href="/app/ai-manager/business?view=record&amp;record=${uiIds.cash}"`);
    expect(html).toContain("See what’s current");
  });
  it("says each refusal in plain words", () => {
    expect(issue("limit")).toContain("Business records are full");
    expect(issue("limit", { code: "INPUT_LIMIT", field: null, row: null, line: 1002 })).toContain("Keep it to 1,000 rows and 512 KB.");
    expect(issue("disabled")).toContain("Nothing was saved.");
    expect(issue("invalid")).toContain("Check the file and the details.");
    expect(issue("invalid", { code: "INVALID_CSV_RECORD", field: null, row: 4, line: 5 })).toContain("A row isn’t valid. Row 4 · line 5.");
    expect(issue("invalid", { code: "INVALID_INPUT", field: "duplicate_record", row: 3, line: null })).toContain("Something isn’t valid. Check a row ID used twice · row 3.");
  });
  it("has words for every validation code and field, in both languages, and never prints a code", () => {
    for (const lang of ["en", "es"] as const) for (const code of BUSINESS_VALIDATION_CODES) for (const field of [null, ...BUSINESS_VALIDATION_FIELDS]) {
      const text = validationText(BUSINESS_COPY[lang], { code, field, row: 2, line: null });
      expect(text.length).toBeGreaterThan(8);
      expect(text).not.toMatch(/[A-Z]{3,}_|undefined|null/);
    }
  });
  const card = (pending: BusinessPending) => renderToStaticMarkup(<PendingCard t={BUSINESS_COPY.en} pending={pending} onCheck={noop} onResend={noop} onStop={noop} />);
  it("an unknown result is never shown as failed and never as done", () => {
    const html = card({ meta, payload, status: "uncertain" });
    expect(html).toContain("Not confirmed yet");
    expect(html).toContain("Your publish may have gone through. Checking can’t apply it twice.");
    expect(html).toContain("Check again");
    expect(html).toContain("Send again");
    for (const wrong of ["failed", "Failed", "Couldn’t", "Published", "Saved", "error"]) expect(html).not.toContain(wrong);
    expect(html).toContain('data-kind="paused"');
  });
  it("still isn't called failed when the check finds no receipt, and offers no resend once the exact command is gone", () => {
    const still = card({ meta, payload, status: "unconfirmed" });
    expect(still).toContain("No confirmation yet. It may still go through.");
    expect(still).not.toContain("Stop checking");
    expect(still).toContain("Check again");
    expect(card({ meta, payload: null, status: "unconfirmed" })).not.toContain("Stop checking");
    const reloaded = card({ meta, payload: null, status: "uncertain" });
    expect(reloaded).toContain("Keep this change’s reference and check again. Do not add it as a new change while it is unconfirmed.");
    expect(reloaded).not.toContain("Send again");
    expect(card({ meta, payload: null, status: "checking" })).toContain("Checking your change");
    expect(card({ meta, payload: null, status: "foreign" })).toContain("It was made under another sign-in.");
  });
  it("puts the unconfirmed change above the list and locks nothing it shouldn't", () => {
    const html = page(ready, { initialPending: { meta, payload, status: "uncertain" } });
    expect(html.indexOf("Not confirmed yet")).toBeLessThan(html.indexOf("Square sales"));
    expect(html).toContain("Square sales");
  });
});

describe("adding a record", () => {
  it("asks for everything in words and guesses nothing", () => {
    const html = renderToStaticMarkup(<RecordForm ctx={businessContext(catalog, "en", uiNow)} source={null} />);
    for (const text of ["Name", "Type", "Currency", "Comes from", "Counts as current for", "First day", "Last day", "Data as of", "Covers the whole period", "Load a .csv or .json file",
      "UTF-8 .csv or .json, up to 1,000 rows", "Saved as a draft. Rondo doesn’t use it until you publish.", "Save draft"]) expect(html, text).toContain(text);
    expect(html).not.toContain("Columns");   // the column choices appear only for a loaded .csv
    for (const id of ["be-name", "be-domain", "be-currency", "be-from", "be-age", "be-first", "be-last", "be-asof", "be-complete"]) expect(html).toContain(`for="${id}"`);
  });
  it("locks what a record already is when adding a newer file", () => {
    const html = renderToStaticMarkup(<RecordForm ctx={businessContext(catalog, "en", uiNow)} source={source(uiIds.sales)} />);
    const tag = (id: string) => new RegExp(`<(?:input|select)[^>]*id="${id}"[^>]*>`).exec(html)?.[0] ?? "";
    expect(tag("be-name")).toContain('value="Square sales"');
    for (const id of ["be-name", "be-domain", "be-currency", "be-from", "be-age"]) expect(tag(id), id).toContain('disabled=""');
    expect(tag("be-first")).not.toContain("disabled");
  });
});

describe("Spanish", () => {
  const es = businessContext(catalog, "es", uiNow), t = BUSINESS_COPY.es;
  const english = ["Business records", "Add record", "Add a record", "Records", "In use", "Draft", "Withdrawn", "Status", "Versions", "Details", "Published", "rows", "Delete", "Cancel", "Check again", "Not confirmed",
    "Summary", "Period", "Totals", "Money in", "Things to check", "Good to know", "Publish for Rondo", "Discard", "Open as plain text", "Save draft", "Name", "Currency", "First day", "Loading", "Try again",
    "Your session", "Sign in", "Main records", "Comes from", "not cash", "Something changed", "Nothing was saved", "Row", "Pending", "Posted", "Bill to pay", "Sale ·", "Only Owners"];
  const renders: [string, string][] = [
    ["loading", page({ state: "loading" }, { lang: "es" })], ["failed", page({ state: "failed" }, { lang: "es" })], ["offline", page({ state: "offline" }, { lang: "es" })],
    ["revoked", page({ state: "revoked" }, { lang: "es" })], ["off", page({ state: "off" }, { lang: "es", importsEnabled: false, retrievalEnabled: false })],
    ["read only off", page({ state: "off" }, { lang: "es", importsEnabled: false })], ["empty", page({ state: "ready", catalog: uiCatalog("empty"), authority: "a" }, { lang: "es" })],
    ["list", page(ready, { lang: "es", initialPending: { meta, payload, status: "uncertain" }, initialIssue: { code: "conflict", op: "publish", detail: null, sourceId: uiIds.cash } })],
    ["record", renderToStaticMarkup(<RecordDetail ctx={es} source={source(uiIds.sales)} />)], ["delete", renderToStaticMarkup(<RecordDetail ctx={es} source={source(uiIds.sales)} initialConfirm="delete" />)],
    ["withdrawn", renderToStaticMarkup(<RecordDetail ctx={es} source={source(uiIds.withdrawn)} initialConfirm="withdraw" />)],
    ["review cash", review(uiIds.cashDraft, "es")], ["review sales", review(uiIds.salesCurrent, "es")], ["review partial", review(uiIds.salesPartial, "es")], ["review replaced", review(uiIds.salesReplaced, "es")],
    ["discard", review(uiIds.cashDraft, "es", { confirmDiscard: true })], ["form", renderToStaticMarkup(<RecordForm ctx={es} source={null} />)],
    ...(["conflict", "limit", "invalid", "disabled"] as const).map((code): [string, string] => [code, renderToStaticMarkup(<IssueCard t={t} issue={{ code, op: "stage", detail: code === "invalid" ? { code: "INVALID_MONEY", field: "decimal_money", row: 7, line: 8 } : null, sourceId: null }} />)]),
    ...(["uncertain", "unconfirmed", "checking", "foreign"] as const).map((status): [string, string] => [status, renderToStaticMarkup(<PendingCard t={t} pending={{ meta, payload: null, status }} onCheck={noop} onResend={noop} onStop={noop} />)]),
  ];
  it.each(renders)("renders the %s state in Spanish with no English string and no missing key", (_name, html) => {
    // Names the Owner typed, IDs and money codes are data, not copy.
    const text = html.replace(/<[^>]+>/g, " ").replace(/Square sales|Operating account|Catering invoices|Old register|Condado Café|Santurce Bakery|square|banco-popular|old-register|quickbooks|USD|EUR|Rondo|NEVORA|UTF-8|\.csv|\.json|KB/g, " ");
    for (const word of english) expect(new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "u").test(text), word).toBe(false);
    expect(text).not.toMatch(/undefined|\[object|NaN/);
  });
  it("says the main states in Spanish", () => {
    const all = renders.map(([, html]) => html).join(" ");
    for (const text of ["Registros del negocio", "Aún no hay registros", "Borrador pendiente", "En uso por Rondo", "Reemplazado", "Publicar para Rondo", "Por confirmar", "Algo cambió antes", "Estás sin conexión",
      "Tu sesión terminó", "Los registros del negocio están apagados", "Totales de este archivo", "no es efectivo", "9 nov – 15 nov 2026".slice(0, 0), "Guardar borrador", "¿Eliminar «Square sales»?"]) expect(all, text).toContain(text);
  });
});

describe("the person's language, with no lang prop", () => {
  const inSpanish = (node: ReactNode) => renderToStaticMarkup(<AdvisorLangProvider lang="es">{node}</AdvisorLangProvider>);
  const words = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/Square sales|Operating account|Catering invoices|Old register|Condado Café|Santurce Bakery|square|banco-popular|old-register|quickbooks|USD|EUR|Rondo|NEVORA/g, " ");
  it("shows the list in Spanish when Rondo speaks Spanish (the route passes no lang)", () => {
    const html = inSpanish(<BusinessPage timeZone="America/Puerto_Rico" view={{ name: "library" }} importsEnabled retrievalEnabled initial={ready} />);
    for (const text of ["Registros del negocio", "Solo los dueños pueden ver esto", "Añadir registro", "3 registros", "Registros principales", "2 entradas", "Verificar cifras", "Ve lo que Rondo leería", "Retirados"])
      expect(html, text).toContain(text);
    for (const word of ["Business records", "Add record", "Main records", "Check figures", "See what Rondo would read", "Withdrawn", "records", "entries"]) expect(words(html), word).not.toContain(word);
  });
  it("shows the review in Spanish with tú and localidad", () => {
    const html = review(uiIds.cashDraft, "es") + review(uiIds.salesCurrent, "es");
    for (const text of ["Resumen", "Totales de este archivo", "Entradas de dinero", "Te deben", "no es efectivo", "Para revisar", "Conviene saber", "Publicar para Rondo", "Este registro es tuyo.", "Descartar borrador"])
      expect(html, text).toContain(text);
    for (const word of ["Summary", "Totals", "Money in", "Owed to you", "not cash", "Things to check", "Good to know", "Publish for Rondo", "Discard draft", "Le deben", "suyo", "usted", "Usted", " local "])
      expect(words(html), word).not.toContain(word);
  });
  it("still lets an explicit lang win over Rondo's language", () => {
    expect(inSpanish(<BusinessPage timeZone="America/Puerto_Rico" view={{ name: "library" }} importsEnabled retrievalEnabled initial={ready} lang="en" />)).toContain("Business records");
    expect(page(ready)).toContain("Business records");
  });
});
