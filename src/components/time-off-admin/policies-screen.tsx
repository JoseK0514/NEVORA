"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { BCallout, BChip, BFilters, BNote, BState } from "@/components/owner-b/b-kit";
import { hoursInput, minutesFromHours, policyOrder, readPolicies, sendSettings, type PolicyCommand, type PtoPolicy } from "@/lib/workforce/pto-client";
import { hoursText, ptoCopy, type PtoCopy, type PtoLang } from "./copy";

/* PTO screens (Nov 20, 2026): Settings › Time off policies, Owner only (the Settings layout closes it to everyone else and
 * the server checks the Owner on every write). Reads GET /api/workforce/settings; each save is one PTO_POLICY command with
 * a fresh UUID and the policy's revision (0 to create). The code is fixed after creation so its revisions share one
 * balance. A save whose answer is lost is kept whole and only ever sent again unchanged. */

type Load = { state: "loading" } | { state: "ready"; policies: PtoPolicy[] } | { state: "failed" | "signed_out" | "denied" };
type Kind = "VACATION" | "SICK" | "OTHER";
type Draft = { revision: number; kind: Kind; code: string; label: string; day: string; rate: string; cap: string; enabled: boolean };
type Custody = { command: PolicyCommand; status: "sending" | "unknown" | "checking" | "still_unknown" };
type Issue = "conflict" | "invalid" | "denied" | "signed_out";
type Problem = "label" | "code" | "codeTaken" | "day" | "rate" | "cap";

export type PoliciesScreenProps = { lang?: PtoLang; initial?: { load?: Load; draft?: Draft; custody?: Custody; issue?: Issue } };
const TITLE_ID = "pto-pol-title";

function Act({ kind, children, onClick, disabled, busy, label }: { kind: "teal" | "ghost" | "quiet" | "text"; children: ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean; label?: string }) {
  const cls = kind === "text" ? "b-btn b-btn--quiet b-rowact b-rowact--quiet" : `b-btn b-btn--${kind} rs-act`;
  return <button type="button" className={cls} aria-label={label} aria-busy={busy || undefined} disabled={disabled || busy} onClick={onClick}>{children}</button>;
}

export function policyDraft(policy: PtoPolicy | null, kind: Kind, t: PtoCopy): Draft {
  if (policy) return { revision: policy.revision, kind: policy.code === "VACATION" ? "VACATION" : policy.code === "SICK" ? "SICK" : "OTHER", code: policy.code, label: policy.label,
    day: hoursInput(policy.fullDayMinutes), rate: hoursInput(policy.earnedMinutesPer100Hours), cap: hoursInput(policy.carryoverCapMinutes), enabled: policy.enabled };
  return { revision: 0, kind, code: kind === "OTHER" ? "" : kind, label: kind === "VACATION" ? t.vacation : kind === "SICK" ? t.sick : "", day: "8", rate: "0", cap: "0", enabled: true };
}

export function policyProblems(draft: Draft, policies: PtoPolicy[]): Problem[] {
  const out: Problem[] = [];
  if (!draft.label.trim() || draft.label.trim().length > 80) out.push("label");
  if (!/^[A-Z][A-Z0-9_]{0,31}$/.test(draft.code)) out.push("code");
  else if (draft.revision === 0 && policies.some(p => p.code === draft.code)) out.push("codeTaken");
  const day = minutesFromHours(draft.day), rate = minutesFromHours(draft.rate), cap = minutesFromHours(draft.cap);
  if (day === null || day < 1 || day > 1440) out.push("day");
  if (rate === null || rate > 6000) out.push("rate");
  if (cap === null || cap > 525600) out.push("cap");
  return out;
}

export function PoliciesScreen({ lang = "en", initial }: PoliciesScreenProps) {
  const t = ptoCopy(lang);
  const [load, setLoad] = useState<Load>(initial?.load ?? { state: "loading" });
  const [draft, setDraft] = useState<Draft | null>(initial?.draft ?? null);
  const [custody, setCustody] = useState<Custody | null>(initial?.custody ?? null);
  const [issue, setIssue] = useState<Issue | null>(initial?.issue ?? null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [landed, setLanded] = useState(false);
  const [said, setSaid] = useState("");
  const issueRef = useRef<HTMLDivElement>(null), problemRef = useRef<HTMLParagraphElement>(null), editing = useRef(!!draft);

  const apply = useCallback((result: Awaited<ReturnType<typeof readPolicies>>) => {
    if (result.kind === "ready") setLoad({ state: "ready", policies: result.policies });
    else if (result.kind === "unavailable") setLoad(old => old.state === "ready" ? old : { state: "failed" });
    else setLoad({ state: result.kind });
  }, []);
  const reload = useCallback(() => readPolicies().then(apply, () => undefined), [apply]);
  useEffect(() => {
    if (initial?.load) return;
    const controller = new AbortController();
    readPolicies(controller.signal).then(result => { if (!controller.signal.aborted) apply(result); }, () => undefined);
    return () => controller.abort();
  }, [apply, initial?.load]);
  useEffect(() => {
    if (!custody || custody.status === "sending") return;
    const hold = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", hold);
    return () => window.removeEventListener("beforeunload", hold);
  }, [custody]);
  useEffect(() => {
    if (editing.current === !!draft) return;
    editing.current = !!draft;
    const title = [...document.querySelectorAll<HTMLElement>(".pto h1")].find(h => h.getClientRects().length > 0);
    if (title) { if (!title.hasAttribute("tabindex")) title.tabIndex = -1; title.focus(); window.scrollTo({ top: 0 }); }
  }, [draft]);
  const trouble = custody && custody.status !== "sending" ? custody.status : issue;
  useEffect(() => {
    if (!trouble) return;
    issueRef.current?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    issueRef.current?.focus({ preventScroll: true });
  }, [trouble]);

  const policies = load.state === "ready" ? [...load.policies].sort((a, b) => policyOrder(a.code, b.code)) : [];
  const busy = custody?.status === "sending" || custody?.status === "checking";

  function open(policy: PtoPolicy | null, kind: Kind) { setIssue(null); setLanded(false); setProblems([]); setDraft(policyDraft(policy, kind, t)); }
  async function send(command: PolicyCommand, again: boolean) {
    setCustody({ command, status: again ? "checking" : "sending" }); setIssue(null);
    const result = await sendSettings(command);
    if (result.kind === "saved") { setCustody(null); setDraft(null); setLanded(true); setSaid(t.policySaved); await reload(); return; }
    if (result.kind === "unknown") { setCustody({ command, status: again ? "still_unknown" : "unknown" }); setSaid(t.unknownTitle); return; }
    setCustody(null); setIssue(result.kind);
    setSaid(result.kind === "conflict" ? t.conflictTitle : result.kind === "invalid" ? t.invalidTitle : result.kind === "denied" ? t.deniedTitle : t.signedOutTitle);
  }
  function save() {
    if (!draft || custody) return;
    const found = policyProblems(draft, policies);
    setProblems(found);
    if (found.length) { requestAnimationFrame(() => problemRef.current?.focus()); return; }
    void send({ kind: "PTO_POLICY", operationId: crypto.randomUUID(), code: draft.code, label: draft.label.trim(), enabled: draft.enabled,
      fullDayMinutes: minutesFromHours(draft.day)!, earnedMinutesPer100Hours: minutesFromHours(draft.rate)!, carryoverCapMinutes: minutesFromHours(draft.cap)!, expectedRevision: draft.revision }, false);
  }

  let attention: ReactNode = null;
  if (custody && custody.status !== "sending") attention = <BState alert kind="paused" icon={<WarningIcon weight="bold" />} title={t.unknownTitle} line={custody.status === "still_unknown" ? t.stillUnknown : t.unknownBody}>
    <span className="rs-acts"><Act kind="ghost" busy={custody.status === "checking"} onClick={() => void send(custody.command, true)}>{custody.status === "checking" ? t.checking : t.checkAgain}</Act></span></BState>;
  else if (issue === "conflict") attention = <BState alert kind="paused" icon={<WarningIcon weight="bold" />} title={t.conflictTitle} line={t.conflictBody}>
    <span className="rs-acts"><Act kind="ghost" onClick={() => { setIssue(null); setDraft(null); setLoad({ state: "loading" }); void reload(); }}>{t.reload}</Act></span></BState>;
  else if (issue === "invalid") attention = <BState alert kind="failed" title={t.invalidTitle} line={t.invalidBodyPolicy}><span className="rs-acts"><Act kind="text" onClick={() => setIssue(null)}>{t.close}</Act></span></BState>;
  else if (issue) attention = <BState alert kind="locked" title={issue === "denied" ? t.deniedTitle : t.signedOutTitle} line={issue === "denied" ? t.deniedBody : t.signedOutBody} action={issue === "signed_out" ? { label: t.signIn, href: "/login" } : undefined} />;
  const attentionCard = attention ? <div className="rs-issue" ref={issueRef} tabIndex={-1}><CorpCard ariaLabel={t.unknownTitle}>{attention}</CorpCard></div> : null;

  let body: ReactNode;
  const title = draft ? (draft.revision ? t.editPolicy : t.newPolicy) : t.policiesTitle;
  if (load.state === "loading") body = <CorpCard ariaLabel={t.policiesCard}><div className="rs-skel" role="status" aria-busy="true"><span className="rs-sr">{t.loadingPolicies}</span>
    <span className="rs-skel__bar rs-skel__bar--head" aria-hidden="true" />{[46, 38].map((w, i) => <span key={i} className="rs-skel__row" aria-hidden="true"><span className="rs-skel__bar rs-skel__bar--day" /><span className="rs-skel__bar" style={{ width: `${w}%` }} /></span>)}</div></CorpCard>;
  else if (load.state !== "ready") body = <div className="rs-state"><CorpCard ariaLabel={t.policiesTitle}>{
    load.state === "failed" ? <BState alert kind="failed" title={t.failedTitle} line={t.failedBody} action={{ label: t.tryAgain, onClick: () => { setLoad({ state: "loading" }); void reload(); } }} />
    : load.state === "signed_out" ? <BState alert kind="locked" title={t.signedOutTitle} line={t.signedOutBody} action={{ label: t.signIn, href: "/login" }} />
    : <BState kind="locked" title={t.deniedTitle} line={t.deniedBody} />}</CorpCard></div>;
  else if (draft) {
    const set = (patch: Partial<Draft>) => { const next = { ...draft, ...patch }; setDraft(next); if (problems.length) setProblems(policyProblems(next, policies)); };
    const err = (p: Problem[], id: string, text: string) => p.some(x => problems.includes(x)) ? <p className="rs-err" id={id}><WarningCircleIcon size={16} weight="bold" aria-hidden="true" />{text}</p> : null;
    const field = (id: string, label: string, help: string, value: string, onChange: (v: string) => void, bad: Problem[], errText: string, extra?: { inputMode?: "decimal" | "text"; maxLength?: number; disabled?: boolean; upper?: boolean }) => {
      const invalid = bad.some(x => problems.includes(x));
      return <div className="rs-field"><label className="rs-field__l" htmlFor={id}>{label}</label>
        <input id={id} className={`c-in rs-in${extra?.inputMode === "decimal" ? " pto-num" : ""}`} type="text" inputMode={extra?.inputMode ?? "text"} autoComplete="off" spellCheck={false} maxLength={extra?.maxLength}
          value={value} disabled={busy || extra?.disabled} aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-h ${id}-e` : `${id}-h`}
          onChange={event => onChange(extra?.upper ? event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") : event.target.value)} />
        <p className="rs-field__h" id={`${id}-h`}>{help}</p>{err(bad, `${id}-e`, errText)}</div>;
    };
    const codeErr = problems.includes("codeTaken") ? t.codeTaken : t.needCode;
    body = <>
      {attentionCard}
      <CorpCard id="pto-pol-edit" ariaLabel={title}>
        <div className="rs-fields">
          {draft.revision === 0 ? <div className="rs-field"><span className="rs-field__l">{t.kindLabel}</span>
            <BFilters label={t.kindLabel} items={(["VACATION", "SICK", "OTHER"] as Kind[]).map(kind => ({ key: kind, label: kind === "VACATION" ? t.kindVacation : kind === "SICK" ? t.kindSick : t.kindOther,
              current: draft.kind === kind, onSelect: () => set({ kind, code: kind === "OTHER" ? "" : kind, label: kind === "VACATION" ? t.vacation : kind === "SICK" ? t.sick : "" }) }))} /></div> : null}
          {field("pto-label", t.name, t.nameHelp, draft.label, v => set({ label: v }), ["label"], t.needName, { maxLength: 80 })}
          {draft.kind === "OTHER" || draft.revision ? field("pto-code", t.code, t.codeHelp, draft.code, v => set({ code: v }), ["code", "codeTaken"], codeErr, { maxLength: 32, disabled: draft.revision > 0, upper: true }) : null}
          {field("pto-day", t.dayHours, t.dayHoursHelp, draft.day, v => set({ day: v }), ["day"], t.needDay, { inputMode: "decimal", maxLength: 6 })}
          {field("pto-rate", t.earnRate, t.earnRateHelp, draft.rate, v => set({ rate: v }), ["rate"], t.needRate, { inputMode: "decimal", maxLength: 6 })}
          {field("pto-cap", t.carryover, t.carryoverHelp, draft.cap, v => set({ cap: v }), ["cap"], t.needCap, { inputMode: "decimal", maxLength: 7 })}
          <label className="pto-switch" htmlFor="pto-enabled">
            <span className="pto-switch__tx"><b>{t.enabled}</b><span id="pto-enabled-h">{t.enabledHelp}</span></span>
            <input id="pto-enabled" type="checkbox" role="switch" className="c-switch" checked={draft.enabled} disabled={busy} aria-describedby="pto-enabled-h" onChange={event => set({ enabled: event.target.checked })} />
          </label>
        </div>
      </CorpCard>
      {problems.length ? <p className="rs-err rs-err--sum" ref={problemRef} tabIndex={-1} role="alert"><WarningCircleIcon size={16} weight="bold" aria-hidden="true" />{t.problems(problems.length)}</p> : null}
      <div className="rs-foot"><Act kind="text" disabled={busy || !!custody} onClick={() => { setDraft(null); setProblems([]); setIssue(null); }}>{t.cancel}</Act>
        <Act kind="teal" busy={custody?.status === "sending"} disabled={busy || !!custody} onClick={save}>{custody?.status === "sending" ? t.saving : t.save}</Act></div>
    </>;
  } else {
    const has = (code: string) => policies.some(p => p.code === code);
    body = <>
      {attentionCard}
      {landed && !attention ? <div className="rs-landed"><CorpCard ariaLabel={t.policySaved}><BState silent kind="done" title={t.policySaved} /></CorpCard></div> : null}
      <CorpCard id="pto-policies" label={t.policiesCard}>
        {policies.length ? <CorpRows label={t.policiesCard}>{policies.map(policy => <li key={policy.code}>
          <CorpRow onClick={() => open(policy, "OTHER")} chevron title={policy.label}
            detail={[t.dayLine(hoursText(policy.fullDayMinutes)), policy.earnedMinutesPer100Hours ? t.earnsLine(hoursText(policy.earnedMinutesPer100Hours)) : t.earnsNone,
              policy.carryoverCapMinutes ? t.capLine(hoursText(policy.carryoverCapMinutes)) : t.capNone].join(" · ")}
            trail={<BChip tone={policy.enabled ? "green" : "grey"}>{policy.enabled ? t.on : t.off}</BChip>} /></li>)}</CorpRows>
          : <div className="pto-empty"><BCallout tone="grey" icon="empty" title={t.emptyTitle}>{t.emptyBody}</BCallout></div>}
        <div className="rs-main pto-adds">
          {!has("VACATION") ? <Act kind={policies.length ? "quiet" : "teal"} disabled={busy} onClick={() => open(null, "VACATION")}>{t.addVacation}</Act> : null}
          {!has("SICK") ? <Act kind={has("VACATION") && policies.length === 1 ? "teal" : "quiet"} disabled={busy} onClick={() => open(null, "SICK")}>{t.addSick}</Act> : null}
          <Act kind="text" disabled={busy} onClick={() => open(null, "OTHER")}>{t.addOther}</Act>
        </div>
      </CorpCard>
      <BNote>{t.policiesNote}</BNote>
    </>;
  }

  return <CorpPage className="c-page--narrow rs rs--c pto" labelledBy={TITLE_ID} lang={lang}>
    <CorpNav back={draft ? undefined : { href: "/app/settings", label: t.settingsBack }} title={title} titleId="pto-pol-nav" phoneOnly />
    <CorpTitle id={TITLE_ID} title={title} wide focusTarget />
    <p className="rs-sr" role="status" aria-live="polite">{said}</p>
    {body}
  </CorpPage>;
}
