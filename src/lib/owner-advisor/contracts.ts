import { parsePeriod } from "@/lib/timecards/project";
import { parseTaskFocus, type TaskFocus, NotebookError, notebookId, notebookRevision, parseNotebookCommand } from "./notebook";
import { MemoryError, parseMemoryCommand } from "./memory";
import { parseCoverageAction } from "./coverage-actions";
export const ADVISOR_MAX_TOOL_CALLS = 8;
export const ADVISOR_MAX_ANSWER_SOURCES = 1 + (ADVISOR_MAX_TOOL_CALLS - 1) * 2;
export type AdvisorMessage = { role: "user" | "assistant"; content: string };
export type AdvisorSource = { label: string; href: string; observedAt: string };
export type AdvisorProfile = { priorities: string; revision: number };
export type DecisionContext = { objective: string; focus: TaskFocus };
export type AdvisorAnswer = { decision?: DecisionContext; text: string; sources: AdvisorSource[]; context?: { notebookRevision: number | null; memoryRevision?: number | null; profileRevision?: number; taskId: string | null } } & import("./workflow-contracts").WorkflowEvidence;
export type AdvisorSnapshot = {
  state: "ready";
  connection: "available" | "unavailable";
  profile: AdvisorProfile;
  history: AdvisorMessage[];
  briefing: BriefingResult;
  attention?: import("./briefing-contracts").AttentionBriefing;
  memory?: import("./memory").MemoryRead;
  notebook?: import("./notebook").NotebookRead;
  authority: string;
  observedAt: string;
  validForMs: number;
};
export type AdvisorCommand =
  | import("./coverage-actions").CoverageActionCommand
  | import("./memory").MemoryCommand
  | import("./notebook").NotebookCommand
  | { op: "ask_task"; requestId: string; taskId: string; expectedNotebookRevision: number; message: string }
  | { op: "inspect"; requestId: string; tool: Extract<ToolCall, { name: "attendance_payroll_review" | "coverage_proposals" | "coverage_plan" }> }
  | ({ op: "ask_decision"; requestId: string; message: string } & DecisionContext)
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
  if (["prepare_coverage_draft", "apply_coverage_draft", "check_coverage_draft"].includes(String(v.op))) {
    try { return parseCoverageAction(v); } catch { throw new AdvisorError("invalid"); }
  }
  if (v.op === "memory") {
    try { return parseMemoryCommand(v); } catch (error) { if (error instanceof MemoryError) throw new AdvisorError(error.code); throw error; }
  }
  if (v.op === "notebook") {
    try { return parseNotebookCommand(v); }
    catch (error) { if (error instanceof NotebookError) throw new AdvisorError(error.code); throw error; }
  }
  if (v.op === "ask_decision" && Object.keys(v).sort().join(",") === "focus,message,objective,op,requestId" && typeof v.message === "string" && !!v.message.trim() && v.message.length <= 2000 && typeof v.objective === "string" && !!v.objective.trim() && v.objective.length <= 1000) {
    try { return { op: "ask_decision", requestId: v.requestId.toLowerCase(), message: v.message, objective: v.objective, focus: parseTaskFocus(v.focus) }; }
    catch { throw new AdvisorError("invalid"); }
  }
  if (v.op === "ask_task" && Object.keys(v).sort().join(",") === "expectedNotebookRevision,message,op,requestId,taskId" && typeof v.taskId === "string" && notebookId(v.taskId.toLowerCase()) && notebookRevision(v.expectedNotebookRevision) && typeof v.message === "string" && v.message.trim().length > 0 && v.message.length <= 2000) return { op: "ask_task", requestId: v.requestId.toLowerCase(), taskId: v.taskId.toLowerCase(), expectedNotebookRevision: v.expectedNotebookRevision, message: v.message };
  if (v.op === "inspect" && Object.keys(v).sort().join(",") === "op,requestId,tool" && record(v.tool) && Object.keys(v.tool).sort().join(",") === "args,name") {
    const tool = parseTool(v.tool.name, JSON.stringify(v.tool.args));
    if (tool.name === "attendance_payroll_review" || tool.name === "coverage_proposals" || tool.name === "coverage_plan") return { op: "inspect", requestId: v.requestId.toLowerCase(), tool };
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
  | { name: "coverage_plan"; args: { date: string } }
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
    (name === "published_staffing" || name === "coverage_investigation" || name === "coverage_proposals" || name === "coverage_plan") &&
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
