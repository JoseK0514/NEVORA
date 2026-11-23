/* Rondo business records: the Owner screens' side of Codex's contract
 * (docs/handoffs/2026-11-16-rondo-business-evidence-ui-contract.md and the Nov 17 answers). Browser-safe: it imports only
 * the client-safe contract modules. Every response is parsed exactly; anything unknown fails closed as "couldn't load",
 * never as an empty list or a zero. Money stays an exact minor-unit string and is never converted through Number. */
import {
  BUSINESS_UNAVAILABLE_CODES, isBusinessErrorResult, isBusinessFindingCode, isBusinessQualifierCode,
  type BusinessApiResult, type BusinessCatalog, type BusinessCommand, type BusinessCoverageMap, type BusinessDomain, type BusinessFinding, type BusinessMapView,
  type BusinessReadResult, type BusinessReceipt, type BusinessRecord, type BusinessSourceView, type BusinessValidationDetail, type BusinessVersionInput, type BusinessVersionView, type BusinessWindow,
} from "@/lib/owner-advisor/business/contracts";
import { normalizeBusinessVersion, parseBusinessMap, parseBusinessQuery, parseWindow } from "@/lib/owner-advisor/business/parse";
import { isBusinessCitationHref } from "@/lib/owner-advisor/business/metrics";
import { isoInstant, zonedInstant } from "@/lib/owner-advisor/knowledge-client";
import { dateRange } from "@/lib/duration-format";
import { checkBusinessFinanceMetrics, checkBusinessSalesMetrics } from "../public-business-evidence";
import type { Lang } from "../format";
import { BUSINESS_COPY } from "./copy";

export const BUSINESS_ENDPOINT = "/api/owner/advisor/business";
export const BUSINESS_HEADER = "x-nevora-business-evidence";
export const BUSINESS_PATH = "/app/ai-manager/business";
export const BUSINESS_LIMITS = { bytes: 512 * 1024, rows: 1000, nameBytes: 240 } as const;
export const PENDING_STORAGE_NAME = "nevora.rondo.business.pending";

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const fail = (): never => { throw new Error("Unreadable business records"); };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const REF = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const uuid = (value: unknown) => typeof value === "string" && UUID.test(value) ? value : fail();
const digest = (value: unknown) => typeof value === "string" && DIGEST.test(value) ? value : fail();
const instant = (value: unknown) => typeof value === "string" && /^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && new Date(value).toISOString() === value ? value : fail();
const revision = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : fail();
const name = (value: unknown, max = 240) => typeof value === "string" && value.length > 0 && value.length <= max && !/[\x00-\x1f\x7f]/.test(value) ? value : fail();
const exact = (value: Record<string, unknown>, required: string, optional = "") => {
  const need = required.split(" "), allowed = new Set([...need, ...optional.split(" ").filter(Boolean)]);
  if (need.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !allowed.has(key))) fail();
};
// JSON keeps values, not key order; arrays stay ordered.
const canonical = (value: unknown): string => JSON.stringify(value, (_key, entry) =>
  object(entry) ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : entry);
const window = (value: unknown): BusinessWindow => { const parsed = parseWindow(value); if (canonical(parsed) !== canonical(value)) fail(); return parsed; };

/* ---------- Strict response parsing ---------- */
function source(value: unknown): BusinessSourceView {
  if (!object(value)) return fail();
  exact(value, "sourceId revision name domain namespace currency scale maxAgeMinutes active deleted scopeDigest");
  if ((value.domain !== "FINANCE" && value.domain !== "SALES") || (value.currency !== "USD" && value.currency !== "EUR") || value.scale !== 2 ||
    typeof value.active !== "boolean" || typeof value.deleted !== "boolean" || typeof value.namespace !== "string" || !REF.test(value.namespace) ||
    typeof value.maxAgeMinutes !== "number" || !Number.isInteger(value.maxAgeMinutes) || value.maxAgeMinutes < 15 || value.maxAgeMinutes > 10080) return fail();
  return { sourceId: uuid(value.sourceId), revision: revision(value.revision), name: name(value.name), domain: value.domain, namespace: value.namespace, currency: value.currency,
    scale: 2, maxAgeMinutes: value.maxAgeMinutes, active: value.active, deleted: value.deleted, scopeDigest: digest(value.scopeDigest) };
}
function findings(list: BusinessFinding[]) { if (!list.every(item => isBusinessFindingCode(item.code))) fail(); }
function version(value: unknown, full: boolean): BusinessVersionView {
  if (!object(value)) return fail();
  exact(value, "timeZone sourceId versionId digest status current input publishedAt", "publishEligible validation metadata");
  if (!["DRAFT", "PUBLISHED", "DISCARDED", "ERASED"].includes(String(value.status)) || typeof value.current !== "boolean" ||
    (value.publishEligible !== undefined && typeof value.publishEligible !== "boolean")) return fail();
  const view: BusinessVersionView = { timeZone: name(value.timeZone, 64), sourceId: uuid(value.sourceId), versionId: uuid(value.versionId), digest: digest(value.digest),
    status: value.status as BusinessVersionView["status"], current: value.current, input: null, publishedAt: value.publishedAt === null ? null : instant(value.publishedAt) };
  if (value.publishEligible !== undefined) view.publishEligible = value.publishEligible;
  if (value.metadata !== undefined) {
    const meta = value.metadata;
    if (!object(meta)) return fail();
    exact(meta, "window sourceAsOf completeness rowCount payloadBytes");
    if (meta.completeness !== "COMPLETE" && meta.completeness !== "PARTIAL") return fail();
    view.metadata = { window: window(meta.window), sourceAsOf: instant(meta.sourceAsOf), completeness: meta.completeness, rowCount: revision(meta.rowCount), payloadBytes: revision(meta.payloadBytes) };
  }
  if (value.input !== null) {
    // The exact bounded records, in the server's own normal form. Anything else is not a version we can show for review.
    let input: BusinessVersionInput;
    try { input = normalizeBusinessVersion(value.input); } catch { return fail(); }
    if (canonical(input) !== canonical(value.input)) return fail();
    view.input = input;
  }
  if (value.validation !== undefined) {
    const check = value.validation;
    if (!object(check)) return fail();
    exact(check, "finance sales qualifiers");
    if (!Array.isArray(check.qualifiers) || check.qualifiers.length > 32 || !check.qualifiers.every(isBusinessQualifierCode)) return fail();
    try {
      if (check.finance !== null) checkBusinessFinanceMetrics(check.finance);
      if (check.sales !== null) checkBusinessSalesMetrics(check.sales);
    } catch { return fail(); }
    view.validation = check as unknown as NonNullable<BusinessVersionView["validation"]>;
    for (const metrics of [view.validation.finance, view.validation.sales]) if (metrics) findings(metrics.findings);
  }
  // A full review carries every row and the server's own totals; without both it is not a review.
  if (full && (!view.input || !view.validation)) return fail();
  return view;
}
function map(value: unknown): BusinessMapView {
  if (!object(value)) return fail();
  exact(value, "mapVersionId digest status input current");
  if (!["DRAFT", "PUBLISHED", "DISCARDED"].includes(String(value.status)) || typeof value.current !== "boolean") return fail();
  let input: BusinessCoverageMap | null = null;
  if (value.input !== null) { try { input = parseBusinessMap(value.input); } catch { return fail(); } }
  return { mapVersionId: uuid(value.mapVersionId), digest: digest(value.digest), status: value.status as BusinessMapView["status"], input, current: value.current };
}
function catalog(value: unknown): BusinessCatalog {
  if (!object(value)) return fail();
  exact(value, "revision evidenceRevision timeZone activeLocationIds activeLocations sources versions maps", "mapRevision");
  if (!Array.isArray(value.activeLocationIds) || !Array.isArray(value.activeLocations) || !Array.isArray(value.sources) || !Array.isArray(value.versions) || !Array.isArray(value.maps) ||
    value.activeLocations.length !== value.activeLocationIds.length) return fail();
  const activeLocations = value.activeLocations.map((item, index) => {
    if (!object(item)) return fail();
    exact(item, "id name");
    // One list, one order: a label is never combined with another observation's ID.
    if (typeof item.id !== "string" || !item.id || item.id.length > 400 || item.id !== (value.activeLocationIds as unknown[])[index]) return fail();
    return { id: item.id, name: name(item.name, 400) };
  });
  const sources = value.sources.map(source), versions = value.versions.map(item => version(item, false));
  if (new Set(sources.map(item => item.sourceId)).size !== sources.length || new Set(versions.map(item => item.versionId)).size !== versions.length) return fail();
  return { revision: revision(value.revision), evidenceRevision: revision(value.evidenceRevision), ...(value.mapRevision !== undefined ? { mapRevision: revision(value.mapRevision) } : {}),
    timeZone: name(value.timeZone, 64), activeLocationIds: activeLocations.map(item => item.id), activeLocations, sources, versions, maps: value.maps.map(map) };
}
const OPS: BusinessCommand["op"][] = ["stage_source_version", "read_source_version", "publish_source_version", "discard_source_version", "withdraw_source", "delete_source",
  "stage_coverage_map", "read_coverage_map", "publish_coverage_map", "discard_coverage_map", "check_source_operation", "query_finance", "query_sales"];
function receipt(value: unknown): BusinessReceipt {
  if (!object(value)) return fail();
  exact(value, "operationId kind sourceId versionId mapVersionId revision savedAt");
  if (!OPS.includes(value.kind as BusinessCommand["op"])) return fail();
  const optional = (id: unknown) => id === null ? null : uuid(id);
  return { operationId: uuid(value.operationId), kind: value.kind as BusinessCommand["op"], sourceId: optional(value.sourceId), versionId: optional(value.versionId),
    mapVersionId: optional(value.mapVersionId), revision: revision(value.revision), savedAt: isoInstant(value.savedAt) ?? fail() };
}
/** A query's answer (`query_finance` / `query_sales`): the exact public fields, the closed code lists, the server's own
 * canonical scope and metric shapes. Unavailable is a state with a reason, never figures. */
function readResult(value: unknown): BusinessReadResult {
  if (!object(value)) return fail();
  exact(value, "state reason domain completeScope sourceSubtotal window selection locationScope temporalUse scenario observedAt expiresAt qualifiers finance sales citations");
  const ready = value.state === "ready";
  if (!(ready && value.reason === null || value.state === "unavailable" && (BUSINESS_UNAVAILABLE_CODES as readonly string[]).includes(String(value.reason))) ||
    (value.domain !== "FINANCE" && value.domain !== "SALES") || typeof value.completeScope !== "boolean" || typeof value.sourceSubtotal !== "boolean" ||
    !Array.isArray(value.qualifiers) || value.qualifiers.length > 32 || !value.qualifiers.every(isBusinessQualifierCode) || !Array.isArray(value.citations) || value.citations.length > 200) return fail();
  const scope = { window: value.window, selection: value.selection, locationScope: value.locationScope, temporalUse: value.temporalUse };
  try {
    if (value.domain === "FINANCE") { if (canonical(parseBusinessQuery({ ...scope, scenario: value.scenario }, true)) !== canonical({ ...scope, scenario: value.scenario }) || value.sales !== null) fail(); if (value.finance !== null) checkBusinessFinanceMetrics(value.finance); }
    else { if (value.scenario !== null || canonical(parseBusinessQuery(scope)) !== canonical(scope) || value.finance !== null) fail(); if (value.sales !== null) checkBusinessSalesMetrics(value.sales); }
  } catch { return fail(); }
  const metrics = (value.finance ?? value.sales) as { findings: BusinessFinding[] } | null;
  if (metrics) findings(metrics.findings);
  for (const item of value.citations) {
    if (!object(item)) return fail();
    exact(item, "sourceId versionId digest name namespace timeZone currency window sourceAsOf origin href");
    uuid(item.sourceId); uuid(item.versionId); digest(item.digest); name(item.name); name(item.timeZone, 64); instant(item.sourceAsOf); window(item.window);
    if ((item.currency !== "USD" && item.currency !== "EUR") || (item.origin !== "OWNER_IMPORT" && item.origin !== "CONNECTOR") || !isBusinessCitationHref(item.href) ||
      item.href !== citationHref(String(item.sourceId), String(item.versionId)) || typeof item.namespace !== "string" || !REF.test(item.namespace)) return fail();
  }
  instant(value.observedAt);
  if (value.expiresAt !== null) instant(value.expiresAt);
  return value as unknown as BusinessReadResult;
}
/** One answer of the business API, whichever command asked for it. */
export function parseBusinessResult(value: unknown): BusinessApiResult {
  if (!object(value)) return fail();
  exact(value, "state reason catalog version map receipt result readReceiptId readReceiptExpiresAt authority observedAt validForMs");
  if (!["ready", "saved", "not_saved", "unavailable", "stale"].includes(String(value.state)) ||
    !(value.reason === null || (BUSINESS_UNAVAILABLE_CODES as readonly string[]).includes(String(value.reason))) ||
    typeof value.authority !== "string" || !value.authority || value.authority.length > 512 ||
    typeof value.validForMs !== "number" || !Number.isInteger(value.validForMs) || value.validForMs <= 0 || value.validForMs > 15000 ||
    (value.readReceiptId === null) !== (value.readReceiptExpiresAt === null)) return fail();
  const full = value.readReceiptId !== null;
  return { state: value.state as BusinessApiResult["state"], reason: value.reason as BusinessApiResult["reason"], catalog: value.catalog === null ? null : catalog(value.catalog),
    version: value.version === null ? null : version(value.version, full), map: value.map === null ? null : map(value.map), receipt: value.receipt === null ? null : receipt(value.receipt),
    result: value.result === null ? null : readResult(value.result), readReceiptId: full ? uuid(value.readReceiptId) : null, readReceiptExpiresAt: full ? instant(value.readReceiptExpiresAt) : null,
    authority: value.authority, observedAt: isoInstant(value.observedAt) ?? fail(), validForMs: value.validForMs };
}

/* ---------- Transport ---------- */
export type BusinessPageCommand = BusinessCommand;
export type BusinessWriteOp = Exclude<BusinessPageCommand["op"], "read_source_version" | "read_coverage_map" | "check_source_operation" | "query_finance" | "query_sales">;
export type BusinessWrite = Extract<BusinessPageCommand, { op: BusinessWriteOp }>;
export const isWrite = (command: BusinessPageCommand): command is BusinessWrite => !["read_source_version", "read_coverage_map", "check_source_operation", "query_finance", "query_sales"].includes(command.op);
export type RefusedCode = "forbidden" | "invalid" | "conflict" | "limit" | "disabled";
/** `uncertain` (a write only): the request may or may not have been applied. `unavailable` (a read only): nothing changed. */
export type BusinessOutcome =
  | { kind: "ok"; result: BusinessApiResult; receivedAt: number }
  | { kind: "refused"; code: RefusedCode; detail: BusinessValidationDetail | null }
  | { kind: "unavailable" }
  | { kind: "uncertain" };
type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
const headers = { [BUSINESS_HEADER]: "1" };
export function citationHref(sourceId: string, versionId: string) { return `${BUSINESS_ENDPOINT}/sources/${sourceId}/versions/${versionId}`; }
export const newRequestId = () => crypto.randomUUID();

export function createBusinessClient(fetcher: Fetcher = (input, init) => fetch(input, init)) {
  async function settle(response: Response, write: boolean, began: number): Promise<BusinessOutcome> {
    const lost: BusinessOutcome = write ? { kind: "uncertain" } : { kind: "unavailable" };
    let body: unknown;
    try { body = await response.json(); } catch { return response.status === 401 || response.status === 403 ? { kind: "refused", code: "forbidden", detail: null } : lost; }
    if (response.ok) {
      try {
        const result = parseBusinessResult(body);
        // Conservatively include request, delivery and parsing time; receiving a response cannot restart its lease.
        const validForMs = Math.floor(result.validForMs - Math.max(0, performance.now() - began));
        if (validForMs < 1) return lost;
        return { kind: "ok", result: { ...result, validForMs }, receivedAt: Date.now() };
      } catch { return lost; }
    }
    // Only the closed envelope is believed. An unknown code, an extra field or a raw upstream message is not an answer.
    if (!isBusinessErrorResult(body)) return response.status === 401 || response.status === 403 ? { kind: "refused", code: "forbidden", detail: null } : lost;
    // Receipt finalization can fail after execute committed. Conflict or a flag change is also uncertain for writes.
    if (body.code === "unavailable" || body.code === "cancelled" || body.code === "busy" || write && (body.code === "conflict" || body.code === "disabled")) return lost;
    return { kind: "refused", code: body.code, detail: body.detail ?? null };
  }
  return {
    async catalog(signal?: AbortSignal): Promise<BusinessOutcome> {
      const began = performance.now();
      try { return await settle(await fetcher(BUSINESS_ENDPOINT, { method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error", signal, headers }), false, began); }
      catch { return { kind: "unavailable" }; }
    },
    /** A write is never aborted by the page: leaving mid-write would turn a likely success into an uncertain result. */
    async send(command: BusinessPageCommand, signal?: AbortSignal): Promise<BusinessOutcome> {
      const write = isWrite(command), began = performance.now();
      try {
        return await settle(await fetcher(BUSINESS_ENDPOINT, { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal: write ? undefined : signal,
          headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(command) }), write, began);
      } catch { return write ? { kind: "uncertain" } : { kind: "unavailable" }; }
    },
  };
}
export type BusinessClient = ReturnType<typeof createBusinessClient>;

/* ---------- The one pending write (content-free; answer 7) ---------- */
export type PendingOperation = { operationId: string; op: BusinessWriteOp; sourceId: string | null; versionId: string | null; mapVersionId: string | null; authority: string };
const WRITE_OPS: BusinessWriteOp[] = ["stage_source_version", "publish_source_version", "discard_source_version", "withdraw_source", "delete_source", "stage_coverage_map", "publish_coverage_map", "discard_coverage_map"];
/** Only identifiers: no names, amounts, rows, review handles or acknowledgements ever reach browser storage. */
export function pendingFor(command: BusinessWrite, authority: string): PendingOperation {
  return { operationId: command.requestId, op: command.op, sourceId: "sourceId" in command ? command.sourceId : command.op === "stage_source_version" ? (command.format === "JSON" ? command.input.source.sourceId : command.metadata.source.sourceId) : null,
    versionId: "versionId" in command ? command.versionId : null, mapVersionId: "mapVersionId" in command ? command.mapVersionId : null, authority };
}
export function savePending(storage: Pick<Storage, "setItem"> | null, pending: PendingOperation) {
  try { storage?.setItem(PENDING_STORAGE_NAME, JSON.stringify(pending)); } catch { /* the in-memory copy still holds it */ }
}
export function loadPending(storage: Pick<Storage, "getItem" | "removeItem"> | null): PendingOperation | null {
  try {
    const raw = storage?.getItem(PENDING_STORAGE_NAME);
    if (!raw) return null;
    if (raw.length > 2048) throw Error();
    const value = JSON.parse(raw) as unknown;
    if (!object(value) || Object.keys(value).sort().join() !== "authority,mapVersionId,op,operationId,sourceId,versionId" || !WRITE_OPS.includes(value.op as BusinessWriteOp) ||
      typeof value.authority !== "string" || !value.authority || value.authority.length > 512) throw Error();
    const optional = (id: unknown) => id === null ? null : uuid(id);
    return { operationId: uuid(value.operationId), op: value.op as BusinessWriteOp, sourceId: optional(value.sourceId), versionId: optional(value.versionId), mapVersionId: optional(value.mapVersionId), authority: value.authority };
  } catch { try { storage?.removeItem(PENDING_STORAGE_NAME); } catch { /* nothing to clear */ } return null; }
}
export function clearPending(storage: Pick<Storage, "removeItem"> | null) { try { storage?.removeItem(PENDING_STORAGE_NAME); } catch { /* nothing to clear */ } }

/* ---------- What a record is now ---------- */
export type VersionState = "draft" | "draft_locked" | "in_use" | "past" | "replaced" | "discarded" | "erased";
/** Rondo treats a published version as current only until this moment (the earlier of its data time and its period's
 * end, plus the record's own allowance). After it the version still answers questions about its past period. */
export function currentUntil(source: Pick<BusinessSourceView, "maxAgeMinutes">, view: BusinessVersionView): number | null {
  if (!view.metadata) return null;
  return Math.min(Date.parse(view.metadata.sourceAsOf), Date.parse(view.metadata.window.toAt)) + source.maxAgeMinutes * 60000;
}
export function versionState(source: BusinessSourceView, view: BusinessVersionView, now: number): VersionState {
  if (view.status === "ERASED") return "erased";
  if (view.status === "DISCARDED") return "discarded";
  if (view.status === "DRAFT") return view.publishEligible ? "draft" : "draft_locked";
  if (!view.current) return "replaced";
  const until = currentUntil(source, view);
  return until !== null && until > now ? "in_use" : "past";
}
export type RecordSummary = { state: "withdrawn" | "draft" | "in_use" | "past"; draftWaiting: boolean; current: BusinessVersionView[]; drafts: BusinessVersionView[]; versions: BusinessVersionView[] };
const byWindow = (a: BusinessVersionView, b: BusinessVersionView) => (b.metadata?.window.fromAt ?? "").localeCompare(a.metadata?.window.fromAt ?? "") || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") || a.versionId.localeCompare(b.versionId);
/** A record's versions: drafts first, then what is in use, then what was replaced, each newest period first. */
export function recordSummary(catalog: BusinessCatalog, source: BusinessSourceView, now: number): RecordSummary {
  const all = catalog.versions.filter(item => item.sourceId === source.sourceId);
  const drafts = all.filter(item => item.status === "DRAFT").sort(byWindow), current = all.filter(item => item.status === "PUBLISHED" && item.current).sort(byWindow);
  const rest = all.filter(item => !drafts.includes(item) && !current.includes(item)).sort(byWindow);
  const state = !source.active ? "withdrawn" : !current.length ? "draft" : current.some(item => versionState(source, item, now) === "in_use") ? "in_use" : "past";
  return { state, draftWaiting: source.active && current.length > 0 && drafts.length > 0, current, drafts, versions: [...drafts, ...current, ...rest] };
}

/* ---------- Dates and periods (the company's time, canonical UTC milliseconds on the wire) ---------- */
const nextDay = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
const toInstant = (local: string, timeZone: string) => { const at = zonedInstant(local, timeZone); return at ? new Date(at).toISOString() : null; };
/** Two calendar days the Owner picked (both included) as the half-open window the server stores. */
export function windowFromDays(first: string, last: string, timeZone: string): BusinessWindow | null {
  if (!/^20\d\d-\d\d-\d\d$/.test(first) || !/^20\d\d-\d\d-\d\d$/.test(last) || last < first) return null;
  const fromAt = toInstant(`${first}T00:00`, timeZone), toAt = toInstant(`${nextDay(last)}T00:00`, timeZone);
  return fromAt && toAt && fromAt < toAt ? { fromAt, toAt } : null;
}
export const instantFromLocal = (local: string, timeZone: string) => toInstant(local, timeZone);
const localDate = (iso: string, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
/** "Jan 1–31, 2026": the period's days in the company's zone (the end instant itself is not part of the period), in
 * the app's one date-range form. */
export function periodText(period: BusinessWindow, timeZone: string, locale = "en-US") {
  const last = new Date(Date.parse(period.toAt) - 1).toISOString();
  return dateRange(localDate(period.fromAt, timeZone), localDate(last, timeZone), { year: "end", locale });
}
export const momentText = (iso: string, timeZone: string, locale = "en-US") =>
  new Intl.DateTimeFormat(locale, { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
export const clockText = (iso: string, timeZone: string, locale = "en-US") => new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/* ---------- Import: explicit mapping only (nothing is guessed from a file) ---------- */
export const RECORD_FIELDS: Record<BusinessDomain, readonly string[]> = {
  FINANCE: ["kind", "recordId", "revision", "accountRef", "at", "amountMinor", "occurredAt", "postedAt", "state", "deltaMinor", "reconciliationRef", "recordedAt", "dueDate", "confirmation"],
  SALES: ["kind", "recordId", "revision", "orderRef", "locationId", "at", "merchandiseMinor", "discountMinor", "taxMinor", "collectedMinor", "feeMinor"],
};
export const RECORD_KINDS: Record<BusinessDomain, readonly BusinessRecord["kind"][]> = { FINANCE: ["BALANCE", "CASH", "OBLIGATION", "RECEIVABLE"], SALES: ["SALE", "REFUND", "FEE", "CANCELLATION"] };
/** Fields that may be one value for the whole file instead of a column. */
export const CONSTANT_FIELDS: Record<BusinessDomain, readonly string[]> = { FINANCE: ["kind", "accountRef", "revision"], SALES: ["kind", "locationId", "revision"] };
/** The first line's column names, read as the server reads them (quotes, doubled quotes, commas). Null when unreadable. */
export function csvHeader(text: string): string[] | null {
  const cells: string[] = []; let cell = "", quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } } else cell += ch; }
    else if (ch === '"') { if (cell || closed) return null; quoted = true; }
    else if (ch === ",") { cells.push(cell); cell = ""; closed = false; }
    else if (ch === "\n" || ch === "\r") break;
    else { if (closed) return null; cell += ch; }
  }
  if (quoted) return null;
  cells.push(cell);
  return cells.every(header => header && header.length <= 128) && new Set(cells).size === cells.length && cells.length <= 21 ? cells : null;
}
export const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;
export const sizeText = (bytes: number, lang: Lang = "en") => bytes < 1024 ? `${bytes} ${BUSINESS_COPY[lang].bytes}` : `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
/** A short opaque label for where the rows come from ("Square POS" → "square-pos"); null when nothing usable is left. */
export function namespaceFrom(value: string): string | null {
  const slug = value.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 64);
  return slug && REF.test(slug) ? slug : null;
}
/** Rows from a .json file: the array itself, or an object with a `records` array. Never rewritten or completed here. */
export function recordsFromJson(text: string): unknown[] | null {
  try { const value = JSON.parse(text) as unknown; const rows = Array.isArray(value) ? value : object(value) && Array.isArray(value.records) ? value.records : null; return rows && rows.length <= BUSINESS_LIMITS.rows ? rows : null; }
  catch { return null; }
}
