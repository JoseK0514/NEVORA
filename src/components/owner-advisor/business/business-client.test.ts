import { describe, expect, it, rs } from '@rstest/core';
import { BUSINESS_ERROR_CODES, BUSINESS_FINDING_CODES, BUSINESS_QUALIFIER_CODES, BUSINESS_UNAVAILABLE_CODES } from "@/lib/owner-advisor/business/contracts";
import { uiCatalog, uiCatalogResult, uiFullRead, uiIds, uiNow, uiReceipt, uiZone } from "@/test/fixtures/rondo-business-ui";
import {
  BUSINESS_ENDPOINT, PENDING_STORAGE_NAME, clearPending, createBusinessClient, csvHeader, currentUntil, isWrite, loadPending, namespaceFrom, parseBusinessResult, pendingFor, periodText,
  recordSummary, recordsFromJson, savePending, versionState, windowFromDays, type BusinessPageCommand, type BusinessWrite,
} from "./business-client";

// Fictional data only. The transport is a scripted fetch; nothing reaches a server.
const wire = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const REQUEST = "50000000-0000-4000-8000-000000000001";
const publish: BusinessWrite = { op: "publish_source_version", requestId: REQUEST, sourceId: uiIds.cash, versionId: uiIds.cashDraft, readReceiptId: "50000000-0000-4000-8000-000000000041",
  expectedRevision: 2, digest: "d".repeat(64), acknowledged: true };
const read: BusinessPageCommand = { op: "read_source_version", requestId: REQUEST, sourceId: uiIds.cash, versionId: uiIds.cashDraft };
const answer = (status: number, body: unknown) => async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("parsing an answer of the business API", () => {
  it("accepts the list, an empty list and a full review exactly as the server shapes them", () => {
    const list = parseBusinessResult(wire(uiCatalogResult()));
    expect(list.catalog!.sources.map(s => s.name)).toEqual(["Square sales", "Operating account", "Catering invoices", "Old register"]);
    expect(list.catalog!.activeLocations).toEqual([{ id: "loc-1", name: "Condado Café" }, { id: "loc-2", name: "Santurce Bakery" }]);
    expect(list.readReceiptId).toBeNull();
    expect(parseBusinessResult(wire(uiCatalogResult("empty"))).catalog!.sources).toEqual([]);
    const full = parseBusinessResult(wire(uiFullRead(uiIds.cashDraft)));
    expect(full.version!.input!.records).toHaveLength(10);
    expect(full.version!.validation!.finance!.currencies[0].postedInflowMinor).toBe("998650");
    expect(full.readReceiptExpiresAt).toBe(new Date(uiNow + 300000).toISOString());
    expect(full.receipt!.revision).toBe(2);
  });
  it("normalises a receipt time written the Postgres way", () => {
    const saved = wire(uiReceipt("publish_source_version", REQUEST, uiIds.cash, uiIds.cashDraft));
    saved.receipt!.savedAt = "2026-11-17 15:00:00.123+00";
    expect(parseBusinessResult(saved).receipt!.savedAt).toBe("2026-11-17T15:00:00.123Z");
  });
  it.each(["ready", "saved", "not_saved", "unavailable", "stale"] as const)("accepts the %s state", state => {
    expect(parseBusinessResult({ ...wire(uiCatalogResult()), catalog: null, state }).state).toBe(state);
  });
  it.each([...BUSINESS_UNAVAILABLE_CODES])("accepts the reason %s and nothing outside the closed list", reason => {
    expect(parseBusinessResult({ ...wire(uiCatalogResult()), catalog: null, state: "unavailable", reason }).reason).toBe(reason);
  });
  it("fails closed on anything it doesn't know", () => {
    const list = () => wire(uiCatalogResult()), full = () => wire(uiFullRead(uiIds.cashDraft)) as unknown as Record<string, any>;
    const bad: unknown[] = [null, [], {}, { ...list(), extra: 1 }, { ...list(), state: "published" }, { ...list(), reason: "NEW_REASON" }, { ...list(), validForMs: 15001 }, { ...list(), validForMs: 0 },
      { ...list(), authority: "" }, { ...list(), result: { state: "ready" } }, { ...list(), readReceiptId: "50000000-0000-4000-8000-000000000041" }];
    const edit = (change: (c: Record<string, any>) => void) => { const value = list() as unknown as Record<string, any>; change(value.catalog); bad.push(value); };
    edit(c => { c.sources[0].domain = "PAYROLL"; });
    edit(c => { c.sources[0].currency = "GBP"; });
    edit(c => { c.sources[0].secret = "x"; });
    edit(c => { c.sources[1].sourceId = c.sources[0].sourceId; });
    edit(c => { c.versions[0].status = "LIVE"; });
    edit(c => { c.versions[0].metadata.completeness = "MOSTLY"; });
    edit(c => { c.versions[0].metadata.window.toAt = c.versions[0].metadata.window.fromAt; });
    edit(c => { c.activeLocations.reverse(); });
    edit(c => { c.activeLocations[0].address = "private"; });
    edit(c => { c.maps[1].input.cells[0].role = "MAIN"; });
    edit(c => { delete c.revision; });
    const review = (change: (v: Record<string, any>) => void) => { const value = full(); change(value); bad.push(value); };
    review(v => { v.version.input = null; });                                  // a full read without its rows
    review(v => { delete v.version.validation; });                            // or without the server's totals
    review(v => { v.version.validation.qualifiers.push("NEW_QUALIFIER"); });
    review(v => { v.version.validation.finance.findings.push({ code: "NEW_FINDING", accountRef: null, recordIds: [], differenceMinor: null }); });
    review(v => { v.version.validation.finance.currencies[0].postedInflowMinor = 998650; });   // money is an exact string
    review(v => { v.version.input.records[0].amountMinor = "12.50"; });
    review(v => { v.version.input.records.reverse(); });                       // not the server's normal form
    review(v => { v.readReceiptExpiresAt = null; });                           // a receipt without its expiry
    review(v => { v.receipt.kind = "pay_supplier"; });
    for (const value of bad) expect(() => parseBusinessResult(value), JSON.stringify(value)?.slice(0, 120)).toThrow();
  });
  it("knows every finding and qualifier the contract lists", () => {
    for (const code of BUSINESS_QUALIFIER_CODES) { const value = wire(uiFullRead(uiIds.cashDraft)); value.version!.validation!.qualifiers = [code]; expect(parseBusinessResult(value).version!.validation!.qualifiers).toEqual([code]); }
    for (const code of BUSINESS_FINDING_CODES) { const value = wire(uiFullRead(uiIds.cashDraft)); value.version!.validation!.finance!.findings = [{ code, accountRef: null, recordIds: [], differenceMinor: null }];
      expect(parseBusinessResult(value).version!.validation!.finance!.findings[0].code).toBe(code); }
  });
});

describe("the transport", () => {
  it("sends the contract's header and never a query string", async () => {
    const calls: { input: string; init: RequestInit }[] = [];
    const client = createBusinessClient(async (input, init) => { calls.push({ input, init }); return new Response(JSON.stringify(uiCatalogResult())); });
    expect((await client.catalog()).kind).toBe("ok");
    await client.send(read);
    expect(calls.map(c => [c.input, c.init.method])).toEqual([[BUSINESS_ENDPOINT, "GET"], [BUSINESS_ENDPOINT, "POST"]]);
    for (const call of calls) expect((call.init.headers as Record<string, string>)["x-nevora-business-evidence"]).toBe("1");
    expect(JSON.parse(String(calls[1].init.body))).toEqual(read);
  });
  const statusOf = { forbidden: 403, invalid: 400, conflict: 409, limit: 429, unavailable: 503, cancelled: 503, disabled: 503, busy: 503 } as const;
  it.each([...BUSINESS_ERROR_CODES])("maps the error code %s for a write and for a read", async code => {
    const client = createBusinessClient(answer(statusOf[code], { state: "error", code }));
    const write = await client.send(publish), reading = await client.send(read), list = await client.catalog();
    if (code === "unavailable" || code === "cancelled" || code === "busy") {
      // The server may have saved before it stopped: a write is never called failed, and a read just didn't happen.
      expect(write).toEqual({ kind: "uncertain" });
      expect(reading).toEqual({ kind: "unavailable" });
      expect(list).toEqual({ kind: "unavailable" });
    } else if (code === "conflict" || code === "disabled") {
      expect(write).toEqual({ kind: "uncertain" });
      for (const outcome of [reading, list]) expect(outcome).toEqual({ kind: "refused", code, detail: null });
    } else for (const outcome of [write, reading, list]) expect(outcome).toEqual({ kind: "refused", code, detail: null });
  });
  it("keeps the safe validation detail and nothing else", async () => {
    const detail = { code: "INVALID_CSV_RECORD", field: null, row: 4, line: 5 };
    expect(await createBusinessClient(answer(400, { state: "error", code: "invalid", detail })).send(publish)).toEqual({ kind: "refused", code: "invalid", detail });
  });
  it("does not believe an unknown code, an extra field, a raw message or a body it can't read", async () => {
    for (const body of [{ state: "error", code: "provider_failed" }, { state: "error", code: "invalid", raw: "row 4: 12.5O" }, { error: "stack trace" }, "<html>", ""]) {
      for (const status of [400, 409, 500, 502]) {
        const client = createBusinessClient(answer(status, body));
        expect(await client.send(publish), `${status} ${JSON.stringify(body)}`).toEqual({ kind: "uncertain" });
        expect(await client.send(read)).toEqual({ kind: "unavailable" });
      }
    }
    // Signed out with no readable body is still "signed out".
    expect(await createBusinessClient(answer(401, "")).send(publish)).toEqual({ kind: "refused", code: "forbidden", detail: null });
  });
  it("treats a lost reply, and an answer it can't parse, as uncertain for a write and unavailable for a read", async () => {
    const lost = createBusinessClient(async () => { throw new TypeError("network"); });
    expect(await lost.send(publish)).toEqual({ kind: "uncertain" });
    expect(await lost.send(read)).toEqual({ kind: "unavailable" });
    expect(await lost.catalog()).toEqual({ kind: "unavailable" });
    const odd = createBusinessClient(answer(200, { state: "saved", receipt: { everything: "fine" } }));
    expect(await odd.send(publish)).toEqual({ kind: "uncertain" });
  });
  it("does not extend the server data observation by time spent delivering or parsing the response", async () => {
    rs.useFakeTimers();
    try {
      const client = createBusinessClient(async () => { rs.advanceTimersByTime(16000); return new Response(JSON.stringify(uiCatalogResult())); });
      expect(await client.catalog()).toEqual({ kind: "unavailable" });
    } finally { rs.useRealTimers(); }
  });
  it("never lets the page abort a write", async () => {
    let seen: AbortSignal | null | undefined;
    const client = createBusinessClient(async (_input, init) => { seen = init.signal; return new Response(JSON.stringify(uiReceipt("publish_source_version", REQUEST, uiIds.cash, uiIds.cashDraft))); });
    const outcome = await client.send(publish, new AbortController().signal);
    expect(seen).toBeUndefined();
    expect(outcome.kind === "ok" && outcome.result.receipt?.operationId).toBe(REQUEST);
    expect(isWrite(publish)).toBe(true);
    expect(isWrite(read)).toBe(false);
    expect(isWrite({ op: "check_source_operation", requestId: REQUEST, operationId: REQUEST })).toBe(false);
  });
});

describe("the one pending write", () => {
  const memory = () => { const data = new Map<string, string>(); return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } }; };
  it("keeps identifiers only: no names, amounts, rows, review handle or acknowledgement", () => {
    const store = memory();
    const stage: BusinessWrite = { op: "stage_source_version", requestId: REQUEST, format: "CSV", csv: "Order,Total\nA-1,12.50", mapping: { amountUnit: "DECIMAL_MAJOR", columns: {}, constants: {} },
      metadata: { source: { sourceId: null, expectedRevision: 0, name: "Square sales", domain: "SALES", namespace: "square", currency: "USD", scale: 2, maxAgeMinutes: 1440 },
        window: { fromAt: "2026-11-09T04:00:00.000Z", toAt: "2026-11-16T04:00:00.000Z" }, sourceAsOf: "2026-11-16T12:00:00.000Z", completeness: "COMPLETE" } };
    savePending(store, pendingFor(stage, "owner-authority"));
    const raw = store.data.get(PENDING_STORAGE_NAME)!;
    expect(JSON.parse(raw)).toEqual({ operationId: REQUEST, op: "stage_source_version", sourceId: null, versionId: null, mapVersionId: null, authority: "owner-authority" });
    for (const secret of ["Square", "12.50", "A-1", "acknowledged", "readReceipt", "csv"]) expect(raw).not.toContain(secret);
    savePending(store, pendingFor(publish, "owner-authority"));
    expect(loadPending(store)).toEqual({ operationId: REQUEST, op: "publish_source_version", sourceId: uiIds.cash, versionId: uiIds.cashDraft, mapVersionId: null, authority: "owner-authority" });
    expect(store.data.get(PENDING_STORAGE_NAME)).not.toContain("50000000-0000-4000-8000-000000000041");
    clearPending(store);
    expect(loadPending(store)).toBeNull();
  });
  it("drops stored text it doesn't recognise", () => {
    const store = memory(), good = pendingFor(publish, "owner-authority");
    for (const raw of ["{", "[]", JSON.stringify({ ...good, name: "Square sales" }), JSON.stringify({ ...good, op: "read_source_version" }), JSON.stringify({ ...good, operationId: "1" }),
      JSON.stringify({ ...good, authority: "" }), JSON.stringify({ ...good, authority: "x".repeat(3000) })]) {
      store.data.set(PENDING_STORAGE_NAME, raw);
      expect(loadPending(store), raw.slice(0, 60)).toBeNull();
      expect(store.data.has(PENDING_STORAGE_NAME)).toBe(false);
    }
    expect(loadPending(null)).toBeNull();
  });
});

describe("what a record is now", () => {
  const catalog = uiCatalog(), source = (id: string) => catalog.sources.find(s => s.sourceId === id)!, version = (id: string) => catalog.versions.find(v => v.versionId === id)!;
  it("names each version's state from the server's own fields", () => {
    expect(versionState(source(uiIds.sales), version(uiIds.salesCurrent), uiNow)).toBe("in_use");
    expect(versionState(source(uiIds.sales), version(uiIds.salesReplaced), uiNow)).toBe("replaced");
    expect(versionState(source(uiIds.sales), version(uiIds.salesPartial), uiNow)).toBe("draft_locked");
    expect(versionState(source(uiIds.cash), version(uiIds.cashOctober), uiNow)).toBe("past");
    expect(versionState(source(uiIds.cash), version(uiIds.cashDraft), uiNow)).toBe("draft");
    expect(versionState(source(uiIds.cash), { ...version(uiIds.cashDraft), status: "DISCARDED" }, uiNow)).toBe("discarded");
    expect(versionState(source(uiIds.cash), { ...version(uiIds.cashDraft), status: "ERASED" }, uiNow)).toBe("erased");
  });
  it("stops calling a version current at the server's boundary, and never offers an expired one as in use", () => {
    const until = currentUntil(source(uiIds.sales), version(uiIds.salesCurrent))!;
    expect(new Date(until).toISOString()).toBe("2026-11-19T04:00:00.000Z");   // the period's end plus three days
    expect(versionState(source(uiIds.sales), version(uiIds.salesCurrent), until - 1)).toBe("in_use");
    expect(versionState(source(uiIds.sales), version(uiIds.salesCurrent), until)).toBe("past");
  });
  it("summarises a record: withdrawn, draft only, in use with a draft waiting, past", () => {
    expect(recordSummary(catalog, source(uiIds.sales), uiNow)).toMatchObject({ state: "in_use", draftWaiting: true });
    expect(recordSummary(catalog, source(uiIds.cash), uiNow)).toMatchObject({ state: "past", draftWaiting: true });
    expect(recordSummary(catalog, source(uiIds.draftOnly), uiNow)).toMatchObject({ state: "draft", draftWaiting: false });
    expect(recordSummary(catalog, source(uiIds.withdrawn), uiNow)).toMatchObject({ state: "withdrawn", draftWaiting: false });
    expect(recordSummary(catalog, source(uiIds.sales), uiNow).versions.map(v => v.versionId)).toEqual([uiIds.salesPartial, uiIds.salesCurrent, uiIds.salesReplaced]);
  });
});

describe("periods and files", () => {
  it("turns two chosen days into the half-open window of the company's zone", () => {
    expect(windowFromDays("2026-11-09", "2026-11-15", uiZone)).toEqual({ fromAt: "2026-11-09T04:00:00.000Z", toAt: "2026-11-16T04:00:00.000Z" });
    expect(windowFromDays("2026-11-15", "2026-11-09", uiZone)).toBeNull();
    expect(windowFromDays("", "2026-11-09", uiZone)).toBeNull();
    expect(periodText({ fromAt: "2026-11-09T04:00:00.000Z", toAt: "2026-11-16T04:00:00.000Z" }, uiZone)).toBe("Nov 9–15, 2026");
    expect(periodText({ fromAt: "2026-11-09T04:00:00.000Z", toAt: "2026-11-10T04:00:00.000Z" }, uiZone)).toBe("Nov 9, 2026");
    expect(periodText({ fromAt: "2026-12-28T04:00:00.000Z", toAt: "2027-01-04T04:00:00.000Z" }, uiZone)).toBe("Dec 28, 2026–Jan 3, 2027");
  });
  it("reads column names as written and guesses nothing", () => {
    expect(csvHeader('Order,"Total, with tax","He said ""hi"""\nA-1,12.50,x')).toEqual(["Order", "Total, with tax", 'He said "hi"']);
    expect(csvHeader("Order,Order\n")).toBeNull();
    expect(csvHeader("Order,,Total\n")).toBeNull();
    expect(csvHeader('"Order\n')).toBeNull();
    expect(namespaceFrom("Square POS")).toBe("square-pos");
    expect(namespaceFrom("  ")).toBeNull();
    expect(recordsFromJson('[{"kind":"SALE"}]')).toEqual([{ kind: "SALE" }]);
    expect(recordsFromJson('{"records":[]}')).toEqual([]);
    expect(recordsFromJson('{"rows":[]}')).toBeNull();
    expect(recordsFromJson("not json")).toBeNull();
    expect(recordsFromJson(JSON.stringify(Array.from({ length: 1001 }, () => ({}))))).toBeNull();
  });
});
