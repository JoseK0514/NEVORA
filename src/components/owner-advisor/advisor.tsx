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
  actions,
}: {
  view: AdvisorView;
  actions: {
    editQuestion: (s: string) => void;
    editPriorities: (s: string) => void;
    ask: () => void;
    save: () => void;
    cancel: () => void;
    refresh: () => void;
    reviewConflict: () => void;
  };
}) {
  const current = view.snapshot;
  const disabled = !current || !!view.busy || view.uncertain;
  return (
    <div className="nv-page oa-page" data-nv-page="">
      <PageBand
        title="AI manager"
        summary="Investigate a situation and compare your options."
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
                    <p className="oa-plain">{view.answer.text}</p>
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
  useEffect(() => {
    const c = createAdvisorController(setView);
    ref.current = c;
    const pause = () => c.pause();
    const resume = () => {
      if (
        document.visibilityState !== "hidden" &&
        navigator.onLine &&
        document.hasFocus()
      )
        c.start();
    };
    const visibility = () => {
      pause();
      resume();
    };
    const focus = (e: Event) => {
      if (e.target === window) resume();
    };
    document.addEventListener("visibilitychange", visibility);
    for (const name of ["blur", "pagehide", "offline", "nevora:signout"])
      window.addEventListener(name, pause);
    for (const name of ["pageshow", "online", "storage"])
      window.addEventListener(name, visibility);
    window.addEventListener("focus", focus);
    resume();
    return () => {
      c.stop();
      ref.current = null;
      document.removeEventListener("visibilitychange", visibility);
      for (const name of ["blur", "pagehide", "offline", "nevora:signout"])
        window.removeEventListener(name, pause);
      for (const name of ["pageshow", "online", "storage"])
        window.removeEventListener(name, visibility);
      window.removeEventListener("focus", focus);
    };
  }, []);
  return (
    <AdvisorScreen
      view={view}
      actions={{
        editQuestion: (s) => ref.current?.editQuestion(s),
        editPriorities: (s) => ref.current?.editPriorities(s),
        ask: () => void ref.current?.ask(),
        save: () => void ref.current?.save(),
        cancel: () => ref.current?.cancel(),
        refresh: () => ref.current?.start(),
        reviewConflict: () => ref.current?.reviewConflict(),
      }}
    />
  );
}
