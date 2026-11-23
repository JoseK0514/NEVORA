"use client";
import { useViewLang } from "@/components/owner-b/use-owner-lang";
import { DiscardGuard } from "@/components/kit/discard-dialog";
import { leaveWithDiscardGuard } from "@/components/kit/use-discard-guard";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { BCallout, BChip, BFilters, BNote, BState } from "@/components/owner-b/b-kit";
import { localDateTimeToInstant } from "@/lib/business-time";
import { readWages, saveWages, type WagePage, type WageSave } from "@/lib/compensation/compensation-client";
import { centsFromDollars, moneyText, planRate, rateAt, rateBefore, type WageInterval, type WageRevision } from "@/lib/compensation/wage-plan";
import { dateText, instantDate, wagesCopy, type WagesCopy, type WagesLang } from "./copy";

/* SCRUM-214 (Nov 19, 2026): the Owner's pay rate page for one person, opened from their page. The rates and their
 * history are read and saved in the browser through POST /api/compensation/wages (Owner only, every call); this page
 * gets only the person's name, the workplace's locations and time zone from the server. Flow: view, then edit, then
 * review, then one save. A save is built once, when the Owner confirms, and kept whole until its result is known: an
 * unconfirmed save is only ever sent again unchanged (the server replays a saved one). The draft lives in memory only. */

export type WageLocation = { id: string; name: string; active: boolean };
type Load = { state: "loading" } | { state: "ready"; page: WagePage } | { state: "failed" | "signed_out" | "denied" };
type Step = "view" | "edit" | "review";
type Draft = { mode: "set" | "stop"; locationIds: string[]; date: string; rate: string; reason: string };
type Custody = { command: WageSave; status: "sending" | "unknown" | "checking" | "still_unknown" };
type Issue = "conflict" | "invalid" | "denied" | "signed_out";
type Problem = "locations" | "date" | "rate" | "reason";

export type WagesScreenProps = {
  employeeId: string; name: string; firstName: string; backHref: string; timeZone: string; today: string;
  locations: WageLocation[]; defaultLocationIds: string[];
  /** Names for the history's "who": the Owners the page could read. The viewer is "You". */
  actors: Record<string, string>; actorId: string;
  lang?: WagesLang; now?: Date;
  initial?: { load?: Load; step?: Step; draft?: Draft; custody?: Custody; issue?: Issue };
};

const TITLE_ID = "wg-title";
const uuid = () => crypto.randomUUID();
const rateText = (minor: string, t: WagesCopy) => t.perHour(moneyText(minor, t.locale));

function Act({ kind, children, onClick, disabled, busy, id }: { kind: "teal" | "ghost" | "quiet" | "text"; children: ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean; id?: string }) {
  const cls = kind === "text" ? "b-btn b-btn--quiet b-rowact b-rowact--quiet" : `b-btn b-btn--${kind} rs-act`;
  return <button type="button" id={id} className={cls} aria-busy={busy || undefined} disabled={disabled || busy} onClick={onClick}>{children}</button>;
}

function Skeleton({ t }: { t: WagesCopy }) {
  return <CorpCard label={t.nowTitle}><div className="rs-skel" role="status" aria-busy="true"><span className="rs-sr">{t.loading}</span>
    <span className="rs-skel__bar rs-skel__bar--head" aria-hidden="true" />
    {[44, 36, 40].map((width, index) => <span key={index} className="rs-skel__row" aria-hidden="true"><span className="rs-skel__bar rs-skel__bar--day" /><span className="rs-skel__bar" style={{ width: `${width}%` }} /></span>)}
  </div></CorpCard>;
}

export function WagesScreen(props: WagesScreenProps) {
  const { employeeId, name, firstName, backHref, timeZone, today, locations, defaultLocationIds, actors, actorId, lang: langProp, initial } = props;
  const lang = useViewLang(langProp);
  const t = wagesCopy(lang);
  const now = useMemo(() => props.now ?? new Date(), [props.now]);
  const [load, setLoad] = useState<Load>(initial?.load ?? { state: "loading" });
  const [older, setOlder] = useState<{ history: WageRevision[]; next: number | null; state: "idle" | "loading" | "failed" }>({ history: [], next: null, state: "idle" });
  const [step, setStep] = useState<Step>(initial?.step ?? "view");
  const [draft, setDraft] = useState<Draft | null>(initial?.draft ?? null);
  const [custody, setCustody] = useState<Custody | null>(initial?.custody ?? null);
  const [issue, setIssue] = useState<Issue | null>(initial?.issue ?? null);
  const [problems, setProblems] = useState<Problem[]>([]);
  // The confirmed save: the fact line under "Pay rate saved", built from the draft the server just accepted.
  const [landed, setLanded] = useState<{ line: string | null } | null>(null);
  const [said, setSaid] = useState("");
  const issueRef = useRef<HTMLDivElement>(null), problemRef = useRef<HTMLParagraphElement>(null), shownStep = useRef(step), doneRef = useRef<HTMLElement>(null);

  const page = load.state === "ready" ? load.page : null;
  const latest = page?.history[0] ?? null;
  const wages = useMemo(() => latest?.wages ?? [], [latest]);
  const revision = latest?.revision ?? 0;

  const apply = useCallback((result: Awaited<ReturnType<typeof readWages>>) => {
    if (result.kind === "ready") { setLoad({ state: "ready", page: result.page }); setOlder({ history: [], next: result.page.nextBeforeRevision, state: "idle" }); return; }
    if (result.kind === "signed_out" || result.kind === "denied") { setLoad({ state: result.kind }); setDraft(null); setStep("view"); return; }
    setLoad(old => old.state === "ready" ? old : { state: "failed" });
  }, []);
  const reload = useCallback((signal?: AbortSignal) => readWages(employeeId, undefined, signal).then(result => { if (!signal?.aborted) apply(result); }), [employeeId, apply]);

  useEffect(() => {
    if (initial?.load) return;
    const controller = new AbortController();
    readWages(employeeId, undefined, controller.signal).then(result => { if (!controller.signal.aborted) apply(result); }, () => undefined);
    return () => controller.abort();
  }, [employeeId, apply, initial?.load]);
  // An unconfirmed save is held only on this page: leaving would lose the one safe way to check it.
  useEffect(() => {
    if (!custody || custody.status === "sending") return;
    const hold = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", hold);
    return () => window.removeEventListener("beforeunload", hold);
  }, [custody]);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    // A confirmed save lands on its result: the title that says what is now true takes focus, so it is read once.
    if (step === "view" && landed && doneRef.current) { doneRef.current.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); return; }
    const title = [...document.querySelectorAll<HTMLElement>(".wg h1")].find(heading => heading.getClientRects().length > 0);
    if (!title) return;
    if (!title.hasAttribute("tabindex")) title.tabIndex = -1;
    title.focus();
    window.scrollTo({ top: 0 });
  }, [step, landed]);
  const trouble = custody && custody.status !== "sending" ? custody.status : issue;
  useEffect(() => {
    if (!trouble) return;
    issueRef.current?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    issueRef.current?.focus({ preventScroll: true });
  }, [trouble]);

  /* ---- Commands --------------------------------------------------------------------------------------------------- */
  const shown = useMemo(() => {
    // Every location the person has a rate at, plus the ones the page offers by default (their home and eligible ones).
    const ids = new Set([...defaultLocationIds, ...wages.flatMap(w => w.locationIds)]);
    return locations.filter(location => ids.has(location.id));
  }, [defaultLocationIds, wages, locations]);

  function startEdit() {
    setIssue(null); setLanded(null); setProblems([]);
    const ids = defaultLocationIds.filter(id => locations.some(l => l.id === id && l.active));
    setDraft({ mode: "set", locationIds: ids.slice(0, 1), date: today, rate: "", reason: "" });
    setStep("edit");
  }
  function check(next: Draft): Problem[] {
    const out: Problem[] = [];
    if (!next.locationIds.length) out.push("locations");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next.date)) out.push("date");
    if (next.mode === "set" && centsFromDollars(next.rate) === null) out.push("rate");
    if (!next.reason.trim()) out.push("reason");
    return out;
  }
  function toReview() {
    if (!draft) return;
    const found = check(draft);
    setProblems(found);
    if (found.length) { requestAnimationFrame(() => problemRef.current?.focus()); return; }
    setStep("review");
  }
  const fromInstant = (date: string) => localDateTimeToInstant(`${date}T00:00`, timeZone);
  /** "Sofía earns $17.50/h at Condado from Nov 21, 2026", from the draft a confirmed save carried. */
  function savedLine(saved: Draft | null) {
    if (!saved) return null;
    const names = saved.locationIds.map(id => locations.find(l => l.id === id)?.name ?? id);
    const places = names.length === 1 ? names[0] : names.length === 2 ? t.placesTwo(names[0], names[1]) : t.placesMany(names.length);
    const minor = saved.mode === "set" ? centsFromDollars(saved.rate) : null;
    return minor === null ? t.savedStopLine(firstName, places, dateText(saved.date, t)) : t.savedLine(firstName, rateText(minor, t), places, dateText(saved.date, t));
  }

  async function send(command: WageSave, recheck: boolean) {
    setCustody({ command, status: recheck ? "checking" : "sending" }); setIssue(null);
    let result;
    try { result = await saveWages(command); } catch { result = { kind: "unknown" as const }; }
    if (result.kind === "saved") {
      // The result's title takes focus (the step effect), so the live line stays empty: a result is said once.
      setCustody(null); setLanded({ line: savedLine(draft) }); setDraft(null); setStep("view"); setSaid("");
      await reload().catch(() => undefined);
      return;
    }
    if (result.kind === "unknown") { setCustody({ command, status: recheck ? "still_unknown" : "unknown" }); setSaid(t.unknownTitle); return; }
    setCustody(null);
    setIssue(result.kind);
    setSaid(result.kind === "conflict" ? t.conflictTitle : result.kind === "invalid" ? t.invalidTitle : result.kind === "denied" ? t.deniedTitle : t.signedOutTitle);
  }
  function confirm() {
    if (!draft || custody) return;
    let from: string;
    try { from = fromInstant(draft.date); } catch { setProblems(["date"]); setStep("edit"); return; }
    const minor = draft.mode === "set" ? centsFromDollars(draft.rate) : null;
    const next = planRate(wages, { locationIds: draft.locationIds, from, hourlyRateMinor: minor, id: uuid() }, uuid);
    void send({ action: "SAVE_WAGES", employeeId, expectedRevision: revision, operationId: uuid(), reason: draft.reason.trim(), wages: next }, false);
  }
  async function showOlder() {
    const before = older.history.at(-1)?.revision ?? page?.history.at(-1)?.revision;
    if (!before) return;
    setOlder(old => ({ ...old, state: "loading" }));
    const result = await readWages(employeeId, before).catch(() => ({ kind: "unavailable" as const }));
    if (result.kind === "ready") setOlder(old => ({ history: [...old.history, ...result.page.history], next: result.page.nextBeforeRevision, state: "idle" }));
    else setOlder(old => ({ ...old, state: "failed" }));
  }

  /* ---- Pieces ----------------------------------------------------------------------------------------------------- */
  const busy = custody?.status === "sending" || custody?.status === "checking";
  const back = { href: backHref, label: firstName };
  let attention: ReactNode = null;
  if (custody && custody.status !== "sending") {
    attention = <BState alert kind="paused" icon={<WarningIcon weight="bold" />} title={t.unknownTitle} line={custody.status === "still_unknown" ? t.stillUnknown : t.unknownBody}>
      <span className="rs-acts"><Act kind="ghost" busy={custody.status === "checking"} onClick={() => void send(custody.command, true)}>{custody.status === "checking" ? t.checking : t.checkAgain}</Act></span>
    </BState>;
  } else if (issue === "conflict") {
    attention = <BState alert kind="paused" icon={<WarningIcon weight="bold" />} title={t.conflictTitle} line={t.conflictBody}>
      <span className="rs-acts"><Act kind="ghost" onClick={() => { setIssue(null); setDraft(null); setStep("view"); setLoad({ state: "loading" }); void reload(); }}>{t.reload}</Act></span>
    </BState>;
  } else if (issue === "invalid") {
    attention = <BState alert kind="failed" title={t.invalidTitle} line={t.invalidBody}><span className="rs-acts"><Act kind="text" onClick={() => { setIssue(null); setStep("edit"); }}>{t.close}</Act></span></BState>;
  } else if (issue === "denied" || issue === "signed_out") {
    attention = <BState alert kind="locked" title={issue === "denied" ? t.deniedTitle : t.signedOutTitle} line={issue === "denied" ? t.deniedBody : t.signedOutBody}
      action={issue === "signed_out" ? { label: t.signIn, href: "/login" } : undefined} />;
  }
  const attentionCard = attention ? <div className="rs-issue" ref={issueRef} tabIndex={-1}><CorpCard ariaLabel={t.unknownTitle}>{attention}</CorpCard></div> : null;

  function locationRow(location: WageLocation) {
    const { current, next, endsAt } = rateAt(wages, location.id, now);
    const detail = [
      current ? (current.hourlyRateMinor === "0" ? t.zero : t.since(instantDate(current.effectiveFrom, timeZone, t))) : wages.length ? t.noRateLine : null,
      next ? t.from(instantDate(next.effectiveFrom, timeZone, t), rateText(next.hourlyRateMinor, t)) : endsAt ? t.stopsOn(instantDate(endsAt, timeZone, t)) : null,
      location.active ? null : t.inactive,
    ].filter(Boolean).join(" · ");
    return <li key={location.id}><CorpRow title={location.name} detail={detail}
      value={current ? rateText(current.hourlyRateMinor, t) : undefined} valueTone={current ? "soft" : undefined}
      trail={current ? undefined : <BChip tone="amber">{t.noRate}</BChip>} /></li>;
  }
  function revisionRow(item: WageRevision) {
    const who = item.actorId === actorId ? t.you : actors[item.actorId] ?? t.someone;
    // Each location once: the rate in effect when it was saved, then any change set to start later ("then $18.75/h from Dec 3").
    const at = Date.parse(item.createdAt), seen = new Map<string, string[]>();
    for (const w of [...item.wages].sort((a, b) => Date.parse(a.effectiveFrom) - Date.parse(b.effectiveFrom))) {
      if (w.effectiveTo !== null && Date.parse(w.effectiveTo) <= at) continue;
      for (const id of w.locationIds) {
        const parts = seen.get(id) ?? [];
        parts.push(Date.parse(w.effectiveFrom) > at && parts.length ? t.then(rateText(w.hourlyRateMinor, t), instantDate(w.effectiveFrom, timeZone, t))
          : Date.parse(w.effectiveFrom) > at ? t.fromShort(instantDate(w.effectiveFrom, timeZone, t), rateText(w.hourlyRateMinor, t)) : rateText(w.hourlyRateMinor, t));
        seen.set(id, parts);
      }
    }
    const summary = seen.size ? [...seen].map(([id, parts]) => `${locations.find(l => l.id === id)?.name ?? id}: ${parts.join(", ")}`).join(" · ") : t.noRatesAtRevision;
    return <li key={item.revision} className="rs-req wg-rev">
      <div className="rs-req__h"><span className="rs-req__t">{t.savedBy(instantDate(item.createdAt, timeZone, t), who)}</span></div>
      <p className="rs-req__s">{item.reason}</p>
      <p className="rs-req__w wg-rev__rates">{summary}</p>
    </li>;
  }

  /* ---- Body ------------------------------------------------------------------------------------------------------- */
  const title = step === "edit" ? t.editTitle : step === "review" && draft ? t.reviewPage : t.title;
  // The step line: under the title on the band from 768px; a phone's bar has no second line, so the card carries it.
  const stepLine = load.state !== "ready" || !draft ? null : step === "edit" ? t.stepEdit : step === "review" ? t.stepReview : null;
  let body: ReactNode;
  if (load.state === "loading") body = <Skeleton t={t} />;
  else if (load.state !== "ready") {
    body = <div className="rs-state"><CorpCard label={t.title}>{
      load.state === "failed" ? <BState alert kind="failed" title={t.failedTitle} line={t.failedBody} action={{ label: t.tryAgain, onClick: () => { setLoad({ state: "loading" }); void reload(); } }} />
      : load.state === "signed_out" ? <BState alert kind="locked" title={t.signedOutTitle} line={t.signedOutBody} action={{ label: t.signIn, href: "/login" }} />
      : <BState kind="locked" title={t.deniedTitle} line={t.deniedBody} action={{ label: firstName, href: backHref }} />
    }</CorpCard></div>;
  } else if (step === "edit" && draft) {
    const set = (patch: Partial<Draft>) => { const next = { ...draft, ...patch }; setDraft(next); if (problems.length) setProblems(check(next)); };
    const err = (problem: Problem, id: string, text: string) => problems.includes(problem) ? <p className="rs-err" id={id}><WarningCircleIcon size={16} weight="bold" aria-hidden="true" />{text}</p> : null;
    body = <>
      {attentionCard}
      <CorpCard id="wg-edit" label={t.editTitle}>
        <p className="rs-step">{t.stepEdit}</p>
        <div className="rs-fields">
          <div className="rs-field"><span className="rs-field__l" id="wg-mode-l">{t.modeLabel}</span>
            <BFilters label={t.modeLabel} items={[{ key: "set", label: t.modeSet, current: draft.mode === "set", onSelect: () => set({ mode: "set" }) },
              { key: "stop", label: t.modeStop, current: draft.mode === "stop", onSelect: () => set({ mode: "stop" }) }]} /></div>
          <fieldset className="rs-field wg-locs" aria-describedby="wg-locs-h">
            <legend className="rs-field__l">{t.locations}</legend>
            {locations.filter(l => l.active || draft.locationIds.includes(l.id)).map(location => <label key={location.id} className="rs-check wg-check">
              <input type="checkbox" checked={draft.locationIds.includes(location.id)} disabled={busy} aria-invalid={problems.includes("locations") || undefined}
                onChange={event => set({ locationIds: event.target.checked ? [...draft.locationIds, location.id] : draft.locationIds.filter(id => id !== location.id) })} />
              <span>{location.name}</span></label>)}
            <p className="rs-field__h" id="wg-locs-h">{t.locationsHelp}</p>
            {err("locations", "wg-locs-e", t.needLocation)}
          </fieldset>
          <div className="rs-field"><label className="rs-field__l" htmlFor="wg-date">{t.starts}</label>
            <input id="wg-date" className="c-in rs-in" type="date" value={draft.date} disabled={busy} aria-invalid={problems.includes("date") || undefined}
              aria-describedby={problems.includes("date") ? "wg-date-h wg-date-e" : "wg-date-h"} onChange={event => set({ date: event.target.value })} />
            <p className="rs-field__h" id="wg-date-h">{t.startsHelp(timeZone.split("/").at(-1)?.replaceAll("_", " ") ?? timeZone)}</p>{err("date", "wg-date-e", t.needDate)}</div>
          {draft.mode === "set" ? <div className="rs-field"><label className="rs-field__l" htmlFor="wg-rate">{t.rate}</label>
            <span className="wg-money"><span className="wg-money__sym" aria-hidden="true">$</span>
              <input id="wg-rate" className="c-in rs-in wg-money__in" type="text" inputMode="decimal" autoComplete="off" spellCheck={false} placeholder="0.00" value={draft.rate} disabled={busy}
                aria-invalid={problems.includes("rate") || undefined} aria-describedby={problems.includes("rate") ? "wg-rate-h wg-rate-e" : "wg-rate-h"} onChange={event => set({ rate: event.target.value })} />
              <span className="wg-money__unit" aria-hidden="true">/h</span></span>
            <p className="rs-field__h" id="wg-rate-h">{t.rateHelp}</p>{err("rate", "wg-rate-e", t.needRate)}</div> : null}
          <div className="rs-field"><label className="rs-field__l" htmlFor="wg-reason">{t.reason}</label>
            <input id="wg-reason" className="c-in rs-in" type="text" maxLength={300} autoComplete="off" value={draft.reason} disabled={busy} aria-invalid={problems.includes("reason") || undefined}
              aria-describedby={problems.includes("reason") ? "wg-reason-h wg-reason-e" : "wg-reason-h"} onChange={event => set({ reason: event.target.value })} />
            <p className="rs-field__h" id="wg-reason-h">{t.reasonHelp}</p>{err("reason", "wg-reason-e", t.needReason)}</div>
        </div>
      </CorpCard>
      {problems.length ? <p className="rs-err rs-err--sum" ref={problemRef} tabIndex={-1} role="alert"><WarningCircleIcon size={16} weight="bold" aria-hidden="true" />{t.problems(problems.length)}</p> : null}
      <div className="rs-foot"><Act kind="text" disabled={busy} onClick={() => leaveWithDiscardGuard(() => { setDraft(null); setProblems([]); setStep("view"); })}>{t.cancel}</Act><Act kind="teal" disabled={busy} onClick={toReview}>{t.review}</Act></div>
    </>;
  } else if (step === "review" && draft) {
    let from = "";
    try { from = fromInstant(draft.date); } catch { /* the edit step checked the date */ }
    const minor = draft.mode === "set" ? centsFromDollars(draft.rate) : null;
    const replacesLater = from ? wages.some(w => Date.parse(w.effectiveFrom) > Date.parse(from) && w.locationIds.some(id => draft.locationIds.includes(id))) : false;
    const sending = custody?.status === "sending";
    body = <>
      {attentionCard}
      <CorpCard id="wg-review" label={t.reviewTitle(dateText(draft.date, t))}
        footer={<><Act kind="text" disabled={busy || !!custody} onClick={() => setStep("edit")}>{t.back}</Act>
          <Act kind="teal" busy={sending} disabled={busy || !!custody} onClick={confirm}>{sending ? t.saving : t.save}</Act></>}>
        <p className="rs-step">{t.stepReview}</p>
        <div className="rs-review"><p className="rs-review__p">{t.reviewLine(firstName)}</p></div>
        <CorpRows label={t.locations}>{draft.locationIds.map(id => {
          const location = locations.find(l => l.id === id), before = from ? rateBefore(wages, id, from) : null;
          return <li key={id}><CorpRow title={location?.name ?? id} detail={before === null ? t.was(t.noRate) : t.was(rateText(before, t))}
            value={minor === null ? undefined : rateText(minor, t)} valueTone="teal" trail={minor === null ? <BChip tone="amber">{t.noRate}</BChip> : undefined} /></li>;
        })}</CorpRows>
        {replacesLater ? <p className="rs-note rs-note--in">{t.replacesLater}</p> : null}
        <p className="rs-note rs-note--in">{t.reason}: {draft.reason.trim()}</p>
        <p className="rs-zone">{t.payrollNote}</p>
      </CorpCard>
    </>;
  } else {
    const history = [...(page?.history ?? []), ...older.history];
    const next = older.history.length ? older.next : page?.nextBeforeRevision ?? null;
    body = <>
      {attentionCard}
      <CorpCard id="wg-now" label={t.nowTitle}>
        {/* Final polish (finding 24): a save's result opens the card it changed: the done mark, what is now true, the fact. */}
        {landed && !attention ? <BState kind="done" titleRef={doneRef} title={t.savedTitle} line={landed.line ?? undefined} /> : null}
        {!wages.length ? <div className="wg-empty"><BCallout tone="amber" title={t.noRateAnywhere(name)}>{t.noRateHelp}</BCallout></div> : null}
        <CorpRows label={t.nowTitle}>{shown.map(locationRow)}</CorpRows>
        <div className="rs-main"><Act kind={attention ? "ghost" : "teal"} id="wg-main-action" disabled={busy || !!custody} onClick={startEdit}>{t.change}</Act></div>
      </CorpCard>
      <CorpCard id="wg-history" label={t.historyTitle}>
        {history.length ? <ul className="rs-reqs">{history.map(revisionRow)}</ul> : <p className="rs-open">{t.historyEmpty}</p>}
        {next ? <div className="rs-main wg-more">
          <Act kind="quiet" busy={older.state === "loading"} onClick={() => void showOlder()}>{older.state === "loading" ? t.loadingEarlier : t.earlier}</Act>
          {older.state === "failed" ? <p className="rs-err" role="alert"><WarningCircleIcon size={16} weight="bold" aria-hidden="true" />{t.earlierFailed}</p> : null}
        </div> : null}
      </CorpCard>
      <BNote>{t.ownerOnly}</BNote>
    </>;
  }

  return <CorpPage className="c-page--narrow rs rs--c wg" labelledBy={TITLE_ID} lang={lang}>
    <CorpNav back={back} title={title} titleId="wg-nav-title" phoneOnly />
    <CorpTitle id={TITLE_ID} title={title} sub={stepLine ? `${name} · ${stepLine}` : name} wide focusTarget />
    <p className="rs-sr" role="status" aria-live="polite">{said}</p>
    {body}
    {/* Leaving the flow with a typed rate or reason that is not saved asks first (Nov 21, 2026). Review and Back are steps of
      the same flow and never ask; a save that is being checked keeps its own hold. */}
    <DiscardGuard dirty={!!draft && !custody && (draft.rate.trim() !== "" || draft.reason.trim() !== "")} lang={lang} />
  </CorpPage>;
}

export type { WageInterval };
