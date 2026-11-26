"use client";
import { useViewLang } from "@/components/owner-b/use-owner-lang";
import { DiscardGuard } from "@/components/kit/discard-dialog";
import { leaveWithDiscardGuard } from "@/components/kit/use-discard-guard";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { BCallout, BFilters, BNote, BState } from "@/components/owner-b/b-kit";
import { minutesFromHours, policyOrder, readAccount, readPolicies, sendSettings, type PostCommand, type PtoAccount, type PtoEntry, type PtoPolicy } from "@/lib/workforce/pto-client";
import { dateText, hoursText, ptoCopy, rangeText, type PtoCopy, type PtoLang } from "./copy";

/* PTO screens (Nov 20, 2026): one person's time off balance, for Owners (Team › person › Time off balance). Reads the
 * person's account (GET /api/workforce/pto/{employeeId}) and the current policies; an adjustment is one PTO_POST command
 * (ADJUSTMENT, or OPENING before anything else is recorded) after a review that shows the balance now and after. The
 * server refuses anything that would take a balance below zero or date it before the last year-end carryover. A save
 * whose answer is lost is kept whole and only ever sent again unchanged. No statutory accrual is posted from here. */

type Data = { account: PtoAccount; policies: PtoPolicy[] };
type Load = { state: "loading" } | { state: "ready"; data: Data } | { state: "failed" | "signed_out" | "denied" };
type Mode = "add" | "remove" | "opening";
type Draft = { code: string; mode: Mode; amount: string; date: string; note: string };
type Step = "view" | "edit" | "review";
type Custody = { command: PostCommand; status: "sending" | "unknown" | "checking" | "still_unknown" };
type Issue = "conflict" | "invalid" | "denied" | "signed_out";
type Problem = "amount" | "below" | "date" | "note";

export type AccountScreenProps = { employeeId: string; name: string; firstName: string; backHref: string; today: string; actors: Record<string, string>; actorId: string;
  lang?: PtoLang; initial?: { load?: Load; step?: Step; draft?: Draft; custody?: Custody; issue?: Issue } };
const TITLE_ID = "pto-acc-title";

function Act({ kind, children, onClick, disabled, busy }: { kind: "teal" | "ghost" | "quiet" | "text"; children: ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean }) {
  const cls = kind === "text" ? "b-btn b-btn--quiet b-rowact b-rowact--quiet" : `b-btn b-btn--${kind} rs-act`;
  return <button type="button" className={cls} aria-busy={busy || undefined} disabled={disabled || busy} onClick={onClick}>{children}</button>;
}

/** The signed change a draft makes, or null when the amount isn't valid. */
export function draftDelta(draft: Draft): number | null {
  const minutes = minutesFromHours(draft.amount);
  if (minutes === null || minutes <= 0 || minutes > 525600) return null;
  return draft.mode === "remove" ? -minutes : minutes;
}
export function draftProblems(draft: Draft, balance: number, today: string): Problem[] {
  const out: Problem[] = [];
  const delta = draftDelta(draft);
  if (delta === null) out.push("amount");
  else if (balance + delta < 0) out.push("below");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || draft.date > today) out.push("date");
  if (!draft.note.trim()) out.push("note");
  return out;
}

export function entryDetail(entry: PtoEntry, t: PtoCopy, actors: Record<string, string>, actorId: string) {
  const who = entry.actorEmployeeId ? (entry.actorEmployeeId === actorId ? t.you : actors[entry.actorEmployeeId] ?? t.someone) : null;
  const parts = [dateText(entry.effectiveDate, t)];
  if (entry.accrual) parts.push(entry.kind === "ADJUSTMENT" ? t.timecardChanged(rangeText(entry.accrual.startDate, entry.accrual.endDate, t))
    : t.fromTimecards(rangeText(entry.accrual.startDate, entry.accrual.endDate, t), hoursText(entry.accrual.qualifyingMinutes)));
  else if (who && entry.kind !== "USAGE" && entry.kind !== "REVERSAL") parts.push(t.by(who));
  return parts.join(" · ");
}

export function AccountScreen(props: AccountScreenProps) {
  const { employeeId, name, firstName, backHref, today, actors, actorId, lang: langProp, initial } = props;
  const lang = useViewLang(langProp);
  const t = ptoCopy(lang);
  const [load, setLoad] = useState<Load>(initial?.load ?? { state: "loading" });
  const [step, setStep] = useState<Step>(initial?.step ?? "view");
  const [draft, setDraft] = useState<Draft | null>(initial?.draft ?? null);
  const [custody, setCustody] = useState<Custody | null>(initial?.custody ?? null);
  const [issue, setIssue] = useState<Issue | null>(initial?.issue ?? null);
  const [problems, setProblems] = useState<Problem[]>([]);
  // The confirmed change: which balance, and what it is now (the sum the review showed, then the server's own figure).
  const [landed, setLanded] = useState<{ code: string; minutes: number } | null>(null);
  const [said, setSaid] = useState("");
  const issueRef = useRef<HTMLDivElement>(null), problemRef = useRef<HTMLParagraphElement>(null), shownStep = useRef(step), doneRef = useRef<HTMLElement>(null);

  const fetchAll = useCallback(async (signal?: AbortSignal): Promise<Load> => {
    const [account, policies] = await Promise.all([readAccount(employeeId, signal), readPolicies(signal)]);
    if (account.kind === "ready" && policies.kind === "ready") return { state: "ready", data: { account: account.account, policies: policies.policies } };
    const bad = account.kind !== "ready" ? account.kind : policies.kind !== "ready" ? policies.kind : "unavailable";
    return bad === "unavailable" ? { state: "failed" } : { state: bad };
  }, [employeeId]);
  const apply = useCallback((next: Load) => setLoad(old => next.state === "failed" && old.state === "ready" ? old : next), []);
  const reload = useCallback(() => fetchAll().then(apply, () => undefined), [fetchAll, apply]);
  useEffect(() => {
    if (initial?.load) return;
    const controller = new AbortController();
    fetchAll(controller.signal).then(next => { if (!controller.signal.aborted) apply(next); }, () => undefined);
    return () => controller.abort();
  }, [fetchAll, apply, initial?.load]);
  useEffect(() => {
    if (!custody || custody.status === "sending") return;
    const hold = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", hold);
    return () => window.removeEventListener("beforeunload", hold);
  }, [custody]);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    // A confirmed change lands on its result: the title that says what is now true takes focus, so it is read once.
    if (step === "view" && landed && doneRef.current) { doneRef.current.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); return; }
    const title = [...document.querySelectorAll<HTMLElement>(".pto h1")].find(h => h.getClientRects().length > 0);
    if (title) { if (!title.hasAttribute("tabindex")) title.tabIndex = -1; title.focus(); window.scrollTo({ top: 0 }); }
  }, [step, landed]);
  const trouble = custody && custody.status !== "sending" ? custody.status : issue;
  useEffect(() => {
    if (!trouble) return;
    issueRef.current?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    issueRef.current?.focus({ preventScroll: true });
  }, [trouble]);

  const data = load.state === "ready" ? load.data : null;
  const rows = useMemo(() => {
    if (!data) return [];
    // Every enabled policy, plus any turned-off policy that still holds time for this person.
    const codes = new Set([...data.policies.filter(p => p.enabled).map(p => p.code), ...data.account.balances.map(b => b.code)]);
    return [...codes].sort(policyOrder).map(code => {
      const policy = data.policies.find(p => p.code === code) ?? null, balance = data.account.balances.find(b => b.code === code);
      return { code, label: policy?.label ?? balance?.label ?? code, enabled: policy?.enabled ?? balance?.enabled ?? false, minutes: balance?.balanceMinutes ?? 0, policy,
        hasEntries: data.account.entries.some(e => e.policyCode === code) };
    });
  }, [data]);
  const labelOf = (code: string) => rows.find(r => r.code === code)?.label ?? code;
  const busy = custody?.status === "sending" || custody?.status === "checking";

  function startAdjust(code?: string) {
    // Vacation first when it exists (the balance most adjustments touch), then any policy in use.
    const first = rows.find(r => r.code === code) ?? rows.find(r => r.code === "VACATION" && r.policy?.enabled) ?? rows.find(r => r.policy?.enabled) ?? rows[0];
    if (!first) return;
    setIssue(null); setLanded(null); setProblems([]);
    setDraft({ code: first.code, mode: first.hasEntries ? "add" : "opening", amount: "", date: today, note: "" });
    setStep("edit");
  }
  const current = (d: Draft) => rows.find(r => r.code === d.code);
  function toReview() {
    if (!draft) return;
    const found = draftProblems(draft, current(draft)?.minutes ?? 0, today);
    setProblems(found);
    if (found.length) { requestAnimationFrame(() => problemRef.current?.focus()); return; }
    setStep("review");
  }
  async function send(command: PostCommand, again: boolean) {
    setCustody({ command, status: again ? "checking" : "sending" }); setIssue(null);
    const result = await sendSettings(command);
    if (result.kind === "saved") {
      // The result's title takes focus (the step effect), so the live line stays empty: a result is said once. The same
      // one reload as before; its balance replaces the review's sum in the fact line.
      const code = command.policyCode, expected = (rows.find(r => r.code === code)?.minutes ?? 0) + command.quantity;
      setCustody(null); setDraft(null); setStep("view"); setLanded({ code, minutes: expected }); setSaid("");
      const next = await fetchAll().catch(() => null);
      if (next) {
        apply(next);
        const fresh = next.state === "ready" ? next.data.account.balances.find(b => b.code === code) : undefined;
        if (fresh) setLanded(old => old && old.code === code ? { code, minutes: fresh.balanceMinutes } : old);
      }
      return;
    }
    if (result.kind === "unknown") { setCustody({ command, status: again ? "still_unknown" : "unknown" }); setSaid(t.unknownTitle); return; }
    setCustody(null); setIssue(result.kind);
    setSaid(result.kind === "conflict" ? t.conflictTitle : result.kind === "invalid" ? t.invalidTitle : result.kind === "denied" ? t.deniedTitle : t.signedOutTitle);
  }
  function confirm() {
    if (!draft || custody) return;
    const row = current(draft), delta = draftDelta(draft);
    if (!row?.policy || delta === null) return;
    void send({ kind: "PTO_POST", operationId: crypto.randomUUID(), employeeId, policyCode: draft.code, expectedPolicyRevision: row.policy.revision, effectiveDate: draft.date,
      entryKind: draft.mode === "opening" ? "OPENING" : "ADJUSTMENT", quantity: delta, sourceReference: null, note: draft.note.trim() }, false);
  }

  let attention: ReactNode = null;
  if (custody && custody.status !== "sending") attention = <BState alert kind="paused" icon={<WarningIcon weight="bold" />} title={t.unknownTitle} line={custody.status === "still_unknown" ? t.stillUnknown : t.unknownBody}>
    <span className="rs-acts"><Act kind="ghost" busy={custody.status === "checking"} onClick={() => void send(custody.command, true)}>{custody.status === "checking" ? t.checking : t.checkAgain}</Act></span></BState>;
  else if (issue === "conflict") attention = <BState alert kind="paused" icon={<WarningIcon weight="bold" />} title={t.conflictTitle} line={t.conflictBody}>
    <span className="rs-acts"><Act kind="ghost" onClick={() => { setIssue(null); setDraft(null); setStep("view"); setLoad({ state: "loading" }); void reload(); }}>{t.reload}</Act></span></BState>;
  else if (issue === "invalid") attention = <BState alert kind="failed" title={t.invalidTitle} line={t.invalidBodyPost}><span className="rs-acts"><Act kind="text" onClick={() => { setIssue(null); setStep("edit"); }}>{t.close}</Act></span></BState>;
  else if (issue) attention = <BState alert kind="locked" title={issue === "denied" ? t.deniedTitle : t.signedOutTitle} line={issue === "denied" ? t.deniedBody : t.signedOutBody} action={issue === "signed_out" ? { label: t.signIn, href: "/login" } : undefined} />;
  const attentionCard = attention ? <div className="rs-issue" ref={issueRef} tabIndex={-1}><CorpCard ariaLabel={t.unknownTitle}>{attention}</CorpCard></div> : null;

  const title = step === "edit" ? t.adjustTitle : step === "review" ? t.reviewTitle : t.accountTitle;
  // The step line: under the title on the band from 768px; a phone's bar has no second line, so the card carries it.
  const stepLine = load.state !== "ready" || !draft ? null : step === "edit" ? t.stepEdit : step === "review" ? t.stepReview : null;
  let body: ReactNode;
  if (load.state === "loading") body = <CorpCard ariaLabel={t.balancesCard}><div className="rs-skel" role="status" aria-busy="true"><span className="rs-sr">{t.loadingAccount}</span>
    <span className="rs-skel__bar rs-skel__bar--head" aria-hidden="true" />{[42, 34, 40].map((w, i) => <span key={i} className="rs-skel__row" aria-hidden="true"><span className="rs-skel__bar rs-skel__bar--day" /><span className="rs-skel__bar" style={{ width: `${w}%` }} /></span>)}</div></CorpCard>;
  else if (load.state !== "ready") body = <div className="rs-state"><CorpCard ariaLabel={t.accountTitle}>{
    load.state === "failed" ? <BState alert kind="failed" title={t.failedTitle} line={t.failedBody} action={{ retry: true, label: t.tryAgain, onClick: () => { setLoad({ state: "loading" }); void reload(); } }} />
    : load.state === "signed_out" ? <BState alert kind="locked" title={t.signedOutTitle} line={t.signedOutBody} action={{ label: t.signIn, href: "/login" }} />
    : <BState kind="locked" title={t.deniedTitle} line={t.deniedBody} action={{ label: firstName, href: backHref }} />}</CorpCard></div>;
  else if (step === "edit" && draft) {
    const row = current(draft);
    const set = (patch: Partial<Draft>) => { const next = { ...draft, ...patch }; setDraft(next); if (problems.length) setProblems(draftProblems(next, current(next)?.minutes ?? 0, today)); };
    const err = (p: Problem, id: string, text: string) => problems.includes(p) ? <p className="rs-err" id={id}><WarningCircleIcon size={16} weight="bold" aria-hidden="true" />{text}</p> : null;
    const modes: Mode[] = row && !row.hasEntries ? ["opening", "add"] : ["add", "remove"];
    const amountBad = problems.includes("amount") || problems.includes("below");
    body = <>
      {attentionCard}
      <CorpCard id="pto-adjust" ariaLabel={t.adjustTitle}>
        <p className="rs-step">{t.stepEdit}</p>
        <div className="rs-fields">
          <div className="rs-field"><label className="rs-field__l" htmlFor="pto-policy">{t.whichPolicy}</label>
            <select id="pto-policy" className="c-in rs-in" value={draft.code} disabled={busy} onChange={event => { const r = rows.find(x => x.code === event.target.value); set({ code: event.target.value, mode: r && !r.hasEntries ? "opening" : "add" }); }}>
              {rows.filter(r => r.policy).map(r => <option key={r.code} value={r.code}>{`${r.label} · ${hoursText(r.minutes)}`}</option>)}</select></div>
          <div className="rs-field"><span className="rs-field__l">{t.change}</span>
            <BFilters label={t.change} items={modes.map(mode => ({ key: mode, label: mode === "add" ? t.add : mode === "remove" ? t.remove : t.opening, current: draft.mode === mode, onSelect: () => set({ mode }) }))} />
            {draft.mode === "opening" ? <p className="rs-field__h">{t.openingHelp}</p> : null}</div>
          <div className="rs-field"><label className="rs-field__l" htmlFor="pto-amount">{t.amount}</label>
            <input id="pto-amount" className="c-in rs-in pto-num" type="text" inputMode="decimal" autoComplete="off" maxLength={8} value={draft.amount} disabled={busy}
              aria-invalid={amountBad || undefined} aria-describedby={amountBad ? "pto-amount-h pto-amount-e" : "pto-amount-h"} onChange={event => set({ amount: event.target.value })} />
            <p className="rs-field__h" id="pto-amount-h">{t.amountHelp}</p>{err("amount", "pto-amount-e", t.needAmount)}{err("below", "pto-amount-e", t.belowZero)}</div>
          <div className="rs-field"><label className="rs-field__l" htmlFor="pto-date">{t.effective}</label>
            <input id="pto-date" className="c-in rs-in" type="date" max={today} value={draft.date} disabled={busy} aria-invalid={problems.includes("date") || undefined}
              aria-describedby={problems.includes("date") ? "pto-date-h pto-date-e" : "pto-date-h"} onChange={event => set({ date: event.target.value })} />
            <p className="rs-field__h" id="pto-date-h">{t.effectiveHelp}</p>{err("date", "pto-date-e", t.needDate)}</div>
          <div className="rs-field"><label className="rs-field__l" htmlFor="pto-note">{t.note}</label>
            <input id="pto-note" className="c-in rs-in" type="text" maxLength={500} autoComplete="off" value={draft.note} disabled={busy} aria-invalid={problems.includes("note") || undefined}
              aria-describedby={problems.includes("note") ? "pto-note-h pto-note-e" : "pto-note-h"} onChange={event => set({ note: event.target.value })} />
            <p className="rs-field__h" id="pto-note-h">{t.noteHelp}</p>{err("note", "pto-note-e", t.needNote)}</div>
        </div>
      </CorpCard>
      {problems.length ? <p className="rs-err rs-err--sum" ref={problemRef} tabIndex={-1} role="alert"><WarningCircleIcon size={16} weight="bold" aria-hidden="true" />{t.problems(problems.length)}</p> : null}
      <div className="rs-foot"><Act kind="text" disabled={busy} onClick={() => leaveWithDiscardGuard(() => { setDraft(null); setProblems([]); setStep("view"); })}>{t.cancel}</Act><Act kind="teal" disabled={busy} onClick={toReview}>{t.review}</Act></div>
    </>;
  } else if (step === "review" && draft) {
    const row = current(draft), delta = draftDelta(draft) ?? 0, before = row?.minutes ?? 0;
    const sending = custody?.status === "sending";
    body = <>
      {attentionCard}
      <CorpCard id="pto-review" label={t.reviewLine(firstName, labelOf(draft.code))}
        footer={<><Act kind="text" disabled={busy || !!custody} onClick={() => setStep("edit")}>{t.back}</Act>
          <Act kind="teal" busy={sending} disabled={busy || !!custody} onClick={confirm}>{sending ? t.saving : t.saveAdjust}</Act></>}>
        <p className="rs-step">{t.stepReview}</p>
        <CorpRows label={t.reviewLine(firstName, labelOf(draft.code))}>
          <li><CorpRow title={t.now} value={hoursText(before)} valueTone="soft" /></li>
          <li><CorpRow title={draft.mode === "opening" ? t.opening : t.change} detail={dateText(draft.date, t)} value={hoursText(delta, true)} valueTone="soft" /></li>
          <li><CorpRow bold title={t.after} value={hoursText(before + delta)} valueTone="teal" /></li>
        </CorpRows>
        <p className="rs-note rs-note--in">{t.note}: {draft.note.trim()}</p>
      </CorpCard>
    </>;
  } else {
    const account = data!.account;
    body = <>
      {attentionCard}
      <CorpCard id="pto-balances" label={t.balancesCard}>
        {/* Final polish (finding 24): a save's result opens the card it changed: the done mark, what is now true, the fact. */}
        {landed && !attention ? <BState kind="done" titleRef={doneRef} title={t.adjustSaved} line={t.adjustSavedLine(labelOf(landed.code), hoursText(landed.minutes))} /> : null}
        {rows.length ? <CorpRows label={t.balancesCard}>{rows.map(r => <li key={r.code}><CorpRow title={r.label} detail={r.enabled ? undefined : t.policyOff} value={hoursText(r.minutes)} valueTone="soft" /></li>)}</CorpRows>
          : <div className="pto-empty"><BCallout tone="grey" icon="empty" title={t.noPolicies} action={{ label: t.openPolicies, href: "/app/settings/time-off" }} /></div>}
        {rows.some(r => r.policy) ? <div className="rs-main"><Act kind={attention ? "ghost" : "teal"} disabled={busy || !!custody} onClick={() => startAdjust()}>{t.adjust}</Act></div> : null}
      </CorpCard>
      <CorpCard id="pto-history" label={t.historyCard}>
        {account.entries.length ? <ul className="rs-reqs">{account.entries.map(entry => <li key={entry.id} className="rs-req pto-entry">
          <div className="rs-req__h"><span className="rs-req__t">{`${t.kinds[entry.kind] ?? entry.kind} · ${labelOf(entry.policyCode)}`}</span>
            <span className="pto-delta" data-sign={entry.minutes < 0 ? "minus" : "plus"}>{hoursText(entry.minutes, true)}</span></div>
          <p className="rs-req__s">{entryDetail(entry, t, actors, actorId)}</p>
          {entry.note ? <p className="rs-req__w">{entry.note}</p> : null}
        </li>)}</ul> : <p className="rs-open">{t.historyEmpty}</p>}
        {account.historyTruncated ? <p className="rs-zone">{t.historyTruncated}</p> : null}
      </CorpCard>
      <BNote>{t.policiesNote}</BNote>
    </>;
  }

  return <CorpPage className="c-page--narrow rs rs--c pto" labelledBy={TITLE_ID} lang={lang}>
    <CorpNav back={{ href: backHref, label: firstName }} title={title} titleId="pto-acc-nav" phoneOnly />
    <CorpTitle id={TITLE_ID} title={title} sub={stepLine ? `${name} · ${stepLine}` : name} wide focusTarget />
    <p className="rs-sr" role="status" aria-live="polite">{said}</p>
    {body}
    {/* Leaving the flow with a typed amount or note that is not saved asks first (Nov 21, 2026). Review and Back are steps of
      the same flow and never ask; a save that is being checked keeps its own hold. */}
    <DiscardGuard dirty={!!draft && !custody && (draft.amount.trim() !== "" || draft.note.trim() !== "")} lang={lang} />
  </CorpPage>;
}

export type { Draft as AccountDraft };
