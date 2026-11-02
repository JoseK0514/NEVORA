import { parseOperationalInsights } from "@/lib/owner-advisor/operational-insights";
import { parseLegalResearch } from "@/lib/owner-advisor/legal-research";
import { parseMemory } from "@/lib/owner-advisor/memory";
import {
  record,
  ADVISOR_MAX_ANSWER_SOURCES,
  type AdvisorSnapshot,
  type AdvisorAnswer,
  type AdvisorProfile,
} from "@/lib/owner-advisor/contracts";
import { parseTaskFocus, notebookId, notebookRevision, parseNotebook } from "@/lib/owner-advisor/notebook";
import { parseCoveragePlans } from "./public-coverage-plans";
function requireValue(value: unknown): asserts value {
  if (!value) throw Error("Invalid advisor response");
}
const text = (v: unknown, max = 12000) =>
  typeof v === "string" && v.length <= max;
const date = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
function stamp(v: Record<string, unknown>) {
  requireValue(
    text(v.authority, 512) &&
      v.authority &&
      date(v.observedAt) &&
      typeof v.validForMs === "number" &&
      v.validForMs > 0 &&
      v.validForMs <= 15000,
  );
}
export function profile(v: unknown): asserts v is AdvisorProfile {
  requireValue(record(v) && text(v.priorities, 2000) && count(v.revision));
}
function sources(v: unknown, maximum = 8) {
  requireValue(Array.isArray(v) && v.length <= maximum);
  for (const s of v) {
    requireValue(
      record(s) &&
        text(s.label, 300) &&
        date(s.observedAt) &&
        typeof s.href === "string" &&
        (/^\/app$/.test(s.href) ||
          /^\/app\/payroll$/.test(s.href) || /^\/app\/timecards\?start=20\d\d-\d\d-\d\d&end=20\d\d-\d\d-\d\d$/.test(s.href) ||
          (/^\/app\/schedule\?week=20\d\d-\d\d-\d\d$/.test(s.href) &&
            date(s.href.slice(-10)))),
    );
  }
}
export function parseSnapshot(value: unknown): AdvisorSnapshot {
  requireValue(
    record(value) &&
      value.state === "ready" &&
      (value.connection === "available" || value.connection === "unavailable"),
  );
  stamp(value);
  profile(value.profile);
  if (value.operationalInsights !== undefined) parseOperationalInsights(value.operationalInsights);
  if (value.memory !== undefined) {
    const m = value.memory;
    requireValue(record(m) && (m.state === "ready" || m.state === "unavailable"));
    requireValue(Object.keys(m).sort().join(",") === (m.state === "ready" ? "memory,state" : "state"));
    if (m.state === "ready") parseMemory(m.memory);
  }
  if (value.notebook !== undefined) {
    const n = value.notebook;
    requireValue(record(n) && (n.state === "ready" || n.state === "unavailable"));
    requireValue(Object.keys(n).sort().join(",") === (n.state === "ready" ? "notebook,state" : "state"));
    if (n.state === "ready") parseNotebook(n.notebook);
  }
  requireValue(Array.isArray(value.history) && value.history.length <= 12);
  for (const m of value.history)
    requireValue(
      record(m) &&
        (m.role === "user" || m.role === "assistant") &&
        text(m.content),
    );
  const b = value.briefing;
  requireValue(
    record(b) && date(b.observedAt) && typeof b.partial === "boolean",
  );
  sources(b.sources);
  if (value.attention !== undefined) {
    const a = value.attention;
    const hash = (v: unknown) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
    const kind = (v: unknown) => ["clock_in", "coverage", "missing_punches", "setup"].includes(String(v));
    const disposition = (v: unknown) => ["tracking", "deferred", "dismissed"].includes(String(v));
    const day = (v: unknown) => typeof v === "string" && /^20\d\d-\d\d-\d\d$/.test(v) && date(v) && new Date(v).toISOString().slice(0, 10) === v;
    requireValue(record(a) && ["ready", "unavailable"].includes(String(a.state)) &&
      (a.date === null || day(a.date)) && date(a.observedAt) && typeof a.partial === "boolean" && count(a.total) && count(a.hidden) && Number(a.hidden) <= Number(a.total) &&
      Array.isArray(a.items) && a.items.length <= 3 && Array.isArray(a.reviewed) && a.reviewed.length <= 50);
    sources(a.sources);
    for (const i of a.items) {
      requireValue(record(i) && hash(i.id) && hash(i.fingerprint) && kind(i.kind) && text(i.locationId, 400) && text(i.locationName, 200) && day(i.date) && text(i.title, 300) && text(i.detail, 2000) &&
        ["Published shifts and recorded punches", "Current planning ledger, including drafts"].includes(String(i.basis)) && count(i.reviewRevision) &&
        (i.disposition === null || disposition(i.disposition)) && (i.deferredUntil === null || date(i.deferredUntil)));
      sources([i.source]);
    }
    requireValue(new Set(a.items.map(i => i.id)).size === a.items.length);
    for (const r of a.reviewed) requireValue(record(r) && hash(r.id) && (r.fingerprint === null || hash(r.fingerprint)) && kind(r.kind) && day(r.date) && text(r.locationName, 200) && text(r.title, 300) &&
      ["open", "resolved", "not_current", "unverified"].includes(String(r.state)) && disposition(r.disposition) && (r.deferredUntil === null || date(r.deferredUntil)) && count(r.reviewRevision) && typeof r.evidenceChanged === "boolean");
  }
  if (b.data !== null) {
    const d = b.data;
    requireValue(
      record(d) &&
        text(d.companyName, 500) &&
        text(d.timeZone, 100) &&
        date(d.date) &&
        d.publication === "PUBLISHED" &&
        record(d.counts) &&
        ["scheduled", "clockedIn", "late", "notClockedIn"].every((k) =>
          count(d.counts && (d.counts as Record<string, unknown>)[k]),
        ) &&
        Array.isArray(d.shifts) &&
        d.shifts.length <= 100,
    );
    for (const s of d.shifts)
      requireValue(
        record(s) &&
          text(s.employeeName, 500) &&
          text(s.locationName, 500) &&
          (s.positionName === null || text(s.positionName, 500)) &&
          date(s.startAt) &&
          date(s.endAt) &&
          text(s.status, 100),
      );
  }
  return value as AdvisorSnapshot;
}
export type AnswerResponse = {
  state: "answered";
  answer: AdvisorAnswer;
  authority: string;
  observedAt: string;
  validForMs: number;
};
export function parseAnswer(value: unknown): AnswerResponse {
  requireValue(
    record(value) &&
      value.state === "answered" &&
      record(value.answer) &&
      text(value.answer.text),
  );
  stamp(value);
  sources(value.answer.sources, ADVISOR_MAX_ANSWER_SOURCES);
  const a = value.answer;
  if (a.legalResearch !== undefined) parseLegalResearch(a.legalResearch);
  if (a.coveragePlans !== undefined) parseCoveragePlans(a.coveragePlans);
  if (a.decision !== undefined) {
    const d = a.decision;
    requireValue(record(d) && Object.keys(d).sort().join(",") === "focus,objective" && text(d.objective, 1000) && typeof d.objective === "string" && !!d.objective.trim());
    parseTaskFocus(d.focus);
  }
  if (a.context !== undefined) {
    const c = a.context;
    requireValue(record(c) && Object.keys(c).every(k => ["notebookRevision", "memoryRevision", "profileRevision", "taskId"].includes(k)) &&
      (c.memoryRevision === undefined || c.memoryRevision === null || notebookRevision(c.memoryRevision)) &&
      (c.profileRevision === undefined || notebookRevision(c.profileRevision)) &&
      (c.notebookRevision === null || notebookRevision(c.notebookRevision)) &&
      (c.taskId === null || notebookId(c.taskId) && c.notebookRevision !== null));
  }
  if (a.proposals !== undefined) {
    requireValue(Array.isArray(a.proposals) && a.proposals.length <= 3);
    for (const p of a.proposals) requireValue(record(p) && text(p.employeeName, 200) && text(p.locationId, 400) && text(p.locationName, 200) &&
      typeof p.date === "string" && /^20\d\d-\d\d-\d\d$/.test(p.date) && date(p.date) &&
      typeof p.startTime === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(p.startTime) && typeof p.endTime === "string" && /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/.test(p.endTime) &&
      (p.positionName === null || text(p.positionName, 200)) && typeof p.isDesignatedLead === "boolean" &&
      typeof p.scheduledHours === "number" && Number.isFinite(p.scheduledHours) && p.scheduledHours >= 0 && (p.targetHours === null || typeof p.targetHours === "number" && Number.isFinite(p.targetHours) && p.targetHours >= 0) &&
      ["DRAFT", "PUBLISHED"].includes(String(p.publication)) && typeof p.review === "string" && p.review.length > 0 && p.review.length <= 16384 && /^[A-Za-z0-9_-]+$/.test(p.review));
  }
  if (a.periodReview !== undefined) {
    const p = a.periodReview;
    requireValue(record(p) && date(p.startDate) && date(p.endDate) && date(p.observedAt) && ["en", "es"].includes(String(p.language)) && p.readiness === "unverified" && typeof p.partial === "boolean" &&
      record(p.attendance) && ["ready", "unavailable"].includes(String(p.attendance.state)) && count(p.attendance.total) && Array.isArray(p.attendance.employees) && p.attendance.employees.length <= 100 &&
      record(p.payroll) && ["ready", "disabled", "unavailable"].includes(String(p.payroll.state)) && Array.isArray(p.payroll.runs) && p.payroll.runs.length <= 10);
    for (const c of p.attendance.employees) requireValue(record(c) && text(c.name, 200) && ["DRAFT", "APPROVED", "FINALIZED", "REOPENED", "NEEDS_REVIEW"].includes(String(c.state)) && count(c.revision) && typeof c.historical === "boolean" &&
      Array.isArray(c.locations) && c.locations.length <= 20 && c.locations.every(l => text(l, 200)) && Array.isArray(c.issues) && c.issues.length <= 10 && c.issues.every(i => typeof i === "string" && /^[a-z_]+$/.test(i)));
    for (const r of p.payroll.runs) requireValue(record(r) && typeof r.id === "string" && /^[a-f0-9-]{36}$/i.test(r.id) && count(r.revision) && date(r.startDate) && date(r.endDate) &&
      ["WAITING_FOR_AMOUNTS", "BLOCKED", "REVIEW_REQUIRED", "APPROVED"].includes(String(r.status)) && (r.ruleRevision === null || count(r.ruleRevision)) && typeof r.superseded === "boolean" && typeof r.coverageComplete === "boolean" &&
      Array.isArray(r.codes) && r.codes.length <= 20 && r.codes.every(c => typeof c === "string" && /^[A-Z_]+$/.test(c)));
  }
  return value as AnswerResponse;
}
export function parseSaved(value: unknown): {
  state: "saved";
  profile: AdvisorProfile;
  authority: string;
  observedAt: string;
  validForMs: number;
} {
  requireValue(record(value) && value.state === "saved");
  stamp(value);
  profile(value.profile);
  return value as ReturnType<typeof parseSaved>;
}
export function parseBriefingReviewed(value: unknown): {
  state: "briefing_reviewed"; revision: number; authority: string; observedAt: string; validForMs: number;
} {
  requireValue(record(value) && value.state === "briefing_reviewed" && count(value.revision) && Number(value.revision) > 0);
  stamp(value);
  return value as ReturnType<typeof parseBriefingReviewed>;
}
export function parseNotebookSaved(value: unknown): {
  state: "notebook_saved"; revision: number; authority: string; observedAt: string; validForMs: number;
} {
  requireValue(record(value) && value.state === "notebook_saved" && notebookRevision(value.revision) && value.revision > 0);
  stamp(value);
  return value as ReturnType<typeof parseNotebookSaved>;
}

export function parseMemorySaved(value: unknown) {
  requireValue(record(value) && value.state === "memory_saved" && notebookRevision(value.revision));
  stamp(value);
  return value as { state: "memory_saved"; revision: number; authority: string; observedAt: string; validForMs: number };
}
