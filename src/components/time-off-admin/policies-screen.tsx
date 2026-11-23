"use client";
import { DiscardGuard } from "@/components/kit/discard-dialog";
import { leaveWithDiscardGuard } from "@/components/kit/use-discard-guard";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { CorpCard, CorpFormFooter, CorpRow, CorpRows } from "@/components/corp/corp";
import { BChip, BState } from "@/components/owner-b/b-kit";
import { SettingsPageB } from "@/app/app/settings/settings-b";
import { FieldB, RadioRowB, ResultB, SwitchRowB } from "@/app/app/settings/settings-b-form";
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

/** Settings in Direction B (Nov 23, 2026): the kit's buttons; teal is the one main action, everything else secondary. */
function Act({ kind, children, onClick, disabled, busy, label }: { kind: "teal" | "ghost" | "quiet" | "text"; children: ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean; label?: string }) {
  const cls = kind === "teal" ? "c-btn" : "c-btn c-btn--secondary";
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
  // What the open policy form started with: the discard guard asks only once something differs from it.
  const [opened, setOpened] = useState<string | null>(() => initial?.draft ? JSON.stringify(initial.draft) : null);
  const [custody, setCustody] = useState<Custody | null>(initial?.custody ?? null);
  const [issue, setIssue] = useState<Issue | null>(initial?.issue ?? null);
  const [problems, setProblems] = useState<Problem[]>([]);
  // The confirmed save: the fact line under "Policy saved", from the command the server just accepted.
  const [landed, setLanded] = useState<{ line: string } | null>(null);
  const [said, setSaid] = useState("");
  const issueRef = useRef<HTMLDivElement>(null), problemRef = useRef<HTMLParagraphElement>(null), editing = useRef(!!draft), doneRef = useRef<HTMLElement>(null);

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
    // A confirmed save lands on its result: the title that says what is now true takes focus, so it is read once.
    if (!draft && landed && doneRef.current) { doneRef.current.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); return; }
    const title = [...document.querySelectorAll<HTMLElement>(".pto h1")].find(h => h.getClientRects().length > 0);
    if (title) { if (!title.hasAttribute("tabindex")) title.tabIndex = -1; title.focus(); window.scrollTo({ top: 0 }); }
  }, [draft, landed]);
  const trouble = custody && custody.status !== "sending" ? custody.status : issue;
  useEffect(() => {
    if (!trouble) return;
    issueRef.current?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    issueRef.current?.focus({ preventScroll: true });
  }, [trouble]);

  const policies = load.state === "ready" ? [...load.policies].sort((a, b) => policyOrder(a.code, b.code)) : [];
  const busy = custody?.status === "sending" || custody?.status === "checking";

  function open(policy: PtoPolicy | null, kind: Kind) { const next = policyDraft(policy, kind, t); setIssue(null); setLanded(null); setProblems([]); setOpened(JSON.stringify(next)); setDraft(next); }
  async function send(command: PolicyCommand, again: boolean) {
    setCustody({ command, status: again ? "checking" : "sending" }); setIssue(null);
    const result = await sendSettings(command);
    // The result's title takes focus (the draft effect), so the live line stays empty: a result is said once.
    if (result.kind === "saved") { setCustody(null); setDraft(null); setLanded({ line: t.policySavedLine(command.label, hoursText(command.fullDayMinutes), command.enabled) }); setSaid(""); await reload(); return; }
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
  // Settings in Direction B (Nov 23, 2026): the attention card is a direct child of the page, like every other card.
  const attentionCard = attention ? <section className="c-card c-setb-attn" ref={issueRef as never} tabIndex={-1} aria-label={t.unknownTitle}>{attention}</section> : null;

  let body: ReactNode;
  let phoneSave: ReactNode = null;
  const title = draft ? (draft.revision ? t.editPolicy : t.newPolicy) : t.policiesTitle;
  if (load.state === "loading") body = <CorpCard ariaLabel={t.policiesCard}><div className="rs-skel" role="status" aria-busy="true"><span className="c-sr">{t.loadingPolicies}</span>
    <span className="rs-skel__bar rs-skel__bar--head" aria-hidden="true" />{[46, 38].map((w, i) => <span key={i} className="rs-skel__row" aria-hidden="true"><span className="rs-skel__bar rs-skel__bar--day" /><span className="rs-skel__bar" style={{ width: `${w}%` }} /></span>)}</div></CorpCard>;
  else if (load.state !== "ready") body = <CorpCard ariaLabel={t.policiesTitle}>{
    load.state === "failed" ? <BState alert kind="failed" title={t.failedTitle} line={t.failedBody} action={{ label: t.tryAgain, onClick: () => { setLoad({ state: "loading" }); void reload(); } }} />
    : load.state === "signed_out" ? <BState alert kind="locked" title={t.signedOutTitle} line={t.signedOutBody} action={{ label: t.signIn, href: "/login" }} />
    : <BState kind="locked" title={t.deniedTitle} line={t.deniedBody} />}</CorpCard>;
  else if (draft) {
    const set = (patch: Partial<Draft>) => { const next = { ...draft, ...patch }; setDraft(next); if (problems.length) setProblems(policyProblems(next, policies)); };
    const field = (id: string, label: string, help: string, value: string, onChange: (v: string) => void, bad: Problem[], errText: string, extra?: { inputMode?: "decimal" | "text"; maxLength?: number; disabled?: boolean; upper?: boolean }) =>
      <FieldB id={id} label={label} help={help} helpId={`${id}-h`} error={bad.some(x => problems.includes(x)) ? errText : undefined} className={extra?.inputMode === "decimal" ? "pto-num" : undefined}
        type="text" inputMode={extra?.inputMode ?? "text"} autoComplete="off" spellCheck={false} maxLength={extra?.maxLength} value={value} disabled={busy || extra?.disabled}
        onChange={event => onChange(extra?.upper ? event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") : event.target.value)} />;
    const codeErr = problems.includes("codeTaken") ? t.codeTaken : t.needCode;
    const saving = custody?.status === "sending";
    const saveButton = (cls: string) => <button type="button" className={cls} aria-busy={saving || undefined} disabled={busy || !!custody} onClick={save}>{saving ? t.saving : t.save}</button>;
    phoneSave = saveButton("c-setb-save");
    const cancel = () => leaveWithDiscardGuard(() => { setDraft(null); setProblems([]); setIssue(null); });
    // The card's footer holds Cancel and Save on tablets and desktop; phones stack them full width at the card's end (the
    // band has no Back while a policy is open, so Cancel is the way out).
    body = <>
      {attentionCard}
      <section className="c-card c-setb-form" id="pto-pol-edit" aria-label={title}>
        {draft.revision === 0 ? <fieldset className="c-setb-fieldset c-setb-choice">
          <legend className="c-field__label c-setb-legend">{t.kindLabel}</legend>
          <ul className="c-rows">{(["VACATION", "SICK", "OTHER"] as Kind[]).map(kind => <li key={kind}><RadioRowB name="pto-kind" value={kind} checked={draft.kind === kind} disabled={busy}
            title={kind === "VACATION" ? t.kindVacation : kind === "SICK" ? t.kindSick : t.kindOther}
            onChange={() => set({ kind, code: kind === "OTHER" ? "" : kind, label: kind === "VACATION" ? t.vacation : kind === "SICK" ? t.sick : "" })} /></li>)}</ul>
        </fieldset> : null}
        <div className="c-setb-fields">
          {field("pto-label", t.name, t.nameHelp, draft.label, v => set({ label: v }), ["label"], t.needName, { maxLength: 80 })}
          {draft.kind === "OTHER" || draft.revision ? field("pto-code", t.code, t.codeHelp, draft.code, v => set({ code: v }), ["code", "codeTaken"], codeErr, { maxLength: 32, disabled: draft.revision > 0, upper: true }) : null}
          {field("pto-day", t.dayHours, t.dayHoursHelp, draft.day, v => set({ day: v }), ["day"], t.needDay, { inputMode: "decimal", maxLength: 6 })}
          {field("pto-rate", t.earnRate, t.earnRateHelp, draft.rate, v => set({ rate: v }), ["rate"], t.needRate, { inputMode: "decimal", maxLength: 6 })}
          {field("pto-cap", t.carryover, t.carryoverHelp, draft.cap, v => set({ cap: v }), ["cap"], t.needCap, { inputMode: "decimal", maxLength: 7 })}
        </div>
        <ul className="c-rows"><li><SwitchRowB id="pto-enabled" label={t.enabled} description={t.enabledHelp} checked={draft.enabled} disabled={busy} onChange={on => set({ enabled: on })} /></li></ul>
        {problems.length ? <p className="c-error c-setb-sum" ref={problemRef} tabIndex={-1} role="alert"><WarningCircleIcon weight="bold" aria-hidden="true" />{t.problems(problems.length)}</p> : null}
        <CorpFormFooter><Act kind="text" disabled={busy || !!custody} onClick={cancel}>{t.cancel}</Act>{saveButton("c-btn")}</CorpFormFooter>
        {/* Final fixes S2 (G85): a phone saves from the band, as every Settings form does; Cancel stays at the card's end. */}
        <div className="c-only-phone c-setb-phoneacts"><Act kind="text" disabled={busy || !!custody} onClick={cancel}>{t.cancel}</Act></div>
      </section>
    </>;
  } else {
    const has = (code: string) => policies.some(p => p.code === code);
    // Adding is one kind of row, whatever is missing (QA A1-05: the empty state had three button styles).
    const adds: { key: string; label: string; kind: Kind }[] = [
      ...(!has("VACATION") ? [{ key: "v", label: t.addVacation, kind: "VACATION" as Kind }] : []),
      ...(!has("SICK") ? [{ key: "s", label: t.addSick, kind: "SICK" as Kind }] : []),
      { key: "o", label: t.addOther, kind: "OTHER" as Kind },
    ];
    body = <>
      {attentionCard}
      {/* Final polish (finding 24): a save's result stands at the top: the done mark, what is now true, the fact. */}
      {landed && !attention ? <ResultB innerRef={doneRef as never} tone="done" title={t.policySaved}>{landed.line}</ResultB> : null}
      <CorpCard id="pto-policies" label={t.policiesCard}>
        {policies.length ? <CorpRows label={t.policiesCard}>{policies.map(policy => <li key={policy.code}>
          <CorpRow onClick={() => open(policy, "OTHER")} chevron title={policy.label}
            detail={[t.dayLine(hoursText(policy.fullDayMinutes)), policy.earnedMinutesPer100Hours ? t.earnsLine(hoursText(policy.earnedMinutesPer100Hours)) : t.earnsNone,
              policy.carryoverCapMinutes ? t.capLine(hoursText(policy.carryoverCapMinutes)) : t.capNone].join(" · ")}
            trail={<BChip tone={policy.enabled ? "green" : "grey"}>{policy.enabled ? t.on : t.off}</BChip>} /></li>)}</CorpRows>
          : <div className="c-empty c-empty--card"><span className="c-empty__title">{t.emptyTitle}</span><span className="c-empty__body">{t.emptyBody}</span></div>}
        <ul className="c-rows c-setb-adds">{adds.map(add => <li key={add.key}><CorpRow onClick={busy ? undefined : () => open(null, add.kind)} disabled={busy} icon={<PlusIcon weight="bold" />} title={add.label} chevron={false} /></li>)}</ul>
        <p className="c-setb-cardnote">{t.policiesNote}</p>
      </CorpCard>
    </>;
  }

  return <SettingsPageB title={title} titleId={TITLE_ID} back={draft ? null : { href: "/app/settings", label: t.settingsBack }} className="pto" lang={lang} phoneRight={phoneSave}>
    <p className="c-sr" role="status" aria-live="polite">{said}</p>
    {body}
    {/* Leaving with policy edits that are not saved asks first (Nov 21, 2026); a save that is being checked keeps its own hold. */}
    <DiscardGuard dirty={!!draft && !custody && JSON.stringify(draft) !== opened} lang={lang} />
  </SettingsPageB>;
}
