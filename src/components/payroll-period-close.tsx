"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Period } from "@/lib/timecards/project";
import {stableExportJson} from '@/lib/payroll-export/json';
import { formatRecordedHours } from "@/lib/timecards/project";
import type { readPeriodClose, MemberReview } from "@/lib/period-close/service";
import { MobileHomeDisclosure } from "./mobile-home-disclosure";
import { payrollReviewIssues, payrollReviewState } from "./payroll-review-copy";
type Review = Awaited<ReturnType<typeof readPeriodClose>>;
type PendingCommand = { action: string; command: unknown };
type Props={period:Period;actorId:string};
export function PayrollPeriodClose(props:Props){
  return <PeriodCloseView key={JSON.stringify([props.actorId,props.period.startDate,props.period.endDate])} {...props}/>;
}
function PeriodCloseView({period,actorId}:Props) {
  const [review, setReview] = useState<Review | null>(null),
    [notice, setNotice] = useState("Loading complete population"),
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
    if(!preserve)retire('Loading complete population');
    const own=generation.current.value,n=++sequence.current,started=performance.now(),abort=new AbortController();request.current=abort;reading.current=true;
    const current=()=>active.current&&own===generation.current.value&&n===sequence.current;
    // This Company-only legacy DTO has no lease metadata. The request-start
    // maximum includes server work, transit, parsing and comparison time.
    readTimeout.current=setTimeout(()=>{if(current())retire('Population expired. Reload to review current data.');},15000);
    try{
      const response=await post('READ',period,abort.signal),body=await response.json();
      if(!current())return false;
      if(!response.ok||body.state!=='ready'||!body.result||body.result.period?.startDate!==period.startDate||body.result.period?.endDate!==period.endDate||typeof body.result.sourceHash!=='string'||!Array.isArray(body.result.members)||!Array.isArray(body.result.manifests)||!Array.isArray(body.result.exports))throw Error('Population unavailable');
      const key=stableExportJson(body.result),remaining=started+15000-performance.now();
      if(remaining<1||(preserve&&performance.now()>=deadline.current))throw Error('Population expired');
      if(!preserve||key!==sourceKey.current){setSelected([]);setViewKey(key);}
      if(expiry.current)clearTimeout(expiry.current);if(early.current)clearTimeout(early.current);
      sourceKey.current=key;deadline.current=started+15000;
      expiry.current=setTimeout(()=>retire('Population expired. Reload to review current data.'),remaining);
      early.current=setTimeout(()=>void loadProjection(true),remaining*.65);
      setReview(body.result);setNotice('Review the complete roster, including inactive and zero-time employees.');
      return true;
    }catch{if(current())retire('Population unavailable. Reload to try again.');return false;}
    finally{if(current()){if(readTimeout.current)clearTimeout(readTimeout.current);readTimeout.current=null;reading.current=false;}}
  },[post,period,retire]);
  useEffect(()=>{
    let mounted=true;
    const lifecycle=generation.current;
    const recover=()=>{try{const saved=localStorage.getItem(recoveryKey),original:PendingCommand|null=saved?JSON.parse(saved):null;
      if(original&&(!['POPULATION','MANIFEST','HANDOFF'].includes(original.action)||!original.command||typeof original.command!=='object'))throw Error('Recovery unavailable');
      setRetry(original);setRecoveryReady(true);return true;
    }catch{setRecoveryReady(false);setNotice('Recovery storage unavailable. Enable browser storage before saving payroll period changes.');return false;}};
    const paused=(event?:Event)=>{if(event?.type==='blur'&&event.target!==window)return;active.current=false;retire('Population paused. Reload to review current data.');};
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
    if(!active.current||!sourceKey.current||performance.now()>=deadline.current){retire('Population expired. Reload before sending a period command.');return;}
    cancelRead();const own=generation.current.value;
    let pending: PendingCommand;
    try {
      const saved = localStorage.getItem(recoveryKey);
      pending = saved ? JSON.parse(saved) : retry ?? { action, command };
      localStorage.setItem(recoveryKey, JSON.stringify(pending));
    } catch {
      setNotice("Could not retain the original command. No payroll period change was sent.");
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
        setNotice(body.message);
        return;
      }
      if (!response.ok || body.state !== "ready") throw Error();
      localStorage.removeItem(recoveryKey);
      setRetry(null);
      const loaded=await load();
      if(!loaded)return;
      setNotice(
        pending.action === "HANDOFF"
          ? "Handoff report saved. Provider import and payroll processing remain unverified."
          : "Saved with an immutable operation receipt.",
      );
    } catch {
      if(!active.current||own!==generation.current.value)return;
      setNotice(
        "Outcome unconfirmed. Retry the original command before starting another.",
      );
    } finally {
      if(active.current&&own===generation.current.value){mutating.current=false;setBusy(false);}
    }
  };
  return (
    <section className="panel">
      <h2>Complete payroll population and handoff</h2>
      <p>
        Account creation and active status are not employment start or end
        dates. Review period employment facts for every member. Preparing a
        manifest does not mean payroll is processed.
      </p>
      <p role="status">{notice}</p>
      <button
        className="button secondary"
        type="button"
        disabled={busy}
        onClick={() => void load()}
      >
        Reload population
      </button>
      {retry && (
        <button
          className="button primary"
          type="button"
          disabled={busy || review===null}
          onClick={() => void send(retry.action, retry.command)}
        >
          Retry original period command
        </button>
      )}
      <MobileHomeDisclosure id="mobile-payroll-population" label="Review payroll population" expandedLabel="Close population details"
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
                    <span className="desktop-payroll-review-copy">{member.cardState}</span>
                    <span className="mobile-payroll-review-copy">{payrollReviewState(member.cardState)}</span> ·{" "}
                    {formatRecordedHours(member.recordedNanoseconds)} recorded ·{" "}
                    {member.hasPeriodEvidence
                      ? "Historical period evidence retained"
                      : "No recorded period evidence"}
                    {member.issues.length ? <>
                      <span className="desktop-payroll-review-copy">{` · Needs review: ${member.issues.join(", ")}`}</span>
                      <span className="mobile-payroll-review-copy">{` · Needs review: ${payrollReviewIssues(member.issues)}`}</span>
                    </> : null}
                  </p>
                  {!member.active && (
                    <p>
                      ADP RUN export is unavailable for inactive accounts.
                      Review a compatible neutral or custom export; do not drop
                      this member silently.
                    </p>
                  )}
                  <label>
                    Period disposition{" "}
                    <select
                      required
                      name={`${member.employeeId}.disposition`}
                      defaultValue={saved?.disposition ?? ""}
                    >
                      <option value="" disabled>
                        Review this member
                      </option>
                      <option value="INCLUDE">
                        Include finalized time in exports
                      </option>
                      <option value="ZERO_TIME">
                        Reviewed zero-time member
                      </option>
                      <option value="EXCLUDE">
                        Exclude with audited reason
                      </option>
                    </select>
                  </label>
                  <label>
                    Disposition reason{" "}
                    <input
                      required
                      maxLength={600}
                      name={`${member.employeeId}.reason`}
                      defaultValue={saved?.reason ?? ""}
                    />
                  </label>
                  <label>
                    Reviewed period employment facts (manager-attested; include
                    entrants/leavers){" "}
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
              Save reviewed population revision
            </button>
          </form>
          <h3>Reconcile export batches</h3>
          <p>
            Population revision {review.population?.revision ?? 0}. Select all
            original export batches covering included members exactly once.
            Zero-time members and audited exclusions remain in the manifest.
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
            Prepare verified manifest
          </button>
          {review.manifests.some(
            (m) => m.populationRevision === review.population?.revision,
          ) && (
            <p>
              This population revision already has a manifest below. If data
              changed, review and save a new population revision before
              preparing another.
            </p>
          )}
          <h3>Prepared manifests</h3>
          {review.manifests.map((m) => (
            <article className="panel" key={m.id}>
              <h4>
                {m.current
                  ? "Manifest matches current reviewed population"
                  : "Historical manifest — current data requires review"}
              </h4>
              <p>
                Population revision {m.populationRevision} ·{" "}
                {formatRecordedHours(m.totals.recordedNanoseconds)} recorded
              </p>
              <details>
                <summary>Manifest fingerprint</summary>
                <code style={{ overflowWrap: "anywhere" }}>{m.hash}</code>
              </details>
              <a
                className="button secondary"
                href={`/api/period-close/artifact?id=${m.id}&format=manifest`}
              >
                Retrieve saved manifest
              </a>
              {m.exports.map((e) => (
                <div key={e.index}>
                  <a
                    href={`/api/period-close/artifact?id=${m.id}&format=csv&index=${e.index}`}
                  >
                    Retrieve saved CSV batch {e.index + 1}
                  </a>{" "}
                  ·{" "}
                  <a
                    href={`/api/period-close/artifact?id=${m.id}&format=canonical&index=${e.index}`}
                  >
                    Retrieve canonical JSON batch {e.index + 1}
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
                Server artifact responses are recorded. Browser file completion
                is unverified.
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
                  <legend>Record manual downstream handoff</legend>
                  <label>
                    Destination{" "}
                    <input required name="destination" maxLength={600} />
                  </label>
                  <label>
                    External reference{" "}
                    <input required name="reference" maxLength={600} />
                  </label>
                  <label>
                    Reported state{" "}
                    <select name="kind">
                      <option value="REPORTED_SUBMITTED">
                        Reported submitted
                      </option>
                      <option value="REPORTED_IMPORTED">
                        Reported imported (unverified)
                      </option>
                    </select>
                  </label>
                  <button className="button secondary" type="submit">
                    Save handoff report
                  </button>
                </fieldset>
                <p>
                  No connected provider verifies import or payroll processing.
                </p>
              </form>
              <h4>Artifact and handoff history</h4>
              <ul>
                {m.events.map((event, i) => (
                  <li key={i}>
                    {event.kind.replaceAll("_", " ")} · {event.createdAt} ·
                    actor {event.actorId}
                    {event.payload.destination && (
                      <p>
                        {event.payload.destination} · reference{" "}
                        {event.payload.reference} · Manager reported, provider
                        verification unavailable.
                      </p>
                    )}
                    {event.payload.filename && (
                      <p>
                        {event.payload.filename} · Browser file completion
                        unverified.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
      </MobileHomeDisclosure>
    </section>
  );
}
