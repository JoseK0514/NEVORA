"use client";
import { useEffect, useRef, useState } from "react";
import { SelectField } from "@/components/select-field";
import type { MemoryChange, MemoryEdit, OwnerMemory } from "@/lib/owner-advisor/memory";
import type { CoverageActionResult } from "@/lib/owner-advisor/coverage-actions";
import type { TaskFocus } from "@/lib/owner-advisor/notebook";
type Editable = Exclude<MemoryChange, {
    kind: "delete_intent" | "delete_decision";
}>;
type Draft = {
    base: number;
    change: Editable;
    retentionStart: string;
};
const scopeLabel = (f: TaskFocus) => f.kind === "general" ? "General" : f.kind === "coverage" ? `Coverage · ${f.date}` : `Period · ${f.startDate}–${f.endDate}`;
const lastDay = (date: string) => new Date(Date.parse(date) + 364 * 86400000).toISOString().slice(0, 10);
export function newMemoryDraft(kind: "preference" | "owner_constraint" | "decision", date: string, id: string): Editable {
    const common = { focus: { kind: "general" as const }, expiryDate: lastDay(date) };
    return kind === "decision"
        ? { kind: "save_decision", decisionId: id, summary: "", course: "", reason: "", decisionDate: date, ...common }
        : { kind: "save_intent", intentId: id, kindOfIntent: kind, text: "", effectiveDate: date, ...common };
}
/** Parent authority retirement unmounts all drafts; no browser persistence. */
export function MemoryPanel({ memory, date, disabled, change, savedDraft }: {
    memory: OwnerMemory;
    date: string;
    disabled: boolean;
    change: (edit: MemoryEdit) => Promise<boolean>;
    savedDraft?: CoverageActionResult | null;
}) {
    const [draft, setDraft] = useState<Draft | null>(null), editor = useRef<HTMLFormElement>(null), panel = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement | null>(null);
    const editing = !!draft;
    useEffect(() => {
        if (editing) {
            const field = editor.current?.querySelector<HTMLElement>("textarea,input");
            field?.scrollIntoView({ block: "center" });
            field?.focus({ preventScroll: true });
        }
        else {
            const old = trigger.current;
            trigger.current = null;
            if (!old)
                return;
            (old.isConnected && !old.disabled ? old : panel.current?.querySelector<HTMLElement>("button:not(:disabled)"))?.focus();
        }
    }, [editing]);
    const open = (c: Editable, button: HTMLButtonElement, created = date) => { trigger.current = button; setDraft({ base: memory.revision, change: c, retentionStart: created.slice(0, 10) }); };
    const c = draft?.change, stale = !!draft && draft.base !== memory.revision, blocked = disabled || editing;
    const patch = (values: Partial<Editable>) => {
        if (draft)
            setDraft({ ...draft, change: { ...draft.change, ...values } as Editable });
    };
    const scope = c && (c.kind === "save_intent" || c.kind === "save_decision") ? c.focus : null;
    const addIntent = (kindOfIntent: "preference" | "owner_constraint", button: HTMLButtonElement) => open(newMemoryDraft(kindOfIntent, date, crypto.randomUUID()), button);
    const selectedDraft = c?.kind === "check_outcome" && savedDraft?.receipt && savedDraft.review.id === c.reviewId ? savedDraft : null;
    const canCheck = (focus: TaskFocus) => !!savedDraft?.receipt && focus.kind === "coverage" && focus.date === savedDraft.review.date;
    return <div className="oa-notebook" ref={panel}>
  <h2>Owner memory</h2>
  <p className="oa-muted">Only your explicit submissions are saved. Preferences are flexible; Owner constraints state your intent. Neither changes enforced rules or establishes legal clearance.</p>
  <p className="oa-muted">Records expire on the selected day (inclusive), within 365 days of creation. Expired records are excluded from investigations and removed when memory is next refreshed or edited. Editing never renews retention. Corrections clear recent conversation and retained answers in this application; provider and backup deletion is not claimed.</p>
  <details className="oa-follow-through" open><summary>Preferences and constraints · {memory.intents.length}/12</summary>
   {!memory.intents.length && <p className="oa-muted">No preferences or constraints saved.</p>}
   <ul className="oa-priority-list">{memory.intents.map(i => <li className="oa-priority-item" key={i.id}>
    <h3>{i.kind === "preference" ? "Preference" : "Owner constraint"}</h3><p className="oa-plain">{i.text}</p>
    <p className="oa-muted">{scopeLabel(i.focus)} · Effective {i.effectiveDate} through {i.expiryDate} · Explicit Owner submission</p>
    <p className="oa-muted">Updated <time dateTime={i.updatedAt}>{new Date(i.updatedAt).toLocaleString()}</time></p>
    <div className="oa-actions"><button type="button" className="nv-btn" data-kind="secondary" disabled={blocked} onClick={e => open({ kind: "save_intent", intentId: i.id, kindOfIntent: i.kind, text: i.text, focus: i.focus, effectiveDate: i.effectiveDate, expiryDate: i.expiryDate }, e.currentTarget, i.createdAt)}>Edit {i.kind === "preference" ? "preference" : "constraint"}</button>
    <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked} onClick={() => void change({ expectedRevision: memory.revision, change: { kind: "delete_intent", intentId: i.id } })}>Remove {i.kind === "preference" ? "preference" : "constraint"}</button></div>
   </li>)}</ul>
   <div className="oa-actions"><button type="button" className="nv-btn" data-kind="secondary" disabled={blocked || memory.intents.length >= 12} onClick={e => addIntent("preference", e.currentTarget)}>Add preference</button><button type="button" className="nv-btn" data-kind="secondary" disabled={blocked || memory.intents.length >= 12} onClick={e => addIntent("owner_constraint", e.currentTarget)}>Add constraint</button></div>
  </details>
  <details className="oa-follow-through" open><summary>Decisions and outcomes · {memory.decisions.length}/20</summary>
   <p className="oa-muted">Historical choices and reasons. An accepted suggestion is not execution, publication, attendance or business success.</p>
   {!memory.decisions.length && <p className="oa-muted">No decisions recorded.</p>}
   <ul className="oa-priority-list">{memory.decisions.map(d => <li className="oa-priority-item" key={d.id}>
    <h3 className="oa-plain">{d.summary}</h3><p className="oa-plain">Chosen course: {d.course}</p><p className="oa-plain">Reason: {d.reason}</p>
    <p className="oa-muted">{scopeLabel(d.focus)} · Decision {d.decisionDate} · Expires {d.expiryDate} · Explicit Owner submission</p>
    {d.outcome?.kind === "owner_reported" ? <><h4>Owner-reported outcome</h4><p className="oa-plain">{d.outcome.text}</p><p className="oa-muted">Reported {d.outcome.reportedAt}. Not independently checked.</p></> : d.outcome?.kind === "coverage_checked" ? <><h4>Checked draft progress · historical observation</h4><p className="oa-muted">{d.outcome.progress.state} · Observed {d.outcome.progress.observedAt} · {d.outcome.progress.timeZone}</p><p>{d.outcome.progress.assignmentsPresent}/{d.outcome.progress.assignmentsTotal} exact assignments present; {d.outcome.progress.publishedAssignments} published.</p><p className="oa-muted">{d.outcome.progress.coverage ? `${d.outcome.progress.coverage.remainingBlocks} remaining coverage blocks.` : "Current coverage unavailable."} {d.outcome.progress.scopeComplete ? "Complete measured scope." : "Partial or unavailable scope."} This is a historical observation, not verified attendance or business success. It does not grant receipt access in a new session.</p></> : <p className="oa-muted">No outcome recorded.</p>}
    <div className="oa-actions">
     <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked} onClick={e => open({ kind: "save_decision", decisionId: d.id, summary: d.summary, course: d.course, reason: d.reason, focus: d.focus, decisionDate: d.decisionDate, expiryDate: d.expiryDate }, e.currentTarget, d.createdAt)}>Edit decision</button>
     <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked} onClick={() => void change({ expectedRevision: memory.revision, change: { kind: "delete_decision", decisionId: d.id } })}>Remove decision</button>
     <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked} onClick={e => open({ kind: "report_outcome", decisionId: d.id, text: "" }, e.currentTarget, d.createdAt)}>Report outcome</button>
     {d.focus.kind === "coverage" && <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked || !canCheck(d.focus)} onClick={e => { if (canCheck(d.focus) && savedDraft)
            open({ kind: "check_outcome", decisionId: d.id, reviewId: savedDraft.review.id }, e.currentTarget, d.createdAt); }}>Check current saved draft</button>}
    </div>
    {d.focus.kind === "coverage" && !canCheck(d.focus) && <p className="oa-muted">No matching saved draft in this session. Save or recover a coverage draft for {d.focus.date} before checking progress.</p>}
   </li>)}</ul>
   <button type="button" className="nv-btn" data-kind="secondary" disabled={blocked || memory.decisions.length >= 20} onClick={e => open(newMemoryDraft("decision", date, crypto.randomUUID()), e.currentTarget)}>Record decision</button>
  </details>
  {draft && c && <form ref={editor} className="oa-notebook-editor" aria-label="Edit Owner memory" onSubmit={async (e) => {
                e.preventDefault();
                if (!disabled && !stale && (c.kind !== "check_outcome" || selectedDraft) && await change({ expectedRevision: draft.base, change: c }))
                    setDraft(null);
            }}>
   <h3>{c.kind === "save_intent" ? "Your preference or constraint" : c.kind === "save_decision" ? "Your decision and reason" : c.kind === "report_outcome" ? "Your reported outcome" : "Check an owned coverage draft"}</h3>
   {(c.kind === "save_intent" || c.kind === "report_outcome") && <><label htmlFor="oa-memory-text">{c.kind === "save_intent" ? "Intent" : "Outcome reported by you"}</label><textarea id="oa-memory-text" rows={3} maxLength={1000} required disabled={disabled} value={c.text} onChange={e => patch({ text: e.target.value })}/></>}
   {c.kind === "save_intent" && <SelectField id="oa-memory-kind" name="memoryKind" label="Intent type" value={c.kindOfIntent} disabled={disabled} options={[{ value: "preference", label: "Preference" }, { value: "owner_constraint", label: "Owner constraint" }]} onChange={e => patch({ kindOfIntent: e.target.value as "preference" | "owner_constraint" })}/>}
   {c.kind === "save_decision" && <>{([['summary', 'Decision summary'], ['course', 'Chosen course'], ['reason', 'Reason']] as const).map(([key, label]) => <div key={key}><label htmlFor={`oa-memory-${key}`}>{label}</label><textarea id={`oa-memory-${key}`} rows={3} maxLength={1000} required disabled={disabled} value={c[key]} onChange={e => patch({ [key]: e.target.value })}/></div>)}<p className="oa-muted">Editing a decision clears its previous outcome; report or check it again for the revised decision.</p></>}
   {scope && <><SelectField id="oa-memory-scope" name="memoryScope" label="Memory scope" value={scope.kind} disabled={disabled} options={[{ value: "general", label: "General" }, { value: "coverage", label: "Coverage on a date" }, { value: "period", label: "Attendance and payroll period" }]} onChange={e => patch({ focus: e.target.value === "coverage" ? { kind: "coverage", date } : e.target.value === "period" ? { kind: "period", startDate: date, endDate: date } : { kind: "general" } })}/>
    {scope.kind === "coverage" && <><label htmlFor="oa-memory-date">Coverage date</label><input type="date" id="oa-memory-date" required disabled={disabled} value={scope.date} onChange={e => patch({ focus: { kind: "coverage", date: e.target.value } })}/></>}
    {scope.kind === "period" && <><label htmlFor="oa-memory-start">Period start</label><input type="date" id="oa-memory-start" required disabled={disabled} value={scope.startDate} onChange={e => patch({ focus: { ...scope, startDate: e.target.value } })}/><label htmlFor="oa-memory-end">Period end (up to 31 days)</label><input type="date" id="oa-memory-end" required disabled={disabled} min={scope.startDate} value={scope.endDate} onChange={e => patch({ focus: { ...scope, endDate: e.target.value } })}/></>}
   </>}
   {(c.kind === "save_intent" || c.kind === "save_decision") && <><label htmlFor="oa-memory-effective">{c.kind === "save_intent" ? "Effective date" : "Decision date"}</label><input type="date" id="oa-memory-effective" required disabled={disabled} max={lastDay(draft.retentionStart)} value={c.kind === "save_intent" ? c.effectiveDate : c.decisionDate} onChange={e => patch(c.kind === "save_intent" ? { effectiveDate: e.target.value } : { decisionDate: e.target.value })}/><label htmlFor="oa-memory-expiry">Expiry date (inclusive)</label><input type="date" id="oa-memory-expiry" required disabled={disabled} min={c.kind === "save_intent" ? c.effectiveDate : c.decisionDate} max={lastDay(draft.retentionStart)} value={c.expiryDate} onChange={e => patch({ expiryDate: e.target.value })}/><p className="oa-muted">Each text field allows up to 1000 characters. Retention ends no later than {lastDay(draft.retentionStart)}.</p></>}
   {c.kind === "check_outcome" && <>{selectedDraft ? <>
      <h4>Saved coverage draft · {selectedDraft.review.date}</h4>
      <p className="oa-muted">{selectedDraft.receipt!.count} saved assignments. Check their current presence and publication state for this decision.</p>
      <ul>{selectedDraft.review.assignments.map((a, index) => <li key={index}>{a.employeeName} · {a.locationName} · {a.startTime}–{a.endTime}</li>)}</ul>
    </> : <p role="alert" className="oa-notice">The selected saved draft is no longer available in this session. Discard this edit and select a current matching draft.</p>}
    <p className="oa-muted">The server checks the exact saved assignments and records its observation. It cannot verify attendance or business success.</p></>}

   {stale && <div className="oa-notice" role="alert"><p>Memory changed elsewhere. Your draft is preserved. Review the current records before replacing them.</p><button type="button" className="nv-btn" data-kind="secondary" disabled={disabled} onClick={() => setDraft({ ...draft, base: memory.revision })}>I’ve reviewed the current memory</button></div>}
   <div className="oa-actions"><button className="nv-btn" data-kind="secondary" disabled={disabled || stale || (c.kind === "check_outcome" && !selectedDraft)}>{c.kind === "check_outcome" ? "Check and record progress" : "Save memory"}</button><button type="button" className="nv-btn" data-kind="secondary" disabled={disabled} onClick={() => setDraft(null)}>Discard edit</button></div>
  </form>}
 </div>;
}
