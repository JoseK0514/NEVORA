import {
  record,
  type AdvisorSnapshot,
  type AdvisorAnswer,
  type AdvisorProfile,
} from "@/lib/owner-advisor/contracts";
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
function sources(v: unknown) {
  requireValue(Array.isArray(v) && v.length <= 8);
  for (const s of v) {
    requireValue(
      record(s) &&
        text(s.label, 300) &&
        date(s.observedAt) &&
        typeof s.href === "string" &&
        (/^\/app$/.test(s.href) ||
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
  sources(value.answer.sources);
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
