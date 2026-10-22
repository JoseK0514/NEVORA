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
