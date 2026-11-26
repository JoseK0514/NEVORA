"use client";

/* Paid time and export by batch (U01): the page. Four steps in the Add employee sheet frame: decide every recorded
 * break, see the plan, send each batch, finish. Who is included comes from POST /api/period-close (READ) and the breaks
 * from POST /api/timecards; the plan is the contract's planner (src/lib/payroll-export/batches.ts); each batch's stored
 * body goes verbatim to POST /api/payroll-export and its reply is verified before it counts; the period is complete
 * only when POST /api/period-close (MANIFEST) answers for exactly these batches. The plan lives in this tab's memory. */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PayrollExportBatchError, paidExportBatchProgress, planPaidExportBatches, type PaidExportBatchPlan } from "@/lib/payroll-export/batches";
import {parseExportCommand} from "@/lib/payroll-export/command";
import { verifyExportReply } from "@/lib/payroll-export/client";
import { parseCurrentTimecards } from "@/lib/timecards/client";
import type { Period } from "@/lib/timecards/project";
import { payrollImportCopy, type PayrollImportLang } from "./copy";
import { batchStatus, breakGate, describePlan, exportReadiness, finishState, keepDecisions, manifestMatches, nextBatch, parsePeriodRead, periodBreaks, planInput, sourceKey,
  type BatchState, type Decisions, type ExportSource } from "./export-model";
import { BreaksStep, ExportChangedNotice, FinishStep, PlanStep, RunStep } from "./export-views";
import { type StepAction, FlowHead, OfflineNote, Skeleton, StepActions, StopCard, download, periodText, useHeld, useLeaveGuard, useOffline, useStepFocus } from "./flow-kit";
import { IDLE, EXPORT_REFUSALS, retireWrite, classifyExportAnswer, holdsCustody, writeReducer, type Custody, type WriteEvent, type WriteState, type ExportRefusal } from "./recovery";

const foreground=()=>document.visibilityState!=="hidden"&&navigator.onLine&&document.hasFocus();
const TITLE_ID = "paid-export-title", HEADING_ID = "paid-export-step";
type Work = {
  step: 1 | 2 | 3 | 4; decisions: Decisions; plan: PaidExportBatchPlan | null; planFor: string | null; planProblem: "tooBig" | "coverage" | null;
  states: Record<string, BatchState>; record: WriteState<unknown>; changed: number | null; source: string | null;
};
const emptyWork = (): Work => ({ step: 1, decisions: {}, plan: null, planFor: null, planProblem: null, states: {}, record: IDLE, changed: null, source: null });
function retireWork(work:Work):Work{return {...emptyWork(),states:Object.fromEntries(Object.entries(work.states).map(([key,state])=>[key,retireWrite(state)]).filter(([,state])=>holdsCustody(state as WriteState<unknown>))),record:retireWrite(work.record)};}
type Loaded = { state: "loading" } | { state: "failed"; why: "network" | "denied" | "signed_out" } | { state: "ready"; source: ExportSource };

async function post(path: string, headers: Record<string, string>, body: string): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(path, { method: "POST", cache: "no-store", credentials: "same-origin", signal: controller.signal, headers: { "content-type": "application/json", ...headers }, body });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  } catch { return { status: 0, body: undefined }; }
  finally { clearTimeout(timer); }
}

export function PaidTimeExportFlow({ lang = "en", actorId, workspaceId, period, timeZone }: { lang?: PayrollImportLang; actorId: string; workspaceId: string; period: Period; timeZone: string }) {
  const copy = payrollImportCopy[lang];
  const [work, setWork, dropWork] = useHeld<Work>(`export:${workspaceId}:${actorId}:${period.startDate}:${period.endDate}`, emptyWork,retireWork);
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" }), [busy, setBusy] = useState(false);
  const offline = useOffline(), latest = useRef(work), running = useRef(false);
  useEffect(() => { latest.current = work; }, [work]);
  const active = useRef(false), focused = useRef(true), readSequence = useRef(0), validUntil = useRef(0),generation=useRef(0);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null),renewal=useRef<ReturnType<typeof setTimeout>|null>(null);
  const cancelRead = useCallback(() => {
    generation.current++;readSequence.current++; validUntil.current = 0;
    if (expiry.current) clearTimeout(expiry.current);
    expiry.current = null;if(renewal.current)clearTimeout(renewal.current);renewal.current=null;
  }, []);
  const pausePrivate=useCallback(()=>{cancelRead();const next=retireWork(latest.current);latest.current=next;setWork(next);setLoaded({state:"loading"});},[cancelRead,setWork]);
  const hasLease = () => active.current && focused.current && foreground() && performance.now() < validUntil.current;
  const started = Object.keys(work.states).length > 0;
  const unresolved = Object.values(work.states).some(holdsCustody) || holdsCustody(work.record);
  useLeaveGuard(unresolved || (started && work.record.phase !== "saved"));
  useStepFocus(`${work.step}:${work.record.phase}`, HEADING_ID);
  useEffect(() => () => { if (latest.current.record.phase === "saved") dropWork(); }, [dropWork]);

  const load = useCallback(async function loadExport() {
    if (!active.current || !focused.current || !foreground()) return;
    const sequence = ++readSequence.current, began = performance.now();
    const [close, time] = await Promise.all([
      post("/api/period-close", { "x-nevora-period-close": "1", "x-nevora-actor": actorId }, JSON.stringify({ action: "READ", command: period })),
      post("/api/timecards", { "x-nevora-timecards": "1", "x-nevora-actor": actorId }, JSON.stringify(period)),
    ]);
    if (!active.current || !focused.current || sequence !== readSequence.current || !foreground()) return;
    const status = [close.status, time.status];
    if (status.includes(401)) { pausePrivate(); setLoaded({ state: "failed", why: "signed_out" }); return; }
    if (status.includes(403)) { pausePrivate(); setLoaded({ state: "failed", why: "denied" }); return; }
    try {
      const read = close.status === 200 ? parsePeriodRead(close.body, period) : null;
      if (!read || time.status !== 200) throw new Error("unavailable");
      const parsed = parseCurrentTimecards(time.body, period), deadline = began + parsed.validForMs;
      const remaining = deadline - performance.now();
      if (remaining < 1) throw new Error("Expired timecard read");
      const source: ExportSource = { read, cards: parsed.cards }, key = sourceKey(source), now = latest.current;
      // Starting a new read never cancels the old deadline. Only a completed paired read can renew it.
      if (expiry.current) clearTimeout(expiry.current);
      validUntil.current = deadline;
      expiry.current = setTimeout(() => { if (active.current){pausePrivate();setLoaded({state:"failed",why:"network"});} }, remaining);
      if(renewal.current)clearTimeout(renewal.current);renewal.current=setTimeout(()=>void loadExport(),remaining*.7);
      setLoaded({ state: "ready", source });
      // Once a batch is out the plan is fixed: a newer read is shown for names only and never changes the plan.
      if (Object.keys(now.states).length || now.source === key) return;
      // The timecards or the people changed before anything was sent: keep every choice whose break is still there.
      const ready = exportReadiness(source), kept = "included" in ready ? keepDecisions(periodBreaks(ready.included, period), now.decisions) : { decisions: now.decisions, dropped: 0 };
      setWork(value => ({ ...value, source: key, decisions: kept.decisions, plan: null, planFor: null, planProblem: null, step: value.source && value.step > 1 ? 1 : value.step, changed: value.source ? kept.dropped : null }));
    } catch { pausePrivate(); setLoaded({ state: "failed", why: "network" }); }
  }, [actorId, period, setWork, pausePrivate]);
  useEffect(() => {
    active.current = true; focused.current = foreground();
    queueMicrotask(() => { if (active.current) void load(); });
    const hide = (event?: Event) => { if (event?.type === "blur" && event.target !== window) return; focused.current = false; pausePrivate(); };
    const again = () => { if (foreground()) { focused.current = true; void load(); } };
    const visible = () => document.visibilityState === "hidden" ? hide() : again();

    window.addEventListener("online", again); window.addEventListener("focus", again); window.addEventListener("pageshow", again);
    window.addEventListener("offline", hide); window.addEventListener("blur", hide); window.addEventListener("pagehide", hide); document.addEventListener("visibilitychange", visible);
    return () => {
      active.current = false;cancelRead();
      window.removeEventListener("online", again); window.removeEventListener("focus", again); window.removeEventListener("pageshow", again);
      window.removeEventListener("offline", hide); window.removeEventListener("blur", hide); window.removeEventListener("pagehide", hide); document.removeEventListener("visibilitychange", visible);
    };
  }, [load, pausePrivate, cancelRead]);

  const source = loaded.state === "ready" ? loaded.source : null;
  const ready = useMemo(() => source ? exportReadiness(source) : null, [source]);
  const included = useMemo(() => ready && "included" in ready ? ready.included : [], [ready]);
  const people = useMemo(() => periodBreaks(included, period), [included, period]);
  const gate = useMemo(() => breakGate(people, work.decisions), [people, work.decisions]);
  const names = useMemo(() => new Map(source?.read.members.map(member => [member.employeeId, member.name]) ?? []), [source]);
  const plan = work.plan, batches = useMemo(() => plan ? describePlan(plan, names) : null, [plan, names]);
  const finish = useMemo(() => plan ? finishState(plan, work.states, work.record) : null, [plan, work.states, work.record]);
  const planKey = useMemo(() => JSON.stringify([work.source, Object.entries(work.decisions).sort()]), [work.source, work.decisions]);

  // The plan is made when the Plan step opens, and made again only if a choice or the source changed before sending.
  useEffect(() => {
    if (work.step !== 2 || started || !source || !gate.ready || gate.overLimit || work.planFor === planKey) return;
    let active = true;
    void planPaidExportBatches(planInput(source, included, people, work.decisions, { planId: crypto.randomUUID(), actorId, workspaceId }))
      .then(next => { if (active&&hasLease()) setWork(value => ({ ...value, plan: next, planFor: planKey, planProblem: null })); })
      .catch(failure => { if (active) setWork(value => ({ ...value, plan: null, planFor: planKey, planProblem: failure instanceof PayrollExportBatchError && failure.reason === "EMPLOYEE_EXCEEDS_COMMAND_LIMIT" ? "tooBig" : "coverage" })); });
    return () => { active = false; };
  }, [work.step, work.planFor, work.decisions, started, source, gate.ready, gate.overLimit, planKey, included, people, actorId, workspaceId, setWork]);

  const go = (step: Work["step"]) => setWork(value => ({ ...value, step }));
  const applyBatch = useCallback((key: string, event: WriteEvent<unknown>) => {
    const next = writeReducer(latest.current.states[key] ?? IDLE, event);
    latest.current = { ...latest.current, states: { ...latest.current.states, [key]: next } };
    setWork(value => ({ ...value, states: { ...value.states, [key]: next } }));
    return next;
  }, [setWork]);

  /** Send one batch's stored body, exactly as planned, and settle its state from the verified reply. */
  async function sendBatch(current: PaidExportBatchPlan, key: string): Promise<boolean> {
    if (!hasLease()) { pausePrivate(); return false; }
    const batch = current.batches.find(item => item.command.operationId === key);
    if (!batch) return false;
    const currentGeneration=generation.current;
    const custody: Custody = { key, body: batch.body };
    if (applyBatch(key, { type: "send", custody }).phase !== "sending") return false;
    const answer = await post("/api/payroll-export", { "x-nevora-payroll-export": "1", "x-nevora-actor": current.actorId }, batch.body), result = classifyExportAnswer(answer.status, answer.body);
    if(currentGeneration!==generation.current||!hasLease()){applyBatch(key,{type:"unknown"});return false;}
    if (result.kind === "generated") {
      // A reply counts only when its CSV, both fingerprints and the workplace are the ones this batch asked for.
      try { const verified = await verifyExportReply(result.reply, batch.command); if (verified.model.workspaceId !== current.workspaceId) throw new Error("foreign");if(currentGeneration!==generation.current||!hasLease()){applyBatch(key,{type:"unknown"});return false;} applyBatch(key, { type: "saved", receipt: result.reply }); return true; }
      catch { applyBatch(key, { type: "unknown" }); return false; }
    }
    if (result.kind === "refused") applyBatch(key, { type: "refused", reason: result.reason });
    else if (result.kind === "conflict") applyBatch(key, { type: "blocked", reason: "conflict" });
    else if (result.kind === "already_generated") applyBatch(key, { type: "blocked", reason: "duplicate" });
    else if (result.kind === "denied") applyBatch(key, { type: "blocked", reason: result.signedOut ? "signed_out" : "denied" });
    else applyBatch(key, { type: "unknown" });
    return false;
  }
  async function run(only?: string) {
    const current = latest.current.plan;
    if (!current || running.current) return;
    if (!hasLease()) { pausePrivate(); return; }
    running.current = true; setBusy(true);
    try {
      if (only) await sendBatch(current, only);
      else for (let key = nextBatch(current, latest.current.states); key; key = nextBatch(current, latest.current.states)) { if (!await sendBatch(current, key)) break; }
    } finally { running.current = false; setBusy(false); focusProblem(); }
  }
  // After the page has drawn the batch's new state, focus goes to the sentence that says what happened.
  const focusProblem = () => setTimeout(() => document.querySelector<HTMLElement>(".pim [data-pim-error]")?.focus(), 80);

  /** Ask the server to confirm the whole period for exactly this plan's batches. The same request is the retry. */
  async function confirm() {
    const current = latest.current.plan;
    if (!current || running.current) return;
    if (!hasLease()) { pausePrivate(); return; }
    const replies = current.batches.map(batch => { const state = latest.current.states[batch.command.operationId]; return state?.phase === "saved" ? state.receipt : null; });
    if (replies.includes(null)) return;
    const currentGeneration=generation.current;
    running.current = true; setBusy(true);
    try {
      const progress = await paidExportBatchProgress(current, replies).catch(() => null);
      if (currentGeneration!==generation.current||!hasLease()) { pausePrivate(); return; }
      if (progress?.state !== "READY_FOR_MANIFEST") { setWork(value => ({ ...value, record: { phase: "blocked", custody: { key: current.planId, body: "" }, reason: "conflict" } })); return; }
      const custody: Custody = latest.current.record.phase === "unknown" ? latest.current.record.custody : { key: current.planId, body: JSON.stringify(current.manifestRequest) };
      const sending = writeReducer(latest.current.record, { type: "send", custody });
      if (sending.phase !== "sending") return;
      latest.current={...latest.current,record:sending};setWork(latest.current);
      const answer = await post("/api/period-close", { "x-nevora-period-close": "1", "x-nevora-actor": current.actorId }, custody.body);
      if(currentGeneration!==generation.current||!hasLease())return;
      const body = answer.body as { state?: unknown; result?: unknown } | undefined;
      const event: WriteEvent<unknown> = answer.status === 200 && body?.state === "ready" && manifestMatches(body.result, current) ? { type: "saved", receipt: body.result }
        : answer.status === 401 || answer.status === 403 ? { type: "blocked", reason: answer.status === 401 ? "signed_out" : "denied" }
        : answer.status === 409 && body?.state === "conflict" ? { type: "refused", reason: "CONFLICT" } : answer.status === 400 && body?.state === "invalid" ? { type: "refused", reason: "INVALID" } : { type: "unknown" };
      setWork(value => ({ ...value, record: writeReducer(sending, event) }));
    } finally { running.current = false; setBusy(false); }
  }
  async function downloadBatch(key:string){
    if(!hasLease()){pausePrivate();return;}
    const currentGeneration=generation.current,batch=latest.current.plan?.batches.find(batch=>batch.command.operationId===key);
    if(!batch||latest.current.states[key]?.phase!=="saved")return;
    // Replay the immutable original command: the server rechecks current company
    // authority and verifies the stored artifact before returning any bytes.
    const answer=await post("/api/payroll-export",{"x-nevora-payroll-export":"1","x-nevora-actor":actorId},batch.body);
    if(currentGeneration!==generation.current||!hasLease())return;
    if(answer.status!==200){pausePrivate();void load();return;}
    try{const verified=await verifyExportReply(answer.body,batch.command);if(verified.model.workspaceId!==workspaceId)throw Error("foreign");if(currentGeneration!==generation.current||!hasLease())return;download(verified.csv,"text/csv;charset=utf-8",`nevora-paid-time-${period.startDate}-${key.slice(0,8)}.csv`);}catch{pausePrivate();}
  }
  async function recoverOriginal(key:string,manifest=false){
    if(running.current||!hasLease())return;
    const original=manifest?latest.current.record:latest.current.states[key];
    if(!original||original.phase!=="unknown")return;
    const currentGeneration=generation.current,custody=original.custody;
    const settle=(event:WriteEvent<unknown>)=>{
      if(!manifest){applyBatch(key,event);return;}
      const record=writeReducer(latest.current.record,event);
      latest.current={...latest.current,record};setWork(latest.current);
    };
    settle({type:"send",custody});running.current=true;setBusy(true);
    try{
      const answer=await post(manifest?"/api/period-close":"/api/payroll-export",{[manifest?"x-nevora-period-close":"x-nevora-payroll-export"]:"1","x-nevora-actor":actorId},custody.body);
      if(currentGeneration!==generation.current||!hasLease())return;
      if(answer.status===401||answer.status===403){pausePrivate();void load();return;}
      let confirmed=false;
      if(manifest){
        const body=answer.body as {state?:string;result?:{state?:string;id?:string}}|null;
        confirmed=answer.status===200&&body?.state==="ready"&&body.result?.state==="MANIFEST_PREPARED"&&body.result.id===custody.key;
        if(!confirmed)settle(answer.status===400&&body?.state==="invalid"?{type:"refused",reason:"INVALID"}:answer.status===409&&body?.state==="conflict"?{type:"blocked",reason:"conflict"}:{type:"unknown"});
      }else{
        const result=classifyExportAnswer(answer.status,answer.body);
        if(result.kind==="generated"){
          const verified=await verifyExportReply(result.reply,parseExportCommand(JSON.parse(custody.body)));
          confirmed=verified.model.workspaceId===workspaceId;
          if(!confirmed)throw Error("foreign");
        }else settle(result.kind==="refused"?{type:"refused",reason:result.reason}:result.kind==="conflict"?{type:"blocked",reason:"conflict"}:result.kind==="already_generated"?{type:"blocked",reason:"duplicate"}:{type:"unknown"});
      }
      if(!confirmed||currentGeneration!==generation.current||!hasLease())return;
      setWork(value=>{const states={...value.states};if(!manifest)delete states[key];return {...value,states,record:manifest?IDLE:value.record};});
      void load();
    }catch{if(currentGeneration===generation.current&&hasLease())settle({type:"unknown"});}
    finally{running.current=false;setBusy(false);}
  }

  const exportsHref = `/app/payroll-export?start=${period.startDate}&end=${period.endDate}`, back = { href: exportsHref, label: copy.common.timeExports };
  const periodLabel = periodText(period.startDate, period.endDate, copy.locale), title = copy.exp.title, eyebrow = `${copy.imp.confirm.period} · ${periodLabel}`;
  const frame = (step: number, onBack: (() => void) | null, children: ReactNode) => <>
    <FlowHead copy={copy} title={title} titleId={TITLE_ID} back={back} step={step} steps={copy.exp.steps} onBack={onBack} />
    <form className="c-teamform pim" data-wide={step >= 1 && step <= 3 ? "" : undefined} noValidate onSubmit={event => event.preventDefault()} aria-labelledby={TITLE_ID}><p className="pim-eyebrow">{eyebrow}</p>{children}</form>
  </>;

  if (loaded.state === "loading") return frame(0, null, <Skeleton label={copy.common.loading} />);
  if (loaded.state === "failed") return frame(0, null, loaded.why === "network"
    ? <StopCard kind={offline ? "offline" : "failed"} alert title={offline ? copy.common.offlineTitle : copy.common.loadFailedTitle} line={offline ? copy.common.offlineLine : copy.common.loadFailedLine} action={{ retry: true, label: copy.common.tryAgain, onClick: () => { setLoaded({ state: "loading" }); void load(); } }} />
    : <StopCard title={loaded.why === "denied" ? copy.common.deniedTitle : copy.common.signedOutTitle} line={loaded.why === "denied" ? copy.common.deniedLine : copy.common.signedOutLine} action={loaded.why === "denied" ? { label: copy.exp.finish.openExports, href: exportsHref } : { label: copy.common.signIn, href: "/login" }} />);
  if(!work.plan&&(Object.keys(work.states).length||work.record.phase!=="idle")){
    const recovery=(key:string,state:WriteState<unknown>,manifest=false)=>{
      const stopped=state.phase==="blocked"||state.phase==="refused";
      const refusal=state.phase==="refused"&&(state.reason==="INVALID"||(EXPORT_REFUSALS as readonly string[]).includes(state.reason))?copy.exp.run.refusal[state.reason as ExportRefusal]:null;
      const line=manifest?(stopped?copy.exp.finish.refusedLine:copy.exp.finish.unknownLine):refusal??(state.phase==="blocked"?(state.reason==="duplicate"?copy.exp.run.duplicateLine:copy.exp.run.conflictLine):copy.exp.run.unknownLine);
      return <StopCard key={key} kind={state.phase==="refused"?"failed":"paused"} alert title={stopped?copy.exp.run.status.blocked:copy.exp.run.status.unknown} line={line}
        action={stopped?{label:copy.exp.finish.openExports,href:exportsHref}:{label:manifest?copy.exp.finish.check:copy.exp.run.checkBatch,busy,onClick:()=>void recoverOriginal(key,manifest)}}>
        {"custody" in state?<p className="pim-receipt"><code>{state.custody.key.slice(0,8)}</code></p>:null}
      </StopCard>;
    };
    return frame(0,null,<>{Object.entries(work.states).map(([key,state])=>recovery(key,state))}{work.record.phase!=="idle"?recovery("manifest",work.record,true):null}</>);
  }
  if (ready && "hold" in ready && !started) {
    const hold = ready.hold, href = hold.kind === "notFinalized" ? `/app/timecards?start=${period.startDate}&end=${period.endDate}` : hold.kind === "tooManyPeople" ? "/app/payroll" : hold.kind === "alreadyComplete" ? exportsHref : `${exportsHref}#who-is-included`;
    return frame(0, null, <StopCard kind="paused" title={copy.exp.hold.title(hold)} line={copy.exp.hold.line(hold)} action={{ label: copy.exp.hold.action(hold), href }} />);
  }

  const step = work.step, zero = ready && "included" in ready ? ready.zero : 0, excluded = ready && "included" in ready ? ready.excluded : 0;
  const notices = <>
    <p className="c-sr" role="status" aria-live="polite">{copy.common.stepOf(step, copy.exp.steps.length, copy.exp.steps[step - 1])}</p>
    {offline ? <OfflineNote copy={copy} /> : null}
    {work.changed !== null && !started ? <ExportChangedNotice copy={copy} dropped={work.changed} onDismiss={() => setWork(value => ({ ...value, changed: null }))} /> : null}
  </>;

  if (step === 1) return frame(1, null, <>
    {notices}
    <BreaksStep copy={copy} headingId={HEADING_ID} people={people} decisions={work.decisions} gate={gate} timeZone={included[0]?.card.card.timeZone ?? timeZone} locked={started}
      onDecide={(key, treatment) => setWork(value => ({ ...value, decisions: { ...value.decisions, [key]: treatment } }))} />
    <StepActions id="pim-e1" primary={{ label: copy.exp.breaks.next, why: gate.overLimit ? copy.exp.breaks.overLimit : gate.ready ? null : copy.exp.breaks.blocked(gate.undecided), onClick: () => go(2) }} secondary={{ label: copy.common.cancel, href: exportsHref }} />
  </>);

  if (step === 2) return frame(2, () => go(1), <>
    {notices}
    <PlanStep copy={copy} headingId={HEADING_ID} batches={work.planFor === planKey || started ? batches : null} problem={work.planProblem} covered={{ included: included.length, zero, excluded }} exportsHref={exportsHref} />
    <StepActions id="pim-e2" primary={work.planProblem ? undefined : { label: plan && !plan.batches.length ? copy.exp.run.next : copy.exp.plan.next, why: plan && (work.planFor === planKey || started) ? null : copy.exp.plan.planning, onClick: () => go(plan && !plan.batches.length ? 4 : 3) }}
      secondary={{ label: copy.common.back, onClick: () => go(1) }} />
  </>);

  if (!plan || !batches || !finish) return frame(2, () => go(1), <StopCard kind="paused" title={copy.exp.changed.title} line={copy.exp.changed.line(0)} action={{ label: copy.exp.breaks.next, onClick: () => go(2) }} />);

  if (step === 3) {
    const next = nextBatch(plan, work.states), allSaved = finish.savedBatches === finish.batches, stopped = Object.values(work.states).some(state => state.phase === "blocked");
    const primary: StepAction = allSaved ? { label: copy.exp.run.next, onClick: () => go(4) } : stopped ? { label: copy.exp.finish.openExports, href: exportsHref }
      : { label: busy ? copy.exp.run.sending : started ? copy.exp.run.sendRest : copy.exp.run.sendAll, busy, onClick: () => void run(),
        why: busy ? null : offline ? copy.common.offlineLine : stopped ? copy.exp.finish.missing(finish.missing[0], finish.batches) : !next ? copy.exp.finish.missing(finish.missing[0], finish.batches) : null };
    return frame(3, started ? null : () => go(2), <>
      {notices}
      <RunStep copy={copy} headingId={HEADING_ID} batches={batches} states={work.states} onCheck={key => void run(key)} onDownload={downloadBatch} />
      <StepActions id="pim-e3" primary={primary} secondary={allSaved ? undefined : { label: copy.exp.finish.heading, onClick: () => go(4) }} />
    </>);
  }

  const recordStatus = batchStatus(work.record), batchesDone = finish.savedBatches === finish.batches;
  return frame(4, finish.complete ? null : () => go(plan.batches.length ? 3 : 2), <>
    {notices}
    <FinishStep copy={copy} headingId={HEADING_ID} finish={finish} record={work.record} periodLabel={periodLabel} exportsHref={exportsHref} onBackToRun={() => go(3)} />
    {finish.complete || !batchesDone || recordStatus === "refused" || recordStatus === "blocked" ? null
      : <StepActions id="pim-e4" primary={{ label: busy ? copy.exp.finish.confirming : recordStatus === "unknown" ? copy.exp.finish.check : copy.exp.finish.confirm, busy, why: offline ? copy.common.offlineLine : null, onClick: () => void confirm() }} />}
  </>);
}
