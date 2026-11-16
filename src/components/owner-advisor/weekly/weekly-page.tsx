"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpNav, CorpPage, CorpPill, CorpRow, CorpRows, CorpSection, CorpTitle } from "@/components/corp/corp";
import { BState } from "@/components/owner-b/b-kit";
import { toast } from "@/components/toaster";
import "@/components/team/team-forms.css";
import {
  LOCATION_STATE_TEXT, MODE_TEXT, PROGRESS_TEXT, PROVENANCE_TEXT, REASON_TEXT, STATUS_TEXT, addDays, applyCommand, clearPending, clockText, coverageText, createWeeklyClient,
  dayText, hours, loadPending, newRequestId, savePending, weekText, type PendingApply, type WeeklyOutcome, type WeeklySend,
} from "@/lib/owner-advisor/weekly-client";
import type { WeeklyAlternativeSummary, WeeklyCommand, WeeklyComparison, WeeklyMode, WeeklyPlanReview, WeeklyResult, WeeklyScope } from "@/lib/owner-advisor/weekly-contracts";
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
const scopeText = (scope: WeeklyScope, locations: WeeklyLocation[]) => scope.kind === "ALL" ? "All locations"
  : scope.locationIds.length === 1 ? locations.find(l => l.id === scope.locationIds[0])?.name ?? "1 location" : `${scope.locationIds.length} locations`;
const settingsText = (week: string, mode: WeeklyMode, scope: WeeklyScope, locations: WeeklyLocation[]) => `${weekText(week)} · ${MODE_TEXT[mode].label} · ${scopeText(scope, locations)}`;
const stepAway = () => document.visibilityState === "hidden" || !document.hasFocus();

export function WeeklyPage({ timeZone, currentWeek, locations, weeklyEnabled, reviewId, send: given }: {
  timeZone: string; currentWeek: string; locations: WeeklyLocation[]; weeklyEnabled: boolean; reviewId: string | null; send?: WeeklySend;
}) {
  const send = useMemo(() => given ?? createWeeklyClient(), [given]);
  const router = useRouter();
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
      if (state === "saved") toast(result.result.receipt?.operationId === pending.requestId ? "Saved as a draft schedule." : "This plan was already saved.");
      if (shownKey.current !== pending.reviewId) router.push(`${WEEKLY_PATH}?review=${pending.reviewId}`);
    } else {
      setApproval({ pending, status: state === "not_saved" ? "not_saved" : "uncertain" });
      if (shownKey.current === pending.reviewId) void readReview(pending.reviewId);
    }
  }, [accept, readReview, revoke, router, send]);

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
      toast(result.result.receipt?.operationId === pending.requestId ? "Saved as a draft schedule." : "This plan was already saved.");
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
  }, [accept, checkApproval, readReview, revoke, send]);
  const approve = (plan: WeeklyPlanReview, readReceiptId: string) => {
    if (!authority.current || approval) return;
    void runApproval({ reviewId: plan.id, requestId: newRequestId(), termsDigest: plan.termsDigest, readReceiptId, acknowledged: true, authority: authority.current });
  };
  const discardApproval = () => { clearPending(storage()); setApproval(null); };

  const runDecline = useCallback(async (command: WeeklyCommand) => {
    setDecline({ command, status: "sending" }); setProblem(null);
    const result = await send(command);
    if (result.kind === "forbidden") return revoke();
    if (result.kind === "result" && result.result.state === "declined") { setDecline(null); setReview(null); setOutcome(accept(result)); toast("Plan declined. The schedule didn't change."); return; }
    if (result.kind === "uncertain") { setDecline({ command, status: "uncertain" }); return; }
    setDecline(null);
    setProblem({ kind: result.kind === "result" ? "failed" : result.kind, op: "decline_week_plan" });
  }, [accept, revoke, send]);
  const declinePlan = (id: string) => { if (!decline) void runDecline({ op: "decline_week_plan", requestId: newRequestId(), reviewId: id }); };

  /* ---------- Render ---------- */
  const reviewing = !!reviewId;
  const head = reviewing
    ? <><CorpNav phoneOnly back={{ href: WEEKLY_PATH, label: "Weekly plan" }} title="Review plan" titleId="wk-nav-title" />
        <CorpTitle wide id="wk-title" title={outcome?.result.state === "saved" ? "Saved as a draft" : outcome?.result.state === "declined" ? "Plan declined" : "Review the plan"}
          sub={review?.result.review ? settingsText(review.result.review.weekStart, review.result.review.mode, review.result.review.locationScope, locations) : undefined} /></>
    : <><CorpNav phoneOnly back={{ href: "/app/ai-manager", label: "AI manager" }} title="Weekly plan" titleId="wk-nav-title" />
        <CorpTitle wide id="wk-title" title="Weekly plan" sub="Compare staffing options for a week. Nothing changes until you approve one." /></>;

  if (revoked) return <CorpPage className="c-page--narrow wk" labelledBy="wk-title">{head}
    <CorpCard as="div"><BState kind="locked" alert title="Your session ended" line="Sign in again as an Owner to plan a week. Plans were cleared from this screen." action={{ label: "Sign in", href: "/login" }} /></CorpCard>
  </CorpPage>;

  const pendingCard = approval && approval.status !== "sending" ? <ApprovalCard approval={approval} onCheck={() => void checkApproval(approval.pending)}
    onResend={() => void runApproval(approval.pending)} onDiscard={discardApproval} /> : null;
  const sending = approval?.status === "sending" || approval?.status === "checking";

  return <CorpPage className="c-page--narrow wk" labelledBy="wk-title">
    {head}
    {pendingCard}
    {problem ? <ProblemCard problem={problem} /> : null}
    {decline?.status === "uncertain" ? <IssueCard tone="amber" title="We couldn’t confirm the decline" line="The connection dropped before NEVORA answered. Sending it again can’t decline twice."
      actions={<CorpButton kind="primary" size="md" onClick={() => void runDecline(decline.command)}>Try again</CorpButton>} /> : null}
    {reviewing
      ? <ReviewView reviewId={reviewId!} review={review} outcome={outcome} reading={reading} hidden={hidden} weeklyEnabled={weeklyEnabled} locations={locations} timeZone={timeZone} now={now}
          acknowledged={acknowledged} setAcknowledged={setAcknowledged} busy={sending || decline?.status === "sending"} approvalLocked={!!approval}
          onRefresh={observe} onApprove={approve} onDecline={declinePlan} />
      : <>
        {weeklyEnabled ? <PlanForm week={week} setWeek={setWeek} currentWeek={currentWeek} mode={mode} setMode={setMode} scopeKind={scopeKind} setScopeKind={setScopeKind}
          chosen={chosen} setChosen={setChosen} locations={locations} busy={compare?.status === "sending" && !comparison} onCompare={startCompare} />
          : <CorpCard as="div"><BState kind="locked" title="Weekly planning is off" line="Comparing and approving new plans is turned off for this company. A plan you already approved can still be checked from its link." /></CorpCard>}
        {compare?.status === "uncertain" ? <IssueCard tone="amber" title="We couldn’t confirm the comparison" line="The connection dropped. Trying again asks for the same comparison; it doesn’t start another one."
          actions={<CorpButton kind="primary" size="md" onClick={() => void runCompare(compare.command as Extract<WeeklyCommand, { op: "compare_week" }>)}>Try again</CorpButton>} /> : null}
        {comparison?.result.state === "stale" ? <section id="wk-results" className="wk-results" aria-label="Options"><CorpCard as="div"><BState kind="paused" icon={<WarningIcon weight="bold" />}
          title="These options are out of date" line="The schedule or your setup changed since Rondo compared them. Compare again for current options."
          action={weeklyEnabled ? { label: "Compare again", onClick: startCompare } : undefined} /></CorpCard></section>
          : comparison?.result.comparison ? <Comparison data={comparison.result.comparison} locations={locations} />
          : hidden && compare ? <section id="wk-results" className="wk-results" aria-label="Options"><HiddenCard onRefresh={refreshComparison} /></section> : null}
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
  const what = problem.op === "compare_week" ? "compare" : problem.op === "apply_week_plan" ? "save" : problem.op === "decline_week_plan" ? "decline" : "open";
  const copy = {
    invalid: ["That request wasn’t accepted", "Something in it doesn’t match this company. Check the week and locations, then try again. Nothing changed."],
    conflict: ["Something changed first", "The schedule, your access or this plan changed. Look again before deciding."],
    limit: ["Too many saved plans", "This company has reached the limit for saved plans. Nothing changed."],
    disabled: ["Weekly planning is off", "It was turned off for this company. A plan you approved can still be checked."],
    failed: [`Couldn’t ${what} the plan`, "NEVORA didn’t answer. Check your connection, then try again."],
  }[problem.kind];
  return <IssueCard tone={problem.kind === "conflict" || problem.kind === "disabled" ? "amber" : "red"} title={copy[0]} line={copy[1]} />;
}
function ApprovalCard({ approval, onCheck, onResend, onDiscard }: { approval: Approval; onCheck: () => void; onResend: () => void; onDiscard: () => void }) {
  if (approval.status === "checking") return <section className="c-card wk-issue" tabIndex={-1} aria-busy="true"><BState kind="loading" title="Checking your approval" line="Asking NEVORA whether it was saved." /></section>;
  if (approval.status === "foreign") return <IssueCard tone="amber" title="An earlier approval was cleared" line="It belonged to a different sign-in, so it can’t be checked from here. Nothing was sent again."
    actions={<CorpButton kind="secondary" size="md" onClick={onDiscard}>OK</CorpButton>} />;
  if (approval.status === "not_saved") return <IssueCard tone="amber" title="Your approval wasn’t saved" line="NEVORA checked: nothing from this plan is on the schedule. You can send the same approval again, or leave it."
    actions={<><CorpButton kind="primary" size="md" onClick={onResend}>Send the same approval again</CorpButton><CorpButton kind="secondary" size="md" onClick={onDiscard}>Leave it</CorpButton></>} />;
  return <IssueCard tone="amber" title="We couldn’t confirm your approval" line="It may or may not have been saved. Check again asks NEVORA; sending again repeats the very same approval, so it can’t be saved twice."
    actions={<><CorpButton kind="primary" size="md" onClick={onCheck}>Check again</CorpButton><CorpButton kind="secondary" size="md" onClick={onResend}>Send the same approval again</CorpButton></>} />;
}
function HiddenCard({ onRefresh }: { onRefresh: () => void }) {
  return <CorpCard as="div"><BState kind="locked" icon={<EyeSlashIcon weight="bold" />} title="Details hidden" line="Plans stay on screen only for a short time, and leave when you step away." action={{ label: "Show again", onClick: onRefresh }} /></CorpCard>;
}

/* ---------- The plan form ---------- */
function PlanForm({ week, setWeek, currentWeek, mode, setMode, scopeKind, setScopeKind, chosen, setChosen, locations, busy, onCompare }: {
  week: string; setWeek: (week: string) => void; currentWeek: string; mode: WeeklyMode; setMode: (mode: WeeklyMode) => void;
  scopeKind: "ALL" | "SELECTED"; setScopeKind: (kind: "ALL" | "SELECTED") => void; chosen: string[]; setChosen: (ids: string[]) => void;
  locations: WeeklyLocation[]; busy: boolean; onCompare: () => void;
}) {
  const [tried, setTried] = useState(false);
  const missing = scopeKind === "SELECTED" && !chosen.length;
  const earliest = addDays(currentWeek, -7), latest = addDays(currentWeek, 56);
  return <CorpSection id="wk-plan" label="Plan a week">
    <CorpCard as="div"><CorpBody>
      <form className="wk-form" noValidate onSubmit={event => { event.preventDefault(); setTried(true); if (!missing && !busy) onCompare(); }}>
        <div className="c-field">
          <span className="c-field__label" id="wk-week-label">Week</span>
          <div className="wk-week" role="group" aria-labelledby="wk-week-label">
            <button type="button" className="wk-step" aria-label="Previous week" disabled={week <= earliest} onClick={() => setWeek(addDays(week, -7))}><CaretLeftIcon weight="bold" aria-hidden="true" /></button>
            <span className="wk-week__text" aria-live="polite">{weekText(week)}{week === currentWeek ? <span className="wk-week__now"> · This week</span> : null}</span>
            <button type="button" className="wk-step" aria-label="Next week" disabled={week >= latest} onClick={() => setWeek(addDays(week, 7))}><CaretRightIcon weight="bold" aria-hidden="true" /></button>
          </div>
        </div>
        <fieldset className="wk-fieldset">
          <legend className="c-field__label">What Rondo may change</legend>
          <div className="c-checks">
            {(["FILL_GAPS_ONLY", "BUILD_WEEK"] as const).map(value => <label key={value} className="c-check">
              <input type="radio" className="wk-radio" name="wk-mode" checked={mode === value} onChange={() => setMode(value)} />
              <span className="c-check__text">{MODE_TEXT[value].label}<small>{MODE_TEXT[value].line}</small></span>
            </label>)}
          </div>
        </fieldset>
        <fieldset className="wk-fieldset">
          <legend className="c-field__label">Locations</legend>
          <div className="c-checks">
            <label className="c-check"><input type="radio" className="wk-radio" name="wk-scope" checked={scopeKind === "ALL"} onChange={() => setScopeKind("ALL")} /><span className="c-check__text">All locations</span></label>
            <label className="c-check"><input type="radio" className="wk-radio" name="wk-scope" checked={scopeKind === "SELECTED"} onChange={() => setScopeKind("SELECTED")} /><span className="c-check__text">Choose locations</span></label>
          </div>
          {scopeKind === "SELECTED" ? <div className="c-checks wk-places" role="group" aria-label="Locations to plan" aria-describedby={tried && missing ? "wk-places-error" : undefined}>
            {locations.map(location => <label key={location.id} className="c-check">
              <input type="checkbox" className="c-check__box" value={location.id} checked={chosen.includes(location.id)} disabled={!chosen.includes(location.id) && chosen.length >= 20}
                onChange={event => setChosen(event.target.checked ? [...chosen, location.id] : chosen.filter(id => id !== location.id))} />
              <span className="c-check__text">{location.name}</span>
            </label>)}
          </div> : null}
          {tried && missing ? <p className="c-error" id="wk-places-error" role="alert"><WarningIcon weight="bold" className="wk-error__ic" aria-hidden="true" />Choose at least one location</p> : null}
        </fieldset>
        <div className="wk-submit">
          <p className="c-field__help">Rondo compares up to two options. Nothing is saved, published or sent to anyone.</p>
          <CorpButton type="submit" kind="primary" size="md" disabled={busy}>{busy ? "Comparing…" : "Compare options"}</CorpButton>
        </div>
      </form>
    </CorpBody></CorpCard>
  </CorpSection>;
}

/* ---------- Comparing options ---------- */
const letter = (index: number) => String.fromCharCode(65 + index);
function delta(after: number, before: number) { const d = after - before; return d === 0 ? "no change" : `${d > 0 ? "+" : "−"}${hours(Math.abs(d))}`; }
function statusTone(option: WeeklyAlternativeSummary): "green" | "amber" | "neutral" | "red" {
  if (!option.applyEligible) return "neutral";
  return option.status === "COMPLETE" ? "green" : option.status === "INVALID" ? "red" : "amber";
}
function Comparison({ data, locations }: { data: WeeklyComparison; locations: WeeklyLocation[] }) {
  const included = data.locations.filter(l => l.state === "INCLUDED"), excluded = data.locations.filter(l => l.state !== "INCLUDED");
  // Its own heading and separate cards (not a labelled kit section, which desktop draws as one card): options are
  // compared side by side from 1024px.
  return <section id="wk-results" className="wk-results" aria-labelledby="wk-results-t">
    <div className="wk-head"><h2 id="wk-results-t" className="wk-head__t">Options</h2><p className="wk-head__s">{settingsText(data.weekStart, data.mode, data.locationScope, locations)}</p></div>
    {data.state === "unavailable" ? <CorpCard as="div"><BState kind="failed" title="Rondo couldn’t compare this week"
      line={data.reason === "INPUT_LIMIT" ? "The week has more to plan than one comparison can hold. Try fewer locations." : "There were more changes than one plan can hold. Try fewer locations or Fill open gaps."} /></CorpCard>
      : <>
        {data.baseline ? <CorpCard as="div" label="The schedule now">
          <CorpRows label="The schedule now">
            <li><CorpRow one title="Coverage" value={coverageText(data.baseline)} valueTone="soft" /></li>
            <li><CorpRow one title="Still open" value={`${data.baseline.remainingBlocks} ${data.baseline.remainingBlocks === 1 ? "block" : "blocks"}`} valueTone="soft" /></li>
          </CorpRows>
        </CorpCard> : null}
        {data.alternatives.length ? <div className={data.alternatives.length > 1 ? "wk-grid wk-grid--two" : "wk-grid"}>
          {data.alternatives.map((option, index) => <OptionCard key={option.id} option={option} index={index} baseline={data.baseline} />)}</div>
          : <CorpCard as="div"><BState kind="empty" icon={<CalendarCheckIcon weight="bold" />} title="No options to show" line="Rondo found nothing to change for this week and scope." /></CorpCard>}
      </>}
    <CorpCard as="div" label="Locations" count={included.length}>
      <CorpRows label="Locations">
        {[...included, ...excluded].map(location => <li key={location.id}><CorpRow title={location.name} detail={location.issues.length ? location.issues.join(" · ") : undefined}
          value={LOCATION_STATE_TEXT[location.state]} valueTone="soft" one={!location.issues.length} /></li>)}
      </CorpRows>
    </CorpCard>
    <p className="wk-foot">
      {data.partial ? "The search stopped before checking every possibility, so a better option may exist. " : ""}
      Hours are scheduled business hours, not time worked or pay; costs aren’t included. Fairness uses each person’s targets and preferences and {data.fairness.windowWeeks} weeks of weekend history
      ({data.fairness.employeesWithKnownWeekends} known, {data.fairness.employeesWithoutKnownWeekends} unknown). Compared in {(data.computation.elapsedMs / 1000).toFixed(1)} s.
    </p>
  </section>;
}
function OptionCard({ option, index, baseline }: { option: WeeklyAlternativeSummary; index: number; baseline: WeeklyComparison["baseline"] }) {
  const reasons = option.inspectionReasons.map(reason => REASON_TEXT[reason]);
  return <CorpCard as="div" label={`Option ${letter(index)}`} aside={<CorpPill tone={statusTone(option)}>{option.applyEligible ? STATUS_TEXT[option.status] : "Look only"}</CorpPill>}>
    <CorpRows label={`Option ${letter(index)}`}>
      <li><CorpRow one title="Adds" value={`${option.added} ${option.added === 1 ? "shift" : "shifts"} · ${hours(option.addedMinutes)}`} valueTone="soft" /></li>
      {option.removed ? <li><CorpRow one title="Replaces" value={`${option.removed} draft ${option.removed === 1 ? "shift" : "shifts"} · ${hours(option.removedMinutes)}`} valueTone="soft" /></li> : null}
      <li><CorpRow one title="Keeps" value={`${option.preservedAssignments} ${option.preservedAssignments === 1 ? "shift" : "shifts"}`} valueTone="soft" /></li>
      <li><CorpRow one title="Coverage" value={`${coverageText(option.coverage)}${baseline ? ` · ${delta(option.coverage.coveredMinutes, baseline.coveredMinutes)}` : ""}`} valueTone="soft" /></li>
      <li><CorpRow one title="Still open" value={`${option.remaining.total} ${option.remaining.total === 1 ? "block" : "blocks"}`} valueTone="soft" /></li>
    </CorpRows>
    <CorpBody>
      {reasons.length ? <p className="wk-note"><WarningIcon weight="bold" aria-hidden="true" /><span>{option.applyEligible ? "Worth a look: " : "Can’t be saved: "}{reasons.join(". ")}.</span></p> : null}
      {option.issues.items.length ? <ul className="wk-issues">{option.issues.items.slice(0, 3).map((item, i) => <li key={i}><span>{item.message}</span><small>{PROVENANCE_TEXT[item.provenance]}</small></li>)}
        {option.issues.total > 3 ? <li className="wk-more">{option.issues.total - 3} more in the full plan</li> : null}</ul> : null}
      <div className="wk-acts wk-acts--end"><CorpButtonLink href={`${WEEKLY_PATH}?review=${option.id}`} kind="secondary" size="md">Review option {letter(index)}</CorpButtonLink></div>
    </CorpBody>
  </CorpCard>;
}

/* ---------- One option in full ---------- */
function ReviewView({ reviewId, review, outcome, reading, hidden, weeklyEnabled, locations, timeZone, now, acknowledged, setAcknowledged, busy, approvalLocked, onRefresh, onApprove, onDecline }: {
  reviewId: string; review: Lease | null; outcome: Lease | null; reading: boolean; hidden: boolean; weeklyEnabled: boolean; locations: WeeklyLocation[]; timeZone: string; now: number;
  acknowledged: boolean; setAcknowledged: (value: boolean) => void; busy: boolean; approvalLocked: boolean;
  onRefresh: () => void; onApprove: (plan: WeeklyPlanReview, readReceiptId: string) => void; onDecline: (id: string) => void;
}) {
  if (outcome) return <Outcome result={outcome.result} reviewId={reviewId} timeZone={timeZone} onRefresh={onRefresh} onDecline={onDecline} busy={busy} weeklyEnabled={weeklyEnabled} />;
  if (review?.result.review) return <FullPlan plan={review.result.review} readReceiptId={review.result.readReceiptId} baseline={review.result.comparison?.baseline ?? null}
    locations={locations} timeZone={timeZone} now={now} acknowledged={acknowledged} setAcknowledged={setAcknowledged} busy={busy} approvalLocked={approvalLocked}
    onApprove={onApprove} onDecline={onDecline} weeklyEnabled={weeklyEnabled} />;
  if (hidden) return <HiddenCard onRefresh={onRefresh} />;
  if (reading) return <Skeleton />;
  return <CorpCard as="div"><BState kind="empty" title="Nothing to show yet" line="Open the plan to see it." action={{ label: "Open the plan", onClick: onRefresh }} /></CorpCard>;
}
function Skeleton() {
  return <section className="c-card wk-skel" aria-busy="true" aria-label="Loading the plan">
    <span className="wk-skel__bar wk-skel__bar--head" />
    {[58, 44, 66, 50].map(width => <span key={width} className="wk-skel__bar" style={{ width: `${width}%` }} />)}
  </section>;
}
function Outcome({ result, reviewId, timeZone, onRefresh, onDecline, busy, weeklyEnabled }: { result: WeeklyResult; reviewId: string; timeZone: string; onRefresh: () => void; onDecline: (id: string) => void; busy: boolean; weeklyEnabled: boolean }) {
  const when = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  if (result.state === "stale") return <CorpCard as="div"><BState kind="paused" icon={<WarningIcon weight="bold" />} title="This plan is out of date"
    line="The schedule or your setup changed, or the plan expired. Compare again for current options. You can still decline it.">
    <span className="wk-acts"><CorpButtonLink href={WEEKLY_PATH} kind="primary" size="md">Compare again</CorpButtonLink>
      {weeklyEnabled ? <CorpButton kind="secondary" size="md" disabled={busy} onClick={() => onDecline(reviewId)}>Decline it</CorpButton> : null}</span>
  </BState></CorpCard>;
  if (result.state === "declined") return <CorpCard as="div"><BState kind="empty" icon={<CalendarCheckIcon weight="bold" />} title="Plan declined" line="Nothing on the schedule changed. You can review another option."
    action={{ label: "Back to options", href: WEEKLY_PATH }} /></CorpCard>;
  if (result.state === "not_saved") return <CorpCard as="div"><BState kind="empty" title="Not saved" line="NEVORA checked: this plan wasn’t saved and nothing from it is on the schedule." action={{ label: "Back to options", href: WEEKLY_PATH }} /></CorpCard>;
  if (result.state === "unavailable" || !result.receipt) return <CorpCard as="div"><BState kind="failed" title="Can’t check this plan right now"
    line={weeklyEnabled ? "NEVORA couldn’t confirm what happened to it. Try again in a moment." : "Weekly planning is off, so only a saved plan’s record can be shown."} action={{ label: "Check again", onClick: onRefresh }} /></CorpCard>;
  const receipt = result.receipt, progress = result.progress;
  return <>
    <CorpCard as="div" label="Saved">
      <CorpRows label="What was saved">
        <li><CorpRow one title="Saved" value={when(receipt.savedAt)} valueTone="soft" /></li>
        <li><CorpRow one title="Added" value={`${receipt.added} ${receipt.added === 1 ? "shift" : "shifts"}`} valueTone="soft" /></li>
        {receipt.removed ? <li><CorpRow one title="Replaced" value={`${receipt.removed} draft ${receipt.removed === 1 ? "shift" : "shifts"}`} valueTone="soft" /></li> : null}
        <li><CorpRow one title="Kept" value={`${receipt.preservedAssignments} ${receipt.preservedAssignments === 1 ? "shift" : "shifts"}`} valueTone="soft" /></li>
      </CorpRows>
    </CorpCard>
    <CorpCard as="div" label="Now" aside={progress ? <CorpPill tone={progress.state === "published" ? "green" : progress.state === "changed" ? "amber" : "neutral"}>{PROGRESS_TEXT[progress.state]}</CorpPill> : undefined}>
      {progress && progress.state !== "unavailable" ? <CorpRows label="The saved shifts now">
        <li><CorpRow one title="Still as saved" value={`${progress.assignmentsPresent} of ${progress.assignmentsTotal}`} valueTone="soft" /></li>
        <li><CorpRow one title="Published" value={`${progress.publishedAssignments} of ${progress.assignmentsPresent}`} valueTone="soft" /></li>
        {progress.coverage ? <li><CorpRow one title="Coverage" value={coverageText(progress.coverage)} valueTone="soft" /></li> : null}
      </CorpRows> : <CorpBody><p className="wk-para">{progress ? "NEVORA couldn’t look at the schedule just now." : weeklyEnabled ? "The saved shifts can’t be compared with the schedule right now." : "Weekly planning is off, so only this record is shown."}</p></CorpBody>}
    </CorpCard>
    <p className="wk-foot">This records what was saved as a draft. It doesn’t show attendance, and it isn’t proof the week is covered. Publishing happens in Schedule, and nobody was notified.</p>
    <div className="wk-acts wk-acts--end wk-acts--page">
      <CorpButtonLink href={WEEKLY_PATH} kind="secondary" size="md">Plan another week</CorpButtonLink>
      <CorpButtonLink href="/app/schedule" kind="primary" size="md">Open Schedule</CorpButtonLink>
    </div>
  </>;
}
function FullPlan({ plan, readReceiptId, baseline, locations, timeZone, now, acknowledged, setAcknowledged, busy, approvalLocked, onApprove, onDecline, weeklyEnabled }: {
  plan: WeeklyPlanReview; readReceiptId: string | null; baseline: WeeklyComparison["baseline"]; locations: WeeklyLocation[]; timeZone: string; now: number;
  acknowledged: boolean; setAcknowledged: (value: boolean) => void; busy: boolean; approvalLocked: boolean;
  onApprove: (plan: WeeklyPlanReview, readReceiptId: string) => void; onDecline: (id: string) => void; weeklyEnabled: boolean;
}) {
  void locations;
  const until = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(plan.expiresAt));
  const expired = Date.parse(plan.expiresAt) <= now;
  const additions = [...plan.changes.additions].sort((a, b) => (a.date + a.startTime + a.employeeName).localeCompare(b.date + b.startTime + b.employeeName));
  const removals = [...plan.changes.removals].sort((a, b) => (a.date + a.startTime + a.employeeName).localeCompare(b.date + b.startTime + b.employeeName));
  const reasons = plan.inspectionReasons.map(reason => REASON_TEXT[reason]);
  const canSave = !!readReceiptId && plan.applyEligible && !expired && weeklyEnabled;
  const shift = (a: (typeof additions)[number]) => `${dayText(a.date)} · ${clockText(a.startTime)}–${clockText(a.endTime)} · ${a.locationName}${a.positionName ? ` · ${a.positionName}` : ""}`;
  return <>
    <CorpCard as="div" label="This plan" aside={<CorpPill tone={statusTone(plan)}>{plan.applyEligible ? STATUS_TEXT[plan.status] : "Look only"}</CorpPill>}>
      <CorpRows label="This plan">
        <li><CorpRow one title="Adds" value={`${plan.added} ${plan.added === 1 ? "shift" : "shifts"} · ${hours(plan.addedMinutes)}`} valueTone="soft" /></li>
        {plan.removed ? <li><CorpRow one title="Replaces" value={`${plan.removed} draft ${plan.removed === 1 ? "shift" : "shifts"} · ${hours(plan.removedMinutes)}`} valueTone="soft" /></li> : null}
        <li><CorpRow one title="Keeps" value={`${plan.preservedAssignments} ${plan.preservedAssignments === 1 ? "shift" : "shifts"}`} valueTone="soft" /></li>
        <li><CorpRow one title="Coverage" value={`${baseline ? `${hours(baseline.coveredMinutes)} → ` : ""}${coverageText(plan.coverage)}`} valueTone="soft" /></li>
        <li><CorpRow one title="Still open" value={`${plan.remaining.total} ${plan.remaining.total === 1 ? "block" : "blocks"}`} valueTone="soft" /></li>
        <li><CorpRow one title="Available until" value={expired ? "Expired" : until} valueTone="soft" /></li>
      </CorpRows>
    </CorpCard>

    <CorpSection id="wk-added" label="Shifts added" count={additions.length}>
      <CorpCard as="div"><CorpRows label="Shifts added">{additions.length ? additions.map((a, i) => <li key={i}><CorpRow title={a.employeeName} detail={shift(a)}
        detailEnd={a.isDesignatedLead ? <CorpPill tone="teal">Lead</CorpPill> : undefined} /></li>)
        : <li className="c-empty c-empty--row">No shifts added</li>}</CorpRows></CorpCard>
    </CorpSection>
    {removals.length ? <CorpSection id="wk-removed" label="Draft shifts replaced" count={removals.length}>
      <CorpCard as="div"><CorpRows label="Draft shifts replaced">{removals.map((r, i) => <li key={i}><CorpRow title={r.employeeName} detail={shift(r)}
        detailEnd={<CorpPill tone="neutral">Replaced</CorpPill>} /></li>)}</CorpRows></CorpCard>
      <p className="wk-foot">Only draft shifts generated earlier can be replaced. Manual shifts, published weeks and shifts with history stay.</p>
    </CorpSection> : null}
    <CorpSection id="wk-open" label="Still open" count={plan.remaining.total}>
      <CorpCard as="div"><CorpRows label="Still open">{plan.remaining.items.length ? plan.remaining.items.map((g, i) => <li key={i}><CorpRow
        title={`${dayText(g.date)} · ${clockText(g.startTime)}–${clockText(g.endTime)}`}
        detail={[g.locationName, g.missingStaff === null ? null : `${g.missingStaff} more ${g.missingStaff === 1 ? "person" : "people"}`, g.requiresLead ? "lead needed" : null,
          ...g.positions.map(p => `${p.name} ×${p.missing}`), g.positionsOmitted ? `${g.positionsOmitted} more positions` : null].filter(Boolean).join(" · ")} /></li>)
        : <li className="c-empty c-empty--row">Nothing left open</li>}
        {plan.remaining.total > plan.remaining.items.length ? <li className="c-empty c-empty--row">{plan.remaining.total - plan.remaining.items.length} more open blocks aren’t listed</li> : null}
      </CorpRows></CorpCard>
    </CorpSection>
    {plan.issues.total ? <CorpSection id="wk-checks" label="Things to check" count={plan.issues.total}>
      <CorpCard as="div"><CorpRows label="Things to check">{plan.issues.items.map((item, i) => <li key={i}><CorpRow title={item.message} detail={PROVENANCE_TEXT[item.provenance]} /></li>)}
        {plan.issues.total > plan.issues.items.length ? <li className="c-empty c-empty--row">{plan.issues.total - plan.issues.items.length} more aren’t listed</li> : null}</CorpRows></CorpCard>
    </CorpSection> : null}

    <CorpSection id="wk-decide" label="Decide">
      <CorpCard as="div"><CorpBody><div className="wk-decide">
        {canSave ? <>
          <p className="wk-para">Saving adds all {plan.added} {plan.added === 1 ? "shift" : "shifts"}{plan.removed ? ` and replaces ${plan.removed}` : ""} as a draft, in one step. Nothing is published and nobody is notified; you publish from Schedule.</p>
          <label className="wk-ack"><input type="checkbox" checked={acknowledged} disabled={busy || approvalLocked} onChange={event => setAcknowledged(event.target.checked)} />
            <span>I reviewed all proposed changes and remaining gaps</span></label>
        </> : <p className="wk-note"><WarningIcon weight="bold" aria-hidden="true" /><span>{!weeklyEnabled ? "Weekly planning is off, so this plan can’t be saved." : expired ? "This plan has expired. Compare again for current options."
          : `This plan can be looked at but not saved${reasons.length ? `: ${reasons.join(". ").toLowerCase()}` : ""}.`}</span></p>}
        <div className="wk-acts wk-acts--end">
          {weeklyEnabled ? <CorpButton kind="secondary" size="md" disabled={busy} onClick={() => onDecline(plan.id)}>Decline</CorpButton> : null}
          {canSave ? <CorpButton kind="primary" size="md" disabled={!acknowledged || busy || approvalLocked} onClick={() => onApprove(plan, readReceiptId!)}>{busy ? "Saving…" : "Save as draft"}</CorpButton>
            : <CorpButtonLink href={WEEKLY_PATH} kind="primary" size="md">Back to options</CorpButtonLink>}
        </div>
      </div></CorpBody></CorpCard>
      <p className="wk-foot">Hours are scheduled business hours, not time worked or pay; costs aren’t included. Fairness uses targets, preferences and {plan.fairness.windowWeeks} weeks of weekend history ({plan.fairness.employeesWithKnownWeekends} known, {plan.fairness.employeesWithoutKnownWeekends} unknown).</p>
    </CorpSection>
  </>;
}
