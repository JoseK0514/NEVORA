"use client";
import { useViewLang } from "@/components/owner-b/use-owner-lang";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarXIcon } from "@phosphor-icons/react/dist/ssr/CalendarX";
import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import { HourglassMediumIcon } from "@phosphor-icons/react/dist/ssr/HourglassMedium";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { CorpCard, CorpNav, CorpPage, CorpTitle } from "@/components/corp/corp";
import { BCallout, BCard, BChip, BHero, BNote, BScreen, BStack, BState } from "@/components/owner-b/b-kit";
import { timeZoneLabel } from "@/lib/time-zone-label";
import { createRestrictionsClient, newOperationId, type RestrictionRequest, type RestrictionsClient, type RestrictionsCommand, type RestrictionsScope, type RestrictionsSnapshot, type CommandOutcome } from "@/lib/scheduling/restrictions-client";
import {
  admissibleMondays, allowedByDay, changedDays, cleanNote, decidedRequests, findReceipt, firstAdmissible, openPlan, planAllowed, planFromUnavailable, planProblems, unavailableFromPlan,
  versionInEffect, versionsAhead, waitingRequests, workplaceWeek, type PlanProblem, type WeekPlan,
} from "@/lib/scheduling/restrictions-week";
import { dayText, instantText, restrictionsCopy, type RestrictionsCopy, type RestrictionsLang } from "./copy";
import { WeekEditor, WeekView } from "./week";
import { DiscardDialog } from "@/components/kit/discard-dialog";
import { useDiscardGuard } from "@/components/kit/use-discard-guard";

/* Scheduling restrictions (U02, Nov 17, 2026): the times a manager and an employee agreed the person can be scheduled.
 * One screen for both sides. Owners and Managers open it from the person's page (the corporate kit the Direction B
 * layers dress, as that page is); an Employee or Lead opens their own from Availability (the Direction B screen their
 * shell shows at every width). Flow: view, then edit, then review, then one command. A command is made once, when the
 * person confirms, and is kept whole (target, operation, contents, expected revision) until its result is known; an
 * unconfirmed one is checked against the document and only ever sent again unchanged. Nothing here approves for an
 * employee: their side can only send a request. */

type Kit = "corp" | "b";
type Load = { state: "loading" } | { state: "ready"; snapshot: RestrictionsSnapshot } | { state: "failed" | "offline" | "signed_out" | "access" | "denied" };
type Step = "view" | "edit" | "review";
type Draft = { kind: "SET" | "REQUEST"; plan: WeekPlan; week: string; note: string };
type Deciding = { requestId: string; decision: "APPROVE" | "DENY"; week: string; note: string };
type Custody = { command: RestrictionsCommand; status: "sending" | "unknown" | "checking" | "not_saved" | "still_unknown" | "unsent" };
type Issue = { kind: "conflict"; decision: boolean } | { kind: "locked"; asked: string; next: string | null; decision: boolean } | { kind: "invalid" | "capacity" | "denied" };

export type RestrictionsScreenProps = {
  scope: RestrictionsScope; employeeId: string; actorId: string; view: string; timeZone: string;
  /** The person's full and first name (management), for sentences. An Employee's own screen says "you". */
  name: string; firstName: string;
  /** Where the page's back link goes: the person's page (its label is their first name) or Availability. */
  backHref: string;
  /** Management only: where the hours the person entered are shown, and whether this is an Owner's record. */
  availabilityHref?: string; ownerRecord?: boolean;
  lang?: RestrictionsLang; client?: RestrictionsClient; now?: Date;
  /** Tests: open on a step or with a result already in hand. */
  initial?: { load?: Load; step?: Step; draft?: Draft; deciding?: Deciding; custody?: Custody; issue?: Issue };
};

const TITLE_ID = "rs-title";

function Frame({ kit, title, sub, back, children }: { kit: Kit; title: string; sub?: string; back: { href: string; label: string }; children: ReactNode }) {
  if (kit === "b") return <CorpPage className="c-page--narrow rs rs--b" labelledBy={TITLE_ID}>
    <BScreen back><BHero back={back} title={title} titleId={TITLE_ID} sub={sub} /><BStack>{children}</BStack></BScreen>
  </CorpPage>;
  return <CorpPage className="c-page--narrow rs rs--c" labelledBy={TITLE_ID}>
    <CorpNav back={back} title={title} titleId="rs-nav-title" phoneOnly />
    <CorpTitle id={TITLE_ID} title={title} sub={sub} wide focusTarget />
    {children}
  </CorpPage>;
}
function Card({ kit, id, title, aside, label, children }: { kit: Kit; id?: string; title?: string; aside?: ReactNode; label?: string; children: ReactNode }) {
  return kit === "b" ? <BCard id={id} title={title} chip={aside} label={label}>{children}</BCard>
    : <CorpCard id={id} label={title} aside={aside} ariaLabel={title ? undefined : label}>{children}</CorpCard>;
}
type ActKind = "teal" | "ghost" | "quiet" | "text";
function Act({ kind, children, onClick, disabled, busy, label, id }: { kind: ActKind; children: ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean; label?: string; id?: string }) {
  // Premium pass FA: every pill here is a decision, so it is drawn on the ladder's 44px (rs-act, b-restrictions.css) at
  // every width, and the quiet one is the white edged pill (the grey fill is the disabled one's).
  const cls = kind === "text" ? "b-btn b-btn--quiet b-rowact b-rowact--quiet" : `b-btn b-btn--${kind} rs-act`;
  return <button type="button" id={id} className={cls} aria-label={label} aria-busy={busy || undefined} disabled={disabled || busy} onClick={onClick}>{children}</button>;
}

function Skeleton({ kit, t }: { kit: Kit; t: RestrictionsCopy }) {
  return <Card kit={kit} label={t.loading}><div className="rs-skel" role="status" aria-busy="true"><span className="rs-sr">{t.loading}</span>
    <span className="rs-skel__bar rs-skel__bar--head" aria-hidden="true" />
    {Array.from({ length: 7 }, (_, index) => <span key={index} className="rs-skel__row" aria-hidden="true"><span className="rs-skel__bar rs-skel__bar--day" /><span className="rs-skel__bar" style={{ width: `${[38, 30, 38, 26, 38, 22, 22][index]}%` }} /></span>)}
  </div></Card>;
}

export function RestrictionsScreen(props: RestrictionsScreenProps) {
  const { scope, employeeId, actorId, view, timeZone, name, firstName, backHref, availabilityHref, ownerRecord, lang: langProp, initial } = props;
  const lang = useViewLang(langProp);
  const t = restrictionsCopy(lang), kit: Kit = scope === "employee" ? "b" : "corp", management = scope === "management";
  const back = { href: backHref, label: management ? firstName : t.backAvailability };
  const client = useMemo(() => props.client ?? createRestrictionsClient({ scope, actorId, view }), [props.client, scope, actorId, view]);
  const [load, setLoad] = useState<Load>(initial?.load ?? { state: "loading" });
  const [step, setStep] = useState<Step>(initial?.step ?? "view");
  const [draft, setDraft] = useState<Draft | null>(initial?.draft ?? null);
  const [deciding, setDeciding] = useState<Deciding | null>(initial?.deciding ?? null);
  const [custody, setCustody] = useState<Custody | null>(initial?.custody ?? null);
  const [issue, setIssue] = useState<Issue | null>(initial?.issue ?? null);
  const [problems, setProblems] = useState<PlanProblem[]>([]);
  const [said, setSaid] = useState("");
  /* Phase 7 (moments): the last command the server confirmed, shown as the shared done state at the top of the view (the
   * form it came from is gone). It replaces the toast; the live line above the page says it once. */
  const [landed, setLanded] = useState<{ title: string; checked: boolean } | null>(null);
  const week = useMemo(() => workplaceWeek(props.now ?? new Date(), timeZone), [props.now, timeZone]);
  const shownStep = useRef(step);
  // The request as it was opened, to tell a changed request from an untouched one ("Discard changes?").
  const [draftStart, setDraftStart] = useState("");
  const issueRef = useRef<HTMLDivElement>(null), problemRef = useRef<HTMLParagraphElement>(null);

  const reload = useCallback((signal?: AbortSignal): Promise<RestrictionsSnapshot | null> => client.read(employeeId, signal).then(result => {
    if (signal?.aborted) return null;
    if (result.kind === "ready") { setLoad({ state: "ready", snapshot: result.snapshot }); return result.snapshot; }
    if (result.kind === "unavailable") { setLoad(old => old.state === "ready" ? old : { state: typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "failed" }); return null; }
    // The session, the page's authority or the person's record is no longer ours to show: what was on screen is dropped.
    setLoad({ state: result.kind }); setCustody(null); setIssue(null); setDraft(null); setDeciding(null); setStep("view");
    return null;
  }), [client, employeeId]);

  useEffect(() => {
    if (initial?.load) return;
    const controller = new AbortController();
    void reload(controller.signal);
    const online = () => { void reload(); };
    window.addEventListener("online", online);
    return () => { controller.abort(); window.removeEventListener("online", online); };
  }, [reload, initial?.load]);
  // An unconfirmed command is held only on this page: leaving would lose the one safe way to check it.
  useEffect(() => {
    if (!custody) return;
    const hold = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", hold);
    return () => window.removeEventListener("beforeunload", hold);
  }, [custody]);
  // A new step puts focus on its title (the phone header's or the band's, whichever is shown).
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    const title = [...document.querySelectorAll<HTMLElement>(".rs h1")].find(heading => heading.getClientRects().length > 0);
    if (!title) return;
    if (!title.hasAttribute("tabindex")) title.tabIndex = -1;
    title.focus();
    window.scrollTo({ top: 0 });
  }, [step]);
  // A result that needs a decision is said at the top: bring it into view and focus it.
  const trouble = custody && custody.status !== "sending" ? custody.status : issue?.kind ?? null;
  useEffect(() => {
    if (!trouble) return;
    const card = issueRef.current;
    card?.scrollIntoView({ block: "center", behavior: typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    card?.focus({ preventScroll: true });
  }, [trouble]);

  const snapshot = load.state === "ready" ? load.snapshot : null;
  const document_ = snapshot?.document ?? null;
  const latest = document_?.versions.at(-1) ?? null;

  const done = useCallback(async (command: RestrictionsCommand, outcome: Extract<CommandOutcome, { kind: "saved" }>, checked = false) => {
    setCustody(null); setIssue(null); setDraft(null); setDeciding(null); setProblems([]);
    setLoad(old => ({ state: "ready", snapshot: { document: outcome.snapshot.document, legacyUnconfirmed: outcome.snapshot.legacyUnconfirmed, earliestWeek: old.state === "ready" ? old.snapshot.earliestWeek : week } }));
    setStep("view");
    const message = command.kind === "DECIDE" ? (command.decision === "APPROVE" ? t.approvedToast : t.declinedToast) : command.kind === "SET" ? t.savedToast : t.sentToast;
    setSaid(checked ? `${t.confirmedSaved} ${message}` : message);
    setLanded({ title: message, checked });
    // The first Monday a next version may start moved with this save: read it again rather than work it out here.
    await reload();
  }, [reload, t, week]);

  const settle = useCallback(async (command: RestrictionsCommand, outcome: CommandOutcome) => {
    const decision = command.kind === "DECIDE";
    if (outcome.kind === "saved") { await done(command, outcome); return; }
    if (outcome.kind === "unknown") { setCustody({ command, status: "unknown" }); return; }
    if (outcome.kind === "unsent") { setCustody({ command, status: "unsent" }); return; }
    setCustody(null);
    if (outcome.kind === "signed_out" || outcome.kind === "access") { setLoad({ state: outcome.kind }); setDraft(null); setDeciding(null); setIssue(null); setStep("view"); return; }
    if (outcome.kind === "conflict") { await reload(); setDeciding(null); setStep("view"); setIssue({ kind: "conflict", decision }); return; }
    if (outcome.kind === "locked") {
      // Re-read before any deliberate review: the bound in the refusal can be missing after a race.
      const fresh = await reload(), asked = "effectiveWeek" in command ? command.effectiveWeek : week;
      const next = [outcome.earliestWeek, fresh?.earliestWeek].filter((value): value is string => !!value && value > asked).sort().at(-1) ?? null;
      setStep("view"); setIssue({ kind: "locked", asked, next, decision }); return;
    }
    setIssue({ kind: outcome.kind });
  }, [done, reload, week]);

  const send = useCallback(async (command: RestrictionsCommand) => {
    setIssue(null); setSaid(""); setLanded(null);
    setCustody({ command, status: "sending" });
    await settle(command, await client.command(employeeId, command));
  }, [client, employeeId, settle]);

  /** Unknown result: look for the original operation in the document. Found means saved. Not found means it is not there
   * now; the same command may be sent again, and the server saves it once. */
  const check = useCallback(async () => {
    if (!custody) return;
    const command = custody.command;
    setCustody({ command, status: "checking" });
    const result = await client.read(employeeId);
    if (result.kind !== "ready") {
      if (result.kind === "unavailable") { setCustody({ command, status: "still_unknown" }); return; }
      setCustody(null); setLoad({ state: result.kind }); return;
    }
    const receipt = findReceipt(result.snapshot.document, command.operationId);
    if (receipt) { await done(command, { kind: "saved", receipt, snapshot: { document: result.snapshot.document, legacyUnconfirmed: result.snapshot.legacyUnconfirmed }, changed: false }, true); return; }
    setLoad({ state: "ready", snapshot: result.snapshot });
    setCustody({ command, status: "not_saved" });
  }, [client, custody, done, employeeId]);
  const resend = useCallback(async () => {
    if (!custody) return;
    const command = custody.command;
    setCustody({ command, status: "sending" });
    await settle(command, await client.command(employeeId, command));
  }, [client, custody, employeeId, settle]);

  const startEdit = (plan?: WeekPlan) => {
    if (!snapshot) return;
    setIssue(null); setProblems([]); setDeciding(null);
    const fresh: Draft = { kind: management ? "SET" : "REQUEST", plan: plan ?? (latest ? planFromUnavailable(latest.unavailable) : openPlan()), week: snapshot.earliestWeek, note: "" };
    setDraftStart(JSON.stringify(fresh));
    setDraft(fresh);
    setLanded(null); setStep("edit");
  };
  const toReview = () => {
    if (!draft) return;
    const found = planProblems(draft.plan);
    setProblems(found);
    if (found.length) { requestAnimationFrame(() => problemRef.current?.focus()); return; }
    setStep("review");
  };
  const confirmDraft = () => {
    if (!draft || !snapshot || custody) return;
    void send({ kind: draft.kind, operationId: newOperationId(), expectedRevision: snapshot.document.revision, effectiveWeek: firstAdmissible(draft.week, snapshot.earliestWeek), unavailable: unavailableFromPlan(draft.plan),
      reason: cleanNote(draft.note) || (draft.kind === "SET" ? t.defaultReasonSet : t.defaultReasonRequest) });
  };
  const confirmDecision = () => {
    if (!deciding || !snapshot || custody) return;
    const base = { kind: "DECIDE" as const, operationId: newOperationId(), expectedRevision: snapshot.document.revision, requestId: deciding.requestId };
    void send(deciding.decision === "APPROVE" ? { ...base, decision: "APPROVE", effectiveWeek: deciding.week, reason: cleanNote(deciding.note) || t.defaultReasonApprove }
      : { ...base, decision: "DENY", reason: cleanNote(deciding.note) || t.defaultReasonDecline });
  };

  const busy = custody !== null;
  /* "Discard changes?" on the Employee's own request (Jose, Nov 21, 2026): leaving, or Cancel, with a request that was
   * changed and not sent asks first. A request opened and left untouched, one being sent, and the Owner's and
   * Manager's side of this screen never ask here. */
  const guard = useDiscardGuard(scope === "employee" && step !== "view" && draft !== null && !busy && JSON.stringify(draft) !== draftStart);
  // The week a draft names is never before the bound the last read gave: the picker offers only admissible Mondays.
  const draftWeek = draft && snapshot ? firstAdmissible(draft.week, snapshot.earliestWeek) : draft?.week ?? week;
  const title = step === "edit" ? (management ? t.titleEditManagement : latest ? t.titleEditEmployee : t.askFirst) : step === "review" ? (management ? t.titleReviewManagement : t.titleReviewEmployee) : management ? t.titleManagement : t.titleEmployee;
  const sub = management ? name : step === "view" ? t.subEmployee : undefined;
  // A note the person did not write (the stock reason a command carries when the note is left empty) is not shown.
  const otherDefaults = restrictionsCopy(lang === "en" ? "es" : "en");
  const stock = new Set([t.defaultReasonSet, t.defaultReasonRequest, t.defaultReasonApprove, t.defaultReasonDecline, otherDefaults.defaultReasonSet, otherDefaults.defaultReasonRequest, otherDefaults.defaultReasonApprove, otherDefaults.defaultReasonDecline]);
  const noteLine = (text: string) => stock.has(text) ? null : <p className="rs-note">{t.note(text)}</p>;
  const weekLabel = management ? t.weekLabel(firstName) : t.weekLabelOwn;

  /* ---- The card that says a command needs attention ---------------------------------------------------------------- */
  let attention: ReactNode = null;
  if (custody && custody.status !== "sending") {
    const status = custody.status;
    attention = status === "unsent" ? <BState alert kind="failed" title={t.unsentTitle} line={t.unsentBody} action={{ label: t.sendAgain, onClick: () => void resend() }} />
      : status === "not_saved" ? <BState alert kind="paused" icon={<HourglassMediumIcon weight="bold" />} title={t.notSavedTitle} line={t.notSavedBody} action={{ label: t.sendAgain, onClick: () => void resend() }}>
        <span className="rs-acts"><Act kind="text" onClick={() => { setCustody(null); setIssue(null); }}>{t.discard}</Act></span></BState>
      : <BState alert kind="paused" icon={<QuestionIcon weight="bold" />} title={status === "still_unknown" ? t.stillUnknownTitle : t.unknownTitle} line={status === "still_unknown" ? t.stillUnknownBody : t.unknownBody}
        action={{ label: status === "checking" ? t.checking : t.checkNow, onClick: () => void check(), busy: status === "checking" }} />;
  } else if (issue) {
    attention = issue.kind === "conflict" ? <BState alert kind="paused" icon={<WarningIcon weight="bold" />} title={t.conflictTitle} line={issue.decision ? t.conflictDecisionBody : t.conflictBody}>
        <span className="rs-acts">{!issue.decision && draft ? <Act kind="ghost" onClick={() => { if (snapshot) setDraft({ ...draft, week: firstAdmissible(draft.week, snapshot.earliestWeek) }); setIssue(null); setStep("edit"); }}>{t.reviewAgain}</Act> : null}
          <Act kind="text" onClick={() => { setIssue(null); if (!issue.decision) setDraft(null); }}>{!issue.decision && draft ? t.discard : t.close}</Act></span></BState>
      : issue.kind === "locked" ? <BState alert kind="paused" icon={<CalendarXIcon weight="bold" />} title={t.lockedTitle} line={issue.next ? t.lockedBody(dayText(issue.asked, t), dayText(issue.next, t)) : t.lockedBodyUnknown(dayText(issue.asked, t))}>
        <span className="rs-acts">{issue.next && !issue.decision && draft ? <Act kind="ghost" onClick={() => { setDraft({ ...draft, week: issue.next as string }); setIssue(null); setStep("review"); }}>{t.useWeek(dayText(issue.next, t))}</Act> : null}
          {!issue.decision && draft ? <Act kind="text" onClick={() => { if (snapshot) setDraft({ ...draft, week: firstAdmissible(draft.week, issue.next ?? snapshot.earliestWeek) }); setIssue(null); setStep("edit"); }}>{t.chooseWeek}</Act> : <Act kind="text" onClick={() => setIssue(null)}>{t.close}</Act>}</span></BState>
      : issue.kind === "denied" ? <BState alert kind="locked" title={t.deniedCommandTitle} line={t.deniedCommandBody}><span className="rs-acts"><Act kind="text" onClick={() => setIssue(null)}>{t.close}</Act></span></BState>
      : <BState alert kind="failed" title={issue.kind === "capacity" ? t.capacityTitle : t.invalidTitle} line={issue.kind === "capacity" ? t.capacityBody : t.invalidBody}><span className="rs-acts"><Act kind="text" onClick={() => setIssue(null)}>{t.close}</Act></span></BState>;
  }
  const landedCard = landed && !attention ? <div className="rs-landed"><Card kit={kit} label={landed.title}><BState silent kind="done" title={landed.title}>
    {landed.checked ? <p className="b-done__fact">{t.confirmedSaved}</p> : null}</BState></Card></div> : null;
  const attentionCard = attention ? <div className="rs-issue" ref={issueRef} tabIndex={-1}><Card kit={kit} label={t.unknownTitle}>{attention}</Card></div> : null;

  /* ---- Whole-page states ------------------------------------------------------------------------------------------ */
  let body: ReactNode;
  if (load.state === "loading") body = <Skeleton kit={kit} t={t} />;
  else if (load.state !== "ready") {
    const state = load.state;
    body = <div className="rs-state"><Card kit={kit} label={title}>{
      state === "offline" ? <BState alert kind="offline" title={t.offlineTitle} line={t.offlineBody} action={{ retry: true, label: t.tryAgain, onClick: () => { setLoad({ state: "loading" }); void reload(); } }} />
      : state === "failed" ? <BState alert kind="failed" title={t.failedTitle} line={t.failedBody} action={{ retry: true, label: t.tryAgain, onClick: () => { setLoad({ state: "loading" }); void reload(); } }} />
      : state === "signed_out" ? <BState alert kind="locked" title={t.signedOutTitle} line={t.signedOutBody} action={{ label: t.signIn, href: "/login" }} />
      : state === "access" ? <BState alert kind="locked" title={t.accessTitle} line={t.accessBody} action={{ label: t.reload, onClick: () => window.location.reload() }} />
      : management ? <BState kind="locked" title={ownerRecord ? t.deniedOwnerTitle : t.deniedLocationsTitle} line={ownerRecord ? t.deniedOwnerBody : t.deniedLocationsBody(firstName)} action={{ label: t.backToPerson(firstName), href: back.href }} />
      : <BState kind="locked" title={t.deniedEmployeeTitle} line={t.deniedEmployeeBody} />
    }</Card></div>;
  } else if (step === "edit" && draft) {
    // Only Mondays the server's bound admits; a chosen week past the list (after "Use …") is kept in it.
    const mondays = admissibleMondays(snapshot!.earliestWeek), options = mondays.includes(draftWeek) ? mondays : [...mondays, draftWeek];
    body = <>
      {attentionCard}
      <Card kit={kit} id="rs-edit" title={management ? t.editCardManagement(firstName) : t.editCardEmployee}>
        <WeekEditor plan={draft.plan} onChange={plan => { setDraft({ ...draft, plan }); if (problems.length) setProblems(planProblems(plan)); }} t={t} problems={problems} />
        <p className="rs-zone">{t.zone(timeZoneLabel(timeZone))}</p>
      </Card>
      <Card kit={kit} id="rs-start" title={t.startCard}>
        <div className="rs-fields">
          <div className="rs-field"><label className="rs-field__l" htmlFor="rs-week">{management ? t.startLabelManagement : t.startLabelEmployee}</label>
            <select id="rs-week" className="c-in rs-in" value={draftWeek} disabled={busy} aria-describedby="rs-week-help" onChange={event => setDraft({ ...draft, week: event.target.value })}>
              {options.map(monday => <option key={monday} value={monday}>{dayText(monday, t)}</option>)}</select>
            <p className="rs-field__h" id="rs-week-help">{management ? t.startHelpManagement(dayText(snapshot!.earliestWeek, t)) : t.startHelpEmployee}</p></div>
          <div className="rs-field"><label className="rs-field__l" htmlFor="rs-note">{management ? t.noteManagement : t.noteEmployee}</label>
            <input id="rs-note" className="c-in rs-in" type="text" maxLength={500} autoComplete="off" value={draft.note} disabled={busy} aria-describedby={management ? "rs-note-help" : undefined} onChange={event => setDraft({ ...draft, note: event.target.value })} />
            {management ? <p className="rs-field__h" id="rs-note-help">{t.noteManagementHelp}</p> : null}</div>
        </div>
      </Card>
      {problems.length ? <p className="rs-err rs-err--sum" ref={problemRef} tabIndex={-1} role="alert"><WarningCircleIcon size={16} weight="bold" aria-hidden="true" />{t.problemSummary(problems.length)}</p> : null}
      <div className="rs-foot"><Act kind="text" disabled={busy} onClick={() => guard.leave(() => { setDraft(null); setProblems([]); setStep("view"); })}>{t.cancel}</Act><Act kind="teal" disabled={busy} onClick={toReview}>{t.review}</Act></div>
    </>;
  } else if (step === "review" && draft) {
    const unavailable = unavailableFromPlan(draft.plan), date = dayText(draftWeek, t);
    const changed = latest ? changedDays(latest.unavailable, unavailable) : [], dayNames = changed.map(day => t.days[day]);
    const open = unavailable.length === 0;
    const sentence = !management ? t.reviewRequest(date) : open ? t.reviewOpen(firstName, date) : !latest ? t.reviewFirst(firstName, date) : changed.length ? t.reviewChange(firstName, date, dayNames) : t.reviewSame(date);
    const sending = custody?.status === "sending";
    body = <>
      {attentionCard}
      <Card kit={kit} id="rs-review" title={t.starts(date)}>
        <div className="rs-review">
          <p className="rs-review__p">{sentence}</p>
          {!management && latest && changed.length ? <p className="rs-review__p rs-review__p--2">{t.reviewRequestDays(dayNames)}</p> : null}
          {management ? <p className="rs-review__p rs-review__p--2">{t.reviewUntil}</p> : null}
        </div>
        <WeekView allowed={planAllowed(draft.plan)} changed={latest ? changed : undefined} t={t} label={weekLabel} />
        {cleanNote(draft.note) ? <p className="rs-note rs-note--in">{t.note(cleanNote(draft.note))}</p> : null}
        <p className="rs-zone">{t.zone(timeZoneLabel(timeZone))}</p>
      </Card>
      <div className="rs-foot"><Act kind="text" disabled={busy} onClick={() => setStep("edit")}>{t.backToEdit}</Act>
        <Act kind="teal" busy={sending} disabled={busy} onClick={confirmDraft}>{management ? (sending ? t.saving : t.save) : (sending ? t.sending : t.send)}</Act></div>
    </>;
  } else {
    const current = versionInEffect(document_!.versions, week), ahead = versionsAhead(document_!.versions, week);
    const waiting = waitingRequests(document_!), decided = decidedRequests(document_!).slice(0, 5);
    const mainKind: ActKind = attention || deciding ? "ghost" : "teal";
    const requestRow = (request: RestrictionRequest) => {
      const changed = latest ? changedDays(latest.unavailable, request.unavailable) : [];
      const asked = instantText(request.requestedAt, timeZone, t), open = request.unavailable.length === 0;
      const what = open ? t.asksOpen : !latest ? null : changed.length ? t.daysChange(changed.length) : t.noDaysChange;
      const mine = deciding?.requestId === request.id ? deciding : null;
      const offered = firstAdmissible(request.effectiveWeek, snapshot!.earliestWeek);
      const mondays = admissibleMondays(snapshot!.earliestWeek);
      const sending = custody?.status === "sending" && custody.command.kind === "DECIDE" && custody.command.requestId === request.id;
      return <li key={request.id} className="rs-req">
        <div className="rs-req__h"><span className="rs-req__t">{management ? t.askedOn(asked) : t.sentOn(asked)}</span><BChip tone="amber">{t.waiting}</BChip></div>
        <p className="rs-req__s">{[t.forWeek(dayText(request.effectiveWeek, t)), what].filter(Boolean).join(" · ")}</p>
        {noteLine(request.reason)}
        {latest && changed.length ? <><WeekView allowed={allowedByDay(request.unavailable)} changed={changed} before={allowedByDay(latest.unavailable)} only t={t} label={weekLabel} /><p className="rs-req__w rs-req__w--same">{t.otherDaysSame}</p></>
          : open && latest ? null : <WeekView allowed={allowedByDay(request.unavailable)} t={t} label={weekLabel} />}
        {!management ? <p className="rs-req__w">{t.waitingEmployee}</p> : mine ? <div className="rs-decide" role="group" aria-labelledby={`rs-decide-${request.id}`}>
          <p className="rs-decide__t" id={`rs-decide-${request.id}`} tabIndex={-1}>{mine.decision === "APPROVE" ? t.decideApproveTitle : t.decideDeclineTitle}</p>
          <div className="rs-fields">
            {mine.decision === "APPROVE" ? <div className="rs-field"><label className="rs-field__l" htmlFor={`rs-dw-${request.id}`}>{t.decideStart}</label>
              <select id={`rs-dw-${request.id}`} className="c-in rs-in" value={mine.week} disabled={busy} aria-describedby={`rs-dh-${request.id}`} onChange={event => setDeciding({ ...mine, week: event.target.value })}>
                {(mondays.includes(mine.week) || mine.week < snapshot!.earliestWeek ? mondays : [...mondays, mine.week]).map(monday => <option key={monday} value={monday}>{dayText(monday, t)}</option>)}</select>
              <p className="rs-field__h" id={`rs-dh-${request.id}`}>{t.decideStartHelp(dayText(request.effectiveWeek, t), dayText(offered, t))}</p></div> : null}
            <div className="rs-field"><label className="rs-field__l" htmlFor={`rs-dn-${request.id}`}>{t.decideNote}</label>
              <input id={`rs-dn-${request.id}`} className="c-in rs-in" type="text" maxLength={500} autoComplete="off" value={mine.note} disabled={busy} onChange={event => setDeciding({ ...mine, note: event.target.value })} /></div>
          </div>
          <div className="rs-req__acts"><Act kind="text" disabled={busy} onClick={() => setDeciding(null)}>{t.cancel}</Act>
            <Act kind={mine.decision === "APPROVE" ? "ghost" : "quiet"} busy={sending} disabled={busy} onClick={confirmDecision}>{mine.decision === "APPROVE" ? t.confirmApprove(dayText(mine.week, t)) : t.confirmDecline}</Act></div>
        </div> : <div className="rs-req__acts">
          <Act kind="text" disabled={busy} label={t.declineLabel(firstName, asked)} onClick={() => { setIssue(null); setDeciding({ requestId: request.id, decision: "DENY", week: offered, note: "" }); requestAnimationFrame(() => document.getElementById(`rs-decide-${request.id}`)?.focus()); }}>{t.decline}</Act>
          <Act kind="ghost" disabled={busy} label={t.approveLabel(firstName, asked)} onClick={() => { setIssue(null); setDeciding({ requestId: request.id, decision: "APPROVE", week: offered, note: "" }); requestAnimationFrame(() => document.getElementById(`rs-decide-${request.id}`)?.focus()); }}>{t.approve}</Act>
        </div>}
      </li>;
    };
    // Phase 8 (review C, row 7): an Employee's note on the agreement is that card's footer, on its text edge (EM-018).
    const separateNote = management ? null : <p className="eb-cardnote rs-separate">{t.separateEmployee}</p>;
    const main = <div className="rs-main"><Act kind={mainKind} id="rs-main-action" disabled={busy} onClick={() => startEdit()}>{management ? t.changeAgreement : latest ? t.askChange : t.askFirst}</Act></div>;
    body = <>
      {attentionCard}
      {landedCard}
      {snapshot!.legacyUnconfirmed ? (management
        // Phase 8 (a.md #23, b.md #31): the heading says the state ("Not confirmed yet"), so no chip says it again.
        // Premium pass FA (fin A #13, B #3): the state is the kit's "not confirmed" note (amber, the Question glyph, its
        // title the card's heading), then the two decisions at 44px: the filled one first (a full-width stack on phones,
        // the filled one on the right from 768px).
        ? <Card kit={kit} id="rs-now" label={t.legacyTitleManagement}>
          <div className="rs-legacy">
            <BCallout tone="amber" icon="unknown" title={t.legacyTitleManagement} heading="h2"
              action={availabilityHref ? <Link className="rs-link" href={availabilityHref}>{t.legacyHours}</Link> : undefined}>
              <p className="rs-legacy__p">{t.legacyBodyManagement(firstName)}</p>
            </BCallout>
            <div className="rs-legacy__acts">
              <Act kind={mainKind} id="rs-main-action" disabled={busy} onClick={() => startEdit(openPlan())}>{t.legacySet}</Act>
              <Act kind="quiet" disabled={busy} onClick={() => { if (!snapshot) return; setIssue(null); setProblems([]); setDraft({ kind: "SET", plan: openPlan(), week: snapshot.earliestWeek, note: "" }); setStep("review"); }}>{t.legacyOpen}</Act>
            </div>
          </div>
        </Card>
        // Phase 8 (review C, row 7): the Employee's empty state is one designed state. Its title says nothing is agreed, so
        // no chip repeats it ("Not confirmed" is the word for an uncertain result), and its line already says the schedule
        // follows the availability they send, so the separate note is left out here.
        : <Card kit={kit} id="rs-now" title={t.legacyTitleEmployee}>
          <div className="rs-legacy"><p className="rs-legacy__p">{t.legacyBodyEmployee}</p></div>{main}
        </Card>)
        : current ? <Card kit={kit} id="rs-now" title={t.now} aside={<span className="rs-meta">{t.since(dayText(current.effectiveWeek, t))}</span>}>
          {current.unavailable.length === 0 ? <p className="rs-open">{management ? t.unrestrictedManagement(firstName) : t.unrestrictedEmployee}</p>
            : <WeekView allowed={allowedByDay(current.unavailable)} t={t} label={weekLabel} />}
          {noteLine(current.reason)}
          <p className="rs-zone">{t.zone(timeZoneLabel(timeZone))}</p>
          {main}{separateNote}
        </Card>
        : <Card kit={kit} id="rs-now" title={t.notYetTitle}>
          <div className="rs-legacy"><p className="rs-legacy__p">{t.notYetBody(dayText(ahead[0]?.effectiveWeek ?? week, t))}</p></div>{main}{separateNote}
        </Card>}
      {waiting.length ? <Card kit={kit} id="rs-requests" title={management ? t.requestsManagement : t.requestsEmployee}><ul className="rs-reqs">{waiting.map(requestRow)}</ul></Card> : null}
      {ahead.length ? <Card kit={kit} id="rs-later" title={t.later}><ul className="rs-reqs">{ahead.map((version, index) => { const prior = index ? ahead[index - 1] : current; return <li key={version.id} className="rs-req">
        <div className="rs-req__h"><span className="rs-req__t">{t.starts(dayText(version.effectiveWeek, t))}</span></div>
        {version.unavailable.length === 0 ? <p className="rs-req__s">{management ? t.unrestrictedManagement(firstName) : t.unrestrictedEmployee}</p>
          : <WeekView allowed={allowedByDay(version.unavailable)} changed={prior ? changedDays(prior.unavailable, version.unavailable) : undefined} t={t} label={weekLabel} />}
        {noteLine(version.reason)}
      </li>; })}</ul></Card> : null}
      {decided.length ? <Card kit={kit} id="rs-earlier" title={t.earlier}><ul className="rs-reqs">{decided.map(request => {
        const version = document_!.versions.find(item => item.requestId === request.id);
        const at = instantText(request.decision?.at ?? request.requestedAt, timeZone, t);
        return <li key={request.id} className="rs-req rs-req--past">
          <div className="rs-req__h"><span className="rs-req__t">{management ? t.askedOn(instantText(request.requestedAt, timeZone, t)) : t.sentOn(instantText(request.requestedAt, timeZone, t))}</span>
            <BChip tone={request.status === "APPROVED" ? "green" : "grey"}>{request.status === "APPROVED" ? t.approved : t.declined}</BChip></div>
          <p className="rs-req__s">{request.status === "APPROVED" && version ? t.approvedOn(at, dayText(version.effectiveWeek, t)) : t.declinedOn(at)}</p>
          {request.decision ? noteLine(request.decision.reason) : null}
        </li>;
      })}</ul></Card> : null}
      {/* Phase 8 (review C, row 7): for an Employee the note is the agreement card's footer (above); the management
        * screens keep their note under the cards. */}
      {/* Phase 2 gate (Nov 23): the "Not confirmed yet" note already says the schedule follows their Availability, so the
        * separate note is left out there, as it is on the Employee's empty state. */}
      {management && !snapshot!.legacyUnconfirmed ? <BNote>{t.separateManagement}</BNote> : null}
    </>;
  }

  return <Frame kit={kit} title={title} sub={sub} back={back}>
    <p className="rs-sr" role="status" aria-live="polite">{said}</p>
    {body}
    <DiscardDialog open={guard.asking} onKeep={guard.keep} onDiscard={guard.discard} lang={lang} />
  </Frame>;
}
