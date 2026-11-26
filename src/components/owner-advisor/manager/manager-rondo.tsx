"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { ChatsCircleIcon } from "@phosphor-icons/react/dist/ssr/ChatsCircle";
import { CorpBody, CorpCard, CorpField, CorpNav, CorpPage, CorpRow, CorpRows, CorpSection, CorpTitle } from "@/components/corp/corp";
import { BCallout, BIcon, BSegs, BSpin, BState } from "@/components/owner-b/b-kit";
import { keepWhole } from "@/lib/keep-whole";
import { addDays, weekText } from "@/lib/owner-advisor/weekly-client";
import type { ManagerAdvisorDay, ManagerAdvisorQuestion } from "@/lib/owner-advisor/manager-contracts";
import {
  QUESTION_ORDER, answerText, dayFacts, minutesText, readManagerRondo,
  type ManagerRondoAnswer, type ManagerRondoContext, type ManagerRondoQuery, type ManagerRondoRead, type ManagerRondoWeek,
} from "./manager-client";
import { MANAGER_COPY, type ManagerCopy } from "./manager-copy";
import { useAdvisorLang } from "../lang";
import { dayText as langDayText, periodText, spanishTimes, type Lang } from "../format";
import "../weekly/weekly.css";
import "./manager-rondo.css";

/* Rondo AI for a Manager (Nov 18, 2026; contract docs/handoffs/2026-11-18-rondo-manager-ui-contract.md). A Manager picks
 * one of their locations and a week, asks one of four guided questions, and reads the week day by day. Nothing here
 * writes. Every answer is private and short-lived: it stays on screen only for the lease the server gives it, is renewed
 * while the page is in front, and is cleared when the Manager steps away, changes the location or week, or loses access.
 * Typed questions need a model, which is off; the four questions are what Rondo answers for Managers today. */

type Lease<T> = { data: T; until: number };
type Closed = "session" | "forbidden" | "disabled";
type Fault = "invalid" | "unavailable";
export type ManagerRondoReader = <T extends ManagerRondoContext | ManagerRondoWeek | ManagerRondoAnswer>(query: ManagerRondoQuery, signal?: AbortSignal) => Promise<ManagerRondoRead<T>>;

const stepAway = () => document.visibilityState === "hidden" || !document.hasFocus();
const lease = <T extends { validForMs: number },>(data: T, receivedAt: number): Lease<T> => ({ data, until: receivedAt + data.validForMs });
/** "Mon, Nov 30": the day column, as the schedule names a day. */
const dayText = (date: string, lang: Lang = "en") => lang === "en"
  ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00Z`))
  : langDayText(date, lang);
/** "Nov 30 – Dec 6" ("30 nov – 6 dic"): English keeps the schedule's own helper. */
const weekWords = (monday: string, lang: Lang) => lang === "en" ? weekText(monday) : periodText(monday, addDays(monday, 6), lang);
/** The retry's busy words: English keeps the kit's own default. */
const busyWords = (lang: Lang, t: ManagerCopy) => lang === "en" ? undefined : t.checkingBusy;

export function ManagerRondo({ currentWeek, timeZone, read: given }: { currentWeek: string; timeZone: string; read?: ManagerRondoReader }) {
  const lang = useAdvisorLang(), t = MANAGER_COPY[lang];
  const read = useMemo<ManagerRondoReader>(() => given ?? ((query, signal) => readManagerRondo(query, signal)), [given]);
  const [context, setContext] = useState<Lease<ManagerRondoContext> | null>(null);
  const [contextFault, setContextFault] = useState<Fault | null>(null);
  const [contextBusy, setContextBusy] = useState(true);
  const [closed, setClosed] = useState<Closed | null>(null);
  const [hidden, setHidden] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [week, setWeek] = useState(currentWeek);
  const [summary, setSummary] = useState<Lease<ManagerRondoWeek> | null>(null);
  const [summaryState, setSummaryState] = useState<"idle" | "loading" | Fault>("idle");
  const [question, setQuestion] = useState<ManagerAdvisorQuestion | null>(null);
  const [answer, setAnswer] = useState<Lease<ManagerRondoAnswer> | null>(null);
  const [answerState, setAnswerState] = useState<"idle" | "loading" | Fault>("idle");
  const [now, setNow] = useState(() => Date.now());
  // One request of each kind at a time: a newer one cancels the older, and a late reply to an older one is ignored.
  const calls = useRef<Record<"context" | "weekly" | "answer", { controller: AbortController; seq: number } | null>>({ context: null, weekly: null, answer: null });
  const seq = useRef(0);
  const choice = useRef<{ place: string | null; week: string }>({ place: null, week: currentWeek });

  const start = (kind: "context" | "weekly" | "answer") => {
    calls.current[kind]?.controller.abort();
    const call = { controller: new AbortController(), seq: ++seq.current };
    calls.current[kind] = call;
    return call;
  };
  const current = (kind: "context" | "weekly" | "answer", call: { seq: number }) => calls.current[kind]?.seq === call.seq;

  const clearPrivate = useCallback(() => {
    for (const call of Object.values(calls.current)) call?.controller.abort();
    calls.current = { context: null, weekly: null, answer: null };
    setContext(null); setSummary(null); setAnswer(null); setSummaryState("idle"); setAnswerState("idle");
  }, []);
  /** Signed out, no access or switched off: nothing private stays, and the page says why. */
  const close = useCallback((why: Closed) => { clearPrivate(); setQuestion(null); setLocationId(null); choice.current = { ...choice.current, place: null }; setClosed(why); }, [clearPrivate]);

  const loadWeek = useCallback(async (place: string, monday: string, quiet = false) => {
    const call = start("weekly");
    if (!quiet) setSummaryState("loading");
    const result = await read<ManagerRondoWeek>({ view: "weekly", weekStart: monday, locationId: place }, call.controller.signal);
    if (!current("weekly", call) || result.kind === "aborted") return;
    calls.current.weekly = null;
    if (result.kind === "ok") { setSummary(lease(result.data, result.receivedAt)); setSummaryState("idle"); return; }
    if (result.kind === "session" || result.kind === "forbidden" || result.kind === "disabled") return close(result.kind);
    setSummary(null); setSummaryState(result.kind);
  }, [read, close]);

  const loadAnswer = useCallback(async (place: string, monday: string, asked: ManagerAdvisorQuestion, quiet = false) => {
    const call = start("answer");
    if (!quiet) { setAnswer(null); setAnswerState("loading"); }
    const result = await read<ManagerRondoAnswer>({ view: "answer", weekStart: monday, locationId: place, question: asked }, call.controller.signal);
    if (!current("answer", call) || result.kind === "aborted") return;
    calls.current.answer = null;
    if (result.kind === "ok") { setAnswer(lease(result.data, result.receivedAt)); setAnswerState("idle"); return; }
    if (result.kind === "session" || result.kind === "forbidden" || result.kind === "disabled") return close(result.kind);
    setAnswer(null); setAnswerState(result.kind);
  }, [read, close]);

  /** A new place or week: what was on screen belonged to the old one, so it goes, and the week is read afresh. */
  const pick = useCallback((place: string | null, monday: string) => {
    choice.current = { place, week: monday };
    setLocationId(place); setWeek(monday);
    setSummary(null); setAnswer(null); setAnswerState("idle"); setQuestion(null);
    calls.current.answer?.controller.abort(); calls.current.answer = null;
    if (place) void loadWeek(place, monday); else { calls.current.weekly?.controller.abort(); calls.current.weekly = null; setSummaryState("idle"); }
  }, [loadWeek]);

  const loadContext = useCallback(async (quiet = false) => {
    const call = start("context");
    if (!quiet) { setContextBusy(true); setContextFault(null); }
    const result = await read<ManagerRondoContext>({ view: "context" }, call.controller.signal);
    if (!current("context", call) || result.kind === "aborted") return;
    calls.current.context = null;
    setContextBusy(false);
    if (result.kind === "ok") {
      setContext(lease(result.data, result.receivedAt)); setContextFault(null); setHidden(false);
      const old = choice.current.place, list = result.data.locations;
      const place = old && list.some(item => item.id === old) ? old : list[0]?.id ?? null;
      // A first read, "Show again", or the place left this Manager's scope: the week is read for the place now chosen.
      if (!quiet || place !== old) pick(place, choice.current.week);
      return;
    }
    if (result.kind === "session" || result.kind === "forbidden" || result.kind === "disabled") return close(result.kind);
    if (!quiet) { setContext(null); setContextFault(result.kind); }
  }, [read, close, pick]);

  // The first read starts after mount, from a timer (a read never starts inside the render's own effect pass).
  useEffect(() => { const timer = window.setTimeout(() => void loadContext(), 0); return () => window.clearTimeout(timer); }, [loadContext]);
  useEffect(() => () => { for (const call of Object.values(calls.current)) call?.controller.abort(); }, []);

  // Leases: each read leaves when its time is up. While the page is in front, every read is renewed a little before.
  const leases: Lease<{ validForMs: number }>[] = [];
  for (const item of [context, summary, answer]) if (item) leases.push(item);
  const firstEnd = leases.length ? Math.min(...leases.map(item => item.until)) : null;
  useEffect(() => {
    if (firstEnd === null) return;
    const timer = window.setTimeout(() => {
      const at = Date.now(); setNow(at);
      setContext(old => old && old.until <= at ? null : old);
      setSummary(old => old && old.until <= at ? null : old);
      setAnswer(old => old && old.until <= at ? null : old);
      setHidden(true);
    }, Math.max(0, firstEnd - Date.now()));
    return () => window.clearTimeout(timer);
  }, [firstEnd]);
  const renewAt = leases.length ? Math.min(...leases.map(item => item.until - item.data.validForMs * 0.3)) : null;
  useEffect(() => {
    if (renewAt === null || closed) return;
    const timer = window.setTimeout(() => {
      if (stepAway()) return;
      void loadContext(true);
      if (locationId && summary) void loadWeek(locationId, week, true);
      if (locationId && question && answer) void loadAnswer(locationId, week, question, true);
    }, Math.max(1000, renewAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [renewAt, closed, locationId, week, question, summary, answer, loadContext, loadWeek, loadAnswer]);

  // Stepping away hides the answers at once; coming back reads them again.
  useEffect(() => {
    const away = () => { if (stepAway() && !closed) { clearPrivate(); setHidden(true); } };
    document.addEventListener("visibilitychange", away); window.addEventListener("blur", away);
    return () => { document.removeEventListener("visibilitychange", away); window.removeEventListener("blur", away); };
  }, [closed, clearPrivate]);
  const showAgain = useCallback(() => { setHidden(false); void loadContext(); }, [loadContext]);
  useEffect(() => {
    const back = () => { if (!stepAway() && hidden && !closed) showAgain(); };
    document.addEventListener("visibilitychange", back); window.addEventListener("focus", back);
    return () => { document.removeEventListener("visibilitychange", back); window.removeEventListener("focus", back); };
  }, [hidden, closed, showAgain]);
  const ask = (asked: ManagerAdvisorQuestion) => {
    if (!locationId) return;
    setQuestion(asked);
    void loadAnswer(locationId, week, asked);
  };

  /* ---------- Render ---------- */
  const head = <>
    <CorpNav back={{ href: "/app/more", label: t.more }} title={t.title} titleId="rm-nav-title" phoneOnly />
    <CorpTitle wide id="rm-title" title={t.title} sub={t.sub} />
  </>;
  const page = (body: React.ReactNode) => <CorpPage className="c-page--narrow wk rm" labelledBy="rm-title">{head}{body}</CorpPage>;

  if (closed) return page(<ClosedCard why={closed} />);
  if (!context) {
    if (hidden) return page(<HiddenCard onShow={showAgain} />);
    if (contextFault) return page(<CorpCard as="div"><BState kind="failed" alert title={t.openFailed} line={t.checkConnection}
      action={{ label: t.tryAgain, onClick: () => void loadContext(), busy: contextBusy, busyLabel: busyWords(lang, t) }} /></CorpCard>);
    return page(<CorpCard as="div"><BState kind="loading" title={t.opening} line={t.checkingLocations} /></CorpCard>);
  }
  const { locations } = context.data;
  if (!locations.length) return page(<CorpCard as="div"><BState kind="empty" icon={<MapPinIcon weight="bold" />} title={t.noLocations}
    line={t.noLocationsLine} action={{ label: t.returnHome, href: "/app" }} /></CorpCard>);
  const place = locations.find(item => item.id === locationId) ?? locations[0];
  const earliest = addDays(currentWeek, -7), latest = addDays(currentWeek, 56);
  const offered = QUESTION_ORDER.filter(item => context.data.questions.includes(item));

  return page(<>
    <CorpSection id="rm-pick" label={t.pickSection}>
      <CorpCard as="div"><CorpBody>
        <div className="rm-pick">
          {locations.length > 1
            ? <CorpField label={t.location} htmlFor="rm-location">
                <select className="c-in" id="rm-location" value={place.id} onChange={event => pick(event.target.value, week)}>
                  {locations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </CorpField>
            : <div className="c-field"><span className="c-field__label" id="rm-location-label">{t.location}</span>
                <p className="rm-place" aria-labelledby="rm-location-label"><MapPinIcon weight="bold" aria-hidden="true" /><span>{place.name}</span></p></div>}
          <div className="c-field">
            <span className="c-field__label" id="rm-week-label">{t.week}</span>
            <div className="wk-week" role="group" aria-labelledby="rm-week-label">
              <button type="button" className="wk-step" aria-label={t.previousWeek} disabled={week <= earliest} onClick={() => pick(place.id, addDays(week, -7))}><CaretLeftIcon weight="bold" aria-hidden="true" /></button>
              <span className="wk-week__text" aria-live="polite"><BSegs parts={[keepWhole(weekWords(week, lang)), week === currentWeek ? <span key="now" className="wk-week__now">{t.thisWeek}</span> : null]} /></span>
              <button type="button" className="wk-step" aria-label={t.nextWeek} disabled={week >= latest} onClick={() => pick(place.id, addDays(week, 7))}><CaretRightIcon weight="bold" aria-hidden="true" /></button>
            </div>
          </div>
        </div>
      </CorpBody></CorpCard>
    </CorpSection>

    <CorpSection id="rm-ask" label={t.askSection}>
      <CorpCard as="div">
        <Answer question={question} answer={answer} state={answerState} timeZone={timeZone} hidden={hidden && !answer && !!question}
          onRetry={() => question && ask(question)} />
        <CorpRows label={t.questionsLabel}>
          {offered.map(item => <li key={item} className={item === question ? "rm-q rm-q--on" : "rm-q"}><CorpRow one title={t.questions[item]} onClick={() => ask(item)}
            label={item === question ? t.asked(t.questions[item]) : undefined} /></li>)}
        </CorpRows>
      </CorpCard>
    </CorpSection>

    <CorpSection id="rm-week" label={t.weekSection}>
      <WeekCard summary={summary} state={summaryState} hidden={hidden} now={now} onRetry={() => void loadWeek(place.id, week)} onShow={showAgain} />
    </CorpSection>
  </>);
}

/* ---------- Pieces ---------- */
export function ClosedCard({ why }: { why: Closed }) {
  const t = MANAGER_COPY[useAdvisorLang()];
  if (why === "session") return <CorpCard as="div"><BState kind="locked" alert title={t.sessionEnded} line={t.sessionLine} action={{ label: t.signIn, href: "/login" }} /></CorpCard>;
  if (why === "disabled") return <CorpCard as="div"><BState kind="locked" title={t.off} line={t.offLine} action={{ label: t.returnHome, href: "/app" }} /></CorpCard>;
  return <CorpCard as="div"><BState kind="locked" alert title={t.noAccess} line={t.noAccessLine} action={{ label: t.returnHome, href: "/app" }} /></CorpCard>;
}

function HiddenCard({ onShow }: { onShow: () => void }) {
  const t = MANAGER_COPY[useAdvisorLang()];
  return <CorpCard as="div"><BState kind="locked" icon={<EyeSlashIcon weight="bold" />} title={t.hidden} line={t.hiddenLine} action={{ label: t.showAgain, onClick: onShow }} /></CorpCard>;
}

/** Rondo's reply to the question asked: the figure large, the sentence that says what it counts, and where and when. */
export function Answer({ question, answer, state, timeZone, hidden, onRetry }: {
  question: ManagerAdvisorQuestion | null; answer: Lease<ManagerRondoAnswer> | null; state: "idle" | "loading" | Fault; timeZone: string; hidden: boolean; onRetry: () => void;
}) {
  const lang = useAdvisorLang(), t = MANAGER_COPY[lang];
  if (!question) return null;
  let body: React.ReactNode;
  if (answer) {
    const words = answerText(answer.data, lang);
    const checked = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-PR", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(answer.data.observedAt));
    body = <div className="rm-reply">
      <BIcon tone="teal"><ChatsCircleIcon weight="bold" /></BIcon>
      <div className="rm-reply__main">
        <p className="rm-reply__figure">{keepWhole(words.figure)}</p>
        <p className="rm-reply__line">{words.line}</p>
        <p className="rm-reply__meta"><BSegs parts={[answer.data.location.name, weekWords(answer.data.weekStart, lang), t.checkedAt(spanishTimes(checked, lang))]} /></p>
      </div>
    </div>;
  } else if (state === "loading") {
    body = <div className="rm-reply rm-reply--wait" aria-busy="true"><BIcon tone="grey"><BSpin /></BIcon><div className="rm-reply__main"><p className="rm-reply__line">{t.answerWait}</p></div></div>;
  } else if (state === "invalid") {
    body = <BCallout tone="amber" icon="check" title={t.cantAnswer}>{t.cantAnswerLine}</BCallout>;
  } else if (state === "unavailable") {
    body = <BCallout tone="red" icon="stop" title={t.answerFailed} action={{ label: t.tryAgain, onClick: onRetry }}>{t.checkConnection}</BCallout>;
  } else if (hidden) {
    body = <p className="rm-reply__line rm-reply__line--quiet">{t.answerHidden}</p>;
  } else return null;
  return <div className="rm-answer" aria-live="polite">
    <p className="rm-answer__asked"><span className="b-sr">{t.youAsked}</span>{t.questions[question]}</p>
    {body}
  </div>;
}

export function WeekCard({ summary, state, hidden, now, onRetry, onShow }: {
  summary: Lease<ManagerRondoWeek> | null; state: "idle" | "loading" | Fault; hidden: boolean; now: number; onRetry: () => void; onShow: () => void;
}) {
  void now;
  const lang = useAdvisorLang(), t = MANAGER_COPY[lang];
  if (summary) return <><CorpCard as="div">
    <CorpRows label={t.weekOf(weekWords(summary.data.weekStart, lang))}>
      {summary.data.days.map((day: ManagerAdvisorDay) => <li key={day.date}><CorpRow title={dayText(day.date, lang)} detail={<BSegs parts={dayFacts(day, lang)} />}
        value={minutesText(day.scheduledMinutes, lang)} valueTone={day.scheduledMinutes ? undefined : "soft"} /></li>)}
    </CorpRows>
  </CorpCard></>;
  if (state === "loading") return <CorpCard as="div"><BState kind="loading" title={t.checkingWeek} line={t.readingWeek} /></CorpCard>;
  if (state === "invalid") return <CorpCard as="div"><BState kind="paused" title={t.cantReadWeek} line={t.cantReadWeekLine} /></CorpCard>;
  if (state === "unavailable") return <CorpCard as="div"><BState kind="failed" alert title={t.weekFailed} line={t.checkConnection} action={{ label: t.tryAgain, onClick: onRetry }} /></CorpCard>;
  if (hidden) return <HiddenCard onShow={onShow} />;
  return <CorpCard as="div"><BState kind="loading" title={t.checkingWeek} line={t.readingWeek} /></CorpCard>;
}
