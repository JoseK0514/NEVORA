import { notebookId, notebookRevision, parseNotebookCommand, type TaskFocus } from "./notebook";
import type { CoverageDraftProgress } from "./coverage-actions";
export type MemoryIntent = {
    id: string;
    kind: "preference" | "owner_constraint";
    text: string;
    focus: TaskFocus;
    effectiveDate: string;
    expiryDate: string;
    source: "explicit_owner";
    createdAt: string;
    updatedAt: string;
};
export type DecisionOutcome = {
    kind: "owner_reported";
    text: string;
    reportedAt: string;
} | {
    kind: "coverage_checked";
    reviewId: string;
    progress: CoverageDraftProgress;
};
export type MemoryDecision = {
    id: string;
    summary: string;
    course: string;
    reason: string;
    focus: TaskFocus;
    decisionDate: string;
    expiryDate: string;
    source: "explicit_owner";
    createdAt: string;
    updatedAt: string;
    outcome: DecisionOutcome | null;
};
export type OwnerMemory = {
    revision: number;
    intents: MemoryIntent[];
    decisions: MemoryDecision[];
};
export type MemoryRead = {
    state: "ready";
    memory: OwnerMemory;
} | {
    state: "unavailable";
};
export type MemoryChange = {
    kind: "save_intent";
    intentId: string;
    kindOfIntent: MemoryIntent["kind"];
    text: string;
    focus: TaskFocus;
    effectiveDate: string;
    expiryDate: string;
} | {
    kind: "delete_intent";
    intentId: string;
} | {
    kind: "save_decision";
    decisionId: string;
    summary: string;
    course: string;
    reason: string;
    focus: TaskFocus;
    decisionDate: string;
    expiryDate: string;
} | {
    kind: "delete_decision";
    decisionId: string;
} | {
    kind: "report_outcome";
    decisionId: string;
    text: string;
} | {
    kind: "check_outcome";
    decisionId: string;
    reviewId: string;
};
export type MemoryEdit = {
    expectedRevision: number;
    change: MemoryChange;
};
export type MemoryCommand = MemoryEdit & {
    op: "memory";
    requestId: string;
};
export class MemoryError extends Error {
    constructor(readonly code: "invalid" | "conflict" | "limit") { super(code); }
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function shape(v: unknown, names: string): asserts v is Record<string, unknown> { if (!object(v) || Object.keys(v).sort().join(",") !== names.split(" ").sort().join(","))
    throw new MemoryError("invalid"); }
function id(v: unknown): string { if (typeof v !== "string" || !notebookId(v.toLowerCase()))
    throw new MemoryError("invalid"); return v.toLowerCase(); }
function text(v: unknown): string { if (typeof v !== "string" || !v.trim() || v.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v))
    throw new MemoryError("invalid"); return v; }
function day(v: unknown): string { if (typeof v !== "string" || !/^20\d\d-\d\d-\d\d$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0, 10) !== v)
    throw new MemoryError("invalid"); return v; }
function stamp(v: unknown): string { if (typeof v !== "string" || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString() !== v)
    throw new MemoryError("invalid"); return v; }
function focus(v: unknown): TaskFocus {
    // Reuse the existing strict general/coverage/1–31-day period contract.
    try {
        const c = parseNotebookCommand({ op: "notebook", requestId: "00000000-0000-0000-0000-000000000000", expectedRevision: 0, change: { kind: "save_task", taskId: "00000000-0000-0000-0000-000000000000", objective: "scope", notes: "", state: "open", focus: v } });
        if (c.change.kind === "save_task")
            return c.change.focus;
    }
    catch { /* invalid */ }
    throw new MemoryError("invalid");
}
function interval(start: unknown, end: unknown) { const a = day(start), b = day(end); if (a > b || Date.parse(b) - Date.parse(a) > 364 * 86400000)
    throw new MemoryError("invalid"); return [a, b]; }
function change(v: unknown): MemoryChange {
    if (!object(v))
        throw new MemoryError("invalid");
    if (v.kind === "save_intent") {
        shape(v, "kind intentId kindOfIntent text focus effectiveDate expiryDate");
        if (v.kindOfIntent !== "preference" && v.kindOfIntent !== "owner_constraint")
            throw new MemoryError("invalid");
        const [effectiveDate, expiryDate] = interval(v.effectiveDate, v.expiryDate);
        return { kind: v.kind, intentId: id(v.intentId), kindOfIntent: v.kindOfIntent, text: text(v.text), focus: focus(v.focus), effectiveDate, expiryDate };
    }
    if (v.kind === "save_decision") {
        shape(v, "kind decisionId summary course reason focus decisionDate expiryDate");
        const [decisionDate, expiryDate] = interval(v.decisionDate, v.expiryDate);
        return { kind: v.kind, decisionId: id(v.decisionId), summary: text(v.summary), course: text(v.course), reason: text(v.reason), focus: focus(v.focus), decisionDate, expiryDate };
    }
    if (v.kind === "delete_intent") {
        shape(v, "kind intentId");
        return { kind: v.kind, intentId: id(v.intentId) };
    }
    if (v.kind === "delete_decision") {
        shape(v, "kind decisionId");
        return { kind: v.kind, decisionId: id(v.decisionId) };
    }
    if (v.kind === "report_outcome") {
        shape(v, "kind decisionId text");
        return { kind: v.kind, decisionId: id(v.decisionId), text: text(v.text) };
    }
    if (v.kind === "check_outcome") {
        shape(v, "kind decisionId reviewId");
        return { kind: v.kind, decisionId: id(v.decisionId), reviewId: id(v.reviewId) };
    }
    throw new MemoryError("invalid");
}
export function parseMemoryCommand(v: unknown): MemoryCommand { shape(v, "op requestId expectedRevision change"); if (v.op !== "memory" || !notebookRevision(v.expectedRevision) || v.expectedRevision === 2147483647)
    throw new MemoryError("invalid"); return { op: "memory", requestId: id(v.requestId), expectedRevision: v.expectedRevision, change: change(v.change) }; }
export const emptyMemory = (): OwnerMemory => ({ revision: 0, intents: [], decisions: [] });
function outcome(v: unknown): DecisionOutcome | null {
    if (v === null)
        return null;
    if (object(v) && v.kind === "owner_reported") {
        shape(v, "kind text reportedAt");
        return { kind: v.kind, text: text(v.text), reportedAt: stamp(v.reportedAt) };
    }
    shape(v, "kind reviewId progress");
    if (v.kind !== "coverage_checked")
        throw new MemoryError("invalid");
    id(v.reviewId);
    const p = v.progress;
    shape(p, "state observedAt timeZone assignmentsPresent assignmentsTotal publishedAssignments coverage scopeComplete");
    if (!["current", "changed", "unavailable"].includes(String(p.state)) || typeof p.scopeComplete !== "boolean" || typeof p.timeZone !== "string" || p.timeZone.length > 100)
        throw new MemoryError("invalid");
    if (typeof p.observedAt !== "string" || p.observedAt.length > 50 || !/^\d{4}-\d{2}-\d{2}T/.test(p.observedAt) || !Number.isFinite(Date.parse(p.observedAt)))
        throw new MemoryError("invalid");
    try {
        new Intl.DateTimeFormat("en", { timeZone: p.timeZone });
    }
    catch {
        throw new MemoryError("invalid");
    }
    for (const n of [p.assignmentsPresent, p.assignmentsTotal, p.publishedAssignments])
        if (!Number.isSafeInteger(n) || Number(n) < 0 || Number(n) > 12)
            throw new MemoryError("invalid");
    if (Number(p.publishedAssignments) > Number(p.assignmentsPresent) || Number(p.assignmentsPresent) > Number(p.assignmentsTotal) || p.state === "current" && p.assignmentsPresent !== p.assignmentsTotal)
        throw new MemoryError("invalid");
    if (p.state === "unavailable") {
        if (p.coverage !== null || p.scopeComplete || p.assignmentsPresent !== 0 || p.publishedAssignments !== 0)
            throw new MemoryError("invalid");
    }
    else {
        shape(p.coverage, "requiredMinutes coveredMinutes requiredObligationMinutes fulfilledObligationMinutes remainingBlocks");
        if (!Object.values(p.coverage).every(n => Number.isSafeInteger(n) && Number(n) >= 0 && Number(n) <= 1e9) || Number(p.coverage.coveredMinutes) > Number(p.coverage.requiredMinutes) || Number(p.coverage.fulfilledObligationMinutes) > Number(p.coverage.requiredObligationMinutes))
            throw new MemoryError("invalid");
    }
    return v as DecisionOutcome;
}
function metadata(v: Record<string, unknown>, start: string) {
    const createdAt = stamp(v.createdAt), updatedAt = stamp(v.updatedAt), expiryDate = day(v.expiryDate);
    if (v.source !== "explicit_owner" || updatedAt < createdAt || expiryDate < start || Date.parse(expiryDate) - Date.parse(createdAt.slice(0, 10)) > 364 * 86400000)
        throw new MemoryError("invalid");
    return { source: "explicit_owner" as const, createdAt, updatedAt, expiryDate };
}
export function parseMemory(v: unknown): OwnerMemory {
    shape(v, "revision intents decisions");
    if (!notebookRevision(v.revision) || !Array.isArray(v.intents) || !Array.isArray(v.decisions) || v.intents.length > 12 || v.decisions.length > 20)
        throw new MemoryError("invalid");
    const intents = v.intents.map((i): MemoryIntent => { shape(i, "id kind text focus effectiveDate expiryDate source createdAt updatedAt"); if (i.kind !== "preference" && i.kind !== "owner_constraint")
        throw new MemoryError("invalid"); const effectiveDate = day(i.effectiveDate); return { id: id(i.id), kind: i.kind, text: text(i.text), focus: focus(i.focus), effectiveDate, ...metadata(i, effectiveDate) }; });
    const decisions = v.decisions.map((d): MemoryDecision => { shape(d, "id summary course reason focus decisionDate expiryDate source createdAt updatedAt outcome"); const decisionDate = day(d.decisionDate); return { id: id(d.id), summary: text(d.summary), course: text(d.course), reason: text(d.reason), focus: focus(d.focus), decisionDate, ...metadata(d, decisionDate), outcome: outcome(d.outcome) }; });
    if (new Set([...intents, ...decisions].map(i => i.id)).size !== intents.length + decisions.length)
        throw new MemoryError("invalid");
    const memory = { revision: v.revision, intents, decisions };
    if (new TextEncoder().encode(JSON.stringify(memory)).byteLength > 131072)
        throw new MemoryError("limit");
    return memory;
}
export const memoryDay = (now: string, timeZone = "UTC") => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
const retained = (r: {
    expiryDate: string;
    createdAt: string;
}, now: string, timeZone: string) => r.expiryDate >= memoryDay(now, timeZone) && Date.parse(now) < Date.parse(r.createdAt) + 365 * 86400000;
export function purgeMemory(memory: OwnerMemory, now: string, timeZone = "UTC"): OwnerMemory { stamp(now); return { ...memory, intents: memory.intents.filter(i => retained(i, now, timeZone)), decisions: memory.decisions.filter(d => retained(d, now, timeZone)) }; }
export function applyMemoryCommand(current: OwnerMemory, command: MemoryCommand, now: string, checked?: CoverageDraftProgress, timeZone = "UTC"): OwnerMemory {
    if (current.revision !== command.expectedRevision)
        throw new MemoryError("conflict");
    if (current.revision >= 2147483647)
        throw new MemoryError("limit");
    const next = purgeMemory(current, now, timeZone);
    next.revision++;
    const c = command.change;
    if (c.kind === "save_intent") {
        const old = next.intents.find(i => i.id === c.intentId);
        if (!old && next.intents.length >= 12)
            throw new MemoryError("limit");
        const item: MemoryIntent = { id: c.intentId, kind: c.kindOfIntent, text: c.text, focus: c.focus, effectiveDate: c.effectiveDate, expiryDate: c.expiryDate, source: "explicit_owner", createdAt: old?.createdAt ?? now, updatedAt: now };
        next.intents = [...next.intents.filter(i => i.id !== c.intentId), item];
    }
    else if (c.kind === "delete_intent") {
        if (!next.intents.some(i => i.id === c.intentId))
            throw new MemoryError("conflict");
        next.intents = next.intents.filter(i => i.id !== c.intentId);
    }
    else if (c.kind === "save_decision") {
        const old = next.decisions.find(d => d.id === c.decisionId);
        if (!old && next.decisions.length >= 20)
            throw new MemoryError("limit");
        const item: MemoryDecision = { id: c.decisionId, summary: c.summary, course: c.course, reason: c.reason, focus: c.focus, decisionDate: c.decisionDate, expiryDate: c.expiryDate, source: "explicit_owner", createdAt: old?.createdAt ?? now, updatedAt: now, outcome: null };
        next.decisions = [...next.decisions.filter(d => d.id !== c.decisionId), item];
    }
    else {
        const old = next.decisions.find(d => d.id === c.decisionId);
        if (!old)
            throw new MemoryError("conflict");
        if (c.kind === "delete_decision")
            next.decisions = next.decisions.filter(d => d.id !== c.decisionId);
        else {
            if (c.kind === "check_outcome" && !checked)
                throw new MemoryError("invalid");
            next.decisions = next.decisions.map(d => d.id === c.decisionId ? { ...d, updatedAt: now, outcome: c.kind === "report_outcome" ? { kind: "owner_reported", text: c.text, reportedAt: now } : { kind: "coverage_checked", reviewId: c.reviewId, progress: checked! } } : d);
        }
    }
    return parseMemory(next);
}
function relevant(saved: TaskFocus, requested: TaskFocus): boolean {
    if (saved.kind === "general")
        return true;
    if (saved.kind === "coverage")
        return requested.kind === "coverage" && saved.date === requested.date;
    return requested.kind === "period" && saved.startDate === requested.startDate && saved.endDate === requested.endDate;
}
/** Explicit intent and historical choices only; never evidence or legal authority. */
export function ownerMemoryContext(memory: OwnerMemory, now: string, scope: TaskFocus = { kind: "general" }, timeZone = "UTC") {
    const active = purgeMemory(memory, now, timeZone), today = memoryDay(now, timeZone);
    const start = scope.kind === "coverage" ? scope.date : scope.kind === "period" ? scope.startDate : today;
    const end = scope.kind === "period" ? scope.endDate : start;
    const intents = active.intents.filter(i => i.effectiveDate <= end && i.expiryDate >= start && relevant(i.focus, scope)).map(i => ({
        ...i, applicableStartDate: i.effectiveDate > start ? i.effectiveDate : start, applicableEndDate: i.expiryDate < end ? i.expiryDate : end,
    }));
    const exact = (saved: TaskFocus) => saved.kind === scope.kind && relevant(saved, scope);
    const candidates = active.decisions.filter(d => d.decisionDate <= today && (scope.kind === "general" || d.focus.kind === "general" || d.focus.kind === scope.kind))
        .sort((a, b) => Number(exact(b.focus)) - Number(exact(a.focus)) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
        .map(d => ({ ...d, contextKind: "historical_example" as const, scopeMatch: exact(d.focus) ? "exact" as const : "comparable" as const }));
    const context = { revision: memory.revision, intents, decisions: [] as typeof candidates, omittedDecisions: candidates.length };
    // Preserve every applicable explicit constraint. Only historical decisions are
    // omitted, visibly, to leave the existing provider body budget unchanged.
    for (const d of candidates) {
        const next = { ...context, decisions: [...context.decisions, d], omittedDecisions: context.omittedDecisions - 1 };
        if (JSON.stringify(next).length > 32768)
            break;
        context.decisions = next.decisions;
        context.omittedDecisions = next.omittedDecisions;
    }
    return context;
}
export type OwnerMemoryContext = ReturnType<typeof ownerMemoryContext>;
