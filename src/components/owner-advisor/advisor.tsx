"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { BookOpenTextIcon } from "@phosphor-icons/react/dist/ssr/BookOpenText";
import { CashRegisterIcon } from "@phosphor-icons/react/dist/ssr/CashRegister";
import { CorpBody, CorpButton, CorpCard, CorpField, CorpNav, CorpPage, CorpRow, CorpRows, CorpSection, CorpStats, CorpTitle } from "@/components/corp/corp";
import { BCallout, BSegs, BState } from "@/components/owner-b/b-kit";
import type { AdvisorSource } from "@/lib/owner-advisor/contracts";
import type { BusinessModelEvidence } from "@/lib/owner-advisor/business/model-contracts";
import { isBusinessCitationHref } from "@/lib/owner-advisor/business/metrics";
import { BusinessCitationItem } from "./business/evidence-card";
import {
  createAdvisorController,
  initialView,
  type AdvisorView,
} from "./controller";
import "./advisor.css";
import { bindAdvisorLifecycle } from "./lifecycle";
import { AttentionSection } from "./attention";
import { WorkflowControls, WorkflowResults } from "./workflows";
import { NotebookPanel } from "./notebook-panel";
import { CoverageActionPanel } from "./coverage-actions";
import { comparisonPredatesSave } from "./coverage-plans";
import { createCoverageActionController, type CoverageActionView } from "./coverage-actions-controller";
import { dayOf, dayText, whenText, type Clock, type Lang } from "./format";
import { useAdvisorLang } from "./lang";
import { ADVISOR_COPY, type AdvisorCopy } from "./advisor-copy";
import type { NotebookEdit } from "@/lib/owner-advisor/notebook";
import type { AttentionDisposition } from "@/lib/owner-advisor/briefing-contracts";
/** Rondo's three other pages, as rows with their glyphs (the band no longer carries floating pills). */
type GuidedTools = { weekly: boolean; knowledge: boolean; business: boolean };
const TOOLS: { key: keyof GuidedTools; href: string; icon: ReactNode }[] = [
  { key: "weekly", href: "/app/ai-manager/weekly", icon: <CalendarDotsIcon weight="bold" /> },
  { key: "knowledge", href: "/app/ai-manager/knowledge", icon: <BookOpenTextIcon weight="bold" /> },
  { key: "business", href: "/app/ai-manager/business", icon: <CashRegisterIcon weight="bold" /> },
];
/** `evidence`: the answer's checked business evidence. A business citation that has some opens its figures as a card;
 * every other source, and a business citation without evidence, stays the plain link. */
/** `shownAt`: the time the card already says; a source observed at that same time doesn't say it again (Rondo fix, Nov 23). */
function Sources({ sources, evidence, clock = {}, shownAt, t, lang }: { sources: AdvisorSource[]; evidence?: BusinessModelEvidence[]; clock?: Clock; shownAt?: string; t: AdvisorCopy["screen"]; lang: Lang }) {
  if (!sources.length) return null;
  return (
    <ul className="oa-sources" aria-label={t.sources}>
      {sources.map((s, i) => isBusinessCitationHref(s.href) && evidence?.length ? <BusinessCitationItem key={i} source={s} evidence={evidence} /> : (
        <li key={i}>
          <a href={s.href}>{s.label}</a>
          {shownAt !== undefined && whenText(s.observedAt, clock.timeZone, clock.today, lang) === shownAt ? null : <span>
            {t.observed}{" "}
            <time dateTime={s.observedAt}>
              {whenText(s.observedAt, clock.timeZone, clock.today, lang)}
            </time>
          </span>}
        </li>
      ))}
    </ul>
  );
}
/* Rondo AI for the Owner (Direction B, Nov 18, 2026). The corporate kit the sibling Rondo pages wear: the teal band with
 * "Rondo AI", white cards with section labels, rows, the kit's notes, stats, fields and pills. From 1280px the tools and
 * the Owner's priorities sit in a right rail beside the briefing, the checks and the conversation; phones stack them, tools
 * first. Presentation only: every handler, request, field, limit and privacy rule is the one the page had. */
export function AdvisorScreen({
  view,
  actions, coverage, tools, lang: langProp,
}: {
  view: AdvisorView;
  /** The person's language; when left out, the hook's (useAdvisorLang). */
  lang?: Lang;
  tools: GuidedTools;
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
  const hookLang = useAdvisorLang();
  const lang = langProp ?? hookLang;
  const t = ADVISOR_COPY[lang].screen;
  const current = view.snapshot;
  const disabled = !current || !!view.busy || view.uncertain;
  const saved = current?.notebook?.state === "ready" ? current.notebook.notebook : undefined;
  const openTasks = saved?.tasks.filter(t => t.state === "open") ?? [];
  const selectedUnavailable = !!view.focusedTaskId && !openTasks.some(t => t.id === view.focusedTaskId);
  const data = current?.briefing.data ?? null;
  // Instants read in the workspace's zone when the briefing names it (else the device's, as before); "today" is the
  // briefing's own date, so a time from today reads "9:27 PM" and an older one "Tue, Nov 17, 4:05 PM".
  const clock: Clock = current ? { timeZone: data?.timeZone, today: data?.date ?? current.attention?.date ?? dayOf(current.observedAt, data?.timeZone) } : {};
  const year = clock.today?.slice(0, 4);
  const workDate = data?.date ?? current?.observedAt.slice(0, 10) ?? "";
  return (
    <CorpPage className="c-page--wide oa" labelledBy="oa-title">
      <CorpNav phoneOnly back={{ href: "/app/more", label: t.back }} title="Rondo AI" titleId="oa-nav-title" />
      <CorpTitle wide id="oa-title" title="Rondo AI" sub={t.sub} />
      {view.message && (
        <CorpCard as="div">
          <div className="oa-pad oa-pad--y">
            <BCallout tone="teal" role="status">{view.message}</BCallout>
          </div>
        </CorpCard>
      )}
      {!current ? (
        <CorpCard as="div">
          {view.loading
            ? <BState kind="loading" title={t.loading} />
            : <BState kind="locked" icon={<EyeSlashIcon weight="bold" />} title={t.hiddenTitle} line={t.hiddenLine}
                action={{ label: t.refreshHistory, onClick: actions.refresh }} />}
        </CorpCard>
      ) : (
        <div className="oa-layout">
          {TOOLS.some(tool => tools[tool.key]) && <nav className="oa-tools" aria-label={t.toolsLabel}>
            <CorpCard as="div">
              <CorpRows>
                {TOOLS.filter(tool => tools[tool.key]).map(tool => <li key={tool.href}><CorpRow one href={tool.href} icon={tool.icon} title={t.tools[tool.key]} /></li>)}
              </CorpRows>
            </CorpCard>
          </nav>}
          <div className="oa-main">
            {current.attention && <AttentionSection briefing={current.attention} disabled={disabled} saving={view.busy === "review"} review={(id, disposition) => actions.reviewItem?.(id, disposition)} refresh={actions.refresh} clock={clock} lang={lang} />}
            <CorpSection id="oa-briefing" label={t.liveBriefing}
              aside={<button type="button" className="c-link oa-headbtn" onClick={actions.refresh}>{t.refreshHistory}</button>}>
              <CorpCard as="div">
                {data ? (
                  <>
                    <p className="oa-facts oa-pad oa-pad--top">
                      <BSegs parts={[data.companyName, dayText(data.date, lang, year),
                        <>{t.observed} <time dateTime={current.briefing.observedAt}>{whenText(current.briefing.observedAt, clock.timeZone, clock.today, lang)}</time></>]} />
                    </p>
                    <CorpStats items={[
                      { label: t.stats.scheduled, value: data.counts.scheduled },
                      { label: t.stats.clockedIn, value: data.counts.clockedIn },
                      { label: t.stats.late, value: data.counts.late },
                      { label: t.stats.notClockedIn, value: data.counts.notClockedIn },
                    ]} />
                  </>
                ) : (
                  <BState kind="failed" silent title={t.briefingUnavailable} line={t.refreshToTry} />
                )}
                {current.briefing.partial && data && (
                  <div className="oa-pad"><BCallout tone="amber">{t.briefingPartial}</BCallout></div>
                )}
                <Sources sources={current.briefing.sources} clock={clock} t={t} lang={lang} shownAt={data ? whenText(current.briefing.observedAt, clock.timeZone, clock.today, lang) : undefined} />
              </CorpCard>
            </CorpSection>
            <WorkflowControls weeklyEnabled={tools.weekly} date={workDate} disabled={disabled} inspect={tool => actions.inspect?.(tool)} lang={lang} />
            {coverage && <CoverageActionPanel view={coverage.view} actions={coverage.actions} />}
            <CorpSection id="oa-conversation" label={t.conversation}>
              <CorpCard as="div">
                {current.connection === "unavailable" && (
                  <div className="oa-pad oa-pad--top">
                    <BCallout tone="teal" title={t.answersOffTitle}>
                      {t.answersOffLine}
                    </BCallout>
                  </div>
                )}
                {current.history.length > 0 ? (
                  <details className="oa-fold oa-history" open>
                    <summary><span>{t.earlier}</span></summary>
                    {current.history.map((m, i) => (
                      <article key={i} className="oa-msg">
                        <h3 className="oa-msg__who">{m.role === "user" ? t.you : t.rondo}</h3>
                        <p className="oa-plain oa-msg__text">{m.content}</p>
                      </article>
                    ))}
                  </details>
                ) : (
                  <p className="oa-empty">{t.noEarlier}</p>
                )}
                {view.answer && (
                  <article className="oa-answer" aria-label={t.latestAnswer}>
                    <h3 className="oa-sub">{t.answerTitle}</h3>
                    {view.answer.context?.notebookRevision !== undefined && view.answer.context.notebookRevision !== null && view.answer.context.notebookRevision !== saved?.revision && <BCallout tone="amber">{t.contextChanged}</BCallout>}
                    <p className="oa-plain oa-answer__text">{comparisonPredatesSave(view.answer.coveragePlans, coverage?.view.lastSavedAt) && <strong>{t.earlierComparison}</strong>}{view.answer.text}</p>
                    <WorkflowResults answer={view.answer} reviewCoverage={actions.reviewCoverage} lastSavedAt={coverage?.view.lastSavedAt} clock={clock} lang={lang} />
                    <Sources sources={view.answer.sources} evidence={view.answer.businessEvidence} clock={clock} t={t} lang={lang} />
                  </article>
                )}
                <h3 className="c-card__sub oa-starters__label" id="oa-starters">{t.startersLabel}</h3>
                <ul className="oa-starters" aria-labelledby="oa-starters">
                  {t.starters.map((s) => <li key={s}><button type="button" className="oa-addrow oa-starter" disabled={!!view.busy} onClick={() => actions.editQuestion(s)}>{s}</button></li>)}
                </ul>
                <form
                  className="oa-form oa-pad oa-ask"
                  onSubmit={(e) => {
                    e.preventDefault();
                    actions.ask();
                  }}
                >
                  {(saved || view.focusedTaskId) && <CorpField label={t.investigating} htmlFor="oa-investigation-task">
                    <select className="c-in" id="oa-investigation-task" name="investigationTask" value={view.focusedTaskId ?? ""} disabled={!!view.busy} onChange={e => actions.selectTask?.(e.target.value || null)}>
                      <option value="">{t.general}</option>
                      {openTasks.map(t => <option key={t.id} value={t.id}>{t.objective}</option>)}
                      {selectedUnavailable ? <option value={view.focusedTaskId!}>{t.taskGone}</option> : null}
                    </select>
                  </CorpField>}
                  {selectedUnavailable && <BCallout tone="amber" role="status">{t.chooseTask}</BCallout>}
                  <div className="c-field">
                    <label className="c-field__label" htmlFor="oa-question">{t.question}</label>
                    <textarea
                      className="c-in oa-area"
                      id="oa-question"
                      maxLength={2000}
                      rows={4}
                      value={view.question}
                      onChange={(e) => actions.editQuestion(e.target.value)}
                      disabled={!!view.busy}
                      aria-describedby="oa-question-limit"
                    />
                    <span id="oa-question-limit" className="c-field__help oa-help">
                      {t.characters(view.question.length)}
                    </span>
                  </div>
                  <div className="oa-acts oa-acts--end">
                    {view.busy === "ask" && (
                      <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" onClick={actions.cancel}>
                        {t.cancel}
                      </CorpButton>
                    )}
                    <CorpButton
                      type="submit"
                      kind="primary"
                      size="md"
                      disabled={
                        disabled ||
                        current.connection !== "available" ||
                        selectedUnavailable ||
                        !view.question.trim()
                      }
                    >
                      {view.busy === "ask" ? t.asking : t.ask}
                    </CorpButton>
                  </div>
                </form>
              </CorpCard>
            </CorpSection>
          </div>
          <div className="oa-side">
            <CorpSection id="oa-priorities" label={t.priorities}>
              <CorpCard as="div">
                <CorpBody>
                  <form
                    className="oa-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      actions.save();
                    }}
                  >
                    <p className="oa-lede">{t.prioritiesLede}</p>
                    <div className="c-field">
                      <label className="c-field__label" htmlFor="oa-priority-edit">{t.yourPriorities}</label>
                      <textarea
                        className="c-in oa-area"
                        id="oa-priority-edit"
                        rows={5}
                        maxLength={2000}
                        value={view.priorities}
                        onChange={(e) => actions.editPriorities(e.target.value)}
                        disabled={!!view.busy}
                        aria-describedby="oa-priorities-limit"
                      />
                      <span id="oa-priorities-limit" className="c-field__help oa-help">
                        {t.characters(view.priorities.length)}
                      </span>
                    </div>
                    {view.conflict && (
                      <BCallout tone="amber" role="alert" heading="h3" title={t.savedPriorities}
                        action={{ label: t.reviewedSaved, onClick: actions.reviewConflict }}>
                        <p className="oa-plain">{current.profile.priorities || t.noneSaved}</p>
                      </BCallout>
                    )}
                    <div className="oa-acts oa-acts--end">
                      <CorpButton type="submit" kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled || !view.dirty || view.conflict}>
                        {view.busy === "save" ? t.saving : t.savePriorities}
                      </CorpButton>
                    </div>
                  </form>
                </CorpBody>
                {saved && actions.changeNotebook ? <NotebookPanel
                  notebook={saved}
                  date={workDate}
                  disabled={disabled}
                  change={actions.changeNotebook}
                  selectTask={id => {
                    actions.selectTask?.(id);
                    document.getElementById("oa-question")?.focus();
                  }}
                  inspect={tool => actions.inspect?.(tool)}
                  clock={clock}
                /> : <p className="oa-foot oa-foot--card">{t.notebookUnavailable}</p>}
              </CorpCard>
            </CorpSection>
          </div>
        </div>
      )}
    </CorpPage>
  );
}
export function OwnerAdvisor({ tools }: { tools: GuidedTools }) {
  const lang = useAdvisorLang();
  // The controller writes its status messages in the language the page opened in.
  const langRef = useRef(lang);
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
    }, fetch, langRef.current);
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
      lang={lang}
      tools={tools}
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
