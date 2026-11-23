"use client";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import type { Period } from "@/lib/timecards/project";
import {stableExportJson} from '@/lib/payroll-export/json';
import { formatRecordedHours } from "@/lib/timecards/project";
import type { readPeriodClose, MemberReview } from "@/lib/period-close/service";
import { MobileHomeDisclosure } from "./mobile-home-disclosure";
import { payrollReviewIssues, payrollReviewState } from "./payroll-review-copy";
import { PeriodCloseHistory } from "./period-close-history";
type Review = Awaited<ReturnType<typeof readPeriodClose>>;
type PendingCommand = { action: string; command: unknown };
/** `startOpen` (AR-4, Nov 14 inspection): the page was opened from Payroll's blocker, so a phone shows the list at once
 * instead of behind its "Choose who’s included" disclosure. */
type Props={period:Period;actorId:string;startOpen?:boolean};
/** AR-4: plain words for this tool's labels and notices. Commands, payloads and what the server checks are unchanged. */
const LOADING='Loading the list of people…',OUT_OF_DATE='This list is out of date. Refresh it to see current data.';
const EVENT_LABELS:Record<string,string>={ARTIFACT_SERVED:'Download requested',REPORTED_SUBMITTED:'Marked as sent',REPORTED_IMPORTED:'Marked as imported'};
/** A stored timestamp ("2026-11-14 23:35:01+00") as "Nov 14, 2026, 7:35 PM"; the stored text if it can't be read. */
const whenText=(value:string)=>{const date=new Date(value.replace(' ','T').replace(/([+-]\d{2})$/,'$1:00'));return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(date);};
/** The list sits behind a phone disclosure, except when the page was opened for it (AR-4). */
function ListDisclosure({open,children,...rest}:ComponentProps<typeof MobileHomeDisclosure>&{open:boolean}){
  return open?<>{children}</>:<MobileHomeDisclosure {...rest}>{children}</MobileHomeDisclosure>;
}
/** What makes a population review a different one: the source and export identity, the population and its revision,
 * the members with their facts, and saved runs. A member's recordedNanoseconds and breakNanoseconds are left out: with
 * someone clocked in they count up to each read's own observedAt, so they move on every refresh while nothing changed.
 * Keying on them remounted the form every 10 s and cleared typed dispositions, reasons and selections (Jose, Nov 23). */
export function populationIdentity(result:{members:readonly object[]}&Record<string,unknown>){
  return stableExportJson({...result,members:result.members.map(member=>{const {recordedNanoseconds:_recorded,breakNanoseconds:_break,...rest}=member as Record<string,unknown>;return rest;})});
}
export function PayrollPeriodClose(props:Props){
  return <PeriodCloseView key={JSON.stringify([props.actorId,props.period.startDate,props.period.endDate])} {...props}/>;
}
function PeriodCloseView({period,actorId,startOpen=false}:Props) {
  const [review, setReview] = useState<Review | null>(null),
    [notice, setNotice] = useState(LOADING),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [retry, setRetry] = useState<PendingCommand | null>(null),
    [recoveryReady, setRecoveryReady] = useState(false);
  const recoveryKey = `nevora-period-pending:${actorId}:${period.startDate}:${period.endDate}`;
  const generation = useRef({ value: 0 });
  const active=useRef(false),reading=useRef(false),mutating=useRef(false),sequence=useRef(0);
  const request=useRef<AbortController|null>(null),deadline=useRef(0),sourceKey=useRef<string|null>(null);
  const expiry=useRef<ReturnType<typeof setTimeout>|null>(null),early=useRef<ReturnType<typeof setTimeout>|null>(null),readTimeout=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [viewKey,setViewKey]=useState('');
  const cancelRead=useCallback(()=>{sequence.current++;request.current?.abort();reading.current=false;if(readTimeout.current)clearTimeout(readTimeout.current);readTimeout.current=null;},[]);
  const retire=useCallback((message:string)=>{generation.current.value++;cancelRead();if(expiry.current)clearTimeout(expiry.current);if(early.current)clearTimeout(early.current);expiry.current=early.current=null;deadline.current=0;sourceKey.current=null;mutating.current=false;setReview(null);setViewKey('');setSelected([]);setBusy(false);setNotice(message);},[cancelRead]);
  const post = useCallback(
    async (action: string, command: unknown, signal?:AbortSignal) =>
      fetch("/api/period-close", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          "x-nevora-period-close": "1",
          "x-nevora-actor": actorId,
        },
        body: JSON.stringify({ action, command }),
        ...(signal?{signal}:{}),
      }),
    [actorId],
  );
  const load = useCallback(async function loadProjection(background=false):Promise<boolean>{
    await Promise.resolve();
    if(!active.current||document.visibilityState==='hidden'||!navigator.onLine)return false;
    if(background&&(reading.current||mutating.current))return false;
    const preserve=background&&sourceKey.current!==null&&performance.now()<deadline.current;
    if(!preserve)retire(LOADING);
    const own=generation.current.value,n=++sequence.current,started=performance.now(),abort=new AbortController();request.current=abort;reading.current=true;
    const current=()=>active.current&&own===generation.current.value&&n===sequence.current;
    // This Company-only legacy DTO has no lease metadata. The request-start
    // maximum includes server work, transit, parsing and comparison time.
    readTimeout.current=setTimeout(()=>{if(current())retire(OUT_OF_DATE);},15000);
    try{
      const response=await post('READ',period,abort.signal),body=await response.json();
      if(!current())return false;
      if(!response.ok||body.state!=='ready'||!body.result||body.result.period?.startDate!==period.startDate||body.result.period?.endDate!==period.endDate||typeof body.result.sourceHash!=='string'||!Array.isArray(body.result.members)||!Array.isArray(body.result.manifests)||!Array.isArray(body.result.exports))throw Error('Population unavailable');
      const key=populationIdentity(body.result),remaining=started+15000-performance.now();
      if(remaining<1||(preserve&&performance.now()>=deadline.current))throw Error('Population expired');
      if(!preserve||key!==sourceKey.current){setSelected([]);setViewKey(key);}
      if(expiry.current)clearTimeout(expiry.current);if(early.current)clearTimeout(early.current);
      sourceKey.current=key;deadline.current=started+15000;
      expiry.current=setTimeout(()=>retire(OUT_OF_DATE),remaining);
      early.current=setTimeout(()=>void loadProjection(true),remaining*.65);
      setReview(body.result);setNotice('Check everyone on the list, including inactive accounts and people with no hours.');
      return true;
    }catch{if(current())retire('We couldn’t load the list. Refresh it to try again.');return false;}
    finally{if(current()){if(readTimeout.current)clearTimeout(readTimeout.current);readTimeout.current=null;reading.current=false;}}
  },[post,period,retire]);
  useEffect(()=>{
    let mounted=true;
    const lifecycle=generation.current;
    const recover=()=>{try{const saved=localStorage.getItem(recoveryKey),original:PendingCommand|null=saved?JSON.parse(saved):null;
      if(original&&(!['POPULATION','MANIFEST','HANDOFF'].includes(original.action)||!original.command||typeof original.command!=='object'))throw Error('Recovery unavailable');
      setRetry(original);setRecoveryReady(true);return true;
    }catch{setRecoveryReady(false);setNotice('Browser storage is off. Turn it on before saving changes here.');return false;}};
    const paused=(event?:Event)=>{if(event?.type==='blur'&&event.target!==window)return;active.current=false;retire('Paused while you were away. Refresh the list to continue.');};
    const sync=(event?:Event)=>{if(event?.type==='focus'&&(event.target!==window||active.current))return;
      active.current=document.visibilityState!=='hidden'&&navigator.onLine;
      if(!active.current){paused();return;}if(recover())void load();};
    const visible=()=>document.visibilityState==='hidden'?paused():sync();
    const initialLoad=window.setTimeout(()=>{if(mounted)sync();},0);
    const poll=window.setInterval(()=>{if(active.current&&document.visibilityState==='visible'&&navigator.onLine)void load(true);},30000);
    for(const event of ['blur','offline','pagehide'])window.addEventListener(event,paused);
    for(const event of ['focus','online','pageshow','storage'])window.addEventListener(event,sync);
    document.addEventListener('visibilitychange',visible);
    return()=>{mounted=false;active.current=false;window.clearTimeout(initialLoad);window.clearInterval(poll);lifecycle.value++;cancelRead();if(expiry.current)clearTimeout(expiry.current);if(early.current)clearTimeout(early.current);deadline.current=0;sourceKey.current=null;
      for(const event of ['blur','offline','pagehide'])window.removeEventListener(event,paused);
      for(const event of ['focus','online','pageshow','storage'])window.removeEventListener(event,sync);
      document.removeEventListener('visibilitychange',visible);};
  },[load,recoveryKey,retire,cancelRead]);
  const send = async (action: string, command: unknown) => {
    if (busy || mutating.current || !recoveryReady) return;
    if(!active.current||!sourceKey.current||performance.now()>=deadline.current){retire('This list is out of date. Refresh it before saving.');return;}
    cancelRead();const own=generation.current.value;
    let pending: PendingCommand;
    try {
      const saved = localStorage.getItem(recoveryKey);
      pending = saved ? JSON.parse(saved) : retry ?? { action, command };
      localStorage.setItem(recoveryKey, JSON.stringify(pending));
    } catch {
      setNotice("We couldn’t keep a copy of this change, so nothing was sent. Try again.");
      return;
    }
    setRetry(pending);
    mutating.current=true;setBusy(true);
    try {
      const response = await post(pending.action, pending.command),
        body = await response.json();
      if(!active.current||own!==generation.current.value)return;
      if (response.status === 400 || response.status === 409) {
        localStorage.removeItem(recoveryKey);
        setRetry(null);
        // AR-4: the server's conflict line speaks of "population" and "export coverage"; its other messages show as sent.
        setNotice(body.state === "conflict" ? "Something changed while you were working. Refresh the list and check it again." : body.message);
        return;
      }
      if (!response.ok || body.state !== "ready") throw Error();
      localStorage.removeItem(recoveryKey);
      setRetry(null);
      const loaded=await load();
      if(!loaded)return;
      setNotice(
        pending.action === "HANDOFF"
          ? "Saved. NEVORA can’t confirm your provider imported it."
          : "Saved.",
      );
    } catch {
      if(!active.current||own!==generation.current.value)return;
      setNotice(
        "We couldn’t confirm that was saved. Try again before changing anything else.",
      );
    } finally {
      if(active.current&&own===generation.current.value){mutating.current=false;setBusy(false);}
    }
  };
  return (
    <section className="panel">
      <h2>Who’s in this payroll</h2>
      <p>
        Choose what to do with each person for this period. An active account
        doesn’t say when someone started or left, so note that here. Nothing
        you save here runs payroll.
      </p>
      <p role="status">{notice}</p>
      <button
        className="button secondary"
        type="button"
        disabled={busy}
        onClick={() => void load()}
      >
        Refresh the list
      </button>
      {retry && (
        <button
          className="button primary"
          type="button"
          disabled={busy || review===null}
          onClick={() => void send(retry.action, retry.command)}
        >
          Try again
        </button>
      )}
      <ListDisclosure open={startOpen} id="mobile-payroll-population" label="Choose who’s included" expandedLabel="Hide the list"
        available={Boolean(review) && !busy && !retry}
        summary={review && !busy && !retry ? <p>{review.members.length} people in this period.</p> : undefined}>
      {review && (
        <div key={viewKey}>
          <form
            className="employee-form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const members: MemberReview[] = review.members.map((m) => ({
                employeeId: m.employeeId,
                disposition: String(
                  data.get(`${m.employeeId}.disposition`),
                ) as MemberReview["disposition"],
                reason: String(data.get(`${m.employeeId}.reason`) ?? ""),
                employmentFacts: String(
                  data.get(`${m.employeeId}.employment`) ?? "",
                ),
                employmentBasis: "MANAGER_ATTESTED",
              }));
              void send("POPULATION", {
                ...period,
                operationId: crypto.randomUUID(),
                expectedRevision: review.population?.revision ?? 0,
                sourceHash: review.sourceHash,
                members,
              });
            }}
          >
            {review.members.map((member) => {
              const saved = review.population?.members.find(
                (m) => m.employeeId === member.employeeId,
              );
              return (
                <fieldset
                  key={member.employeeId}
                  disabled={!recoveryReady || busy || retry !== null}
                >
                  <legend>
                    {member.name} ·{" "}
                    {member.active ? "Active account" : "Inactive account"}
                  </legend>
                  <p>
                    {payrollReviewState(member.cardState)} ·{" "}
                    {formatRecordedHours(member.recordedNanoseconds)} recorded ·{" "}
                    {member.hasPeriodEvidence
                      ? "Has time or timecard history this period"
                      : "No time or timecard history this period"}
                    {member.issues.length ? ` · Needs review: ${payrollReviewIssues(member.issues)}` : null}
                  </p>
                  {!member.active && (
                    <p>
                      ADP RUN files can’t include inactive accounts. Use the
                      CSV file or a custom layout for this person, so they
                      aren’t left out by accident.
                    </p>
                  )}
                  <label>
                    What to do with this period{" "}
                    <select
                      required
                      name={`${member.employeeId}.disposition`}
                      defaultValue={saved?.disposition ?? ""}
                    >
                      <option value="" disabled>
                        Choose one
                      </option>
                      <option value="INCLUDE">
                        Include their finalized hours
                      </option>
                      <option value="ZERO_TIME">
                        No hours this period
                      </option>
                      <option value="EXCLUDE">
                        Leave out, with a reason
                      </option>
                    </select>
                  </label>
                  <label>
                    Reason{" "}
                    <input
                      required
                      maxLength={600}
                      name={`${member.employeeId}.reason`}
                      defaultValue={saved?.reason ?? ""}
                    />
                  </label>
                  <label>
                    Employment this period, as you know it (say if they
                    started or left){" "}
                    <textarea
                      required
                      maxLength={600}
                      name={`${member.employeeId}.employment`}
                      defaultValue={saved?.employmentFacts ?? ""}
                    />
                  </label>
                </fieldset>
              );
            })}
            <button
              className="button primary"
              disabled={!recoveryReady || busy || retry !== null}
              type="submit"
            >
              Save this list
            </button>
          </form>
          <h3>Match your export files</h3>
          <p>
            List version {review.population?.revision ?? 0}. Select the export
            files that cover each included person exactly once. People with no
            hours and people you left out stay on the period record.
          </p>
          {review.exports.map((e) => (
            <label key={e.actorId + e.operationId}>
              <input
                type="checkbox"
                disabled={!recoveryReady || busy || retry !== null}
                checked={selected.includes(e.actorId + ":" + e.operationId)}
                onChange={(event) =>
                  setSelected((values) =>
                    event.target.checked
                      ? [...values, e.actorId + ":" + e.operationId]
                      : values.filter(
                          (v) => v !== e.actorId + ":" + e.operationId,
                        ),
                  )
                }
              />
              {e.profileName} · {e.employeeIds.length} employees ·{" "}
              {e.operationId}
            </label>
          ))}
          <button
            className="button primary"
            type="button"
            disabled={
              busy ||
              !recoveryReady ||
              retry !== null ||
              !review.population ||
              review.manifests.some(
                (m) => m.populationRevision === review.population?.revision,
              )
            }
            onClick={() =>
              void send("MANIFEST", {
                ...period,
                operationId: crypto.randomUUID(),
                populationRevision: review.population?.revision,
                receipts: review.exports
                  .filter((e) =>
                    selected.includes(e.actorId + ":" + e.operationId),
                  )
                  .map((e) => ({
                    actorId: e.actorId,
                    operationId: e.operationId,
                  })),
              })
            }
          >
            Save period record
          </button>
          {review.manifests.some(
            (m) => m.populationRevision === review.population?.revision,
          ) && (
            <p>
              This version of the list already has a period record below. If
              something changed, save the list again before making another.
            </p>
          )}
          <h3>Period records</h3>
          {review.manifests.map((m) => (
            <article className="panel" key={m.id}>
              <h4>
                {m.current
                  ? "Matches the current list"
                  : "Older record, made before the list changed"}
              </h4>
              <p>
                List version {m.populationRevision} ·{" "}
                {formatRecordedHours(m.totals.recordedNanoseconds)} recorded
              </p>
              <details>
                <summary>Record fingerprint</summary>
                <code style={{ overflowWrap: "anywhere" }}>{m.hash}</code>
              </details>
              <a
                className="button secondary"
                href={`/api/period-close/artifact?id=${m.id}&format=manifest`}
              >
                Download period record
              </a>
              {m.exports.map((e) => (
                <div key={e.index}>
                  <a
                    href={`/api/period-close/artifact?id=${m.id}&format=csv&index=${e.index}`}
                  >
                    Download CSV file {e.index + 1}
                  </a>{" "}
                  ·{" "}
                  <a
                    href={`/api/period-close/artifact?id=${m.id}&format=canonical&index=${e.index}`}
                  >
                    Download time record {e.index + 1} (JSON)
                  </a>
                  <details>
                    <summary>CSV fingerprint</summary>
                    <code style={{ overflowWrap: "anywhere" }}>
                      {e.csvSha256}
                    </code>
                  </details>
                </div>
              ))}
              <p>
                NEVORA records each download request. It can’t confirm the file
                finished downloading.
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  void send("HANDOFF", {
                    operationId: crypto.randomUUID(),
                    manifestId: m.id,
                    destination: data.get("destination"),
                    reference: data.get("reference"),
                    kind: data.get("kind"),
                  });
                }}
              >
                <fieldset disabled={!recoveryReady || busy || retry !== null || !m.current}>
                  <legend>Note where you sent the files</legend>
                  <label>
                    Sent to{" "}
                    <input required name="destination" maxLength={600} />
                  </label>
                  <label>
                    Their reference or confirmation number{" "}
                    <input required name="reference" maxLength={600} />
                  </label>
                  <label>
                    Status{" "}
                    <select name="kind">
                      <option value="REPORTED_SUBMITTED">
                        I sent the files
                      </option>
                      <option value="REPORTED_IMPORTED">
                        They imported the files (not checked by NEVORA)
                      </option>
                    </select>
                  </label>
                  <button className="button secondary" type="submit">
                    Save note
                  </button>
                </fieldset>
                <p>
                  NEVORA isn’t connected to your provider, so it can’t confirm
                  the import or that payroll ran.
                </p>
              </form>
              <h4>Latest downloads and notes</h4>
              <p>{m.eventCoverage.returnedEvents} of {m.eventCoverage.totalEvents} events in this summary. {m.eventCoverage.complete ? 'All events for this manifest are shown.' : 'Latest event of each kind only. Load full period history below for older events.'}</p>
              <ul>
                {m.events.map((event) => (
                  <li key={event.id}>
                    {EVENT_LABELS[event.kind] ?? "Recorded"} · {whenText(event.createdAt)} ·
                    by {review.members.find((member) => member.employeeId === event.actorId)?.name ?? "someone on your team"}
                    {event.payload.destination && (
                      <p>
                        {event.payload.destination} · reference{" "}
                        {event.payload.reference} · Reported by a manager. Not
                        confirmed by the provider.
                      </p>
                    )}
                    {event.payload.filename && (
                      <p>
                        {event.payload.filename} · Download not confirmed.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
      {/* Gap closure (Nov 23, 2026, QA trace-1): saved runs sit outside the keyed view. Someone clocked in changes every
        * READ (their open interval counts up to observedAt), so the key above changes on each early refresh; inside it,
        * the history and its loaded pages were remounted every 10 s. */}
      {review && review.manifests.length > 0 && <PeriodCloseHistory period={period} actorId={actorId} />}
      </ListDisclosure>
    </section>
  );
}
