"use client";
import { useEffect, useRef, useState } from "react";
import { PageBand } from "@/components/kit/kit";
import type { AdvisorSource } from "@/lib/owner-advisor/contracts";
import {
  createAdvisorController,
  initialView,
  type AdvisorView,
} from "./controller";
import "./advisor.css";
import { bindAdvisorLifecycle } from "./lifecycle";
import { AttentionSection } from "./attention";
import { WorkflowControls, WorkflowResults } from "./workflows";
import { SelectField } from "@/components/select-field";
import { NotebookPanel } from "./notebook-panel";
import { CoverageActionPanel } from "./coverage-actions";
import { comparisonPredatesSave } from "./coverage-plans";
import { createCoverageActionController, type CoverageActionView } from "./coverage-actions-controller";
import type { NotebookEdit } from "@/lib/owner-advisor/notebook";
import type { AttentionDisposition } from "@/lib/owner-advisor/briefing-contracts";
const starters = [
  "What needs my attention today?",
  "Investigate coverage for tomorrow and compare my options.",
  "What could go wrong with this plan?",
];
function Sources({ sources }: { sources: AdvisorSource[] }) {
  return (
    <ul className="oa-sources">
      {sources.map((s, i) => (
        <li key={i}>
          <a href={s.href}>{s.label}</a>
          <span>
            Observed{" "}
            <time dateTime={s.observedAt}>
              {new Date(s.observedAt).toLocaleString()}
            </time>
          </span>
        </li>
      ))}
    </ul>
  );
}
export function AdvisorScreen({
  view,
  actions, coverage,
}: {
  view: AdvisorView;
  coverage?: { view: CoverageActionView; actions: Pick<ReturnType<typeof createCoverageActionController>, "acknowledge" | "save" | "recover" | "check" | "dismiss"> };
  actions: {
    editQuestion: (s: string) => void;
    editPriorities: (s: string) => void;
    ask: () => void;
    save: () => void;
    cancel: () => void;
    refresh: () => void;
    reviewConflict: () => void;
    reviewItem?: (id: string, disposition: AttentionDisposition) => void;
    inspect?: (tool: Extract<import("@/lib/owner-advisor/contracts").AdvisorCommand, { op: "inspect" }>["tool"]) => void;
    reviewCoverage?: (plans: import("@/lib/owner-advisor/coverage-plan-contracts").CoveragePlans, index: number) => void;
    changeNotebook?: (edit: NotebookEdit) => Promise<boolean>;
    selectTask?: (id: string | null) => void;
  };
}) {
  const current = view.snapshot;
  const disabled = !current || !!view.busy || view.uncertain;
  const saved = current?.notebook?.state === "ready" ? current.notebook.notebook : undefined;
  const openTasks = saved?.tasks.filter(t => t.state === "open") ?? [];
  const selectedUnavailable = !!view.focusedTaskId && !openTasks.some(t => t.id === view.focusedTaskId);
  return (
    <div className="nv-page oa-page" data-nv-page="">
      <PageBand
        title="AI manager"
        summary="See what needs your attention, then investigate your options."
      />
      <div className="oa-content">
        {view.message && (
          <p role="status" className="oa-notice">
            {view.message}
          </p>
        )}
        {!current ? (
          <section className="oa-section" aria-label="Current access">
            <p>
              {view.loading
                ? "Loading your briefing and conversation…"
                : "Current information is hidden until access is refreshed."}
            </p>
            <button
              className="nv-btn"
              data-kind="secondary"
              disabled={view.loading}
              onClick={actions.refresh}
            >
              Refresh history
            </button>
          </section>
        ) : (
          <>
            {current.attention && <AttentionSection briefing={current.attention} disabled={disabled} saving={view.busy === "review"} review={(id, disposition) => actions.reviewItem?.(id, disposition)} refresh={actions.refresh} />}
            <section className="oa-section" aria-labelledby="oa-briefing">
              <div className="oa-heading">
                <h2 id="oa-briefing">Live briefing</h2>
                <button
                  className="nv-btn"
                  data-kind="secondary"
                  onClick={actions.refresh}
                >
                  Refresh history
                </button>
              </div>
              <p className="oa-muted">
                Observed{" "}
                <time dateTime={current.briefing.observedAt}>
                  {new Date(current.briefing.observedAt).toLocaleString()}
                </time>
              </p>
              {current.briefing.data ? (
                <>
                  <p>
                    {current.briefing.data.companyName} ·{" "}
                    {current.briefing.data.date}
                  </p>
                  <dl className="oa-counts">
                    {Object.entries({
                      Scheduled: current.briefing.data.counts.scheduled,
                      "Clocked in": current.briefing.data.counts.clockedIn,
                      Late: current.briefing.data.counts.late,
                      "Not clocked in":
                        current.briefing.data.counts.notClockedIn,
                    }).map(([label, n]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{n}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p>
                  The current operational briefing is unavailable. Refresh to
                  try again.
                </p>
              )}
              {current.briefing.partial && current.briefing.data && (
                <p>Some operational information is unavailable.</p>
              )}
              <Sources sources={current.briefing.sources} />
            </section>
            <WorkflowControls date={current.briefing.data?.date ?? current.observedAt.slice(0, 10)} disabled={disabled} inspect={tool => actions.inspect?.(tool)} />
            {coverage && <CoverageActionPanel view={coverage.view} actions={coverage.actions} />}
            <div className="oa-columns">
              <section className="oa-section" aria-labelledby="oa-conversation">
                <h2 id="oa-conversation">Conversation</h2>
                {current.history.length > 0 ? (
                  <details className="oa-history" open>
                    <summary>Earlier conversation · historical context</summary>
                    {current.history.map((m, i) => (
                      <article key={i}>
                        <h3>{m.role === "user" ? "You" : "AI manager"}</h3>
                        <p className="oa-plain">{m.content}</p>
                      </article>
                    ))}
                  </details>
                ) : (
                  <p className="oa-muted">No earlier conversation.</p>
                )}
                {view.answer && (
                  <article className="oa-answer" aria-label="Latest answer">
                    <h3>Answer and reasoning</h3>
                    {view.answer.context?.notebookRevision !== undefined && view.answer.context.notebookRevision !== null && view.answer.context.notebookRevision !== saved?.revision && <p className="oa-notice">Your saved goals or tasks changed after this investigation. This answer uses earlier saved context; investigate again before relying on it for a new decision.</p>}
                    <p className="oa-plain">{comparisonPredatesSave(view.answer.coveragePlans, coverage?.view.lastSavedAt) && <strong>From an earlier comparison: </strong>}{view.answer.text}</p>
                    <WorkflowResults answer={view.answer} reviewCoverage={actions.reviewCoverage} lastSavedAt={coverage?.view.lastSavedAt} />
                    <Sources sources={view.answer.sources} />
                  </article>
                )}
                {current.connection === "unavailable" && (
                  <p className="oa-notice">
                    Your AI manager isn’t connected yet.
                  </p>
                )}
                <div className="oa-starters" aria-label="Starter questions">
                  {starters.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => actions.editQuestion(s)}
                      disabled={!!view.busy}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    actions.ask();
                  }}
                >
                  {(saved || view.focusedTaskId) && <SelectField id="oa-investigation-task" name="investigationTask" label="Investigating" value={view.focusedTaskId ?? ""} disabled={!!view.busy} options={[
                    { value: "", label: "General investigation" },
                    ...openTasks.map(t => ({ value: t.id, label: t.objective })),
                    ...(selectedUnavailable ? [{ value: view.focusedTaskId!, label: "Selected task is no longer open or available" }] : []),
                  ]} onChange={e => actions.selectTask?.(e.target.value || null)} />}
                  {selectedUnavailable && <p role="status" className="oa-notice">Choose an open task or select a general investigation to continue.</p>}
                  <label htmlFor="oa-question">Your question</label>
                  <textarea
                    id="oa-question"
                    maxLength={2000}
                    rows={4}
                    value={view.question}
                    onChange={(e) => actions.editQuestion(e.target.value)}
                    disabled={!!view.busy}
                    aria-describedby="oa-question-limit"
                  />
                  <p id="oa-question-limit" className="oa-muted">
                    {view.question.length}/2000 characters
                  </p>
                  <div className="oa-actions">
                    <button
                      className="nv-btn"
                      data-kind="primary"
                      disabled={
                        disabled ||
                        current.connection !== "available" ||
                        selectedUnavailable ||
                        !view.question.trim()
                      }
                    >
                      {view.busy === "ask" ? "Investigating…" : "Ask"}
                    </button>
                    {view.busy === "ask" && (
                      <button
                        className="nv-btn"
                        data-kind="secondary"
                        type="button"
                        onClick={actions.cancel}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </section>
              <section className="oa-section" aria-labelledby="oa-priorities">
                <h2 id="oa-priorities">Owner priorities</h2>
                <p className="oa-muted">
                  Save what matters to you for future investigations.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    actions.save();
                  }}
                >
                  <label htmlFor="oa-priority-edit">Your priorities</label>
                  <textarea
                    id="oa-priority-edit"
                    rows={5}
                    maxLength={2000}
                    value={view.priorities}
                    onChange={(e) => actions.editPriorities(e.target.value)}
                    disabled={!!view.busy}
                    aria-describedby="oa-priorities-limit"
                  />
                  <p id="oa-priorities-limit" className="oa-muted">
                    {view.priorities.length}/2000 characters
                  </p>
                  {view.conflict && (
                    <div role="alert">
                      <h3>Currently saved priorities</h3>
                      <p className="oa-plain">
                        {current.profile.priorities || "None saved."}
                      </p>
                      <button
                        type="button"
                        className="nv-btn"
                        data-kind="secondary"
                        onClick={actions.reviewConflict}
                      >
                        I’ve reviewed the saved priorities
                      </button>
                    </div>
                  )}
                  <button
                    className="nv-btn"
                    data-kind="secondary"
                    disabled={disabled || !view.dirty || view.conflict}
                  >
                    {view.busy === "save" ? "Saving…" : "Save priorities"}
                  </button>
                </form>
                {saved && actions.changeNotebook ? <NotebookPanel
                  notebook={saved}
                  date={current.briefing.data?.date ?? current.observedAt.slice(0, 10)}
                  disabled={disabled}
                  change={actions.changeNotebook}
                  selectTask={id => {
                    actions.selectTask?.(id);
                    document.getElementById("oa-question")?.focus();
                  }}
                  inspect={tool => actions.inspect?.(tool)}
                /> : <p className="oa-muted">Saved goals and tasks are unavailable. Your priorities and existing investigation tools remain available.</p>}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
export function OwnerAdvisor() {
  const [view, setView] = useState<AdvisorView>(initialView);
  const ref = useRef<ReturnType<typeof createAdvisorController> | null>(null);
  const [coverageView, setCoverageView] = useState<CoverageActionView>({stage:"idle",result:null,acknowledged:false,message:"",lastSavedAt:null});
  const comparisonTrigger = useRef<HTMLElement | null>(null);
  const coverageRef = useRef<ReturnType<typeof createCoverageActionController> | null>(null);
  useEffect(() => {
    const draft = createCoverageActionController(setCoverageView);
    coverageRef.current = draft;
    let priorSnapshot: AdvisorView["snapshot"] = null;
    const c = createAdvisorController(next => {
      setView(next);
      if (next.snapshot !== priorSnapshot) {
        priorSnapshot = next.snapshot;
        if (next.snapshot) draft.access(next.snapshot.authority, next.snapshot.validForMs); else draft.pause();
      }
    });
    ref.current = c;
    const cleanup = bindAdvisorLifecycle(
      { start: c.start, pause() { draft.pause(); c.pause(); }, stop() { draft.stop(); c.stop(); } },
      window,
      document,
      () => navigator.onLine,
    );
    return () => {
      cleanup();
      ref.current = null;
      coverageRef.current = null;
    };
  }, []);
  return (
    <AdvisorScreen
      view={view}
      coverage={{ view: coverageView, actions: {
        acknowledge: value => coverageRef.current?.acknowledge(value),
        save: async () => { await coverageRef.current?.save(); },
        recover: async () => { await coverageRef.current?.recover(); },
        check: async () => { await coverageRef.current?.check(); },
        dismiss: () => { coverageRef.current?.dismiss(); if (comparisonTrigger.current?.isConnected) comparisonTrigger.current.focus(); },
      } }}
      actions={{
        editQuestion: (s) => ref.current?.editQuestion(s),
        editPriorities: (s) => ref.current?.editPriorities(s),
        ask: () => void ref.current?.ask(),
        save: () => void ref.current?.save(),
        cancel: () => ref.current?.cancel(),
        refresh: () => ref.current?.start(),
        reviewConflict: () => ref.current?.reviewConflict(),
        reviewItem: (id, disposition) => void ref.current?.reviewItem(id, disposition),
        reviewCoverage: (plans, index) => { comparisonTrigger.current = document.activeElement as HTMLElement; void coverageRef.current?.prepare(plans, index); },
        inspect: tool => void ref.current?.inspect(tool),
        selectTask: id => ref.current?.selectTask(id),
        changeNotebook: edit => ref.current?.changeNotebook(edit) ?? Promise.resolve(false),
      }}
    />
  );
}
