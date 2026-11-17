import type { BusinessModelEvidence } from "@/lib/owner-advisor/business/model-contracts";
import { isBusinessCitationHref } from "@/lib/owner-advisor/business/metrics";
import { parseBusinessQuery, parseWindow } from "@/lib/owner-advisor/business/parse";
import { ADVISOR_MAX_ANSWER_SOURCES, ADVISOR_MAX_TOOL_CALLS } from "@/lib/owner-advisor/contracts";

/**
 * Client acceptance of Rondo business evidence (contract: docs/handoffs/2026-11-16-rondo-business-evidence-ui-contract.md,
 * Codex 8e82dbfe). Exact public fields only, so private inspection custody can't ride along; money stays an exact
 * minor-unit string and is never converted through Number. Expiry is not checked here: a replayed answer keeps its
 * evidence, and the card names it as expired instead of dropping the answer.
 */
function need(value: unknown): asserts value {
  if (!value) throw Error("Invalid business evidence");
}
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v: Record<string, unknown>, list: string, optional: string[] = []) => {
  const present = Object.keys(v).filter(k => !optional.includes(k)).sort().join(",");
  need(present === list.split(" ").sort().join(",") && Object.keys(v).every(k => list.split(" ").includes(k) || optional.includes(k)));
};
const HEX = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const MONEY = /^(0|-?[1-9][0-9]{0,29})$/;
const CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const REF = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;
const INSTANT = (v: unknown) => typeof v === "string" && /^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) && new Date(v).toISOString() === v;
const DAY = (v: unknown) => typeof v === "string" && /^20\d\d-\d\d-\d\d$/.test(v) && new Date(`${v}T00:00:00.000Z`).toISOString().slice(0, 10) === v;
const money = (v: unknown) => typeof v === "string" && MONEY.test(v);
const moneyOrNull = (v: unknown) => v === null || money(v);
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const ref = (v: unknown) => typeof v === "string" && v.length <= 128 && REF.test(v);
const currency = (v: unknown) => v === "USD" || v === "EUR";
const text = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max && !/[\x00-\x1f\x7f]/.test(v);
const list = (v: unknown, max: number): v is unknown[] => Array.isArray(v) && v.length <= max;
const UNAVAILABLE = ["INPUT_LIMIT", "RESULT_LIMIT", "MISSING_SOURCE", "MISSING_MAP", "INCOMPLETE_SCOPE", "OVERLAP", "IDENTITY_CONFLICT", "STALE", "SHARED_ACCOUNT", "UNAVAILABLE", "DISABLED"];

function findings(v: unknown) {
  need(list(v, 200));
  for (const f of v) {
    need(obj(f)); keys(f, "code accountRef recordIds differenceMinor", ["count", "window", "boundaryAt"]);
    need(typeof f.code === "string" && CODE.test(f.code) && (f.accountRef === null || ref(f.accountRef)) && moneyOrNull(f.differenceMinor) &&
      list(f.recordIds, 1000) && f.recordIds.every(ref) && (f.count === undefined || count(f.count)) && (f.boundaryAt === undefined || INSTANT(f.boundaryAt)));
    if (f.window !== undefined) need(JSON.stringify(parseWindow(f.window)) === JSON.stringify(f.window));
  }
}
function scenarioIdentity(r: unknown, extra: string) {
  need(obj(r)); keys(r, `recordId accountRef currency sourceId versionId namespace ${extra}`);
  need(ref(r.recordId) && ref(r.accountRef) && currency(r.currency) && typeof r.sourceId === "string" && UUID.test(r.sourceId) &&
    typeof r.versionId === "string" && UUID.test(r.versionId) && ref(r.namespace));
  return r;
}
function finance(v: unknown) {
  need(obj(v)); keys(v, "currencies findings excludedRows scenarioInputs");
  need(list(v.currencies, 2) && count(v.excludedRows));
  for (const c of v.currencies) {
    need(obj(c)); keys(c, "currency scale openingMinor postedDeltaMinor postedInflowMinor postedOutflowMinor postedCount postedInflowCount postedOutflowCount calculatedClosingMinor reportedClosingMinor differenceMinor reconciled obligationsMinor receivablesMinor scenarioMinor scenarioConditional scenarioAccountRef scenarioAnchorAt");
    need(currency(c.currency) && c.scale === 2 && moneyOrNull(c.openingMinor) && money(c.postedDeltaMinor) && money(c.postedInflowMinor) && money(c.postedOutflowMinor) &&
      count(c.postedCount) && count(c.postedInflowCount) && count(c.postedOutflowCount) && moneyOrNull(c.calculatedClosingMinor) &&
      moneyOrNull(c.reportedClosingMinor) && moneyOrNull(c.differenceMinor) && typeof c.reconciled === "boolean" && money(c.obligationsMinor) &&
      money(c.receivablesMinor) && moneyOrNull(c.scenarioMinor) && typeof c.scenarioConditional === "boolean" &&
      (c.scenarioAccountRef === null || ref(c.scenarioAccountRef)) && (c.scenarioAnchorAt === null || INSTANT(c.scenarioAnchorAt)));
  }
  findings(v.findings);
  const s = v.scenarioInputs;
  need(obj(s)); keys(s, "state reason anchors obligations receivables");
  need((s.state === "ready" && s.reason === null || s.state === "unavailable" && ["INPUT_LIMIT", "RESULT_LIMIT", "NO_RECONCILED_ANCHOR"].includes(String(s.reason))) &&
    list(s.anchors, 100) && list(s.obligations, 100) && list(s.receivables, 100));
  for (const a of s.anchors) { const r = scenarioIdentity(a, "at amountMinor"); need(INSTANT(r.at) && money(r.amountMinor)); }
  for (const o of [...s.obligations, ...s.receivables]) {
    const r = scenarioIdentity(o, "dueDate amountMinor confirmation");
    need(DAY(r.dueDate) && money(r.amountMinor) && !String(r.amountMinor).startsWith("-") && ["SOURCE_CONFIRMED", "OWNER_REPORTED"].includes(String(r.confirmation)));
  }
}
function sales(v: unknown) {
  need(obj(v)); keys(v, "currencies findings excludedRows");
  need(list(v.currencies, 2) && count(v.excludedRows));
  for (const c of v.currencies) {
    need(obj(c)); keys(c, "currency scale merchandiseMinor discountsMinor netMerchandiseMinor taxMinor collectionsMinor feesMinor netReceiptsMinor cancellations sales refunds");
    need(currency(c.currency) && c.scale === 2 && [c.merchandiseMinor, c.discountsMinor, c.netMerchandiseMinor, c.taxMinor, c.collectionsMinor, c.feesMinor, c.netReceiptsMinor].every(money) &&
      count(c.cancellations));
    for (const group of [c.sales, c.refunds]) {
      need(obj(group)); keys(group, "count merchandiseMinor discountsMinor netMerchandiseMinor taxMinor collectionsMinor");
      need(count(group.count) && [group.merchandiseMinor, group.discountsMinor, group.netMerchandiseMinor, group.taxMinor, group.collectionsMinor].every(money));
    }
  }
  findings(v.findings);
}
function citation(c: unknown) {
  need(obj(c)); keys(c, "sourceId versionId digest name namespace timeZone currency window sourceAsOf origin href");
  need(typeof c.sourceId === "string" && UUID.test(c.sourceId) && typeof c.versionId === "string" && UUID.test(c.versionId) &&
    typeof c.digest === "string" && HEX.test(c.digest) && text(c.name, 240) && ref(c.namespace) && text(c.timeZone, 64) && currency(c.currency) &&
    INSTANT(c.sourceAsOf) && (c.origin === "OWNER_IMPORT" || c.origin === "CONNECTOR") && isBusinessCitationHref(c.href) &&
    c.href === `/api/owner/advisor/business/sources/${c.sourceId}/versions/${c.versionId}`);
  need(JSON.stringify(parseWindow(c.window)) === JSON.stringify(c.window));
}
function evidence(e: unknown): asserts e is BusinessModelEvidence {
  need(obj(e));
  keys(e, "state reason domain completeScope sourceSubtotal window selection locationScope temporalUse scenario observedAt expiresAt qualifiers finance sales citations timeZone queryHash sourceDigest");
  need((e.state === "ready" && e.reason === null || e.state === "unavailable" && UNAVAILABLE.includes(String(e.reason))) &&
    (e.domain === "FINANCE" || e.domain === "SALES") && typeof e.completeScope === "boolean" && typeof e.sourceSubtotal === "boolean" &&
    INSTANT(e.observedAt) && (e.expiresAt === null || INSTANT(e.expiresAt)) && text(e.timeZone, 64) &&
    typeof e.queryHash === "string" && HEX.test(e.queryHash) && typeof e.sourceDigest === "string" && HEX.test(e.sourceDigest) &&
    list(e.qualifiers, 32) && e.qualifiers.every(q => typeof q === "string" && CODE.test(q)) && list(e.citations, ADVISOR_MAX_ANSWER_SOURCES));
  // Scope must be the canonical form the backend parses (sorted, exact fields); finance carries a scenario, sales none.
  const scope = { window: e.window, selection: e.selection, locationScope: e.locationScope, temporalUse: e.temporalUse };
  if (e.domain === "FINANCE") {
    need(JSON.stringify(parseBusinessQuery({ ...scope, scenario: e.scenario }, true)) === JSON.stringify({ ...scope, scenario: e.scenario }));
    need(e.sales === null && (e.finance === null || (finance(e.finance), true)));
  } else {
    need(e.scenario === null && JSON.stringify(parseBusinessQuery(scope)) === JSON.stringify(scope));
    need(e.finance === null && (e.sales === null || (sales(e.sales), true)));
  }
  for (const c of e.citations) citation(c);
}
export function parseBusinessEvidence(v: unknown): BusinessModelEvidence[] {
  need(Array.isArray(v) && v.length > 0 && v.length <= ADVISOR_MAX_TOOL_CALLS);
  for (const e of v) evidence(e);
  return v as BusinessModelEvidence[];
}
