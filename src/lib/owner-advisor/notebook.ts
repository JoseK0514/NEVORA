import { parsePeriod } from "@/lib/timecards/project";

// Private, explicit Owner intent. Saved text is never a current business fact or
// authority to change company records. No model output writes this notebook.
export type TaskFocus =
  | { kind: "general" }
  | { kind: "coverage"; date: string }
  | { kind: "period"; startDate: string; endDate: string };
export type OwnerGoal = { id: string; text: string; updatedAt: string };
export type OwnerTask = {
  id: string; objective: string; notes: string; state: "open" | "closed";
  focus: TaskFocus; updatedAt: string;
};
export type OwnerNotebook = { revision: number; goals: OwnerGoal[]; tasks: OwnerTask[] };
export type NotebookRead = { state: "ready"; notebook: OwnerNotebook } | { state: "unavailable" };
export type NotebookChange =
  | { kind: "save_goal"; goalId: string; text: string }
  | { kind: "delete_goal"; goalId: string }
  | { kind: "save_task"; taskId: string; objective: string; notes: string; state: "open" | "closed"; focus: TaskFocus }
  | { kind: "delete_task"; taskId: string };
export type NotebookEdit = { expectedRevision: number; change: NotebookChange };
export type NotebookCommand = NotebookEdit & { op: "notebook"; requestId: string };
export class NotebookError extends Error {
  constructor(readonly code: "invalid" | "conflict" | "limit") { super(code); }
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v: Record<string, unknown>, names: string[]) => Object.keys(v).sort().join(",") === [...names].sort().join(",");
export const notebookId = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
export const notebookRevision = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 2147483647;
function text(v: unknown, max: number, required = true): string {
  if (typeof v !== "string" || v.length > max || (required && !v.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)) throw new NotebookError("invalid");
  return v;
}
function id(v: unknown): string {
  const lower = typeof v === "string" ? v.toLowerCase() : v;
  if (!notebookId(lower)) throw new NotebookError("invalid");
  return lower;
}
function focus(v: unknown): TaskFocus {
  if (object(v)) {
    if (v.kind === "general" && keys(v, ["kind"])) return { kind: "general" };
    if (v.kind === "coverage" && keys(v, ["kind", "date"]) && typeof v.date === "string" && /^20\d\d-\d\d-\d\d$/.test(v.date) && Number.isFinite(Date.parse(v.date)) && new Date(v.date).toISOString().slice(0, 10) === v.date) return { kind: "coverage", date: v.date };
    if (v.kind === "period" && keys(v, ["kind", "startDate", "endDate"]) && typeof v.startDate === "string" && typeof v.endDate === "string" && /^20/.test(v.startDate) && /^20/.test(v.endDate)) {
      try { return { kind: "period", ...parsePeriod(v.startDate, v.endDate) }; } catch { /* invalid period */ }
    }
  }
  throw new NotebookError("invalid");
}
function change(v: unknown): NotebookChange {
  if (!object(v)) throw new NotebookError("invalid");
  if (v.kind === "save_goal" && keys(v, ["kind", "goalId", "text"])) return { kind: v.kind, goalId: id(v.goalId), text: text(v.text, 1000) };
  if (v.kind === "delete_goal" && keys(v, ["kind", "goalId"])) return { kind: v.kind, goalId: id(v.goalId) };
  if (v.kind === "delete_task" && keys(v, ["kind", "taskId"])) return { kind: v.kind, taskId: id(v.taskId) };
  if (v.kind === "save_task" && keys(v, ["kind", "taskId", "objective", "notes", "state", "focus"]) && (v.state === "open" || v.state === "closed")) return { kind: v.kind, taskId: id(v.taskId), objective: text(v.objective, 1200), notes: text(v.notes, 2000, false), state: v.state, focus: focus(v.focus) };
  throw new NotebookError("invalid");
}
export function parseNotebookCommand(v: unknown): NotebookCommand {
  if (!object(v) || !keys(v, ["op", "requestId", "expectedRevision", "change"]) || v.op !== "notebook" || !notebookRevision(v.expectedRevision) || v.expectedRevision === 2147483647) throw new NotebookError("invalid");
  return { op: "notebook", requestId: id(v.requestId), expectedRevision: v.expectedRevision, change: change(v.change) };
}
export const emptyNotebook = (): OwnerNotebook => ({ revision: 0, goals: [], tasks: [] });
function timestamp(v: unknown): string {
  if (typeof v !== "string" || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString() !== v) throw new NotebookError("invalid");
  return v;
}
export function parseNotebook(v: unknown): OwnerNotebook {
  if (!object(v) || !keys(v, ["revision", "goals", "tasks"]) || !notebookRevision(v.revision) || !Array.isArray(v.goals) || !Array.isArray(v.tasks) || v.goals.length > 8 || v.tasks.length > 12) throw new NotebookError("invalid");
  const goals = v.goals.map((g): OwnerGoal => {
    if (!object(g) || !keys(g, ["id", "text", "updatedAt"]) || !notebookId(g.id)) throw new NotebookError("invalid");
    return { id: g.id, text: text(g.text, 1000), updatedAt: timestamp(g.updatedAt) };
  });
  const tasks = v.tasks.map((t): OwnerTask => {
    if (!object(t) || !keys(t, ["id", "objective", "notes", "state", "focus", "updatedAt"]) || !notebookId(t.id) || (t.state !== "open" && t.state !== "closed")) throw new NotebookError("invalid");
    return { id: t.id, objective: text(t.objective, 1200), notes: text(t.notes, 2000, false), state: t.state, focus: focus(t.focus), updatedAt: timestamp(t.updatedAt) };
  });
  if (new Set(goals.map(g => g.id)).size !== goals.length || new Set(tasks.map(t => t.id)).size !== tasks.length) throw new NotebookError("invalid");
  const notebook = { revision: v.revision, goals, tasks };
  if (new TextEncoder().encode(JSON.stringify(notebook)).byteLength > 65536) throw new NotebookError("limit");
  return notebook;
}
export function applyNotebookCommand(current: OwnerNotebook, command: NotebookCommand, now: string): OwnerNotebook {
  if (current.revision !== command.expectedRevision) throw new NotebookError("conflict");
  if (current.revision >= 2147483647) throw new NotebookError("limit");
  const next = { ...current, revision: current.revision + 1, goals: [...current.goals], tasks: [...current.tasks] };
  const c = command.change;
  if (c.kind === "save_goal") {
    const index = next.goals.findIndex(g => g.id === c.goalId);
    const goal = { id: c.goalId, text: c.text, updatedAt: now };
    if (index < 0) { if (next.goals.length >= 8) throw new NotebookError("limit"); next.goals.push(goal); }
    else next.goals[index] = goal;
  } else if (c.kind === "save_task") {
    const index = next.tasks.findIndex(t => t.id === c.taskId);
    const task = { id: c.taskId, objective: c.objective, notes: c.notes, state: c.state, focus: c.focus, updatedAt: now };
    if (index < 0) { if (next.tasks.length >= 12) throw new NotebookError("limit"); next.tasks.push(task); }
    else next.tasks[index] = task;
  } else if (c.kind === "delete_goal") {
    if (!next.goals.some(g => g.id === c.goalId)) throw new NotebookError("conflict");
    next.goals = next.goals.filter(g => g.id !== c.goalId);
  } else {
    if (!next.tasks.some(t => t.id === c.taskId)) throw new NotebookError("conflict");
    next.tasks = next.tasks.filter(t => t.id !== c.taskId);
  }
  return parseNotebook(next);
}
export function notebookContext(notebook: OwnerNotebook, taskId?: string) {
  const selected = taskId ? notebook.tasks.find(t => t.id === taskId && t.state === "open") : undefined;
  if (taskId && !selected) throw new NotebookError("conflict");
  return {
    revision: notebook.revision,
    goals: notebook.goals.map(g => ({ id: g.id, text: g.text })),
    openTasks: notebook.tasks.filter(t => t.state === "open").map(t => ({ id: t.id, objective: t.objective, focus: t.focus })),
    ...(selected ? { selectedTask: selected } : {}),
  };
}
export type NotebookContext = ReturnType<typeof notebookContext>;
