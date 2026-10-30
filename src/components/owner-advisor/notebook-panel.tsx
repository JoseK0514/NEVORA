"use client";
import { useState } from "react";
import { SelectField } from "@/components/select-field";
import type { AdvisorCommand } from "@/lib/owner-advisor/contracts";
import type { NotebookChange, NotebookEdit, OwnerNotebook, TaskFocus } from "@/lib/owner-advisor/notebook";
type Draft = { base: number; change: Extract<NotebookChange, { kind: "save_goal" | "save_task" }> };
type Inspection = Extract<AdvisorCommand, { op: "inspect" }>["tool"];
function focusLabel(focus: TaskFocus) {
  return focus.kind === "coverage" ? `Coverage · ${focus.date}` : focus.kind === "period" ? `Attendance and payroll · ${focus.startDate}–${focus.endDate}` : "General investigation";
}

/** Drafts belong to the existing finite private view. No storage or parallel
 * reader: the parent unmounts this entire panel when current authority retires. */
export function NotebookPanel({ notebook, date, disabled, change, selectTask, inspect }: {
  notebook: OwnerNotebook; date: string; disabled: boolean;
  change: (edit: NotebookEdit) => Promise<boolean>;
  selectTask: (id: string) => void;
  inspect: (tool: Inspection) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const stale = !!draft && draft.base !== notebook.revision;
  const goalDraft = draft?.change.kind === "save_goal" ? draft.change : null;
  const taskDraft = draft?.change.kind === "save_task" ? draft.change : null;
  const blocked = disabled || !!draft;
  const save = async () => {
    if (!draft || disabled || stale) return;
    if (await change({ expectedRevision: draft.base, change: draft.change })) setDraft(null);
  };
  const setFocus = (focus: TaskFocus) => {
    if (draft && taskDraft) setDraft({ ...draft, change: { ...taskDraft, focus } });
  };
  return <div className="oa-notebook">
    <p className="oa-muted">Goals and tasks stay saved for your Owner account. Investigations use them when you ask, with current company records.</p>
    <details className="oa-follow-through" open>
      <summary>Saved goals · {notebook.goals.length}/8</summary>
      {notebook.goals.length === 0 && <p className="oa-muted">Save a goal you want the AI manager to consider over time.</p>}
      <ul className="oa-priority-list">
        {notebook.goals.map(goal => <li className="oa-priority-item" key={goal.id}>
          <p className="oa-plain">{goal.text}</p>
          <p className="oa-muted">Saved <time dateTime={goal.updatedAt}>{new Date(goal.updatedAt).toLocaleString()}</time></p>
          <div className="oa-actions">
            <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked} onClick={() => setDraft({ base: notebook.revision, change: { kind: "save_goal", goalId: goal.id, text: goal.text } })}>Edit goal</button>
            <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked} onClick={() => void change({ expectedRevision: notebook.revision, change: { kind: "delete_goal", goalId: goal.id } })}>Remove goal</button>
          </div>
        </li>)}
      </ul>
      <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked || notebook.goals.length >= 8} onClick={() => setDraft({ base: notebook.revision, change: { kind: "save_goal", goalId: crypto.randomUUID(), text: "" } })}>Add goal</button>
    </details>
    <details className="oa-follow-through" open>
      <summary>Your tasks · {notebook.tasks.filter(t => t.state === "open").length} open</summary>
      <p className="oa-muted">Closing a task records your choice. It does not verify that a staffing or payroll issue was resolved.</p>
      {notebook.tasks.length === 0 && <p className="oa-muted">Save an objective and notes to pick up an investigation later.</p>}
      <ul className="oa-priority-list">
        {notebook.tasks.map(task => <li className="oa-priority-item" key={task.id}>
          <h3 className="oa-plain">{task.objective}</h3>
          <p className="oa-muted">{task.state === "open" ? "Open" : "Closed by you"} · {focusLabel(task.focus)}</p>
          {task.notes && <p className="oa-plain">{task.notes}</p>}
          <p className="oa-muted">Saved <time dateTime={task.updatedAt}>{new Date(task.updatedAt).toLocaleString()}</time></p>
          <div className="oa-actions">
            {task.state === "open" && <button type="button" className="nv-btn" data-kind="secondary" disabled={disabled} onClick={() => selectTask(task.id)}>Continue investigation</button>}
            {task.state === "open" && task.focus.kind !== "general" && <button type="button" className="nv-btn" data-kind="secondary" disabled={disabled} onClick={() => {
              if (task.focus.kind === "coverage") inspect({ name: "coverage_proposals", args: { date: task.focus.date } });
              else if (task.focus.kind === "period") inspect({ name: "attendance_payroll_review", args: { startDate: task.focus.startDate, endDate: task.focus.endDate, language: "en" } });
            }}>{task.focus.kind === "coverage" ? "Review current coverage" : "Review current period"}</button>}
            <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked} onClick={() => setDraft({ base: notebook.revision, change: { kind: "save_task", taskId: task.id, objective: task.objective, notes: task.notes, state: task.state, focus: task.focus } })}>Edit task</button>
            <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked} onClick={() => void change({ expectedRevision: notebook.revision, change: { kind: "save_task", taskId: task.id, objective: task.objective, notes: task.notes, state: task.state === "open" ? "closed" : "open", focus: task.focus } })}>{task.state === "open" ? "Close task" : "Reopen task"}</button>
            <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked} onClick={() => void change({ expectedRevision: notebook.revision, change: { kind: "delete_task", taskId: task.id } })}>Remove task</button>
          </div>
        </li>)}
      </ul>
      <p className="oa-muted">{notebook.tasks.length}/12 saved tasks, including closed tasks.</p>
      <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked || notebook.tasks.length >= 12} onClick={() => setDraft({ base: notebook.revision, change: { kind: "save_task", taskId: crypto.randomUUID(), objective: "", notes: "", state: "open", focus: { kind: "general" } } })}>Add task</button>
    </details>
    {draft && <form className="oa-notebook-editor" aria-label={goalDraft ? "Edit saved goal" : "Edit saved task"} onSubmit={e => { e.preventDefault(); void save(); }}>
      <h3>{goalDraft ? "Your goal" : "Your task"}</h3>
      <p className="oa-muted">Unsaved edit</p>
      {goalDraft && <>
        <label htmlFor="oa-goal-text">Goal</label>
        <textarea id="oa-goal-text" value={goalDraft.text} maxLength={1000} rows={3} required disabled={disabled} onChange={e => setDraft({ ...draft, change: { ...goalDraft, text: e.target.value } })} />
        <p className="oa-muted">{goalDraft.text.length}/1000 characters</p>
      </>}
      {taskDraft && <>
        <label htmlFor="oa-task-objective">Objective</label>
        <textarea id="oa-task-objective" value={taskDraft.objective} maxLength={1200} rows={3} required disabled={disabled} onChange={e => setDraft({ ...draft, change: { ...taskDraft, objective: e.target.value } })} />
        <label htmlFor="oa-task-notes">Your notes</label>
        <textarea id="oa-task-notes" value={taskDraft.notes} maxLength={2000} rows={4} disabled={disabled} onChange={e => setDraft({ ...draft, change: { ...taskDraft, notes: e.target.value } })} />
        <p className="oa-muted">Objective {taskDraft.objective.length}/1200 · notes {taskDraft.notes.length}/2000 characters</p>
        <SelectField id="oa-task-focus" name="taskFocus" label="Investigation scope" options={[{ value: "general", label: "General" }, { value: "coverage", label: "Coverage on a date" }, { value: "period", label: "Attendance and payroll period" }]} value={taskDraft.focus.kind} disabled={disabled} onChange={e => setFocus(e.target.value === "coverage" ? { kind: "coverage", date } : e.target.value === "period" ? { kind: "period", startDate: date, endDate: date } : { kind: "general" })} />
        {taskDraft.focus.kind === "coverage" && <>
          <label htmlFor="oa-task-date">Coverage date</label>
          <input type="date" id="oa-task-date" required disabled={disabled} value={taskDraft.focus.date} onChange={e => setFocus({ kind: "coverage", date: e.target.value })} />
        </>}
        {taskDraft.focus.kind === "period" && <>
          <label htmlFor="oa-task-start">Period start</label>
          <input type="date" id="oa-task-start" required disabled={disabled} value={taskDraft.focus.startDate} onChange={e => { if (taskDraft.focus.kind === "period") setFocus({ ...taskDraft.focus, startDate: e.target.value }); }} />
          <label htmlFor="oa-task-end">Period end</label>
          <input type="date" id="oa-task-end" required disabled={disabled} min={taskDraft.focus.startDate} value={taskDraft.focus.endDate} onChange={e => { if (taskDraft.focus.kind === "period") setFocus({ ...taskDraft.focus, endDate: e.target.value }); }} />
          <p className="oa-muted">Choose 1 to 31 days. Financial readiness still requires Payroll review.</p>
        </>}
      </>}
      {stale && <div role="alert" className="oa-notice">
        <p>Saved goals or tasks changed elsewhere. Your draft is preserved. Review the current saved items above before replacing them.</p>
        <button type="button" className="nv-btn" data-kind="secondary" disabled={disabled} onClick={() => setDraft({ ...draft, base: notebook.revision })}>I’ve reviewed the current saved items</button>
      </div>}
      <div className="oa-actions">
        <button className="nv-btn" data-kind="secondary" disabled={disabled || stale}>{goalDraft ? "Save goal" : "Save task"}</button>
        <button type="button" className="nv-btn" data-kind="secondary" disabled={disabled} onClick={() => setDraft(null)}>Discard edit</button>
      </div>
    </form>}
  </div>;
}
