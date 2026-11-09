import { describe, expect, it } from "vitest";
import {
  applyNotebookCommand, emptyNotebook, notebookContext, parseNotebook,
  parseNotebookCommand,
} from "./notebook";
import { parseCommand } from "./contracts";

// Authored before implementation. Execution is held at Jose's request.
const requestId = "10000000-0000-0000-0000-000000000001";
const goalId = "20000000-0000-0000-0000-000000000001";
const taskId = "30000000-0000-0000-0000-000000000001";
const now = "2026-10-30T12:00:00.000Z";
const saveGoal = (revision = 0) => parseNotebookCommand({
  op: "notebook", requestId, expectedRevision: revision,
  change: { kind: "save_goal", goalId, text: "Keep weekend coverage reliable" },
});

describe("Owner notebook boundaries", () => {
  it("rejects forged Owner scope and authority fields instead of accepting a client identity", () => {
    expect(() => parseNotebookCommand({ ...saveGoal(), ownerId: "another-owner" })).toThrow();
    expect(() => parseNotebookCommand({ ...saveGoal(), change: { ...saveGoal().change, workspaceId: "other" } })).toThrow();
  });

  it("rejects stale edits without changing the saved goal", () => {
    const current = applyNotebookCommand(emptyNotebook(), saveGoal(), now);
    expect(() => applyNotebookCommand(current, saveGoal(), now)).toThrow("conflict");
    expect(current.goals[0].text).toBe("Keep weekend coverage reliable");
    expect(current.revision).toBe(1);
  });

  it("persists task notes and an Owner closure separately from a business outcome", () => {
    const task = { kind: "save_task", taskId, objective: "Investigate Saturday's gap", notes: "Ask Ana before preparing a draft", state: "open", focus: { kind: "coverage", date: "2026-10-31" } };
    const open = applyNotebookCommand(emptyNotebook(), parseNotebookCommand({ op: "notebook", requestId, expectedRevision: 0, change: task }), now);
    const closed = applyNotebookCommand(open, parseNotebookCommand({ op: "notebook", requestId, expectedRevision: 1, change: { ...task, state: "closed" } }), now);
    expect(closed.tasks[0]).toEqual({ id: taskId, objective: "Investigate Saturday's gap", notes: "Ask Ana before preparing a draft", state: "closed", focus: { kind: "coverage", date: "2026-10-31" }, updatedAt: now });
    expect(notebookContext(closed).openTasks).toEqual([]);
    expect(() => notebookContext(closed, taskId)).toThrow("conflict");
  });

  it("removes only the selected private item and does not mutate the input snapshot", () => {
    const saved = applyNotebookCommand(emptyNotebook(), saveGoal(), now);
    const removed = applyNotebookCommand(saved, parseNotebookCommand({ op: "notebook", requestId, expectedRevision: 1, change: { kind: "delete_goal", goalId } }), now);
    expect(removed).toEqual({ revision: 2, goals: [], tasks: [] });
    expect(saved.goals).toHaveLength(1);
    expect(() => applyNotebookCommand(removed, parseNotebookCommand({ op: "notebook", requestId, expectedRevision: 2, change: { kind: "delete_goal", goalId } }), now)).toThrow("conflict");
  });

  it("bounds saved context without silently dropping an existing goal", () => {
    let current = emptyNotebook();
    for (let i = 1; i <= 8; i++) current = applyNotebookCommand(current, parseNotebookCommand({ op: "notebook", requestId, expectedRevision: i - 1, change: { kind: "save_goal", goalId: `20000000-0000-0000-0000-${String(i).padStart(12, "0")}`, text: `Goal ${i}` } }), now);
    expect(() => applyNotebookCommand(current, parseNotebookCommand({ op: "notebook", requestId, expectedRevision: 8, change: { kind: "save_goal", goalId: "20000000-0000-0000-0000-000000000009", text: "Ninth goal" } }), now)).toThrow("limit");
    expect(current.goals).toHaveLength(8);
  });

  it("rejects duplicate IDs, invalid periods and malformed stored data", () => {
    const goal = { id: goalId, text: "A goal", updatedAt: now };
    expect(() => parseNotebook({ revision: 1, goals: [goal, goal], tasks: [] })).toThrow();
    expect(() => parseNotebook({ revision: -1, goals: [], tasks: [] })).toThrow();
    expect(() => parseNotebookCommand({ op: "notebook", requestId, expectedRevision: 0, change: { kind: "save_task", taskId, objective: "Review", notes: "", state: "open", focus: { kind: "period", startDate: "2026-10-31", endDate: "2026-10-01" } } })).toThrow();
  });

  it("uses the strict public command parser for task investigations", () => {
    expect(parseCommand({ op: "ask_task", requestId, taskId, expectedNotebookRevision: 3, message: "What should I do next?" })).toEqual({ op: "ask_task", requestId, taskId, expectedNotebookRevision: 3, message: "What should I do next?" });
    expect(() => parseCommand({ op: "ask_task", requestId, taskId, expectedNotebookRevision: 3, message: "Review", autoApprove: true })).toThrow();
  });
});
