"use client";
import { useViewLang } from "@/components/owner-b/use-owner-lang";

/* Import pay from another payroll system (U01): the page. Five steps in the Add employee sheet frame: add a file, match
 * people, review amounts, confirm, result. The team comes from GET /api/payroll/settings and the payroll from GET
 * /api/payroll/runs; the amounts go to POST /api/payroll/runs (IMPORT, or CORRECT once the payroll is approved), and an
 * unconfirmed save is looked up at GET /api/payroll/receipts before anything else. The work lives in this tab's memory
 * (flow-kit.tsx useHeld), never in browser storage. */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {readOperationalNavigation} from "@/components/company-access/commands";
import type { PayrollRun } from "@/lib/payroll/contracts";
import { readRuns, readSettings } from "@/components/payroll/api";
import { payrollImportCopy, type PayrollImportLang } from "./copy";
import { FlowHead, OfflineNote, Skeleton, StepActions, StopCard, dayText, download, periodText, useHeld, useLeaveGuard, useOffline, useStepFocus } from "./flow-kit";
import { correct, freezeImport, initialMatches, isCorrection, periodMismatch, planImport, readImportFile, reconcile, reviewAmounts, reviewMatches, starterCsv, validReason, validSourceText, PEOPLE_MAX,
  type AmountField, type Corrections, type Dispositions, type FileProblem, type FileRow, type ImportDraft, type ImportSource, type Matches, type RosterPerson, type Snapshot, type SourceChange } from "./import-model";
import { AddFileStep, ChangedNotice, ConfirmStep, MatchStep, ResultStep, ReviewStep } from "./import-views";
import { IDLE, retireWrite, classifyPayrollAnswer, classifyReceiptLook, holdsCustody, writeReducer, type PayrollReceiptLike, type WriteEvent, type WriteState } from "./recovery";

const foreground=()=>document.visibilityState!=="hidden"&&navigator.onLine&&document.hasFocus();
const TITLE_ID = "payroll-import-title", HEADING_ID = "payroll-import-step";
type Work = {
  step: 1 | 2 | 3 | 4 | 5; draft: ImportDraft | null; problem: FileProblem | null; source: ImportSource; reason: string;
  matches: Matches; dispositions: Dispositions; corrections: Corrections; write: WriteState<PayrollReceiptLike>; changes: SourceChange[]; snapshot: Snapshot | null; sentPeople: number;
};
const emptyWork = (): Work => ({ step: 1, draft: null, problem: null, source: { sourceName: "", sourceReference: "" }, reason: "", matches: {}, dispositions: {}, corrections: {}, write: IDLE, changes: [], snapshot: null, sentPeople: 0 });
function retireWork(work:Work):Work{const write=retireWrite(work.write);return {...emptyWork(),...(holdsCustody(write)?{step:5,write,sentPeople:work.sentPeople}:{})};}
type Loaded = { state: "loading" } | { state: "failed"; why: "network" | "denied" | "signed_out" } | { state: "ready"; run: PayrollRun | null; roster: RosterPerson[] };

/** One same-origin payroll request. Status 0 when no answer arrived. */
async function ask(path: string, body?: string): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(path, { method: body === undefined ? "GET" : "POST", cache: "no-store", credentials: "same-origin", signal: controller.signal,
      headers: body === undefined ? { "x-nevora-payroll": "1" } : { "Content-Type": "application/json", "x-nevora-payroll": "1" }, body });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  } catch { return { status: 0, body: undefined }; }
  finally { clearTimeout(timer); }
}

export function PayrollImportFlow({ lang: langProp, runId, recoveryScope, actorId }: { lang?: PayrollImportLang; runId: string | null; recoveryScope: string; actorId: string }) {
  const lang = useViewLang(langProp);
  const copy = payrollImportCopy[lang], referenceKey = `nevora-payroll-operation:${recoveryScope}`;
  const [work, setWork, dropWork] = useHeld<Work>(`import:${recoveryScope}:${actorId}:${runId ?? ""}`, emptyWork,retireWork);
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" }), [reading, setReading] = useState(false), [editing, setEditing] = useState<{ index: number; field: AmountField } | null>(null);
  const [otherPending, setOtherPending] = useState(false), [touched, setTouched] = useState(false);
  const offline = useOffline(), latest = useRef(work);
  useEffect(() => { latest.current = work; }, [work]);
  useLeaveGuard(holdsCustody(work.write));
  useStepFocus(`${work.step}:${work.write.phase}`, HEADING_ID);
  // A finished import has nothing to come back to.
  useEffect(() => () => { if (latest.current.write.phase === "saved") dropWork(); }, [dropWork]);

  const active=useRef(false),focused=useRef(true),generation=useRef(0),readSequence=useRef(0),validUntil=useRef(0);
  const timers=useRef<{end?:ReturnType<typeof setTimeout>;renew?:ReturnType<typeof setTimeout>}>({});
  const hasLease=()=>active.current&&focused.current&&foreground()&&performance.now()<validUntil.current;
  const cancelRead=useCallback(()=>{generation.current++;readSequence.current++;validUntil.current=0;clearTimeout(timers.current.end);clearTimeout(timers.current.renew);timers.current={};},[]);
  const retire=useCallback(()=>{
    cancelRead();
    const next=retireWork(latest.current);latest.current=next;setWork(next);setLoaded({state:"loading"});setEditing(null);setReading(false);setTouched(false);
  },[cancelRead,setWork]);
  const load=useCallback(async function loadImport(){
    if(!active.current||!focused.current||!foreground())return;
    const sequence=++readSequence.current,began=performance.now();
    const [runs,settings,authority]=await Promise.all([ask("/api/payroll/runs"),ask("/api/payroll/settings"),fetch("/api/company-access/operational-authority",{cache:"no-store",credentials:"same-origin",headers:{"x-nevora-company-access":"1"}}).then(async response=>({status:response.status,body:await response.json()})).catch(()=>({status:0,body:null}))]);
    if(!active.current||!focused.current||sequence!==readSequence.current||!foreground())return;
    const status=[runs.status,settings.status,authority.status];
    if(status.includes(401)||status.includes(403)){retire();setLoaded({state:"failed",why:status.includes(401)?"signed_out":"denied"});return;}
    try{
      if(runs.status!==200||settings.status!==200||authority.status!==200)throw Error("unavailable");
      const access=readOperationalNavigation(authority.body);if(access.state!=="ready"||access.employeeId!==actorId)throw Error("unavailable");
      const deadline=began+access.validForMs,remaining=deadline-performance.now();if(remaining<=0)throw Error("expired");
      const run=readRuns(runs.body).runs.find(item=>item.id===runId)??null;
      const roster=readSettings(settings.body).employees.map(person=>({id:person.id,name:person.name,active:person.active}));
      clearTimeout(timers.current.end);clearTimeout(timers.current.renew);validUntil.current=deadline;
      timers.current.end=setTimeout(()=>{retire();setLoaded({state:"failed",why:"network"});},remaining);
      timers.current.renew=setTimeout(()=>void loadImport(),remaining*.7);
      setLoaded({state:"ready",run,roster});
      const now=latest.current,after:Snapshot={roster,run};
      if(now.write.phase!=="idle"&&now.write.phase!=="refused")return;
      if(!now.snapshot){setWork(value=>({...value,snapshot:after}));return;}
      const result=reconcile(now.snapshot,after,now.matches,now.dispositions);
      setWork(value=>({...value,snapshot:after,matches:result.matches,dispositions:result.dispositions,changes:result.changes.length?result.changes:value.changes}));
    }catch{retire();setLoaded({state:"failed",why:"network"});}
  },[actorId,runId,retire,setWork]);
  useEffect(()=>{
    active.current=true;focused.current=foreground();queueMicrotask(()=>{if(active.current)void load();});
    const away=()=>{focused.current=false;retire();};
    const back=()=>{if(foreground()){focused.current=true;void load();}};
    const visible=()=>document.visibilityState==="hidden"?away():back();
    window.addEventListener("blur",away);window.addEventListener("offline",away);window.addEventListener("pagehide",away);window.addEventListener("focus",back);window.addEventListener("online",back);window.addEventListener("pageshow",back);document.addEventListener("visibilitychange",visible);
    return()=>{active.current=false;cancelRead();window.removeEventListener("blur",away);window.removeEventListener("offline",away);window.removeEventListener("pagehide",away);window.removeEventListener("focus",back);window.removeEventListener("online",back);window.removeEventListener("pageshow",back);document.removeEventListener("visibilitychange",visible);};
  },[load,retire,cancelRead]);
  // Another payroll action whose result is still unknown (recorded by Review payroll) comes first.
  useEffect(() => {
    queueMicrotask(() => { try { const stored = localStorage.getItem(referenceKey); setOtherPending(!!stored && !("custody" in latest.current.write && latest.current.write.custody.key === stored)); } catch { /* storage is optional here */ } });
  }, [referenceKey]);

  const run = loaded.state === "ready" ? loaded.run : null, roster = useMemo(() => loaded.state === "ready" ? loaded.roster : [], [loaded]);
  const draft = work.draft, correction = run ? isCorrection(run) : false;
  const periodLabel = run ? periodText(run.period.startDate, run.period.endDate, copy.locale) : "", paydayLabel = run ? dayText(run.payday, copy.locale) : "";
  const matchReview = useMemo(() => draft ? reviewMatches(draft.rows, roster, work.matches, work.dispositions) : null, [draft, roster, work.matches, work.dispositions]);
  const amountReview = useMemo(() => draft ? reviewAmounts(draft.rows, roster, work.matches, work.dispositions, work.corrections) : null, [draft, roster, work.matches, work.dispositions, work.corrections]);
  const plan = useMemo(() => draft && run && matchReview?.complete ? planImport(draft, roster, work.matches, work.dispositions, work.corrections, run, work.source) : null, [draft, run, matchReview, roster, work.matches, work.dispositions, work.corrections, work.source]);
  const frozen = useMemo(() => plan && run ? freezeImport(run, plan, "00000000-0000-4000-8000-000000000000", work.reason) : null, [plan, run, work.reason]);

  const go = (step: Work["step"]) => { setEditing(null); setWork(value => ({ ...value, step })); };
  const apply=useCallback((event:WriteEvent<PayrollReceiptLike>)=>{const next={...latest.current,write:writeReducer(latest.current.write,event)};latest.current=next;setWork(next);},[setWork]);
  const release = (key: string) => { try { if (localStorage.getItem(referenceKey) === key) localStorage.removeItem(referenceKey); } catch { /* nothing to release */ } };

  async function chooseFile(file: File) {
    if(!hasLease()){retire();return;}const current=generation.current;
    setReading(true); setTouched(false);
    let text = "";
    const known = /\.(csv|json)$/i.test(file.name), small = file.size <= 524_288;
    try { if (known && small) text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(await file.arrayBuffer()); }
    catch { if(current!==generation.current||!hasLease())return;setReading(false); setWork(value => ({ ...value, problem: { code: "unreadable" } })); focusError(); return; }
    if(current!==generation.current||!hasLease())return;
    const result = readImportFile({ name: file.name, size: file.size, text });
    setReading(false);
    if (!result.ok) { setWork(value => ({ ...value, problem: result.problem })); focusError(); return; }
    const next = result.draft;
    setWork(value => ({ ...value, draft: next, problem: null, matches: initialMatches(next.rows, roster), corrections: {},
      source: next.json ? { sourceName: next.json.sourceName, sourceReference: next.json.sourceReference } : value.source }));
  }
  const focusError = () => requestAnimationFrame(() => document.querySelector<HTMLElement>(".pim [data-pim-error]")?.focus());
  const starter=async()=>{const current=generation.current;const response=await ask("/api/payroll/settings");if(current!==generation.current||!hasLease())return;if(response.status!==200){retire();void load();return;}try{const people=readSettings(response.body).employees.map(person=>({id:person.id,name:person.name,active:person.active}));download(starterCsv(people),"text/csv;charset=utf-8","nevora-pay-import-starter.csv");}catch{retire();}};

  async function post(custody: { key: string; body: string }) {
    const current=generation.current;
    const answer = await ask("/api/payroll/runs", custody.body), result = classifyPayrollAnswer(answer.status, answer.body, custody.key);
    if(current!==generation.current||!hasLease()){apply({type:"unknown"});return;}
    if (result.kind === "saved") { release(custody.key); apply({ type: "saved", receipt: result.receipt }); }
    else if (result.kind === "refused") { release(custody.key); apply({ type: "refused", reason: result.code, detail: result.issues.join(" ") }); void load(); }
    else if (result.kind === "denied") { release(custody.key); apply({ type: "refused", reason: result.signedOut ? "SIGNED_OUT" : "DENIED" }); }
    else if (result.kind === "blocked") apply({ type: "blocked", reason: result.code });
    else apply({ type: "unknown" });
  }
  function save() {
    if (!run || !plan || holdsCustody(work.write)) return;
    if(!hasLease()){retire();return;}
    const key = crypto.randomUUID(), body = freezeImport(run, plan, key, work.reason).body, custody = { key, body };
    try { localStorage.setItem(referenceKey, key); } catch { /* this page still holds the request */ }
    const next={...latest.current,step:5 as const,sentPeople:plan.people,changes:[],write:writeReducer(latest.current.write.phase==="refused"?IDLE:latest.current.write,{type:"send",custody})};latest.current=next;setWork(next);
    void post(custody);
  }
  async function check() {
    const write = latest.current.write;
    if (write.phase !== "unknown") return;
    if(!hasLease()){retire();return;}const current=generation.current;
    apply({ type: "check" });
    const answer = await ask(`/api/payroll/receipts?operationId=${encodeURIComponent(write.custody.key)}`), look = classifyReceiptLook(answer.status, answer.body, write.custody.key);
    if(current!==generation.current||!hasLease()){apply({type:"check_failed"});return;}
    if (look.kind === "saved") { release(write.custody.key); apply({ type: "saved", receipt: look.receipt }); }
    else apply({ type: look.kind === "none" ? "no_receipt" : "check_failed" });
  }
  function resend() {
    const write = latest.current.write;
    if (write.phase !== "unknown") return;
    if(!hasLease()){retire();return;}
    // The original bytes and key, exactly as first sent.
    apply({ type: "send", custody: write.custody }); void post(write.custody);
  }

  const back = { href: runId ? `/app/payroll/review?run=${encodeURIComponent(runId)}` : "/app/payroll", label: runId ? copy.imp.reviewBack : copy.common.payroll };
  const title = correction ? copy.imp.titleCorrection : copy.imp.title;
  const frame = (step: number, onBack: (() => void) | null, children: ReactNode) => <>
    <FlowHead copy={copy} title={title} titleId={TITLE_ID} back={back} step={step} steps={copy.imp.steps} onBack={onBack} />
    <form className="c-teamform pim" data-wide={step === 2 || step === 3 ? "" : undefined} noValidate onSubmit={event => event.preventDefault()} aria-labelledby={TITLE_ID}>{periodLabel ? <p className="pim-eyebrow">{`${copy.imp.confirm.period} · ${periodLabel}`}</p> : null}{children}</form>
  </>;

  if (loaded.state === "loading") return frame(0, null, <Skeleton label={copy.common.loading} />);
  if (loaded.state === "failed") return frame(0, null, loaded.why === "network"
    ? <StopCard kind={offline ? "offline" : "failed"} alert title={offline ? copy.common.offlineTitle : copy.common.loadFailedTitle} line={offline ? copy.common.offlineLine : copy.common.loadFailedLine} action={{ label: copy.common.tryAgain, onClick: () => { setLoaded({ state: "loading" }); void load(); } }} />
    : <StopCard title={loaded.why === "denied" ? copy.common.deniedTitle : copy.common.signedOutTitle} line={loaded.why === "denied" ? copy.common.deniedLine : copy.common.signedOutLine} action={loaded.why === "denied" ? { label: copy.imp.hold.missing.action, href: "/app/payroll" } : { label: copy.common.signIn, href: "/login" }} />);
  const custody = holdsCustody(work.write) || work.write.phase === "saved";
  const hold = custody ? null : !runId ? { ...copy.imp.hold.noRun, href: "/app/payroll" } : !run ? { ...copy.imp.hold.missing, href: "/app/payroll" } : run.sourceAuthority === "NATIVE_RECORDED_TIME" ? { ...copy.imp.hold.native, href: back.href }
    : !roster.length ? { ...copy.imp.hold.noTeam, href: "/app/employees" } : roster.length > PEOPLE_MAX ? { ...copy.imp.hold.tooManyPeople, href: "/app/payroll" } : otherPending ? { ...copy.imp.hold.pending, href: back.href } : null;
  // Phase 8 (a.md #9): nothing chosen yet is the empty kind (the tray), not a lock.
  if (hold) return frame(0, null, <StopCard kind={!runId ? "empty" : "locked"} title={hold.title} line={hold.line} action={{ label: hold.action, href: hold.href }} />);

  const step = work.step, a = copy.imp.add;
  const sourceBad = { sourceName: !validSourceText(work.source.sourceName), sourceReference: !validSourceText(work.source.sourceReference) };
  const mismatch = draft && run && periodMismatch(draft, run) ? a.periodMismatch(periodLabel, paydayLabel) : null;
  const why1 = !draft ? a.needFile : mismatch ? mismatch : draft.kind === "csv" && (sourceBad.sourceName || sourceBad.sourceReference) ? a.needSource : correction && !validReason(work.reason) ? a.needReason : null;
  const notices = <>
    <p className="c-sr" role="status" aria-live="polite">{copy.common.stepOf(step, copy.imp.steps.length, copy.imp.steps[step - 1])}</p>
    {offline && step < 5 ? <OfflineNote copy={copy} /> : null}
    {work.changes.length && step < 5 ? <ChangedNotice copy={copy} changes={work.changes} onDismiss={() => setWork(value => ({ ...value, changes: [] }))} /> : null}
  </>;

  if (!custody && (step === 1 || !draft || !matchReview || !amountReview)) return frame(1, null, <>
    {notices}
    <AddFileStep copy={copy} headingId={HEADING_ID} periodLabel={periodLabel} draft={draft} problem={work.problem} reading={reading} source={work.source} correction={correction} reason={work.reason}
      sourceErrors={touched && draft?.kind === "csv" ? sourceBad : undefined} reasonError={touched && correction && !validReason(work.reason)} mismatch={mismatch}
      onFile={file => void chooseFile(file)} onSource={source => setWork(value => ({ ...value, source }))} onReason={reason => setWork(value => ({ ...value, reason }))} onStarter={starter} />
    <StepActions id="pim-s1" primary={{ label: a.next, why: why1, onClick: () => go(2), onBlocked: () => setTouched(true) }} secondary={{ label: copy.common.cancel, href: back.href }} />
  </>);

  if (step === 2 && draft && matchReview) return frame(2, () => go(1), <>
    {notices}
    <MatchStep copy={copy} lang={lang} headingId={HEADING_ID} review={matchReview} roster={roster} onStarter={starter}
      onMatch={(row: FileRow, personId) => setWork(value => ({ ...value, matches: { ...value.matches, [row.index]: personId } }))}
      onDisposition={(personId, disposition) => setWork(value => ({ ...value, dispositions: { ...value.dispositions, [personId]: disposition } }))} />
    <StepActions id="pim-s2" primary={{ label: copy.imp.match.next, why: matchReview.complete ? null : copy.imp.match.blocked(matchReview.unmatched, matchReview.twice, matchReview.undecided), onClick: () => go(3) }}
      secondary={{ label: copy.common.back, onClick: () => go(1) }} />
  </>);

  if (step === 3 && draft && amountReview && matchReview) return frame(3, () => go(2), <>
    {notices}
    <ReviewStep copy={copy} lang={lang} headingId={HEADING_ID} review={amountReview} rows={draft.rows} editing={editing} onEdit={setEditing}
      onCorrect={(row, field, minor) => setWork(value => ({ ...value, corrections: correct(value.corrections, row, field, minor) }))} />
    <StepActions id="pim-s3" primary={{ label: copy.imp.review.next, why: !matchReview.complete ? copy.imp.match.blocked(matchReview.unmatched, matchReview.twice, matchReview.undecided) : amountReview.ready ? null : copy.imp.review.blocked(amountReview.unbalanced), onClick: () => go(4) }}
      secondary={{ label: copy.common.back, onClick: () => go(2) }} />
  </>);

  if (step === 4 && plan && run && draft && amountReview) return frame(4, () => go(3), <>
    {notices}
    <ConfirmStep copy={copy} lang={lang} headingId={HEADING_ID} plan={plan} review={amountReview} draft={draft} source={work.source} periodLabel={periodLabel} paydayLabel={paydayLabel} correction={correction} reason={work.reason} tooBig={frozen?.tooBig} />
    <StepActions id="pim-s4" primary={{ label: correction ? copy.imp.confirm.saveCorrection : copy.imp.confirm.save, onClick: save,
      why: offline ? copy.common.offlineLine : frozen?.tooBig ? copy.imp.confirm.tooBig : !amountReview.ready ? copy.imp.review.blocked(amountReview.unbalanced) : why1 }} secondary={{ label: copy.common.back, onClick: () => go(3) }} />
  </>);
  if (step === 4 && matchReview) return frame(3, () => go(2), <StopCard kind="paused" title={copy.imp.changed.title} line={copy.imp.match.blocked(matchReview.unmatched, matchReview.twice, matchReview.undecided)} action={{ label: copy.imp.result.fix.match, onClick: () => go(2) }} />);

  return frame(5, null, <>
    <p className="c-sr" role="status" aria-live="polite">{copy.common.stepOf(5, copy.imp.steps.length, copy.imp.steps[4])}</p>
    {work.changes.length && work.write.phase === "refused" ? <ChangedNotice copy={copy} changes={work.changes} onDismiss={() => setWork(value => ({ ...value, changes: [] }))} /> : null}
    <ResultStep copy={copy} headingId={HEADING_ID} write={work.write} correction={correction || (work.write.phase === "saved" && work.write.receipt.action === "CORRECT")} people={work.sentPeople} periodLabel={periodLabel} offline={offline}
      links={{ review: id => `/app/payroll/review?run=${encodeURIComponent(id ?? runId ?? "")}`, included: run ? `/app/payroll-export?start=${run.period.startDate}&end=${run.period.endDate}#who-is-included` : "/app/payroll-export",
        timecards: run ? `/app/timecards?start=${run.period.startDate}&end=${run.period.endDate}` : "/app/timecards", settings: "/app/settings/payroll", payroll: "/app/payroll" }}
      onCheck={() => void check()} onResend={resend} onFix={target => go(target === "file" ? 1 : target === "match" ? 2 : 3)} />
  </>);
}
