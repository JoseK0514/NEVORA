import 'server-only';
import { createHash } from 'node:crypto';
import { Temporal } from '@js-temporal/polyfill';
import { parsePeriod, periodInstants, projectTimecard, type Period, type TimecardBreak, type TimecardEntry, type TimecardSource } from '../../timecards/project';
import type { BreakTypeSnapshot } from '../../clocker/break-types';
import type { SqlStatement } from '../../notifications/types';
import { stableExportJson } from '../../payroll-export/json';

export type RecordedSourceInterval = { startAt: string; endAt: string };
export type RecordedSourceRequest = {
  workspaceId: string; employeeId: string; timeZone: string; period: Period;
  contexts: readonly RecordedSourceInterval[]; coverage: readonly Period[];
};
export type RecordedSourceBlock = 'invalid_source' | 'source_limit' | 'identity_mismatch' | 'coverage_missing' |
  'not_finalized' | 'unresolved_time' | 'stale_source' | 'inconsistent_lineage';
export type RecordedSourceBreak = TimecardBreak & { recordedVersion: number; classification: BreakTypeSnapshot | null };
export type RecordedSourceEntry = Omit<TimecardEntry, 'breaks'> & { logicalId: string; breaks: RecordedSourceBreak[] };
export type RecordedSourceCoverage = Period & {
  operationId: string; revision: number; sourceHash: string; currentSourceHash: string; snapshot: TimecardSource;
};
/** Historical nonfinal custody replaced only within requiredContexts, never rewritten. */
export type RecordedSourceSupersededCoverage = RecordedSourceCoverage & {
  action: 'APPROVE' | 'REOPEN'; occurredAt: string; currentSource: TimecardSource;
  requiredContexts: RecordedSourceInterval[];
  replacedBy: (Period & { operationId: string; approvalOccurredAt: string; occurredAt: string })[];
};
export type RecordedSourceJson = null | boolean | number | string | RecordedSourceJson[] | { [key: string]: RecordedSourceJson };
type JsonObject = { [key: string]: RecordedSourceJson };
type CorrectionKind = 'ENTRY_BOUNDARY' | 'BREAK_BOUNDARY' | 'MISSING_ENTRY';
type CorrectionTarget = {
  workspaceId: string; employeeId: string; kind: CorrectionKind; timeEntryId: string | null;
  breakEntryId: string | null; locationId: string; sourceRevision: number; sourceSnapshot: JsonObject;
};
export type RecordedSourceCorrectionRequest = CorrectionTarget & {
  id: string; requestedByEmployeeId: string; baseAdjustmentId: string | null; proposal: RecordedSourceInterval;
  reason: string; requestHash: string; createdAt: string;
};
export type RecordedSourceAdjustment = CorrectionTarget & RecordedSourceInterval & {
  id: string; requestId: string; supersedesAdjustmentId: string | null; createdByEmployeeId: string; createdAt: string;
};
export type RecordedSourceEvent = {
  id: string; requestId: string; revision: number; kind: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  actorEmployeeId: string; operationHash: string; decisionNote: string | null; adjustmentId: string | null;
  result: JsonObject; occurredAt: string;
};
export type RecordedSourceLineage = {
  requests: RecordedSourceCorrectionRequest[]; adjustments: RecordedSourceAdjustment[];
  events: RecordedSourceEvent[]; locations: { id: string; workspaceId: string }[];
};
export type RecordedSourceCapture = { state: 'blocked'; reason: RecordedSourceBlock } | {
  state: 'ready'; workspaceId: string; employeeId: string; timeZone: string; period: Period;
  contexts: RecordedSourceInterval[]; coverage: RecordedSourceCoverage[]; supersededCoverage: RecordedSourceSupersededCoverage[]; entries: RecordedSourceEntry[];
  lineage: RecordedSourceLineage; locationIds: string[]; emptyFinalizedCoverage: Period[]; sourceFence: string;
};

// Bounds reject overflow; SQL fetches one additional row rather than truncating silently.
const limits = { cards: 64, contexts: 16, entries: 2048, breaks: 4096, requests: 2048, adjustments: 4096, events: 8192, locations: 128 } as const;
class Block extends Error { constructor(readonly reason: RecordedSourceBlock) { super(reason); } }
function fail(reason: RecordedSourceBlock = 'invalid_source'): never { throw new Block(reason); }
function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v) || ![Object.prototype, null].includes(Object.getPrototypeOf(v))) fail();
  return v as Record<string, unknown>;
}
function text(v: unknown, max = 500): string {
  if (typeof v !== 'string' || !v || v.length > max || v.trim() !== v || /[\u0000-\u001f\u007f]/.test(v)) fail();
  return v;
}
function nullableText(v: unknown): string | null { return v === null ? null : text(v); }
function integer(v: unknown, min = 0): number { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min) fail(); return v; }
function bool(v: unknown): boolean { if (typeof v !== 'boolean') fail(); return v; }
function uuid(v: unknown): string { const s = text(v); if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(s)) fail(); return s; }
function nullableUuid(v: unknown): string | null { return v === null ? null : uuid(v); }
function hash(v: unknown, width: number): string { const s = text(v); if (!new RegExp(`^[a-f0-9]{${width}}$`).test(s)) fail(); return s; }
function enumeration<T extends string>(v: unknown, choices: readonly T[]): T { const s = text(v); if (!choices.includes(s as T)) fail(); return s as T; }
function instant(v: unknown): string { return Temporal.Instant.from(text(v, 100)).toString(); }
function ns(v: string): bigint { return Temporal.Instant.from(v).epochNanoseconds; }
function interval(v: unknown): RecordedSourceInterval {
  const r = record(v), startAt = instant(r.startAt), endAt = instant(r.endAt);
  if (ns(startAt) >= ns(endAt)) fail(); return { startAt, endAt };
}
function period(v: unknown): Period { const r = record(v); return parsePeriod(text(r.startDate, 10), text(r.endDate, 10)); }
function array(v: unknown, max: number): unknown[] { if (!Array.isArray(v)) fail(); if (v.length > max) fail('source_limit'); return v; }
function unique<T>(rows: T[], key: (r: T) => string): Map<string, T> {
  const m = new Map<string, T>(); for (const r of rows) { const k = key(r); if (m.has(k)) fail('inconsistent_lineage'); m.set(k, r); } return m;
}
function overlaps(a: RecordedSourceInterval, b: RecordedSourceInterval): boolean { return ns(a.startAt) < ns(b.endAt) && ns(b.startAt) < ns(a.endAt); }
function covers(intervals: RecordedSourceInterval[], required: RecordedSourceInterval): boolean {
  let cursor = ns(required.startAt);
  for (const i of [...intervals].sort((a, b) => Temporal.Instant.compare(a.startAt, b.startAt))) {
    if (ns(i.endAt) <= cursor) continue; if (ns(i.startAt) > cursor) return false;
    cursor = ns(i.endAt); if (cursor >= ns(required.endAt)) return true;
  }
  return false;
}
function parseRequest(v: unknown): RecordedSourceRequest {
  const r = record(v), workspaceId = text(r.workspaceId), employeeId = text(r.employeeId), timeZone = text(r.timeZone, 100);
  if (/^[+-]/.test(timeZone)) fail();
  const p = period(r.period), contexts = array(r.contexts, limits.contexts).map(interval), coverage = array(r.coverage, limits.cards).map(period);
  const bounds = periodInstants(p, timeZone); // Supplied zone, never a derived payroll workweek anchor.
  if (!contexts.length || !covers(contexts, bounds)) fail();
  const earliest = contexts.reduce((a, b) => ns(a.startAt) < ns(b.startAt) ? a : b).startAt;
  const latest = contexts.reduce((a, b) => ns(a.endAt) > ns(b.endAt) ? a : b).endAt;
  if (ns(latest) - ns(earliest) > BigInt(124) * BigInt(86400) * BigInt(1000000000)) fail('source_limit');
  unique(coverage, p => `${p.startDate}/${p.endDate}`);
  return { workspaceId, employeeId, timeZone, period: p, contexts, coverage };
}

// Retain JSON provenance without accepting boxed primitives, cycles, functions, NaN or unbounded depth.
function jsonObject(v: unknown): JsonObject {
  let nodes = 0;
  function visit(v: unknown, depth: number): RecordedSourceJson {
    if (++nodes > 10000 || depth > 12) fail('source_limit');
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') { if (!Number.isFinite(v)) fail(); return v; }
    if (typeof v === 'string') { if (v.length > 100000) fail('source_limit'); return v; }
    if (Array.isArray(v)) return array(v, 10000).map(x => visit(x, depth + 1));
    return Object.fromEntries(Object.entries(record(v)).map(([k, x]) => [k, visit(x, depth + 1)]));
  }
  record(v); return visit(v, 0) as JsonObject;
}
function source(v: unknown, observedAt: string): TimecardSource {
  const r = record(v);
  for (const raw of array(r.entries, limits.entries)) {
    const e = record(raw); enumeration(e.sourceKind, ['RECORDED', 'ADJUSTMENT']);
    if (e.recordedVersion !== null) integer(e.recordedVersion, 1);
    if (e.sourceKind === 'ADJUSTMENT' && e.recordedVersion !== null) fail();
    for (const b of array(e.breaks, 1000)) record(b);
  }
  for (const raw of array(r.corrections, limits.requests)) {
    const c = record(raw); enumeration(c.kind, ['ENTRY_BOUNDARY', 'BREAK_BOUNDARY', 'MISSING_ENTRY']);
    enumeration(c.status, ['PENDING', 'APPROVED', 'REJECTED']); integer(c.revision, 1);
  }
  integer(r.pendingCorrections);
  const c = projectTimecard(v, observedAt);
  if (c.issues.length) fail('unresolved_time');
  return { startDate: c.startDate, endDate: c.endDate, employeeId: c.employeeId, employeeName: c.employeeName,
    timeZone: c.timeZone, pendingCorrections: c.pendingCorrections, entries: c.entries, corrections: c.corrections };
}
function semantics(e: TimecardEntry) {
  return { id: e.id, locationId: e.locationId, sourceKind: e.sourceKind, adjustmentId: e.adjustmentId, recordedVersion: e.recordedVersion,
    startAt: e.startAt, endAt: e.endAt, rawStartAt: e.rawStartAt, rawEndAt: e.rawEndAt,
    breaks: e.breaks.map(b => ({ id: b.id, adjustmentId: b.adjustmentId, startAt: b.startAt, endAt: b.endAt, rawStartAt: b.rawStartAt, rawEndAt: b.rawEndAt })) };
}
const same = (a: unknown, b: unknown) => stableExportJson(a) === stableExportJson(b);
function target(v: unknown, req: RecordedSourceRequest): CorrectionTarget {
  const r = record(v), workspaceId = text(r.workspaceId), employeeId = text(r.employeeId);
  if (workspaceId !== req.workspaceId || employeeId !== req.employeeId) fail('identity_mismatch');
  const kind = enumeration(r.kind, ['ENTRY_BOUNDARY', 'BREAK_BOUNDARY', 'MISSING_ENTRY']);
  const timeEntryId = nullableText(r.timeEntryId), breakEntryId = nullableText(r.breakEntryId);
  if ((kind === 'MISSING_ENTRY' && (timeEntryId !== null || breakEntryId !== null)) ||
      (kind === 'ENTRY_BOUNDARY' && (timeEntryId === null || breakEntryId !== null)) ||
      (kind === 'BREAK_BOUNDARY' && (timeEntryId === null || breakEntryId === null))) fail('inconsistent_lineage');
  return { workspaceId, employeeId, kind, timeEntryId, breakEntryId, locationId: text(r.locationId),
    sourceRevision: integer(r.sourceRevision), sourceSnapshot: jsonObject(r.sourceSnapshot) };
}
function parseLineage(v: unknown, req: RecordedSourceRequest): RecordedSourceLineage {
  const l = record(v);
  const requests = array(l.requests, limits.requests).map(v => {
    const r = record(v); return { ...target(v, req), id: uuid(r.id), requestedByEmployeeId: text(r.requestedByEmployeeId),
      baseAdjustmentId: nullableUuid(r.baseAdjustmentId), proposal: interval(r.proposal), reason: text(r.reason), requestHash: hash(r.requestHash, 64), createdAt: instant(r.createdAt) };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const adjustments = array(l.adjustments, limits.adjustments).map(v => {
    const r = record(v); return { ...target(v, req), ...interval(v), id: uuid(r.id), requestId: uuid(r.requestId),
      supersedesAdjustmentId: nullableUuid(r.supersedesAdjustmentId), createdByEmployeeId: text(r.createdByEmployeeId), createdAt: instant(r.createdAt) };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const events = array(l.events, limits.events).map(v => {
    const r = record(v); return { id: uuid(r.id), requestId: uuid(r.requestId), revision: integer(r.revision, 1),
      kind: enumeration(r.kind, ['REQUESTED', 'APPROVED', 'REJECTED']), actorEmployeeId: text(r.actorEmployeeId), operationHash: hash(r.operationHash, 64),
      decisionNote: nullableText(r.decisionNote), adjustmentId: nullableUuid(r.adjustmentId), result: jsonObject(r.result), occurredAt: instant(r.occurredAt) };
  }).sort((a, b) => a.requestId.localeCompare(b.requestId) || a.revision - b.revision);
  const locations = array(l.locations, limits.locations).map(v => {
    const r = record(v), workspaceId = text(r.workspaceId); if (workspaceId !== req.workspaceId) fail('identity_mismatch');
    return { id: text(r.id), workspaceId };
  }).sort((a, b) => a.id.localeCompare(b.id));
  return { requests, adjustments, events, locations };
}
function validateLineage(l: RecordedSourceLineage, req: RecordedSourceRequest) {
  const requests = unique(l.requests, r => r.id), adjustments = unique(l.adjustments, r => r.id);
  unique(l.events, e => e.id); unique(l.locations, l => l.id);
  const successors = new Map<string, string>();
  const byRequest = unique(l.adjustments, a => a.requestId);
  for (const a of l.adjustments) {
    const r = requests.get(a.requestId); if (!r) fail('inconsistent_lineage');
    if (a.kind !== r.kind || a.locationId !== r.locationId || a.timeEntryId !== r.timeEntryId || a.breakEntryId !== r.breakEntryId ||
        a.sourceRevision !== r.sourceRevision || !same(a.sourceSnapshot, r.sourceSnapshot) || !same({ startAt: a.startAt, endAt: a.endAt }, r.proposal) ||
        a.supersedesAdjustmentId !== r.baseAdjustmentId) fail('inconsistent_lineage');
    if (a.createdByEmployeeId === req.employeeId) fail('inconsistent_lineage');
    if (a.supersedesAdjustmentId) {
      const p = adjustments.get(a.supersedesAdjustmentId);
      if (!p || p.kind !== a.kind || p.locationId !== a.locationId || p.timeEntryId !== a.timeEntryId || p.breakEntryId !== a.breakEntryId || successors.has(p.id)) fail('inconsistent_lineage');
      successors.set(p.id, a.id);
    }
    const seen = new Set<string>(); let node: RecordedSourceAdjustment | undefined = a;
    while (node) { if (seen.has(node.id)) fail('inconsistent_lineage'); seen.add(node.id); node = node.supersedesAdjustmentId ? adjustments.get(node.supersedesAdjustmentId) : undefined; }
  }
  for (const e of l.events) if (!requests.has(e.requestId)) fail('inconsistent_lineage');
  for (const r of l.requests) {
    if (r.baseAdjustmentId && !adjustments.has(r.baseAdjustmentId)) fail('inconsistent_lineage');
    const events = l.events.filter(e => e.requestId === r.id);
    if (!events.length || events.some((e, i) => e.revision !== i + 1) || events[0].kind !== 'REQUESTED' ||
        events[0].actorEmployeeId !== r.requestedByEmployeeId || events[0].adjustmentId !== null) fail('inconsistent_lineage');
    if (events.length === 1) fail('unresolved_time');
    if (events.length !== 2 || events[1].kind === 'REQUESTED' || events[1].actorEmployeeId === req.employeeId) fail('inconsistent_lineage');
    const last = events[1], a = byRequest.get(r.id);
    if (last.kind === 'APPROVED') {
      if (!a || last.adjustmentId !== a.id || last.actorEmployeeId !== a.createdByEmployeeId) fail('inconsistent_lineage');
    } else if (a || last.adjustmentId !== null) fail('inconsistent_lineage');
  }
  return { requests, adjustments, successors };
}

/** Strict SQL-result boundary. It never treats an error, partial source or missing approval as zero. */
export function projectRecordedSourceCapture(input: RecordedSourceRequest, row: unknown): RecordedSourceCapture {
  try {
    const req = parseRequest(input), c = record(record(row).capture), observedAt = instant(c.observedAt);
    if (bool(c.limitExceeded)) fail('source_limit');
    const w = record(c.workspace), e = record(c.employee);
    if (text(w.id) !== req.workspaceId || text(w.timeZone, 100) !== req.timeZone || !bool(w.active) ||
        text(e.id) !== req.employeeId || text(e.workspaceId) !== req.workspaceId) fail('identity_mismatch');
    const coverage: RecordedSourceCoverage[] = [];
    const frozen = new Map<string, TimecardEntry>();
    const sourceCorrections = new Map<string, TimecardSource['corrections'][number]>();
    const cards = array(c.cards, limits.cards), wanted = new Set(req.coverage.map(p => `${p.startDate}/${p.endDate}`));
    const historical: { card: Record<string, unknown>; period: Period; action: 'APPROVE' | 'REOPEN' }[] = [];
    const authority = new Map<string, Record<string, unknown>>();
    const supersededCoverage: RecordedSourceSupersededCoverage[] = [];
    for (const raw of cards) {
      const card = record(raw), p = period(card.period), key = `${p.startDate}/${p.endDate}`;
      if (!wanted.delete(key)) fail('invalid_source');
      if (card.action === null) fail('coverage_missing');
      const action = enumeration(card.action, ['APPROVE', 'FINALIZE', 'REOPEN']);
      if (action !== 'FINALIZE') { historical.push({ card, period: p, action }); continue; }
      const revision = integer(card.revision, 2), sourceHash = hash(card.sourceHash, 32), currentSourceHash = hash(card.currentSourceHash, 32);
      const operationId = uuid(card.operationId);
      if (integer(card.approvalRevision, 1) !== revision - 1 || hash(card.approvalSourceHash, 32) !== sourceHash ||
          uuid(card.approvalOperationId) === operationId || text(card.actorEmployeeId) === req.employeeId || text(card.approvalActorEmployeeId) === req.employeeId) fail('inconsistent_lineage');
      const snapshot = source(card.snapshot, observedAt), current = source(card.currentSource, observedAt);
      for (const source of [snapshot, current]) if (source.employeeId !== req.employeeId || source.timeZone !== req.timeZone || !same(p, { startDate: source.startDate, endDate: source.endDate })) fail('identity_mismatch');
      if (!same(snapshot.entries.map(semantics), current.entries.map(semantics)) || !same(snapshot.corrections, current.corrections)) fail('stale_source');
      for (const entry of snapshot.entries) {
        if (!req.contexts.some(i => overlaps(i, entry as RecordedSourceInterval))) continue;
        const prior = frozen.get(entry.id); if (prior && !same(semantics(prior), semantics(entry))) fail('stale_source'); frozen.set(entry.id, entry);
      }
      for (const correction of snapshot.corrections) {
        const prior = sourceCorrections.get(correction.id); if (prior && !same(prior, correction)) fail('stale_source'); sourceCorrections.set(correction.id, correction);
      }
      coverage.push({ ...p, operationId, revision, sourceHash, currentSourceHash, snapshot });
      authority.set(operationId, card);
    }
    if (wanted.size) fail('coverage_missing');
    if (historical.length && !coverage.length) fail('not_finalized');
    for (const { card, period: p, action } of historical) {
      const occurredAt = instant(card.occurredAt), revision = integer(card.revision, action === 'REOPEN' ? 3 : 1);
      const operationId = uuid(card.operationId), sourceHash = hash(card.sourceHash, 32), currentSourceHash = hash(card.currentSourceHash, 32);
      if (text(card.actorEmployeeId) === req.employeeId || ns(occurredAt) > ns(observedAt)) fail('inconsistent_lineage');
      const snapshot = source(card.snapshot, observedAt), currentSource = source(card.currentSource, observedAt);
      for (const source of [snapshot, currentSource]) if (source.employeeId !== req.employeeId || source.timeZone !== req.timeZone || !same(p, { startDate: source.startDate, endDate: source.endDate })) fail('identity_mismatch');
      const bounds = periodInstants(p, req.timeZone);
      const requiredContexts = req.contexts.filter(i => overlaps(i, bounds)).map(i => ({
        startAt: ns(i.startAt) > ns(bounds.startAt) ? i.startAt : bounds.startAt,
        endAt: ns(i.endAt) < ns(bounds.endAt) ? i.endAt : bounds.endAt,
      }));
      if (!requiredContexts.length) fail('invalid_source');
      const replacedBy = coverage.map(c => {
        const raw = authority.get(c.operationId)!;
        const approvalOccurredAt = instant(raw.approvalOccurredAt), finalizedAt = instant(raw.occurredAt);
        if (ns(approvalOccurredAt) >= ns(finalizedAt) || ns(finalizedAt) > ns(observedAt)) fail('inconsistent_lineage');
        return { startDate: c.startDate, endDate: c.endDate, operationId: c.operationId, approvalOccurredAt, occurredAt: finalizedAt };
      }).filter(c => ns(c.approvalOccurredAt) > ns(occurredAt) && requiredContexts.some(i => overlaps(i, periodInstants(c, req.timeZone))));
      if (!requiredContexts.every(i => covers(replacedBy.map(c => periodInstants(c, req.timeZone)), i))) fail('not_finalized');
      // Superseded snapshots remain history. Their current required time must still equal complete current authority.
      const currentEntries = unique(currentSource.entries.filter(e => requiredContexts.some(i => overlaps(i, e as RecordedSourceInterval))), e => e.id);
      const authoritativeEntries = [...frozen.values()].filter(e => requiredContexts.some(i => overlaps(i, e as RecordedSourceInterval)));
      if (currentEntries.size !== authoritativeEntries.length || authoritativeEntries.some(e => !currentEntries.has(e.id) || !same(semantics(currentEntries.get(e.id)!), semantics(e)))) fail('stale_source');
      const currentCorrections = unique(currentSource.corrections.filter(c => requiredContexts.some(i => overlaps(i, c))), c => c.id);
      const authoritativeCorrections = [...sourceCorrections.values()].filter(c => requiredContexts.some(i => overlaps(i, c)));
      if (currentCorrections.size !== authoritativeCorrections.length || authoritativeCorrections.some(c => !currentCorrections.has(c.id) || !same(currentCorrections.get(c.id)!, c))) fail('stale_source');
      supersededCoverage.push({ ...p, operationId, revision, action, sourceHash, currentSourceHash, occurredAt, snapshot, currentSource, requiredContexts, replacedBy });
    }
    if (!req.contexts.every(i => covers(coverage.map(p => periodInstants(p, req.timeZone)), i))) fail('coverage_missing');
    const lineage = parseLineage(c.lineage, req), chain = validateLineage(lineage, req);
    for (const correction of sourceCorrections.values()) {
      const r = chain.requests.get(correction.id), events = lineage.events.filter(e => e.requestId === correction.id), last = events.at(-1);
      if (!r || !last || r.kind !== correction.kind || last.kind !== correction.status || last.revision !== correction.revision ||
          r.reason !== correction.reason || !same(r.proposal, { startAt: correction.startAt, endAt: correction.endAt })) fail('inconsistent_lineage');
    }
    const rawEntries = array(c.entries, limits.entries), entries: RecordedSourceEntry[] = []; let breakCount = 0;
    for (const raw of rawEntries) {
      const r = record(raw); if (text(r.employeeId) !== req.employeeId) fail('identity_mismatch');
      const status = enumeration(r.status, ['CLOCKED_IN', 'ON_BREAK', 'CLOCKED_OUT']);
      if (status !== 'CLOCKED_OUT' || r.endAt === null || array(r.breaks, 1000).some(b => record(b).endAt === null)) fail('unresolved_time');
      const s = source({ ...req.period, employeeId: req.employeeId, employeeName: 'Recorded source', timeZone: req.timeZone,
        pendingCorrections: 0, entries: [r], corrections: [] }, observedAt), entry = s.entries[0];
      if (!req.contexts.some(i => overlaps(i, entry as RecordedSourceInterval))) fail('invalid_source');
      const breaks = array(r.breaks, 1000).map(raw => {
        const b = record(raw), parsed = entry.breaks.find(x => x.id === b.id); if (!parsed) fail();
        let classification: BreakTypeSnapshot | null = null;
        if (b.classification !== null) {
          const k = record(b.classification);
          const keys = ['id', 'version', 'name', 'category', 'targetMinutes'];
          if (Object.keys(k).length !== keys.length || !keys.every(key => Object.hasOwn(k, key))) fail();
          const name = text(k.name, 160);
          if ([...name].length > 80) fail(); // Match retained break types and PostgreSQL char_length; preserve the original string.
          const targetMinutes = k.targetMinutes === null ? null : integer(k.targetMinutes, 1);
          if (targetMinutes !== null && targetMinutes > 1440) fail();
          classification = { id: text(k.id), version: integer(k.version, 1), name,
            category: enumeration(k.category, ['REST', 'MEAL', 'OTHER']), targetMinutes };
        }
        return { ...parsed, recordedVersion: integer(b.recordedVersion, 1), classification };
      }).sort((a, b) => Temporal.Instant.compare(a.startAt, b.startAt) || a.id.localeCompare(b.id));
      breakCount += breaks.length; if (breakCount > limits.breaks) fail('source_limit');
      let logicalId = entry.id;
      const verifyAdjustment = (id: string | null, kind: CorrectionKind, targetId: string | null, timing: TimecardEntry | TimecardBreak) => {
        if (!id) return;
        const a = chain.adjustments.get(id);
        if (!a || chain.successors.has(id) || a.kind !== kind || a.timeEntryId !== (kind === 'MISSING_ENTRY' ? null : entry.id) ||
            a.breakEntryId !== (kind === 'BREAK_BOUNDARY' ? targetId : null) || a.locationId !== entry.locationId || a.startAt !== timing.startAt || a.endAt !== timing.endAt) fail('inconsistent_lineage');
      };
      verifyAdjustment(entry.adjustmentId, entry.sourceKind === 'ADJUSTMENT' ? 'MISSING_ENTRY' : 'ENTRY_BOUNDARY', null, entry);
      for (const b of breaks) verifyAdjustment(b.adjustmentId, 'BREAK_BOUNDARY', b.id, b);
      if (entry.sourceKind === 'ADJUSTMENT') {
        if (entry.id !== entry.adjustmentId) fail('inconsistent_lineage');
        let root = chain.adjustments.get(entry.adjustmentId!); if (!root) fail('inconsistent_lineage');
        while (root.supersedesAdjustmentId) root = chain.adjustments.get(root.supersedesAdjustmentId)!;
        logicalId = `missing:${root.id}`;
      }
      const prior = frozen.get(entry.id); if (!prior || !same(semantics(prior), semantics(entry))) fail('stale_source');
      entries.push({ ...prior, logicalId, breaks }); frozen.delete(entry.id);
    }
    if (frozen.size) fail('stale_source');
    for (const a of chain.adjustments.values()) {
      if (chain.successors.has(a.id) || !req.contexts.some(i => overlaps(i, a))) continue;
      const represented = a.kind === 'BREAK_BOUNDARY'
        ? entries.some(e => e.id === a.timeEntryId && e.breaks.some(b => b.id === a.breakEntryId && b.adjustmentId === a.id))
        : entries.some(e => e.adjustmentId === a.id && e.id === (a.kind === 'MISSING_ENTRY' ? a.id : a.timeEntryId));
      if (!represented) fail('inconsistent_lineage');
    }
    unique(entries, e => e.logicalId);
    entries.sort((a, b) => Temporal.Instant.compare(a.startAt, b.startAt) || a.logicalId.localeCompare(b.logicalId));
    for (let i = 1; i < entries.length; i++) if (ns(entries[i].startAt) < ns(entries[i - 1].endAt!)) fail('unresolved_time');
    const locationIds = new Set([...coverage, ...supersededCoverage].flatMap(c => c.snapshot.entries.map(e => e.locationId)));
    for (const e of entries) locationIds.add(e.locationId);
    for (const r of [...lineage.requests, ...lineage.adjustments]) {
      locationIds.add(r.locationId);
      if (Object.hasOwn(r.sourceSnapshot, 'locationId')) locationIds.add(text(r.sourceSnapshot.locationId));
    }
    const locations = new Set(lineage.locations.map(l => l.id));
    for (const id of locationIds) if (!locations.has(id)) fail('identity_mismatch');
    // Every retained historical location contributes to the caller's required permission footprint.
    for (const id of locations) locationIds.add(id);
    coverage.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate));
    const captured = { workspaceId: req.workspaceId, employeeId: req.employeeId, timeZone: req.timeZone, period: req.period,
      contexts: [...req.contexts], coverage, supersededCoverage, entries, lineage, locationIds: [...locationIds].sort(),
      emptyFinalizedCoverage: coverage.filter(c => c.snapshot.entries.length === 0).map(c => ({ startDate: c.startDate, endDate: c.endDate })) };
    return { state: 'ready', ...captured, sourceFence: createHash('sha256').update(stableExportJson(captured)).digest('hex') };
  } catch (error) { return { state: 'blocked', reason: error instanceof Block ? error.reason : 'invalid_source' }; }
}

/** Read builder only. Finance owns authority, ordered source locks, execution and approval fencing. */
export function buildRecordedSourceCapture(input: RecordedSourceRequest): SqlStatement {
  let r: RecordedSourceRequest;
  try { r = parseRequest(input); } catch { throw new Error('recorded_source_invalid'); }
  return { text: `WITH RECURSIVE
contexts AS (SELECT * FROM jsonb_to_recordset($4::jsonb) AS x("startAt" timestamptz,"endAt" timestamptz)),
periods AS (SELECT * FROM jsonb_to_recordset($5::jsonb) AS x("startDate" date,"endDate" date)),
identity AS (SELECT e.id,l.workspace_id,$3::text AS requested_zone FROM employees e LEFT JOIN locations l ON l.id=e.primary_location_id WHERE e.id=$2),
cards AS MATERIALIZED (
  SELECT p.*,t.operation_id,t.revision,t.action,t.actor_employee_id,t.source_hash,t.snapshot,
    t.occurred_at,a.occurred_at AS approval_occurred_at,a.revision AS approval_revision,a.operation_id AS approval_operation_id,a.source_hash AS approval_source_hash,a.actor_employee_id AS approval_actor,
    CASE WHEN EXISTS(SELECT 1 FROM identity i JOIN workspaces w ON w.id=i.workspace_id WHERE i.workspace_id=$1 AND w.active)
      THEN nevora_timecard_source($1,$2,p."startDate",p."endDate") ELSE NULL END AS current_source
  FROM periods p LEFT JOIN nevora_timecard_latest t ON t.workspace_id=$1 AND t.employee_id=$2 AND t.start_date=p."startDate" AND t.end_date=p."endDate"
  LEFT JOIN timecard_revisions a ON a.workspace_id=t.workspace_id AND a.employee_id=t.employee_id AND a.start_date=t.start_date
    AND a.end_date=t.end_date AND a.revision=t.revision-1 AND a.action='APPROVE'
),
selected_entries AS MATERIALIZED (
  SELECT v.*,t.clock_in_at,t.clock_out_at,t.schedule_context,l.workspace_id,
    COALESCE(NULLIF(trim(l.short_name),''),trim(l.name)) AS location_name
  FROM nevora_effective_time_entries v LEFT JOIN time_entries t ON t.id=v.time_entry_id LEFT JOIN locations l ON l.id=v.location_id
  WHERE v.employee_id=$2 AND EXISTS(SELECT 1 FROM contexts c WHERE v.start_at<c."endAt" AND (v.end_at IS NULL OR v.end_at>c."startAt"))
  ORDER BY v.start_at,COALESCE(v.time_entry_id,v.adjustment_id::text) LIMIT ${limits.entries + 1}
),
selected_breaks AS MATERIALIZED (
  SELECT b.*,rb.break_start_at,rb.break_end_at
  FROM nevora_effective_break_entries b JOIN break_entries rb ON rb.id=b.break_entry_id
  WHERE b.time_entry_id IN(SELECT time_entry_id FROM selected_entries)
  ORDER BY b.start_at,b.break_entry_id LIMIT ${limits.breaks + 1}
),
seed_requests AS MATERIALIZED (
  SELECT r.id FROM time_correction_requests r LEFT JOIN time_entries t ON t.id=r.time_entry_id
  LEFT JOIN time_correction_adjustments base ON base.id=r.base_adjustment_id
  WHERE r.employee_id=$2 AND (
    r.time_entry_id IN(SELECT time_entry_id FROM selected_entries) OR r.break_entry_id IN(SELECT break_entry_id FROM selected_breaks)
    OR EXISTS(SELECT 1 FROM cards c CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c.snapshot->'corrections','[]'::jsonb)) item WHERE item->>'id'=r.id::text)
    OR EXISTS(SELECT 1 FROM contexts c WHERE
      ((r.proposal->>'startAt')::timestamptz<c."endAt" AND (r.proposal->>'endAt')::timestamptz>c."startAt")
      OR (t.clock_in_at<c."endAt" AND (t.clock_out_at IS NULL OR t.clock_out_at>c."startAt"))
      OR (base.effective_start_at<c."endAt" AND base.effective_end_at>c."startAt")))
),
connected(id) AS (
  SELECT a.id FROM time_correction_adjustments a WHERE a.request_id IN(SELECT id FROM seed_requests)
    OR a.id IN(SELECT base_adjustment_id FROM time_correction_requests WHERE id IN(SELECT id FROM seed_requests))
    OR a.id IN(SELECT adjustment_id FROM selected_entries UNION SELECT adjustment_id FROM selected_breaks)
  UNION
  SELECT neighbor.id FROM connected c JOIN time_correction_adjustments current ON current.id=c.id
  JOIN time_correction_adjustments neighbor ON neighbor.supersedes_adjustment_id=current.id OR neighbor.id=current.supersedes_adjustment_id
),
requests AS MATERIALIZED (
  SELECT r.* FROM time_correction_requests r WHERE r.id IN(SELECT id FROM seed_requests)
    OR r.id IN(SELECT request_id FROM time_correction_adjustments WHERE id IN(SELECT id FROM connected))
    OR r.base_adjustment_id IN(SELECT id FROM connected)
  ORDER BY r.id LIMIT ${limits.requests + 1}
),
adjustments AS MATERIALIZED (
  SELECT a.* FROM time_correction_adjustments a WHERE a.id IN(SELECT id FROM connected) OR a.request_id IN(SELECT id FROM requests)
  ORDER BY a.id LIMIT ${limits.adjustments + 1}
),
events AS MATERIALIZED (
  SELECT e.* FROM time_correction_events e WHERE e.request_id IN(SELECT id FROM requests)
  ORDER BY e.request_id,e.revision LIMIT ${limits.events + 1}
),
location_ids AS (
  SELECT location_id AS id FROM selected_entries
  UNION SELECT location_id FROM requests UNION SELECT location_id FROM adjustments
  UNION SELECT source_snapshot->>'locationId' FROM requests WHERE source_snapshot ? 'locationId'
  UNION SELECT source_snapshot->>'locationId' FROM adjustments WHERE source_snapshot ? 'locationId'
  UNION SELECT t.location_id FROM requests r JOIN time_entries t ON t.id=r.time_entry_id
  UNION SELECT item->>'locationId' FROM cards c CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c.snapshot->'entries','[]'::jsonb)) item
),
locations_capture AS MATERIALIZED (
  SELECT i.id,l.workspace_id FROM location_ids i LEFT JOIN locations l ON l.id=i.id ORDER BY i.id LIMIT ${limits.locations + 1}
)
SELECT jsonb_build_object(
  'observedAt',clock_timestamp()::text,
  'limitExceeded',(SELECT count(*) FROM selected_entries)>${limits.entries} OR (SELECT count(*) FROM selected_breaks)>${limits.breaks}
    OR (SELECT count(*) FROM requests)>${limits.requests} OR (SELECT count(*) FROM adjustments)>${limits.adjustments}
    OR (SELECT count(*) FROM events)>${limits.events} OR (SELECT count(*) FROM locations_capture)>${limits.locations},
  'workspace',(SELECT jsonb_build_object('id',id,'timeZone',time_zone,'active',active) FROM workspaces WHERE id=$1),
  'employee',(SELECT jsonb_build_object('id',id,'workspaceId',workspace_id) FROM identity),
  'cards',COALESCE((SELECT jsonb_agg(jsonb_build_object('period',jsonb_build_object('startDate',"startDate"::text,'endDate',"endDate"::text),
    'operationId',operation_id,'revision',revision,'action',action,'occurredAt',occurred_at::text,'approvalOccurredAt',approval_occurred_at::text,'actorEmployeeId',actor_employee_id,'sourceHash',source_hash,
    'approvalRevision',approval_revision,'approvalOperationId',approval_operation_id,'approvalSourceHash',approval_source_hash,'approvalActorEmployeeId',approval_actor,
    'snapshot',snapshot,'currentSource',current_source,'currentSourceHash',md5(current_source::text)) ORDER BY "startDate","endDate") FROM cards),'[]'::jsonb),
  'entries',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',COALESCE(v.time_entry_id,v.adjustment_id::text),'employeeId',v.employee_id,
    'locationId',v.location_id,'locationName',v.location_name,'positionId',v.schedule_context->'match'->>'positionId','positionName',v.schedule_context->'match'->>'positionName',
    'sourceKind',v.source_kind,'adjustmentId',v.adjustment_id,'recordedVersion',v.recorded_version,'status',v.status,
    'startAt',v.start_at::text,'endAt',v.end_at::text,'rawStartAt',v.clock_in_at::text,'rawEndAt',v.clock_out_at::text,
    'breaks',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',b.break_entry_id,'name',COALESCE(NULLIF(b.break_type_snapshot->>'name',''),'Recorded break'),
      'adjustmentId',b.adjustment_id,'recordedVersion',b.recorded_version,'classification',b.break_type_snapshot,
      'startAt',b.start_at::text,'endAt',b.end_at::text,'rawStartAt',b.break_start_at::text,'rawEndAt',b.break_end_at::text)
      ORDER BY b.start_at,b.break_entry_id) FROM selected_breaks b WHERE b.time_entry_id=v.time_entry_id),'[]'::jsonb))
    ORDER BY v.start_at,COALESCE(v.time_entry_id,v.adjustment_id::text)) FROM selected_entries v),'[]'::jsonb),
  'lineage',jsonb_build_object(
    'requests',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'workspaceId',workspace_id,'employeeId',employee_id,
      'requestedByEmployeeId',requested_by_employee_id,'kind',kind,'timeEntryId',time_entry_id,'breakEntryId',break_entry_id,'locationId',location_id,
      'sourceRevision',source_revision,'sourceSnapshot',source_snapshot,'baseAdjustmentId',base_adjustment_id,'proposal',proposal,
      'reason',reason,'requestHash',request_hash,'createdAt',created_at::text) ORDER BY id) FROM requests),'[]'::jsonb),
    'adjustments',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'requestId',request_id,'workspaceId',workspace_id,'employeeId',employee_id,
      'kind',kind,'timeEntryId',time_entry_id,'breakEntryId',break_entry_id,'locationId',location_id,'sourceRevision',source_revision,'sourceSnapshot',source_snapshot,
      'startAt',effective_start_at::text,'endAt',effective_end_at::text,'supersedesAdjustmentId',supersedes_adjustment_id,'createdByEmployeeId',created_by,
      'createdAt',created_at::text) ORDER BY id) FROM adjustments),'[]'::jsonb),
    'events',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'requestId',request_id,'revision',revision,'kind',event_kind,
      'actorEmployeeId',actor_employee_id,'operationHash',operation_hash,'decisionNote',decision_note,'adjustmentId',adjustment_id,'result',result,
      'occurredAt',occurred_at::text) ORDER BY request_id,revision) FROM events),'[]'::jsonb),
    'locations',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'workspaceId',workspace_id) ORDER BY id) FROM locations_capture),'[]'::jsonb)
  )) AS capture`,
    values: [r.workspaceId, r.employeeId, r.timeZone, JSON.stringify(r.contexts), JSON.stringify(r.coverage)] };
}
