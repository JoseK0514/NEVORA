import { parsePeriod } from "@/lib/timecards/project";
export type AdvisorMessage = { role: "user" | "assistant"; content: string };
export type AdvisorSource = { label: string; href: string; observedAt: string };
export type AdvisorProfile = { priorities: string; revision: number };
export type AdvisorAnswer = { text: string; sources: AdvisorSource[] } & import("./workflow-contracts").WorkflowEvidence;
export type AdvisorSnapshot = {
  state: "ready";
  connection: "available" | "unavailable";
  profile: AdvisorProfile;
  history: AdvisorMessage[];
  briefing: BriefingResult;
  attention?: import("./briefing-contracts").AttentionBriefing;
  authority: string;
  observedAt: string;
  validForMs: number;
};
export type AdvisorCommand =
  | { op: "inspect"; requestId: string; tool: Extract<ToolCall, { name: "attendance_payroll_review" }> | { name: "coverage_proposals"; args: { date: string } } }
  | { op: "ask"; requestId: string; message: string }
  | { op: "review_briefing"; requestId: string; issueId: string; fingerprint: string; expectedRevision: number; disposition: import("./briefing-contracts").AttentionDisposition }
  | {
      op: "save_priorities";
      requestId: string;
      expectedRevision: number;
      priorities: string;
    };
export type AdvisorErrorCode =
  | "disabled"
  | "unavailable"
  | "invalid"
  | "forbidden"
  | "conflict"
  | "busy"
  | "daily_limit"
  | "prior_attempt_failed"
  | "cancelled"
  | "limit"
  | "provider_failed";
export class AdvisorError extends Error {
  constructor(readonly code: AdvisorErrorCode) {
    super(code);
  }
}
export const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function parseCommand(v: unknown): AdvisorCommand {
  if (
    !record(v) ||
    typeof v.requestId !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      v.requestId,
    )
  )
    throw new AdvisorError("invalid");
  if (v.op === "inspect" && Object.keys(v).sort().join(",") === "op,requestId,tool" && record(v.tool) && Object.keys(v.tool).sort().join(",") === "args,name") {
    const tool = parseTool(v.tool.name, JSON.stringify(v.tool.args));
    if (tool.name === "attendance_payroll_review" || tool.name === "coverage_proposals") return { op: "inspect", requestId: v.requestId.toLowerCase(), tool };
    throw new AdvisorError("invalid");
  }
  if (
    v.op === "review_briefing" && Object.keys(v).sort().join(",") === "disposition,expectedRevision,fingerprint,issueId,op,requestId" &&
    typeof v.issueId === "string" && /^[a-f0-9]{64}$/.test(v.issueId) &&
    typeof v.fingerprint === "string" && /^[a-f0-9]{64}$/.test(v.fingerprint) &&
    Number.isSafeInteger(v.expectedRevision) && Number(v.expectedRevision) >= 0 && Number(v.expectedRevision) < 2147483647 &&
    (v.disposition === "tracking" || v.disposition === "deferred" || v.disposition === "dismissed")
  ) return { op: "review_briefing", requestId: v.requestId.toLowerCase(), issueId: v.issueId, fingerprint: v.fingerprint, expectedRevision: Number(v.expectedRevision), disposition: v.disposition };
  if (
    v.op === "ask" &&
    Object.keys(v).sort().join(",") === "message,op,requestId" &&
    typeof v.message === "string" &&
    v.message.trim().length > 0 &&
    v.message.length <= 2000
  )
    return {
      op: v.op,
      requestId: v.requestId.toLowerCase(),
      message: v.message,
    };
  if (
    v.op === "save_priorities" &&
    Object.keys(v).sort().join(",") ===
      "expectedRevision,op,priorities,requestId" &&
    typeof v.priorities === "string" &&
    v.priorities.length <= 2000 &&
    Number.isSafeInteger(v.expectedRevision) &&
    Number(v.expectedRevision) >= 0 &&
    Number(v.expectedRevision) < 2147483647
  )
    return {
      op: v.op,
      requestId: v.requestId.toLowerCase(),
      priorities: v.priorities,
      expectedRevision: Number(v.expectedRevision),
    };
  throw new AdvisorError("invalid");
}
export type ToolCall =
  | { name: "attendance_payroll_review"; args: { startDate: string; endDate: string; language: "en" | "es" } }
  | { name: "coverage_proposals"; args: { date: string } }
  | { name: "company_briefing"; args: Record<string, never> }
  | {
      name: "published_staffing" | "coverage_investigation";
      args: { date: string };
    };
export type ToolResult = import("./workflow-contracts").WorkflowEvidence & {
  observedAt: string;
  sources: AdvisorSource[];
  partial: boolean;
  data: unknown;
};
export function parseTool(name: unknown, args: unknown): ToolCall {
  if (typeof args !== "string" || args.length > 1024)
    throw new AdvisorError("invalid");
  let v: unknown;
  try {
    v = JSON.parse(args);
  } catch {
    throw new AdvisorError("invalid");
  }
  if (!record(v)) throw new AdvisorError("invalid");
  if (name === "attendance_payroll_review" && Object.keys(v).sort().join(",") === "endDate,language,startDate" && typeof v.startDate === "string" && typeof v.endDate === "string" && /^20/.test(v.startDate) && /^20/.test(v.endDate) && (v.language === "en" || v.language === "es")) {
    try { return { name, args: { ...parsePeriod(v.startDate, v.endDate), language: v.language } }; }
    catch { throw new AdvisorError("invalid"); }
  }
  if (name === "company_briefing" && Object.keys(v).length === 0)
    return { name, args: {} };
  if (
    (name === "published_staffing" || name === "coverage_investigation" || name === "coverage_proposals") &&
    Object.keys(v).join(",") === "date" &&
    typeof v.date === "string" &&
    /^20\d\d-\d\d-\d\d$/.test(v.date) &&
    Number.isFinite(Date.parse(v.date)) &&
    new Date(v.date).toISOString().slice(0, 10) === v.date
  )
    return { name, args: { date: v.date } };
  throw new AdvisorError("invalid");
}

export type BriefingData = {
  companyName: string;
  timeZone: string;
  date: string;
  publication: "PUBLISHED";
  counts: {
    scheduled: number;
    clockedIn: number;
    late: number;
    notClockedIn: number;
  };
  shifts: {
    employeeName: string;
    locationName: string;
    positionName: string | null;
    startAt: string;
    endAt: string;
    status: string;
  }[];
};
export type BriefingResult = Omit<ToolResult, "data"> & {
  data: BriefingData | null;
};
