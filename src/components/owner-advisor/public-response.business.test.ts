import { describe, expect, it } from "vitest";
import { parseAnswer } from "./public-response";
import { calculateFinance } from "@/lib/owner-advisor/business/finance";
import { calculateSales } from "@/lib/owner-advisor/business/sales";
import { businessJanuary, fictionalBusinessId, fictionalBusinessScope } from "@/test/fixtures/rondo-business";

// Fictional data only. Metrics come from the backend's own calculators (Codex 8e82dbfe), so the client accepts the
// exact shape the server emits, including the posted inflow/outflow and sales/refund groups.
const SOURCE = fictionalBusinessId, VERSION = "20000000-0000-4000-8000-000000000002";
const href = (s = SOURCE, v = VERSION) => `/api/owner/advisor/business/sources/${s}/versions/${v}`;
const citation = (extra: Record<string, unknown> = {}) => ({ sourceId: SOURCE, versionId: VERSION, digest: "a".repeat(64), name: "Fictional FINANCE",
  namespace: "fixture-FINANCE", timeZone: "UTC", currency: "USD", window: { ...businessJanuary }, sourceAsOf: businessJanuary.toAt, origin: "OWNER_IMPORT", href: href(), ...extra });
const base = (domain: "FINANCE" | "SALES") => ({ state: "ready", reason: null, domain, completeScope: true, sourceSubtotal: false, window: { ...businessJanuary },
  selection: { kind: "PRIMARY_PERIMETER" }, locationScope: { kind: "ALL" }, temporalUse: "HISTORICAL", scenario: null,
  observedAt: "2026-11-16T12:00:00.000Z", expiresAt: "2026-11-16T12:00:15.000Z", qualifiers: ["OWNER_DECLARED_ACCOUNT_PERIMETER", "HISTORICAL_AS_OF_RECORDS"],
  citations: [citation()], timeZone: "UTC", queryHash: "b".repeat(64), sourceDigest: "c".repeat(64) });
const financeEvidence = (extra: Record<string, unknown> = {}) => ({ ...base("FINANCE"), finance: calculateFinance(fictionalBusinessScope("FINANCE"), null), sales: null, ...extra });
const salesEvidence = (extra: Record<string, unknown> = {}) => ({ ...base("SALES"), finance: null, sales: calculateSales(fictionalBusinessScope("SALES")), ...extra });
const answer = (extra: Record<string, unknown> = {}, sources = [{ label: "Fictional FINANCE — Owner import (USD)", href: href() }]) => ({
  state: "answered", authority: "owner-authority", observedAt: "2026-11-16T12:00:01.000Z", validForMs: 15000,
  answer: { text: "Fictional answer.", sources: sources.map(s => ({ ...s, observedAt: "2026-11-16T12:00:00.000Z" })), ...extra },
});
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

describe("Rondo business evidence in answers", () => {
  it("accepts a cited finance answer and a cited sales answer as the server emits them", () => {
    const finance = financeEvidence(), sales = salesEvidence();
    expect(finance.finance.currencies[0]).toHaveProperty("postedInflowMinor");
    expect(sales.sales.currencies[0]).toHaveProperty("refunds");
    expect(parseAnswer(answer({ businessEvidence: [finance] })).answer.businessEvidence).toHaveLength(1);
    expect(() => parseAnswer(answer({ businessEvidence: [finance, sales] }))).not.toThrow();
  });
  it("accepts a cited source with no typed evidence (an unselected read stays a cited observation)", () => {
    expect(() => parseAnswer(answer())).not.toThrow();
  });
  it("accepts unavailable, partial, expired and findings-with-window evidence without inventing figures", () => {
    const unavailable = { ...base("FINANCE"), state: "unavailable", reason: "MISSING_MAP", completeScope: false, finance: null, sales: null, citations: [] };
    const expired = financeEvidence({ expiresAt: "2026-01-01T00:00:00.000Z" });
    const finding = financeEvidence(); finding.finance.findings = [{ code: "RECONCILIATION_DIFFERENCE", accountRef: "operating", recordIds: ["closing"], differenceMinor: "-500",
      window: { ...businessJanuary }, boundaryAt: businessJanuary.toAt }];
    for (const e of [unavailable, expired, finding, financeEvidence({ completeScope: false, sourceSubtotal: true, selection: { kind: "SOURCE", sourceId: SOURCE } })])
      expect(() => parseAnswer(answer({ businessEvidence: [e] }))).not.toThrow();
  });

  it.each([
    ["a query", `${href()}?raw=1`],
    ["a fragment", `${href()}#rows`],
    ["a trailing slash", `${href()}/`],
    ["an extra segment", `${href()}/rows`],
    ["an uppercase UUID", href("AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA")],
    ["a non-v4 UUID", href("20000000-0000-1000-8000-000000000002")],
    ["an external host", `https://example.invalid${href()}`],
    ["a protocol-relative host", `//example.invalid${href()}`],
    ["a missing version", `/api/owner/advisor/business/sources/${SOURCE}`],
  ])("rejects a business source link with %s", (_label, link) => {
    expect(() => parseAnswer(answer({}, [{ label: "Fictional", href: link }]))).toThrow();
  });

  it("rejects an answer that carries private business inspection custody", () => {
    const refs = [{ inspectionId: VERSION, occurrence: 0, tool: "business_finance" }];
    expect(() => parseAnswer(answer({ businessInspectionRefs: refs, businessEvidence: [financeEvidence()] }))).toThrow();
    expect(() => parseAnswer(answer({ businessInspectionRef: refs[0] }))).toThrow();
  });

  const mutations: [string, () => unknown][] = [
    ["a private field on the evidence", () => financeEvidence({ inspectionId: VERSION })],
    ["a session field on the evidence", () => financeEvidence({ session: "x" })],
    ["a missing required field", () => { const e: Record<string, unknown> = financeEvidence(); delete e.queryHash; return e; }],
    ["a finance bucket without posted inflows", () => { const e = financeEvidence(); delete (e.finance.currencies[0] as Partial<typeof e.finance.currencies[0]>).postedInflowMinor; return e; }],
    ["a money figure as a number", () => { const e = clone(financeEvidence()) as Record<string, any>; e.finance.currencies[0].postedDeltaMinor = 43500; return e; }],
    ["a money figure with decimals", () => { const e = clone(financeEvidence()) as Record<string, any>; e.finance.currencies[0].obligationsMinor = "200.00"; return e; }],
    ["a sales bucket without the refunds group", () => { const e = clone(salesEvidence()) as Record<string, any>; delete e.sales.currencies[0].refunds; return e; }],
    ["a sales group with an extra field", () => { const e = clone(salesEvidence()) as Record<string, any>; e.sales.currencies[0].sales.profitMinor = "1"; return e; }],
    ["finance evidence carrying sales metrics", () => financeEvidence({ sales: calculateSales(fictionalBusinessScope("SALES")) })],
    ["sales evidence carrying a scenario", () => salesEvidence({ scenario: { anchorRecordId: "closing", throughDate: "2026-02-05", obligationRecordIds: [], receivableRecordIds: [] } })],
    ["an unknown unavailable reason", () => ({ ...base("FINANCE"), state: "unavailable", reason: "ZERO", finance: null, sales: null })],
    ["a ready result with a reason", () => financeEvidence({ reason: "STALE" })],
    ["unsorted selected locations", () => salesEvidence({ locationScope: { kind: "SELECTED", locationIds: ["loc-b", "loc-a"] } })],
    ["a non-canonical window", () => financeEvidence({ window: { fromAt: "2026-01-01T00:00:00Z", toAt: businessJanuary.toAt } })],
    ["a citation whose link names another version", () => financeEvidence({ citations: [citation({ href: href(SOURCE, SOURCE) })] })],
    ["a citation with an extra field", () => financeEvidence({ citations: [citation({ readReceiptId: VERSION })] })],
    ["a citation with a foreign origin", () => financeEvidence({ citations: [citation({ origin: "WEB" })] })],
    ["a citation name with control characters", () => financeEvidence({ citations: [citation({ name: "Fictional\n<script>" })] })],
    ["a finding with a malformed boundary", () => { const e = clone(financeEvidence()) as Record<string, any>; e.finance.findings = [{ code: "BOUNDARY", accountRef: null, recordIds: [], differenceMinor: null, boundaryAt: "soon" }]; return e; }],
    ["a finding with an unknown field", () => { const e = clone(financeEvidence()) as Record<string, any>; e.finance.findings = [{ code: "X", accountRef: null, recordIds: [], differenceMinor: null, note: "x" }]; return e; }],
    ["a lowercase qualifier", () => financeEvidence({ qualifiers: ["owner_declared"] })],
    ["a non-hex query hash", () => financeEvidence({ queryHash: "z".repeat(64) })],
  ];
  it.each(mutations)("rejects evidence with %s", (_label, make) => {
    expect(() => parseAnswer(answer({ businessEvidence: [make()] }))).toThrow();
  });
  it("rejects an empty or oversized evidence list and a non-list", () => {
    expect(() => parseAnswer(answer({ businessEvidence: [] }))).toThrow();
    expect(() => parseAnswer(answer({ businessEvidence: Array.from({ length: 9 }, () => financeEvidence()) }))).toThrow();
    expect(() => parseAnswer(answer({ businessEvidence: financeEvidence() }))).toThrow();
  });
});
