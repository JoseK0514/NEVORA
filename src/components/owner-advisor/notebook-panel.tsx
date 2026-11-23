"use client";
import { useEffect, useRef, useState } from "react";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { CorpButton, CorpField } from "@/components/corp/corp";
import { BCallout, BSegs } from "@/components/owner-b/b-kit";
import type { AdvisorCommand } from "@/lib/owner-advisor/contracts";
import type { NotebookChange, NotebookEdit, OwnerNotebook, TaskFocus } from "@/lib/owner-advisor/notebook";
import { dayText, periodText, whenText, type Clock } from "./format";
import { DateField } from "./workflows";
type Draft = { base: number; change: Extract<NotebookChange, { kind: "save_goal" | "save_task" }> };
type Inspection = Extract<AdvisorCommand, { op: "inspect" }>["tool"];
function focusParts(focus: TaskFocus, year?: string) {
  return focus.kind === "coverage" ? ["Coverage", dayText(focus.date, "en", year)] : focus.kind === "period" ? ["Attendance and payroll", periodText(focus.startDate, focus.endDate, "en", year)] : ["General investigation"];
}

/** Drafts belong to the existing finite private view. No storage or parallel
 * reader: the parent unmounts this entire panel when current authority retires. */
/* Direction B (Nov 18, 2026): the goals and tasks sit in the Owner priorities card under the priorities form, each list a
 * disclosure with its count, each item a row with quiet actions, and "+ Add" closing the list (the knowledge page's
 * pattern). Handlers, limits, revisions and focus moves are as before. */
export function NotebookPanel({ notebook, date, disabled, change, selectTask, inspect, clock = {} }: {
  notebook: OwnerNotebook; date: string; disabled: boolean;
  change: (edit: NotebookEdit) => Promise<boolean>;
  selectTask: (id: string) => void;
  inspect: (tool: Inspection) => void;
  clock?: Clock;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLFormElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const editing = draft !== null;
  useEffect(() => {
    if (editing) {
      // Deliberate Add/Edit must reveal its field, including after long lists.
      // A refresh or keystroke keeps the same editing state and never steals focus.
      const field = editorRef.current?.querySelector<HTMLTextAreaElement>("textarea");
      // WebKit may scroll only the caret into view on focus. Reveal the whole
      // field first, then retain that placement when transferring keyboard focus.
      field?.scrollIntoView({ block: "center", inline: "nearest" });
      field?.focus({ preventScroll: true });
      return;
    }
    const trigger = triggerRef.current;
    triggerRef.current = null;
    if (!trigger) return;
    const destination = trigger.isConnected && !trigger.disabled && trigger.getClientRects().length
      ? trigger
      : [...(panelRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled),summary") ?? [])].find(el => el.getClientRects().length);
    destination?.focus();
  }, [editing]);
  const openEditor = (next: Draft, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setDraft(next);
  };
  const stale = !!draft && draft.base !== notebook.revision;
  const goalDraft = draft?.change.kind === "save_goal" ? draft.change : null;
  const taskDraft = draft?.change.kind === "save_task" ? draft.change : null;
  const blocked = disabled || !!draft;
  const year = (clock.today ?? date).slice(0, 4);
  const saved = (at: string) => <>Saved <time dateTime={at}>{whenText(at, clock.timeZone, clock.today)}</time></>;
  const save = async () => {
    if (!draft || disabled || stale) return;
    if (await change({ expectedRevision: draft.base, change: draft.change })) setDraft(null);
  };
  const setFocus = (focus: TaskFocus) => {
    if (draft && taskDraft) setDraft({ ...draft, change: { ...taskDraft, focus } });
  };
  const quiet = "b-rowact b-rowact--quiet";
  return <div className="oa-notebook" ref={panelRef}>
    <details className="oa-fold" open>
      <summary><span>Saved goals</span><span className="oa-fold__count">{notebook.goals.length} of 8</span></summary>
      {notebook.goals.length === 0 && <p className="oa-empty">Save a goal you want Rondo to consider over time.</p>}
      {notebook.goals.length > 0 && <ul className="oa-items oa-items--quiet">
        {notebook.goals.map(goal => <li className="oa-item oa-item--flat" key={goal.id}><div className="oa-item__main">
          <p className="oa-plain oa-item__text">{goal.text}</p>
          <p className="oa-facts">{saved(goal.updatedAt)}</p>
          <div className="oa-acts">
            <CorpButton kind="secondary" size="md" className={quiet} disabled={blocked} onClick={e => openEditor({ base: notebook.revision, change: { kind: "save_goal", goalId: goal.id, text: goal.text } }, e.currentTarget)}>Edit goal</CorpButton>
            <CorpButton kind="secondary" size="md" className={quiet} disabled={blocked} onClick={() => void change({ expectedRevision: notebook.revision, change: { kind: "delete_goal", goalId: goal.id } })}>Remove goal</CorpButton>
          </div>
        </div></li>)}
      </ul>}
      <button type="button" className="oa-addrow" disabled={blocked || notebook.goals.length >= 8} onClick={e => openEditor({ base: notebook.revision, change: { kind: "save_goal", goalId: crypto.randomUUID(), text: "" } }, e.currentTarget)}><PlusIcon weight="bold" aria-hidden="true" />Add goal</button>
    </details>
    <details className="oa-fold" open>
      <summary><span>Your tasks</span><span className="oa-fold__count">{notebook.tasks.filter(t => t.state === "open").length} open</span></summary>
      {notebook.tasks.length > 0 && <p className="oa-lede oa-pad oa-lede--quiet">Closing a task records your choice. It does not verify that a staffing or payroll issue was resolved.</p>}
      {notebook.tasks.length === 0 && <p className="oa-empty">Save an objective and notes to pick up an investigation later.</p>}
      {notebook.tasks.length > 0 && <ul className="oa-items oa-items--quiet">
        {notebook.tasks.map(task => <li className="oa-item oa-item--flat" key={task.id}><div className="oa-item__main">
          <h3 className="oa-item__t oa-plain">{task.objective}</h3>
          <p className="oa-facts"><BSegs parts={[task.state === "open" ? "Open" : "Closed by you", ...focusParts(task.focus, year)]} /></p>
          {task.notes && <p className="oa-plain oa-item__d">{task.notes}</p>}
          <p className="oa-facts">{saved(task.updatedAt)}</p>
          <div className="oa-acts">
            {task.state === "open" && <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled} onClick={() => selectTask(task.id)}>Continue investigation</CorpButton>}
            {task.state === "open" && task.focus.kind !== "general" && <CorpButton kind="secondary" size="md" className={quiet} disabled={disabled} onClick={() => {
              if (task.focus.kind === "coverage") inspect({ name: "coverage_proposals", args: { date: task.focus.date } });
              else if (task.focus.kind === "period") inspect({ name: "attendance_payroll_review", args: { startDate: task.focus.startDate, endDate: task.focus.endDate, language: "en" } });
            }}>{task.focus.kind === "coverage" ? "Review current coverage" : "Review current period"}</CorpButton>}
            <CorpButton kind="secondary" size="md" className={quiet} disabled={blocked} onClick={e => openEditor({ base: notebook.revision, change: { kind: "save_task", taskId: task.id, objective: task.objective, notes: task.notes, state: task.state, focus: task.focus } }, e.currentTarget)}>Edit task</CorpButton>
            <CorpButton kind="secondary" size="md" className={quiet} disabled={blocked} onClick={() => void change({ expectedRevision: notebook.revision, change: { kind: "save_task", taskId: task.id, objective: task.objective, notes: task.notes, state: task.state === "open" ? "closed" : "open", focus: task.focus } })}>{task.state === "open" ? "Close task" : "Reopen task"}</CorpButton>
            <CorpButton kind="secondary" size="md" className={quiet} disabled={blocked} onClick={() => void change({ expectedRevision: notebook.revision, change: { kind: "delete_task", taskId: task.id } })}>Remove task</CorpButton>
          </div>
        </div></li>)}
      </ul>}
      {notebook.tasks.length > 0 && <p className="oa-foot">{notebook.tasks.length} of 12 saved tasks, including closed tasks.</p>}
      <button type="button" className="oa-addrow" disabled={blocked || notebook.tasks.length >= 12} onClick={e => openEditor({ base: notebook.revision, change: { kind: "save_task", taskId: crypto.randomUUID(), objective: "", notes: "", state: "open", focus: { kind: "general" } } }, e.currentTarget)}><PlusIcon weight="bold" aria-hidden="true" />Add task</button>
    </details>
    {draft && <form ref={editorRef} className="oa-editor" aria-label={goalDraft ? "Edit saved goal" : "Edit saved task"} onSubmit={e => { e.preventDefault(); void save(); }}>
      <div className="oa-editor__head"><h3 className="oa-sub">{goalDraft ? "Your goal" : "Your task"}</h3><p className="oa-facts">Unsaved edit</p></div>
      {goalDraft && <div className="c-field">
        <label className="c-field__label" htmlFor="oa-goal-text">Goal</label>
        <textarea className="c-in oa-area" id="oa-goal-text" value={goalDraft.text} maxLength={1000} rows={3} required disabled={disabled} onChange={e => setDraft({ ...draft, change: { ...goalDraft, text: e.target.value } })} />
        <span className="c-field__help oa-help">{goalDraft.text.length}/1000 characters</span>
      </div>}
      {taskDraft && <>
        <div className="c-field">
          <label className="c-field__label" htmlFor="oa-task-objective">Objective</label>
          <textarea className="c-in oa-area" id="oa-task-objective" value={taskDraft.objective} maxLength={1200} rows={3} required disabled={disabled} onChange={e => setDraft({ ...draft, change: { ...taskDraft, objective: e.target.value } })} />
        </div>
        <div className="c-field">
          <label className="c-field__label" htmlFor="oa-task-notes">Your notes</label>
          <textarea className="c-in oa-area" id="oa-task-notes" value={taskDraft.notes} maxLength={2000} rows={4} disabled={disabled} onChange={e => setDraft({ ...draft, change: { ...taskDraft, notes: e.target.value } })} />
          <span className="c-field__help oa-help">Objective {taskDraft.objective.length}/1200 · notes {taskDraft.notes.length}/2000 characters</span>
        </div>
        <CorpField label="Investigation scope" htmlFor="oa-task-focus">
          <select className="c-in" id="oa-task-focus" name="taskFocus" value={taskDraft.focus.kind} disabled={disabled} onChange={e => setFocus(e.target.value === "coverage" ? { kind: "coverage", date } : e.target.value === "period" ? { kind: "period", startDate: date, endDate: date } : { kind: "general" })}>
            <option value="general">General</option>
            <option value="coverage">Coverage on a date</option>
            <option value="period">Attendance and payroll period</option>
          </select>
        </CorpField>
        {taskDraft.focus.kind === "coverage" && <DateField id="oa-task-date" label="Coverage date" required disabled={disabled} value={taskDraft.focus.date} onChange={value => setFocus({ kind: "coverage", date: value })} year={year} />}
        {taskDraft.focus.kind === "period" && <>
          <div className="oa-pair">
            <DateField id="oa-task-start" label="Period start" required disabled={disabled} value={taskDraft.focus.startDate} onChange={value => { if (taskDraft.focus.kind === "period") setFocus({ ...taskDraft.focus, startDate: value }); }} year={year} />
            <DateField id="oa-task-end" label="Period end" required disabled={disabled} min={taskDraft.focus.startDate} value={taskDraft.focus.endDate} onChange={value => { if (taskDraft.focus.kind === "period") setFocus({ ...taskDraft.focus, endDate: value }); }} year={year} />
          </div>
          <p className="c-field__help oa-help">Choose 1 to 31 days. Financial readiness still requires Payroll review.</p>
        </>}
      </>}
      {stale && <BCallout tone="amber" role="alert"
        action={<button type="button" disabled={disabled} onClick={() => setDraft({ ...draft, base: notebook.revision })}>I’ve reviewed the current saved items</button>}>
        Saved goals or tasks changed elsewhere. Your draft is preserved. Review the current saved items above before replacing them.
      </BCallout>}
      <div className="oa-acts oa-acts--end">
        <CorpButton type="submit" kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled || stale}>{goalDraft ? "Save goal" : "Save task"}</CorpButton>
        <CorpButton kind="secondary" size="md" className={quiet} disabled={disabled} onClick={() => setDraft(null)}>Discard edit</CorpButton>
      </div>
    </form>}
  </div>;
}
