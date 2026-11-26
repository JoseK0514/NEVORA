"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpNav, CorpPage, CorpPill, CorpRow, CorpRows, CorpSection, CorpTitle } from "@/components/corp/corp";
import { BCallout, BState, compactRange } from "@/components/owner-b/b-kit";
import { DecisionAsk } from "@/components/owner-b/decision-parts";
import { useAskStep } from "@/components/owner-b/ask-step";
import { toast } from "@/components/toaster";
import "@/components/team/team-forms.css";
import {
  addDays, applyCommand, clearPending, clockText, createWeeklyClient, hours, loadPending, newRequestId, savePending, type PendingApply, type WeeklyOutcome, type WeeklySend,
} from "@/lib/owner-advisor/weekly-client";
import type { WeeklyAlternativeSummary, WeeklyCommand, WeeklyComparison, WeeklyMode, WeeklyPlanReview, WeeklyResult, WeeklyScope } from "@/lib/owner-advisor/weekly-contracts";
import { spanishTimes, type Lang } from "../format";
import { copy as weeklyWording } from "./weekly-page-copy";
import { useAdvisorLang } from "../lang";
import { WEEKLY_COPY, type WeeklyCopy } from "./weekly-copy";
import "./weekly.css";

/* Rondo's weekly plan (Nov 16, 2026). Compare up to two staffing options for one week, read one option in full, acknowledge
 * it and approve or decline the whole set. Saving writes a DRAFT schedule only: publishing stays in Schedule and nobody
 * is notified. Private details live on screen only for the server's short lease, and are cleared when it ends, when the
 * Owner steps away, when access changes or is revoked. The one thing kept across a reload is a pending approval's
 * command metadata (weekly-client.ts), restored as "not confirmed" and checked, never resent on its own. */

export const WEEKLY_PATH = "/app/ai-manager/weekly";
export type WeeklyLocation = { id: string; name: string };
type Lease = { result: WeeklyResult; until: number };
type Custody = { command: WeeklyCommand; status: "sending" | "uncertain" | "done" };
type Problem = { kind: "invalid" | "conflict" | "limit" | "disabled" | "failed"; op: WeeklyCommand["op"] } | null;
type Approval = { pending: PendingApply; status: "sending" | "checking" | "uncertain" | "not_saved" | "foreign" };

const storage = () => { try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; } };
const scopeText = (scope: WeeklyScope, locations: WeeklyLocation[], t: WeeklyCopy) => scope.kind === "ALL" ? t.allLocations
  : scope.locationIds.length === 1 ? locations.find(l => l.id === scope.locationIds[0])?.name ?? t.oneLocation : t.nLocations(scope.locationIds.length);
const settingsText = (week: string, mode: WeeklyMode, scope: WeeklyScope, locations: WeeklyLocation[], t: WeeklyCopy) => `${t.weekText(week)} · ${t.mode[mode].label} · ${scopeText(scope, locations, t)}`;
/** "Mon 16" ("lun 16"): the row's day column, as the schedule draws it. */
const shortDay = (date: string, lang: Lang) => {
  const at = new Date(`${date}T12:00:00Z`);
  return `${new Intl.DateTimeFormat(lang === "es" ? "es-PR" : "en-US", { timeZone: "UTC", weekday: "short" }).format(at)} ${at.getUTCDate()}`;
};
/** "8 AM – 12 PM", "8–11:30 AM" ("8–11:30 a. m."): the schedule's short time range. */
const range = (start: string, end: string, lang: Lang) => spanishTimes(compactRange(`${clockText(start)} – ${clockText(end)}`), lang);
const stepAway = () => document.visibilityState === "hidden" || !document.hasFocus();

export function WeeklyPage({ timeZone, currentWeek, locations, weeklyEnabled, reviewId, send: given }: {
  timeZone: string; currentWeek: string; locations: WeeklyLocation[]; weeklyEnabled: boolean; reviewId: string | null; send?: WeeklySend;
}) {
  const send = useMemo(() => given ?? createWeeklyClient(), [given]);
  const router = useRouter();
  const t = WEEKLY_COPY[useAdvisorLang()];
  // The plan form.
  const [week, setWeek] = useState(currentWeek);
  const [mode, setMode] = useState<WeeklyMode>("FILL_GAPS_ONLY");
  const [scopeKind, setScopeKind] = useState<"ALL" | "SELECTED">("ALL");
  const [chosen, setChosen] = useState<string[]>([]);
  // What the server said, each under its own short lease.
  const [compare, setCompare] = useState<Custody | null>(null);
  const [comparison, setComparison] = useState<Lease | null>(null);
  const [review, setReview] = useState<Lease | null>(null);
  const [outcome, setOutcome] = useState<Lease | null>(null);
  const [hidden, setHidden] = useState(false);
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const [revoked, setRevoked] = useState(false);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [decline, setDecline] = useState<Custody | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const authority = useRef<string | null>(null);
  const shownKey = useRef(reviewId ?? "");

  const clearPrivate = useCallback(() => { setComparison(null); setReview(null); setOutcome(null); setAcknowledged(false); }, []);
  const revoke = useCallback(() => {
    clearPrivate(); setCompare(null); setDecline(null); setApproval(null); clearPending(storage()); setRevoked(true);
  }, [clearPrivate]);
  /** Every answer names the Owner's authority: if it changed, nothing seen under the old one stays on screen. */
  const accept = useCallback((outcome: Extract<WeeklyOutcome, { kind: "result" }>): Lease => {
    if (authority.current && authority.current !== outcome.result.authority) clearPrivate();
    authority.current = outcome.result.authority;
    setHidden(false);
    // Only answers that carry private details are held to the lease: a stale, declined or not-saved answer names nothing.
    const holdsDetails = outcome.result.state === "ready" || outcome.result.state === "saved";
    return { result: outcome.result, until: holdsDetails ? outcome.receivedAt + outcome.result.validForMs : Number.POSITIVE_INFINITY };
  }, [clearPrivate]);

  /* ---------- Leases: details go when the lease ends or the Owner steps away ---------- */
  const leases = [comparison?.until, review?.until, outcome?.until].filter((until): until is number => !!until && Number.isFinite(until));
  const nextEnd = leases.length ? Math.min(...leases) : null;
  useEffect(() => {
    if (!nextEnd) return;
    const timer = window.setTimeout(() => {
      const at = Date.now(); setNow(at);
      setComparison(old => old && old.until <= at ? null : old); setReview(old => old && old.until <= at ? null : old); setOutcome(old => old && old.until <= at ? null : old);
      setAcknowledged(false); setHidden(true);
    }, Math.max(0, nextEnd - Date.now()));
    return () => window.clearTimeout(timer);
  }, [nextEnd]);
  useEffect(() => {
    const away = () => { if (stepAway()) { clearPrivate(); setHidden(true); } };
    document.addEventListener("visibilitychange", away); window.addEventListener("blur", away);
    return () => { document.removeEventListener("visibilitychange", away); window.removeEventListener("blur", away); };
  }, [clearPrivate]);

  /* ---------- Observations (never business writes) ---------- */
  const readReview = useCallback(async (id: string, keepProblem = false) => {
    setReading(true); if (!keepProblem) setProblem(null);
    const result = await send(weeklyEnabled ? { op: "read_week_plan", requestId: newRequestId(), reviewId: id } : { op: "check_week_plan", requestId: newRequestId(), reviewId: id });
    if (result.kind === "forbidden") { setReading(false); return revoke(); }
    if (result.kind === "conflict" && weeklyEnabled) {
      // A plan that was already approved or declined can't be read again: show what happened to it instead.
      const checked = await send({ op: "check_week_plan", requestId: newRequestId(), reviewId: id });
      setReading(false);
      if (checked.kind === "forbidden") return revoke();
      if (checked.kind === "result") { setReview(null); setOutcome(accept(checked)); return; }
      setProblem({ kind: "conflict", op: "read_week_plan" }); return;
    }
    setReading(false);
    if (result.kind !== "result") { setProblem({ kind: result.kind === "uncertain" ? "failed" : result.kind, op: "read_week_plan" }); return; }
    const lease = accept(result);
    if (result.result.state === "ready" && result.result.review) {
      // A renewed read of the same plan keeps the acknowledgement only if the terms and read handle are unchanged.
      setReview(old => { if (!old || old.result.review?.termsDigest !== result.result.review?.termsDigest || old.result.readReceiptId !== result.result.readReceiptId) setAcknowledged(false); return lease; });
      setOutcome(null);
    } else { setReview(null); setOutcome(lease); }
  }, [accept, revoke, send, weeklyEnabled]);
  /** A saved plan's record and progress, observed again. */
  const checkOutcome = useCallback(async (id: string) => {
    const result = await send({ op: "check_week_plan", requestId: newRequestId(), reviewId: id });
    if (result.kind === "forbidden") return revoke();
    if (result.kind === "result") setOutcome(accept(result));
  }, [accept, revoke, send]);

  /** Checks a pending approval with the server (an observation, with its own new request ID). */
  const checkApproval = useCallback(async (pending: PendingApply) => {
    setApproval({ pending, status: "checking" });
    const result = await send({ op: "check_week_plan", requestId: newRequestId(), reviewId: pending.reviewId });
    if (result.kind === "forbidden") return revoke();
    if (result.kind !== "result") { setApproval({ pending, status: "uncertain" }); return; }
    // Custody belongs to the session that made it: a different authority never inherits it.
    if (result.result.authority !== pending.authority) { clearPending(storage()); setApproval({ pending, status: "foreign" }); return; }
    const lease = accept(result), state = result.result.state;
    if (state === "saved" || state === "declined") {
      clearPending(storage()); setApproval(null); setReview(null); setOutcome(lease);
      if (state === "saved") toast(result.result.receipt?.operationId === pending.requestId ? t.toastSaved : t.toastAlreadySaved);
      if (shownKey.current !== pending.reviewId) router.push(`${WEEKLY_PATH}?review=${pending.reviewId}`);
    } else {
      setApproval({ pending, status: state === "not_saved" ? "not_saved" : "uncertain" });
      if (shownKey.current === pending.reviewId) void readReview(pending.reviewId);
    }
  }, [accept, readReview, revoke, router, send, t]);

  // On load: a pending approval from before a reload comes back as "not confirmed" and is checked; an address with a
  // plan opens that plan (an observation). Nothing is compared, approved, declined or published by loading the page.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const pending = loadPending(storage());
    queueMicrotask(() => {
      if (pending) void checkApproval(pending);
      if (reviewId && reviewId !== pending?.reviewId) void readReview(reviewId);
    });
  }, [checkApproval, readReview, reviewId]);
  // A different plan in the address (Back, a link) is read; the old one's details go.
  useEffect(() => {
    if (shownKey.current === (reviewId ?? "")) return;
    shownKey.current = reviewId ?? "";
    setReview(null); setOutcome(null); setAcknowledged(false); setProblem(null); setDecline(null);
    if (reviewId) queueMicrotask(() => void readReview(reviewId));
    const title = [...document.querySelectorAll<HTMLElement>(".wk > :is(.c-nav, .c-title) h1")].find(h => h.getClientRects().length > 0);
    if (title) { if (!title.hasAttribute("tabindex")) title.tabIndex = -1; title.focus(); }
  }, [readReview, reviewId]);
  // A problem card takes focus where the Owner is.
  const problemKey = approval && approval.status !== "sending" && approval.status !== "checking" ? approval.status : compare?.status === "uncertain" ? "compare" : decline?.status === "uncertain" ? "decline" : problem?.kind ?? null;
  useEffect(() => {
    if (!problemKey) return;
    const card = document.querySelector<HTMLElement>(".wk .wk-issue");
    card?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    card?.focus({ preventScroll: true });
  }, [problemKey]);

  /* ---------- Deliberate commands ---------- */
  const runCompare = useCallback(async (command: Extract<WeeklyCommand, { op: "compare_week" }>, renewal = false) => {
    if (!renewal) { setCompare({ command, status: "sending" }); setProblem(null); }
    const result = await send(command);
    if (result.kind === "forbidden") return revoke();
    if (result.kind === "uncertain") { if (!renewal) setCompare({ command, status: "uncertain" }); return; }
    if (result.kind !== "result") { setCompare(null); setComparison(null); setProblem({ kind: result.kind, op: "compare_week" }); return; }
    setCompare({ command, status: "done" });
    setComparison(accept(result));
    if (!renewal) setTimeout(() => document.getElementById("wk-results")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }), 50);
  }, [accept, revoke, send]);
  const startCompare = () => {
    const locationScope: WeeklyScope = scopeKind === "ALL" ? { kind: "ALL" } : { kind: "SELECTED", locationIds: [...chosen].sort() };
    // A new comparison for every deliberate request: a changed week, mode or scope is never a replay.
    void runCompare({ op: "compare_week", requestId: newRequestId(), weekStart: week, mode, locationScope });
  };
  /** The same comparison again (its own ID): a lease refresh, never a new one. */
  const refreshComparison = useCallback(() => { if (compare) void runCompare(compare.command as Extract<WeeklyCommand, { op: "compare_week" }>, true); }, [compare, runCompare]);

  /** Observe again whatever is on screen (the app's private readers renew before their lease ends, and again when the
   * Owner comes back). Only observations: the same comparison by its own ID, a fresh read, or a check. */
  const observe = useCallback(() => {
    if (reviewId) { if (outcome?.result.state === "saved") void checkOutcome(reviewId); else if (!outcome) void readReview(reviewId, true); }
    else if (compare?.status === "done") refreshComparison();
  }, [checkOutcome, compare, outcome, readReview, refreshComparison, reviewId]);
  const renewAt = [comparison, review, outcome].filter((lease): lease is Lease => !!lease && Number.isFinite(lease.until)).map(lease => lease.until - lease.result.validForMs * 0.3);
  const nextRenewal = renewAt.length ? Math.min(...renewAt) : null;
  useEffect(() => {
    if (!nextRenewal) return;
    const timer = window.setTimeout(() => { if (!stepAway()) observe(); }, Math.max(1000, nextRenewal - Date.now()));
    return () => window.clearTimeout(timer);
  }, [nextRenewal, observe]);
  useEffect(() => {
    const back = () => { if (!stepAway() && hidden) observe(); };
    document.addEventListener("visibilitychange", back); window.addEventListener("focus", back);
    return () => { document.removeEventListener("visibilitychange", back); window.removeEventListener("focus", back); };
  }, [hidden, observe]);

  const runApproval = useCallback(async (pending: PendingApply) => {
    savePending(storage(), pending);
    setApproval({ pending, status: "sending" }); setProblem(null);
    const result = await send(applyCommand(pending));
    if (result.kind === "forbidden") return revoke();
    if (result.kind === "result" && result.result.state === "saved") {
      const lease = accept(result);
      clearPending(storage()); setApproval(null); setReview(null); setOutcome(lease);
      toast(result.result.receipt?.operationId === pending.requestId ? t.toastSaved : t.toastAlreadySaved);
      return;
    }
    if (result.kind === "invalid" || result.kind === "limit") {
      // Refused before anything was written: this approval is over.
      clearPending(storage()); setApproval(null); setProblem({ kind: result.kind, op: "apply_week_plan" }); return;
    }
    if (result.kind === "conflict") {
      // Something changed first. Find out whether this plan was saved or declined meanwhile; if not, this approval is
      // over (sending it again would conflict again) and the Owner looks at the plan afresh.
      const checked = await send({ op: "check_week_plan", requestId: newRequestId(), reviewId: pending.reviewId });
      if (checked.kind === "forbidden") return revoke();
      clearPending(storage()); setApproval(null);
      if (checked.kind === "result" && checked.result.authority === pending.authority && (checked.result.state === "saved" || checked.result.state === "declined")) {
        setReview(null); setOutcome(accept(checked)); return;
      }
      setProblem({ kind: "conflict", op: "apply_week_plan" }); void readReview(pending.reviewId, true); return;
    }
    // Unknown or switched off: ask the server what happened to this exact review.
    await checkApproval(pending);
  }, [accept, checkApproval, readReview, revoke, send, t]);
  const approve = (plan: WeeklyPlanReview, readReceiptId: string) => {
    if (!authority.current || approval) return;
    void runApproval({ reviewId: plan.id, requestId: newRequestId(), termsDigest: plan.termsDigest, readReceiptId, acknowledged: true, authority: authority.current });
  };
  const discardApproval = () => { clearPending(storage()); setApproval(null); };

  const runDecline = useCallback(async (command: WeeklyCommand) => {
    setDecline({ command, status: "sending" }); setProblem(null);
    const result = await send(command);
    if (result.kind === "forbidden") return revoke();
    if (result.kind === "result" && result.result.state === "declined") { setDecline(null); setReview(null); setOutcome(accept(result)); toast(t.toastDeclined); return; }
    if (result.kind === "uncertain") { setDecline({ command, status: "uncertain" }); return; }
    setDecline(null);
    setProblem({ kind: result.kind === "result" ? "failed" : result.kind, op: "decline_week_plan" });
  }, [accept, revoke, send, t]);
  const declinePlan = (id: string) => { if (!decline) void runDecline({ op: "decline_week_plan", requestId: newRequestId(), reviewId: id }); };

  /* ---------- Render ---------- */
  const reviewing = !!reviewId;
  const head = reviewing
    ? <><CorpNav phoneOnly back={{ href: WEEKLY_PATH, label: t.weeklyPlan }} title={outcome?.result.state === "saved" ? t.navSaved : outcome?.result.state === "declined" ? t.navDeclined : t.navReview} titleId="wk-nav-title" />
        <CorpTitle wide id="wk-title" title={outcome?.result.state === "saved" ? t.titleSaved : outcome?.result.state === "declined" ? t.titleDeclined : t.titleReview}
          sub={review?.result.review ? settingsText(review.result.review.weekStart, review.result.review.mode, review.result.review.locationScope, locations, t) : undefined} /></>
    : <><CorpNav phoneOnly back={{ href: "/app/ai-manager", label: t.rondoAi }} title={t.weeklyPlan} titleId="wk-nav-title" />
        <CorpTitle wide id="wk-title" title={t.weeklyPlan} sub={t.staffingForOneWeek} /></>;

  if (revoked) return <CorpPage className="c-page--narrow wk" labelledBy="wk-title">{head}
    <CorpCard as="div"><BState kind="locked" alert title={t.sessionEnded} line={t.signInAgain} action={{ label: t.signIn, href: "/login" }} /></CorpCard>
  </CorpPage>;

  const pendingCard = approval && approval.status !== "sending" ? <ApprovalCard approval={approval} onCheck={() => void checkApproval(approval.pending)}
    onResend={() => void runApproval(approval.pending)} onDiscard={discardApproval} /> : null;
  const sending = approval?.status === "sending" || approval?.status === "checking";

  return <CorpPage className="c-page--narrow wk" labelledBy="wk-title">
    {head}
    {pendingCard}
    {problem ? <ProblemCard problem={problem} /> : null}
    {decline?.status === "uncertain" ? <IssueCard tone="amber" title={t.declineNotConfirmed} line={t.declineRetryLine}
      actions={<CorpButton kind="primary" size="md" onClick={() => void runDecline(decline.command)}>{t.tryAgain}</CorpButton>} /> : null}
    {reviewing
      ? <ReviewView reviewId={reviewId!} review={review} outcome={outcome} reading={reading} hidden={hidden} weeklyEnabled={weeklyEnabled} locations={locations} timeZone={timeZone} now={now}
          acknowledged={acknowledged} setAcknowledged={setAcknowledged} busy={sending || decline?.status === "sending"} approvalLocked={!!approval}
          onRefresh={observe} onApprove={approve} onDecline={declinePlan} />
      : <>
        {weeklyEnabled ? <PlanForm week={week} setWeek={setWeek} currentWeek={currentWeek} mode={mode} setMode={setMode} scopeKind={scopeKind} setScopeKind={setScopeKind}
          chosen={chosen} setChosen={setChosen} locations={locations} busy={compare?.status === "sending" && !comparison} onCompare={startCompare} />
          : <CorpCard as="div"><BState kind="locked" title={t.weeklyOff} line={t.approvedStillOpen} /></CorpCard>}
        {compare?.status === "uncertain" ? <IssueCard tone="amber" title={t.compareNotConfirmed} line={t.compareRetryLine}
          actions={<CorpButton kind="primary" size="md" onClick={() => void runCompare(compare.command as Extract<WeeklyCommand, { op: "compare_week" }>)}>{t.tryAgain}</CorpButton>} /> : null}
        {comparison?.result.state === "stale" ? <section id="wk-results" className="wk-results" aria-label={t.options}><CorpCard as="div"><BState kind="paused" icon={<WarningIcon weight="bold" />}
          title={t.optionsOutOfDate} line={t.compareAgainLine}
          action={weeklyEnabled ? { label: t.compareAgain, onClick: startCompare } : undefined} /></CorpCard></section>
          : comparison?.result.comparison ? <Comparison data={comparison.result.comparison} locations={locations} />
          : hidden && compare ? <section id="wk-results" className="wk-results" aria-label={t.options}><HiddenCard onRefresh={refreshComparison} /></section> : null}
      </>}
  </CorpPage>;
}

/* ---------- Cards ---------- */
function IssueCard({ tone, title, line, actions }: { tone: "amber" | "red"; title: string; line: ReactNode; actions?: ReactNode }) {
  return <section className="c-card wk-issue" tabIndex={-1} aria-label={title}>
    <BState kind={tone === "red" ? "failed" : "paused"} icon={tone === "amber" ? <WarningIcon weight="bold" /> : undefined} alert title={title} line={line}>
      {actions ? <span className="wk-acts">{actions}</span> : null}
    </BState>
  </section>;
}
function ProblemCard({ problem }: { problem: NonNullable<Problem> }) {
  const t = WEEKLY_COPY[useAdvisorLang()];
  const what = problem.op === "compare_week" ? "compare" : problem.op === "apply_week_plan" ? "save" : problem.op === "decline_week_plan" ? "decline" : "open";
  const copy = {
    invalid: [t.invalidTitle, t.invalidLine],
    conflict: [t.conflictTitle, t.conflictLine],
    limit: [t.limitTitle, t.limitLine],
    disabled: [t.weeklyOff, t.approvedStillOpen],
    failed: [t.couldnt[what], t.failedLine],
  }[problem.kind];
  return <IssueCard tone={problem.kind === "conflict" || problem.kind === "disabled" ? "amber" : "red"} title={copy[0]} line={copy[1]} />;
}
function ApprovalCard({ approval, onCheck, onResend, onDiscard }: { approval: Approval; onCheck: () => void; onResend: () => void; onDiscard: () => void }) {
  const t = WEEKLY_COPY[useAdvisorLang()];
  if (approval.status === "checking") return <section className="c-card wk-issue" tabIndex={-1} aria-busy="true"><BState kind="loading" title={t.checkingApproval} /></section>;
  if (approval.status === "foreign") return <IssueCard tone="amber" title={t.earlierCleared} line={t.otherSignIn}
    actions={<CorpButton kind="primary" size="md" onClick={onDiscard}>{t.ok}</CorpButton>} />;
  if (approval.status === "not_saved") return <IssueCard tone="amber" title={t.approvalNotSaved} line={t.nothingOnSchedule}
    actions={<><CorpButton kind="primary" size="md" onClick={onResend}>{t.sendAgain}</CorpButton><CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" onClick={onDiscard}>{t.leaveIt}</CorpButton></>} />;
  return <IssueCard tone="amber" title={t.approvalNotConfirmed} line={t.mayHaveSaved}
    actions={<><CorpButton kind="primary" size="md" onClick={onCheck}>{t.checkAgain}</CorpButton><CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" onClick={onResend}>{t.sendAgain}</CorpButton></>} />;
}
function HiddenCard({ onRefresh }: { onRefresh: () => void }) {
  const t = WEEKLY_COPY[useAdvisorLang()];
  return <CorpCard as="div"><BState kind="locked" icon={<EyeSlashIcon weight="bold" />} title={t.detailsHidden} line={t.plansHide} action={{ label: t.showAgain, onClick: onRefresh }} /></CorpCard>;
}

/* ---------- The plan form ---------- */
function CompareButtonLabel({ full, short }: { full: string; short: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    const label = ref.current, button = label?.closest('button'), area = button?.parentElement;
    const canvas = document.createElement('canvas').getContext('2d');
    if (!label || !button || !area || !canvas) return;
    const measure = () => {
      const style = getComputedStyle(label), box = getComputedStyle(button), region = getComputedStyle(area);
      canvas.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const width = canvas.measureText(full).width + (parseFloat(style.letterSpacing) || 0) * (full.length - 1);
      const available = area.clientWidth - parseFloat(region.paddingInlineStart) - parseFloat(region.paddingInlineEnd)
        - parseFloat(box.paddingInlineStart) - parseFloat(box.paddingInlineEnd) - parseFloat(box.borderLeftWidth) - parseFloat(box.borderRightWidth);
      setCompact(width > available);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    observer.observe(button);
    document.fonts?.addEventListener('loadingdone', measure);
    return () => { observer.disconnect(); document.fonts?.removeEventListener('loadingdone', measure); };
  }, [full]);
  return <span ref={ref}>{compact ? short : full}</span>;
}

function PlanForm({ week, setWeek, currentWeek, mode, setMode, scopeKind, setScopeKind, chosen, setChosen, locations, busy, onCompare }: {
  week: string; setWeek: (week: string) => void; currentWeek: string; mode: WeeklyMode; setMode: (mode: WeeklyMode) => void;
  scopeKind: "ALL" | "SELECTED"; setScopeKind: (kind: "ALL" | "SELECTED") => void; chosen: string[]; setChosen: (ids: string[]) => void;
  locations: WeeklyLocation[]; busy: boolean; onCompare: () => void;
}) {
  const lang = useAdvisorLang(), t = WEEKLY_COPY[lang];
  const [tried, setTried] = useState(false);
  const missing = scopeKind === "SELECTED" && !chosen.length;
  const earliest = addDays(currentWeek, -7), latest = addDays(currentWeek, 56);
  return <CorpSection id="wk-plan" label={t.planAWeek}>
    <CorpCard as="div"><CorpBody>
      <form className="wk-form" noValidate onSubmit={event => { event.preventDefault(); setTried(true); if (!missing && !busy) onCompare(); }}>
        <div className="c-field">
          <span className="c-field__label" id="wk-week-label">{t.week}</span>
          <div className="wk-week" role="group" aria-labelledby="wk-week-label">
            <button type="button" className="wk-step" aria-label={t.previousWeek} disabled={week <= earliest} onClick={() => setWeek(addDays(week, -7))}><CaretLeftIcon weight="bold" aria-hidden="true" /></button>
            <span className="wk-week__text" aria-live="polite">{t.weekText(week)}{week === currentWeek ? <span className="wk-week__now">{t.thisWeek}</span> : null}</span>
            <button type="button" className="wk-step" aria-label={t.nextWeek} disabled={week >= latest} onClick={() => setWeek(addDays(week, 7))}><CaretRightIcon weight="bold" aria-hidden="true" /></button>
          </div>
        </div>
        <fieldset className="wk-fieldset">
          <legend className="c-field__label">{t.whatRondoMayChange}</legend>
          <div className="c-checks">
            {(["FILL_GAPS_ONLY", "BUILD_WEEK"] as const).map(value => <label key={value} className="c-check">
              <input type="radio" className="wk-radio" name="wk-mode" checked={mode === value} onChange={() => setMode(value)} />
              <span className="c-check__text">{t.mode[value].label}<small>{t.mode[value].line}</small></span>
            </label>)}
          </div>
        </fieldset>
        <fieldset className="wk-fieldset">
          <legend className="c-field__label">{t.locations}</legend>
          <div className="c-checks">
            <label className="c-check"><input type="radio" className="wk-radio" name="wk-scope" checked={scopeKind === "ALL"} onChange={() => setScopeKind("ALL")} /><span className="c-check__text">{t.allLocations}</span></label>
            <label className="c-check"><input type="radio" className="wk-radio" name="wk-scope" checked={scopeKind === "SELECTED"} onChange={() => setScopeKind("SELECTED")} /><span className="c-check__text">{t.chooseLocations}</span></label>
          </div>
          {scopeKind === "SELECTED" ? <div className="c-checks wk-places" role="group" aria-label={t.locationsToPlan} aria-describedby={tried && missing ? "wk-places-error" : undefined}>
            {locations.map(location => <label key={location.id} className="c-check">
              <input type="checkbox" className="c-check__box" value={location.id} checked={chosen.includes(location.id)} disabled={!chosen.includes(location.id) && chosen.length >= 20}
                onChange={event => setChosen(event.target.checked ? [...chosen, location.id] : chosen.filter(id => id !== location.id))} />
              <span className="c-check__text">{location.name}</span>
            </label>)}
          </div> : null}
          {tried && missing ? <p className="c-error" id="wk-places-error" role="alert"><WarningCircleIcon weight="bold" className="wk-error__ic" aria-hidden="true" />{t.chooseOneLocation}</p> : null}
        </fieldset>
        <div className="wk-submit">
          <CorpButton type="submit" kind="primary" size="md" disabled={busy} aria-label={lang === "es" && !busy ? t.compareOptions : undefined}>
            {busy ? t.comparing : lang === "es" ? <CompareButtonLabel full={t.compareOptions} short={weeklyWording.es.compareShort} /> : t.compareOptions}
          </CorpButton>
        </div>
      </form>
    </CorpBody></CorpCard>
  </CorpSection>;
}

/* ---------- Comparing options ---------- */
const letter = (index: number) => String.fromCharCode(65 + index);
function delta(after: number, before: number, t: WeeklyCopy) { const d = after - before; return d === 0 ? t.noChange : `${d > 0 ? "+" : "−"}${hours(Math.abs(d))}`; }
function statusTone(option: WeeklyAlternativeSummary): "green" | "amber" | "neutral" | "red" {
  if (!option.applyEligible) return "neutral";
  return option.status === "COMPLETE" ? "green" : option.status === "INVALID" ? "red" : "amber";
}
/** The comparison's options. An unavailable comparison is one state card and nothing else: it has no measurements, and its
 * fairness counts are placeholders, not observed people (Codex, Nov 16, 2026). An input limit is hit before any source is
 * admitted, so narrowing the scope may not help; it says so plainly instead of advising fewer locations. */
export function Comparison({ data, locations }: { data: WeeklyComparison; locations: WeeklyLocation[] }) {
  const t = WEEKLY_COPY[useAdvisorLang()];
  const included = data.locations.filter(l => l.state === "INCLUDED"), excluded = data.locations.filter(l => l.state !== "INCLUDED");
  const settings = <span className="wk-meta">{settingsText(data.weekStart, data.mode, data.locationScope, locations, t)}</span>;
  if (data.state === "unavailable") return <section id="wk-results" className="wk-results" aria-label={t.optionsFor(t.weekText(data.weekStart))}>
    <CorpCard as="div">{data.reason === "INPUT_LIMIT"
      ? <BState kind="failed" title={t.tooLarge} line={t.tooLargeLine} />
      : <BState kind="failed" title={t.tooMany} line={t.tooManyLine} />}</CorpCard>
  </section>;
  // Separate cards (a labelled kit section would draw as one card on desktop); two options sit side by side from 1024px.
  return <section id="wk-results" className="wk-results" aria-label={t.optionsFor(t.weekText(data.weekStart))}>
    <>
        {data.baseline ? <CorpCard as="div" label={t.scheduleNow} aside={settings}>
          <CorpRows label={t.scheduleNow}>
            <li><CorpRow one title={t.coverage} value={t.coverageText(data.baseline)} valueTone="soft" /></li>
            <li><CorpRow one title={t.stillOpen} value={t.blocks(data.baseline.remainingBlocks)} valueTone="soft" /></li>
            <li><CorpRow one title={t.weekendHistory} value={t.known(data.fairness.employeesWithKnownWeekends, data.fairness.employeesWithKnownWeekends + data.fairness.employeesWithoutKnownWeekends)} valueTone="soft" /></li>
            {/* "partial" also covers unknown weekend history, left-out locations and omitted details (Codex, Nov 16, 2026):
              * only an option whose search ran out of budget says the search stopped early. */}
            {data.alternatives.some(option => option.status === "BUDGET_EXHAUSTED") ? <li><CorpRow one title={t.search} value={<CorpPill tone="amber">{t.stoppedEarly}</CorpPill>} /></li>
              : data.partial ? <li><CorpRow one title={t.information} value={t.partial} valueTone="soft" /></li> : null}
          </CorpRows>
        </CorpCard> : null}
        {data.alternatives.length ? <div className={data.alternatives.length > 1 ? "wk-grid wk-grid--two" : "wk-grid"}>
          {data.alternatives.map((option, index) => <OptionCard key={option.id} option={option} index={index} baseline={data.baseline} />)}</div>
          : <CorpCard as="div"><BState kind="empty" icon={<CalendarCheckIcon weight="bold" />} title={t.noOptions} line={t.nothingToChange} /></CorpCard>}
      </>
    {data.locations.length ? <CorpCard as="div" label={t.locations} count={included.length}>
      <CorpRows label={t.locations}>
        {[...included, ...excluded].map(location => <li key={location.id}><CorpRow title={location.name}
          detail={location.issues.length ? location.issues.join(" · ") : undefined}
          value={t.locationState[location.state]} valueTone="soft" /></li>)}
      </CorpRows>
    </CorpCard> : null}
  </section>;
}
function OptionCard({ option, index, baseline }: { option: WeeklyAlternativeSummary; index: number; baseline: WeeklyComparison["baseline"] }) {
  const t = WEEKLY_COPY[useAdvisorLang()];
  const reasons = option.inspectionReasons.map(reason => t.reason[reason]);
  return <CorpCard as="div" label={t.option(letter(index))} aside={<CorpPill tone={statusTone(option)}>{option.applyEligible ? t.status[option.status] : t.lookOnly}</CorpPill>}>
    <CorpRows label={t.option(letter(index))}>
      <li><CorpRow one title={t.adds} value={`${t.shifts(option.added)} · ${hours(option.addedMinutes)}`} valueTone="soft" /></li>
      {option.removed ? <li><CorpRow one title={t.replaces} value={`${t.drafts(option.removed)} · ${hours(option.removedMinutes)}`} valueTone="soft" /></li> : null}
      <li><CorpRow one title={t.keeps} value={t.shifts(option.preservedAssignments)} valueTone="soft" /></li>
      <li><CorpRow one title={t.coverage} value={`${t.coverageText(option.coverage)}${baseline ? ` · ${delta(option.coverage.coveredMinutes, baseline.coveredMinutes, t)}` : ""}`} valueTone="soft" /></li>
      <li><CorpRow one title={t.stillOpen} value={t.blocks(option.remaining.total)} valueTone="soft" /></li>
      {option.issues.total ? <li><CorpRow one title={t.thingsToCheck} value={String(option.issues.total)} valueTone="soft" /></li> : null}
      {reasons.length ? <li><CorpRow title={option.applyEligible ? t.worthALook : t.cantBeSaved} detail={reasons.join(" · ")} /></li> : null}
      <li><Link className="wk-linkrow" href={`${WEEKLY_PATH}?review=${option.id}`}>{t.reviewOption(letter(index))}<CaretRightIcon weight="bold" aria-hidden="true" /></Link></li>
    </CorpRows>
  </CorpCard>;
}

/* ---------- One option in full ---------- */
function ReviewView({ reviewId, review, outcome, reading, hidden, weeklyEnabled, locations, timeZone, now, acknowledged, setAcknowledged, busy, approvalLocked, onRefresh, onApprove, onDecline }: {
  reviewId: string; review: Lease | null; outcome: Lease | null; reading: boolean; hidden: boolean; weeklyEnabled: boolean; locations: WeeklyLocation[]; timeZone: string; now: number;
  acknowledged: boolean; setAcknowledged: (value: boolean) => void; busy: boolean; approvalLocked: boolean;
  onRefresh: () => void; onApprove: (plan: WeeklyPlanReview, readReceiptId: string) => void; onDecline: (id: string) => void;
}) {
  if (outcome) return <Outcome result={outcome.result} reviewId={reviewId} timeZone={timeZone} locations={locations} onRefresh={onRefresh} onDecline={onDecline} busy={busy} weeklyEnabled={weeklyEnabled} />;
  if (review?.result.review) return <FullPlan plan={review.result.review} readReceiptId={review.result.readReceiptId} baseline={review.result.comparison?.baseline ?? null}
    locations={locations} timeZone={timeZone} now={now} acknowledged={acknowledged} setAcknowledged={setAcknowledged} busy={busy} approvalLocked={approvalLocked}
    onApprove={onApprove} onDecline={onDecline} weeklyEnabled={weeklyEnabled} />;
  if (hidden) return <HiddenCard onRefresh={onRefresh} />;
  if (reading) return <Skeleton />;
  return <EmptyReview onRefresh={onRefresh} />;
}
function EmptyReview({ onRefresh }: { onRefresh: () => void }) {
  const t = WEEKLY_COPY[useAdvisorLang()];
  return <CorpCard as="div"><BState kind="empty" title={t.nothingYet} line={t.openToSee} action={{ label: t.openPlan, onClick: onRefresh }} /></CorpCard>;
}
function Skeleton() {
  const t = WEEKLY_COPY[useAdvisorLang()];
  return <section className="c-card wk-skel" aria-busy="true" aria-label={t.loadingPlan}>
    <span className="wk-skel__bar wk-skel__bar--head" />
    {[58, 44, 66, 50].map(width => <span key={width} className="wk-skel__bar" style={{ width: `${width}%` }} />)}
  </section>;
}
/** Saved coverage counts only the locations the reviewed plan included (Codex, Nov 16, 2026), so it says which, and says
 * when the week's plannable locations changed since. An older answer without the scope keeps its plain coverage row. */
function coverageRows(progress: NonNullable<WeeklyResult["progress"]>, locations: WeeklyLocation[], t: WeeklyCopy) {
  const scope = progress.coverageScope;
  if (!scope) return progress.coverage ? <li><CorpRow one title={t.coverage} value={t.coverageText(progress.coverage)} valueTone="soft" /></li> : null;
  void locations;
  const count = scope.includedLocationIds.length;
  const reviewed = t.reviewedLocations(count);
  return <li><CorpRow title={t.coverage} detail={!progress.coverage ? t.cantMeasure : scope.changed ? t.reviewedChanged(count) : reviewed}
    value={progress.coverage ? t.coverageText(progress.coverage) : t.notAvailable} valueTone="soft" /></li>;
}

/** Jose (Nov 21, 2026): every Decline asks first. Decline opens the question where the plan's buttons were and sends
 * nothing; "Keep plan" brings them back; the question's Decline is the same `onDecline` as before, once. The line says
 * only what the declined result already says. */
export function DeclinePlanStep({ busy, onDecline, lang = "en", children }: { busy: boolean; onDecline: () => void; lang?: Lang; children: (ask: { onClick: () => void }) => ReactNode }) {
  // The language comes from the caller (which reads it), so this step stays a plain hook user (decline-asks.test.tsx).
  const t = WEEKLY_COPY[lang];
  const { open, ask, keep, done, titleRef, mark } = useAskStep();
  if (open && !busy) return <DecisionAsk className="wk-ask" titleRef={titleRef} groupLabel={t.declineQuestion} question={t.declineQuestion} consequence={t.scheduleDoesntChange}
    keep={t.keepPlan} onKeep={keep} go={t.decline} onGo={() => { done(); onDecline(); }} />;
  return children({ onClick: ask, ...mark });
}

function Outcome({ result, reviewId, timeZone, locations, onRefresh, onDecline, busy, weeklyEnabled }: { result: WeeklyResult; reviewId: string; timeZone: string; locations: WeeklyLocation[]; onRefresh: () => void; onDecline: (id: string) => void; busy: boolean; weeklyEnabled: boolean }) {
  const lang = useAdvisorLang(), t = WEEKLY_COPY[lang];
  const when = (iso: string) => new Intl.DateTimeFormat(lang === "es" ? "es-PR" : "en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  if (result.state === "stale") return <CorpCard as="div"><BState kind="paused" icon={<WarningIcon weight="bold" />} title={t.planOutOfDate}
    line={t.compareAgainLine}>
    <DeclinePlanStep busy={busy} lang={lang} onDecline={() => onDecline(reviewId)}>{ask => <span className="wk-acts"><CorpButtonLink href={WEEKLY_PATH} kind="primary" size="md">{t.compareAgain}</CorpButtonLink>
      {weeklyEnabled ? <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" disabled={busy} {...ask}>{t.declineIt}</CorpButton> : null}</span>}</DeclinePlanStep>
  </BState></CorpCard>;
  if (result.state === "declined") return <CorpCard as="div"><BState kind="empty" icon={<CalendarCheckIcon weight="bold" />} title={t.titleDeclined} line={t.scheduleDidntChange}
    action={{ label: t.backToOptions, href: WEEKLY_PATH }} /></CorpCard>;
  if (result.state === "not_saved") return <CorpCard as="div"><BState kind="empty" title={t.notSaved} line={t.nothingOnSchedule} action={{ label: t.backToOptions, href: WEEKLY_PATH }} /></CorpCard>;
  if (result.state === "unavailable" || !result.receipt) return <CorpCard as="div"><BState kind="failed" title={t.cantCheck}
    line={weeklyEnabled ? t.tryInAMoment : t.onlySavedShow} action={{ label: t.checkAgain, onClick: onRefresh }} /></CorpCard>;
  const receipt = result.receipt, progress = result.progress;
  return <>
    <CorpCard as="div" label={t.whatWasSaved}>
      <CorpRows label={t.whatWasSaved}>
        <li><CorpRow one title={t.savedAt} value={when(receipt.savedAt)} valueTone="soft" /></li>
        <li><CorpRow one title={t.added} value={t.shifts(receipt.added)} valueTone="soft" /></li>
        {receipt.removed ? <li><CorpRow one title={t.replaced} value={t.draftShifts(receipt.removed)} valueTone="soft" /></li> : null}
        <li><CorpRow one title={t.kept} value={t.shifts(receipt.preservedAssignments)} valueTone="soft" /></li>
      </CorpRows>
    </CorpCard>
    <CorpCard as="div" label={t.scheduleNow} aside={progress ? <CorpPill tone={progress.state === "published" ? "green" : progress.state === "changed" ? "amber" : "neutral"}>{t.progress[progress.state]}</CorpPill> : undefined}>
      {progress && progress.state !== "unavailable" ? <CorpRows label={t.savedShiftsNow}>
        <li><CorpRow one title={t.stillAsSaved} value={t.of(progress.assignmentsPresent, progress.assignmentsTotal)} valueTone="soft" /></li>
        <li><CorpRow one title={t.published} value={t.of(progress.publishedAssignments, progress.assignmentsPresent)} valueTone="soft" /></li>
        {coverageRows(progress, locations, t)}
      </CorpRows> : <CorpBody><p className="wk-para">{weeklyEnabled ? t.cantReadSchedule : t.notShownOff}</p></CorpBody>}
    </CorpCard>
    <div className="wk-acts wk-acts--end wk-acts--page">
      <CorpButtonLink href={WEEKLY_PATH} kind="secondary" size="md" className="b-rowact b-rowact--quiet">{t.planAnother}</CorpButtonLink>
      <CorpButtonLink href="/app/schedule" kind="primary" size="md">{t.openSchedule}</CorpButtonLink>
    </div>
  </>;
}
function FullPlan({ plan, readReceiptId, baseline, locations, timeZone, now, acknowledged, setAcknowledged, busy, approvalLocked, onApprove, onDecline, weeklyEnabled }: {
  plan: WeeklyPlanReview; readReceiptId: string | null; baseline: WeeklyComparison["baseline"]; locations: WeeklyLocation[]; timeZone: string; now: number;
  acknowledged: boolean; setAcknowledged: (value: boolean) => void; busy: boolean; approvalLocked: boolean;
  onApprove: (plan: WeeklyPlanReview, readReceiptId: string) => void; onDecline: (id: string) => void; weeklyEnabled: boolean;
}) {
  void locations;
  const lang = useAdvisorLang(), t = WEEKLY_COPY[lang];
  const until = new Intl.DateTimeFormat(lang === "es" ? "es-PR" : "en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(plan.expiresAt));
  const expired = Date.parse(plan.expiresAt) <= now;
  const additions = [...plan.changes.additions].sort((a, b) => (a.date + a.startTime + a.employeeName).localeCompare(b.date + b.startTime + b.employeeName));
  const removals = [...plan.changes.removals].sort((a, b) => (a.date + a.startTime + a.employeeName).localeCompare(b.date + b.startTime + b.employeeName));
  const reasons = plan.inspectionReasons.map(reason => t.reason[reason]);
  const canSave = !!readReceiptId && plan.applyEligible && !expired && weeklyEnabled;
  const shift = (a: (typeof additions)[number]) => `${range(a.startTime, a.endTime, lang)} · ${a.locationName}${a.positionName ? ` · ${a.positionName}` : ""}`;
  return <>
    <CorpCard as="div" label={t.thisPlan} aside={<CorpPill tone={statusTone(plan)}>{plan.applyEligible ? t.status[plan.status] : t.lookOnly}</CorpPill>}>
      <CorpRows label={t.thisPlan}>
        <li><CorpRow one title={t.adds} value={`${t.shifts(plan.added)} · ${hours(plan.addedMinutes)}`} valueTone="soft" /></li>
        {plan.removed ? <li><CorpRow one title={t.replaces} value={`${t.draftShifts(plan.removed)} · ${hours(plan.removedMinutes)}`} valueTone="soft" /></li> : null}
        <li><CorpRow one title={t.keeps} value={t.shifts(plan.preservedAssignments)} valueTone="soft" /></li>
        <li><CorpRow one title={t.coverage} value={`${baseline ? `${hours(baseline.coveredMinutes).replace(" h", "")} → ` : ""}${t.coverageText(plan.coverage)}`} valueTone="soft" /></li>
        <li><CorpRow one title={t.stillOpen} value={t.blocks(plan.remaining.total)} valueTone="soft" /></li>
        <li><CorpRow one title={t.weekendHistory} value={t.known(plan.fairness.employeesWithKnownWeekends, plan.fairness.employeesWithKnownWeekends + plan.fairness.employeesWithoutKnownWeekends)} valueTone="soft" /></li>
        <li><CorpRow one title={t.availableUntil} value={expired ? t.expired : until} valueTone="soft" /></li>
      </CorpRows>
    </CorpCard>

    <CorpSection id="wk-added" label={t.shiftsAdded} count={additions.length}>
      <CorpCard as="div"><CorpRows label={t.shiftsAdded}>{additions.length ? additions.map((a, i) => <li key={i}><CorpRow lead={shortDay(a.date, lang)} title={a.employeeName} detail={shift(a)}
        value={a.isDesignatedLead ? <CorpPill tone="teal">{t.lead}</CorpPill> : undefined} /></li>)
        : <li className="c-empty c-empty--row">{t.noShiftsAdded}</li>}</CorpRows></CorpCard>
    </CorpSection>
    {removals.length ? <CorpSection id="wk-removed" label={t.draftShiftsReplaced} count={removals.length}>
      <CorpCard as="div"><CorpRows label={t.draftShiftsReplaced}>{removals.map((r, i) => <li key={i}><CorpRow lead={shortDay(r.date, lang)} title={r.employeeName} detail={shift(r)}
        value={<CorpPill tone="neutral">{t.replacedPill}</CorpPill>} /></li>)}</CorpRows></CorpCard>
    </CorpSection> : null}
    <CorpSection id="wk-open" label={t.stillOpen} count={plan.remaining.total}>
      <CorpCard as="div"><CorpRows label={t.stillOpen}>{plan.remaining.items.length ? plan.remaining.items.map((g, i) => <li key={i}><CorpRow
        lead={shortDay(g.date, lang)} title={range(g.startTime, g.endTime, lang)}
        detail={[g.locationName, g.missingStaff === null ? null : t.more(g.missingStaff), g.requiresLead ? t.lead : null,
          ...g.positions.map(p => `${p.name} ×${p.missing}`), g.positionsOmitted ? t.morePositions(g.positionsOmitted) : null].filter(Boolean).join(" · ")} /></li>)
        : <li className="c-empty c-empty--row">{t.nothingLeftOpen}</li>}
        {plan.remaining.total > plan.remaining.items.length ? <li className="c-empty c-empty--row">{t.moreNotListed(plan.remaining.total - plan.remaining.items.length)}</li> : null}
      </CorpRows></CorpCard>
    </CorpSection>
    {plan.issues.total ? <CorpSection id="wk-checks" label={t.thingsToCheck} count={plan.issues.total}>
      <CorpCard as="div"><CorpRows label={t.thingsToCheck}>{plan.issues.items.map((item, i) => <li key={i}><CorpRow title={item.message} detail={t.provenance[item.provenance]} /></li>)}
        {plan.issues.total > plan.issues.items.length ? <li className="c-empty c-empty--row">{t.moreNotListed(plan.issues.total - plan.issues.items.length)}</li> : null}</CorpRows></CorpCard>
    </CorpSection> : null}

    <CorpSection id="wk-decide" label={t.decide}>
      <CorpCard as="div"><CorpBody><div className="wk-decide">
        {canSave ? <>
          <p className="wk-para">{t.savesLine(plan.added, plan.removed)}</p>
          <label className="wk-ack"><input type="checkbox" checked={acknowledged} disabled={busy || approvalLocked} onChange={event => setAcknowledged(event.target.checked)} />
            <span>{t.ackLabel}</span></label>
        </> : <BCallout tone="amber">{!weeklyEnabled ? t.offCallout : expired ? t.expiredCallout
          : t.cantBeSavedBecause(reasons.length ? reasons.join(", ").toLowerCase() : "")}</BCallout>}
        <DeclinePlanStep busy={busy} lang={lang} onDecline={() => onDecline(plan.id)}>{ask => <div className="wk-acts wk-acts--end">
          {weeklyEnabled ? <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" disabled={busy} {...ask}>{t.decline}</CorpButton> : null}
          {canSave ? <CorpButton kind="primary" size="md" disabled={!acknowledged || busy || approvalLocked} onClick={() => onApprove(plan, readReceiptId!)}>{busy ? t.saving : t.saveAsDraft}</CorpButton>
            : <CorpButtonLink href={WEEKLY_PATH} kind="secondary" size="md" className="b-rowact b-rowact--go">{t.backToOptions}</CorpButtonLink>}
        </div>}</DeclinePlanStep>
      </div></CorpBody></CorpCard>
    </CorpSection>
  </>;
}
