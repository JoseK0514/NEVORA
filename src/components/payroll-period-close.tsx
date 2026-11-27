"use client";
import { wholeSpanishTimes } from '@/lib/i18n/whole-spanish-times';
import { usePortalLang } from '@/lib/i18n/portal-lang';
import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';
import { isPayrollExportDisabled } from "./payroll-export-availability";
import { copy } from './payroll-period-close-copy';
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
type Props={period:Period;actorId:string;startOpen?:boolean;exportsDisabled?:boolean;onExportsDisabled?:()=>void};
/** AR-4: plain words for this tool's labels and notices. Commands, payloads and what the server checks are unchanged. */
/** A stored timestamp ("2026-11-14 23:35:01+00") as "Nov 14, 2026, 7:35 PM"; the stored text if it can't be read. */
const whenText=(value:string,lang:keyof typeof copy)=>{const date=new Date(value.replace(' ','T').replace(/([+-]\d{2})$/,'$1:00'));return Number.isNaN(date.getTime())?value:lang==='es'?wholeSpanishTimes(new Intl.DateTimeFormat('es-PR',{dateStyle:'medium',timeStyle:'short',hour12:true}).format(date)):new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(date);};
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
const handoffConflict = Symbol('handoff conflict');
type PeriodNotice = string | typeof handoffConflict;
const focusNotice = (node: HTMLParagraphElement | null) => node?.focus();
function PeriodCloseView({period,actorId,startOpen=false,exportsDisabled=false,onExportsDisabled}:Props) {
  const lang = usePortalLang();
  const wording = copy[lang];
const LOADING=wording.loadingTheListOfPeople,OUT_OF_DATE=wording.thisListIsOutOfDateRefreshItToSee;
const EVENT_LABELS:Record<string,string>={ARTIFACT_SERVED:wording.downloadRequested,REPORTED_SUBMITTED:wording.markedAsSent,REPORTED_IMPORTED:wording.markedAsImported};

  const [review, setReview] = useState<Review | null>(null),
    [notice, setNotice] = useState<PeriodNotice>(LOADING),
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
  const retire=useCallback((message:PeriodNotice)=>{generation.current.value++;cancelRead();if(expiry.current)clearTimeout(expiry.current);if(early.current)clearTimeout(early.current);expiry.current=early.current=null;deadline.current=0;sourceKey.current=null;mutating.current=false;setReview(null);setViewKey('');setSelected([]);setBusy(false);setNotice(message);},[cancelRead]);
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
      setReview(body.result);setNotice(wording.checkEveryoneOnTheListIncludingInactiveAccountsAndPeople);
      return true;
    }catch{if(current())retire(wording.weCouldnTLoadTheListRefreshItToTry);return false;}
    finally{if(current()){if(readTimeout.current)clearTimeout(readTimeout.current);readTimeout.current=null;reading.current=false;}}
  },[post,period,retire,wording,LOADING,OUT_OF_DATE]);
  useEffect(()=>{
    let mounted=true;
    const lifecycle=generation.current;
    const recover=()=>{try{const saved=localStorage.getItem(recoveryKey),original:PendingCommand|null=saved?JSON.parse(saved):null;
      if(original&&(!['POPULATION','MANIFEST','HANDOFF'].includes(original.action)||!original.command||typeof original.command!=='object'))throw Error('Recovery unavailable');
      setRetry(original);setRecoveryReady(true);return true;
    }catch{setRecoveryReady(false);setNotice(wording.browserStorageIsOffTurnItOnBeforeSavingChanges);return false;}};
    const paused=(event?:Event)=>{if(event?.type==='blur'&&event.target!==window)return;active.current=false;retire(wording.pausedWhileYouWereAwayRefreshTheListToContinue);};
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
  },[load,recoveryKey,retire,cancelRead,wording]);
  const send = async (action: string, command: unknown) => {
    if (busy || mutating.current || !recoveryReady || (exportsDisabled && action!=="POPULATION")) return;
    if(!active.current||!sourceKey.current||performance.now()>=deadline.current){retire(wording.thisListIsOutOfDateRefreshItBeforeSaving);return;}
    cancelRead();const own=generation.current.value;
    let pending: PendingCommand;
    try {
      const saved = localStorage.getItem(recoveryKey);
      pending = saved ? JSON.parse(saved) : retry ?? { action, command };
      if (exportsDisabled && pending.action!=="POPULATION") return;
      localStorage.setItem(recoveryKey, JSON.stringify(pending));
    } catch {
      setNotice(wording.weCouldnTKeepACopyOfThisChangeSo);
      return;
    }
    setRetry(pending);
    mutating.current=true;setBusy(true);
    try {
      const response = await post(pending.action, pending.command),
        body = await response.json();
      if(!active.current||own!==generation.current.value)return;
      if (isPayrollExportDisabled(response.status,body)){
        // Preserve any previously uncertain command for the next enabled review.
        onExportsDisabled?.();
        return;
      }
      if (pending.action === "HANDOFF" && response.status === 409 && body?.state === "conflict") {
        localStorage.removeItem(recoveryKey);
        setRetry(null);
        retire(handoffConflict);
        return;
      }
      if (response.status === 400 || response.status === 409) {
        localStorage.removeItem(recoveryKey);
        setRetry(null);
        // AR-4: the server's conflict line speaks of "population" and "export coverage"; its other messages show as sent.
        setNotice(body.state === "conflict" ? wording.somethingChangedWhileYouWereWorkingRefreshTheListAnd : body.message);
        return;
      }
      if (!response.ok || body.state !== "ready") throw Error();
      localStorage.removeItem(recoveryKey);
      setRetry(null);
      const loaded=await load();
      if(!loaded)return;
      setNotice(
        (pending.action === "HANDOFF" ? wording.savedNEVORACanTConfirmYourProviderImportedIt : wording.saved),
      );
    } catch {
      if(!active.current||own!==generation.current.value)return;
      setNotice(
        wording.weCouldnTConfirmThatWasSavedTryAgainBefore,
      );
    } finally {
      if(active.current&&own===generation.current.value){mutating.current=false;setBusy(false);}
    }
  };
  async function downloadArtifact(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (busy || exportsDisabled || !active.current || performance.now()>=deadline.current) return;
    const own=generation.current.value;
    const current=()=>active.current && own===generation.current.value && performance.now()<deadline.current;
    const href=event.currentTarget.href;
    setBusy(true);
    try {
      const response=await fetch(href,{cache:"no-store",credentials:"same-origin"});
      if (!current()) return;
      if (response.status===403 && isPayrollExportDisabled(response.status,await response.json().catch(()=>null))){
        if(current())onExportsDisabled?.();
        return;
      }
      if (!response.ok) throw Error();
      const filename=/filename="([^"/]+)"/i.exec(response.headers.get("content-disposition")??"")?.[1];
      if (!filename) throw Error();
      const file=await response.blob();
      if (!current()) return;
      const url=URL.createObjectURL(file),link=document.createElement("a");
      link.href=url;link.download=filename;link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch { if(current())setNotice(wording.downloadFailed); }
    finally { if(current())setBusy(false); }
  }
  return (
    <section className="panel">
      <h2>{wording.whoSInThisPayroll}</h2>
      <p>{wording.chooseWhatToDoWithEachPersonForThisPeriod}</p>
      <p role="status" tabIndex={notice === handoffConflict ? -1 : undefined} ref={notice === handoffConflict ? focusNotice : undefined}>{notice === handoffConflict ? wording.handoffChanged : notice}</p>
      <button
        className="button secondary"
        type="button"
        disabled={busy}
        onClick={() => void load()}
      >{wording.refreshTheList}</button>
      {retry && (!exportsDisabled || retry.action==="POPULATION") && (
        <button
          className="button primary"
          type="button"
          disabled={busy || review===null}
          onClick={() => void send(retry.action, retry.command)}
        >{wording.tryAgain}</button>
      )}
      <ListDisclosure open={startOpen} id="mobile-payroll-population" label={wording.chooseWhoSIncluded} expandedLabel={wording.hideTheList}
        available={Boolean(review) && !busy && (!retry || exportsDisabled)}
        summary={review && !busy && !retry ? <p>{formatPortalCopy(wording.memberscountPeopleInThisPeriod, { membersCount: review.members.length })}</p> : undefined}>
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
                    {(member.active ? wording.activeAccount : wording.inactiveAccount)}
                  </legend>
                  <p>
                    {payrollReviewState(member.cardState, lang)} ·{" "}
                    {formatPortalCopy(wording.recordednanosecondsRecorded, { recordedNanoseconds: formatRecordedHours(member.recordedNanoseconds) })}
                    {(member.hasPeriodEvidence ? wording.hasTimeOrTimecardHistoryThisPeriod : wording.noTimeOrTimecardHistoryThisPeriod)}
                    {member.issues.length ? formatPortalCopy(wording.needsReviewIssues, { issues: payrollReviewIssues(member.issues, lang) }) : null}
                  </p>
                  {!member.active && (
                    <p>{wording.adpRUNFilesCanTIncludeInactiveAccountsUseThe}</p>
                  )}
                  <label>{wording.whatToDoWithThisPeriod}
                    <select
                      required
                      name={`${member.employeeId}.disposition`}
                      defaultValue={saved?.disposition ?? ""}
                    >
                      <option value="" disabled>{wording.chooseOne}</option>
                      <option value="INCLUDE">{wording.includeTheirFinalizedHours}</option>
                      <option value="ZERO_TIME">{wording.noHoursThisPeriod}</option>
                      <option value="EXCLUDE">{wording.leaveOutWithAReason}</option>
                    </select>
                  </label>
                  <label>{wording.reason}
                    <input
                      required
                      maxLength={600}
                      name={`${member.employeeId}.reason`}
                      defaultValue={saved?.reason ?? ""}
                    />
                  </label>
                  <label>{wording.employmentThisPeriodAsYouKnowItSayIfThey}
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
            >{wording.saveThisList}</button>
          </form>
          {!exportsDisabled&&<><h3>{wording.matchYourExportFiles}</h3>
          <p>{formatPortalCopy(wording.listVersionRevisionSelectTheExportFilesThatCoverEach, { revision: review.population?.revision ?? 0 })}</p>
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
              {formatPortalCopy(wording.profilenameEmployeeIdsCountEmployees, { profileName: e.profileName, employeeIdsCount: e.employeeIds.length })}
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
          >{wording.savePeriodRecord}</button>
          {review.manifests.some(
            (m) => m.populationRevision === review.population?.revision,
          ) && (
            <p>{wording.thisVersionOfTheListAlreadyHasAPeriodRecord}</p>
          )}
          </>}
          <h3>{wording.periodRecords}</h3>
          {review.manifests.map((m) => (
            <article className="panel" key={m.id}>
              <h4>
                {(m.current ? wording.matchesTheCurrentList : wording.olderRecordMadeBeforeTheListChanged)}
              </h4>
              <p>{formatPortalCopy(wording.listVersionPopulationRevision, { populationRevision: m.populationRevision })}
                {formatPortalCopy(wording.recordednanosecondsRecorded2, { recordedNanoseconds: formatRecordedHours(m.totals.recordedNanoseconds) })}</p>
              <details>
                <summary>{wording.recordFingerprint}</summary>
                <code style={{ overflowWrap: "anywhere" }}>{m.hash}</code>
              </details>
              {!exportsDisabled&&<><a
                className="button secondary"
                onClick={downloadArtifact} href={`/api/period-close/artifact?id=${m.id}&format=manifest`}
              >{wording.downloadPeriodRecord}</a>
              {m.exports.map((e) => (
                <div key={e.index}>
                  <a
                    onClick={downloadArtifact} href={`/api/period-close/artifact?id=${m.id}&format=csv&index=${e.index}`}
                  >{formatPortalCopy(wording.downloadCSVFileNumber, { number: e.index + 1 })}
                  </a>{" "}
                  ·{" "}
                  <a
                    onClick={downloadArtifact} href={`/api/period-close/artifact?id=${m.id}&format=canonical&index=${e.index}`}
                  >{formatPortalCopy(wording.downloadTimeRecordNumberJSON, { number: e.index + 1 })}</a>
                  <details>
                    <summary>{wording.csvFingerprint}</summary>
                    <code style={{ overflowWrap: "anywhere" }}>
                      {e.csvSha256}
                    </code>
                  </details>
                </div>
              ))}
              <p>{wording.nevoraRecordsEachDownloadRequestItCanTConfirmThe}</p>
              </>}
              {!exportsDisabled&&m.current&&<form
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
                  <legend>{wording.noteWhereYouSentTheFiles}</legend>
                  <label>{wording.sentTo}
                    <input required name="destination" maxLength={600} />
                  </label>
                  <label>{wording.theirReferenceOrConfirmationNumber}
                    <input required name="reference" maxLength={600} />
                  </label>
                  <label>{wording.status}
                    <select name="kind">
                      <option value="REPORTED_SUBMITTED">{wording.iSentTheFiles}</option>
                      <option value="REPORTED_IMPORTED">{wording.theyImportedTheFilesNotCheckedByNEVORA}</option>
                    </select>
                  </label>
                  <button className="button secondary" type="submit">{wording.saveNote}</button>
                </fieldset>
                <p>{wording.nevoraIsnTConnectedToYourProviderSoItCan}</p>
              </form>}
              <h4>{wording.latestDownloadsAndNotes}</h4>
              <p>{(m.eventCoverage.complete ? formatPortalCopy(wording.returnedeventsOfTotalEventsEventsInThisSummaryAllEventsFor, { returnedEvents: m.eventCoverage.returnedEvents, totalEvents: m.eventCoverage.totalEvents }) : formatPortalCopy(wording.returnedeventsOfTotalEventsEventsInThisSummaryLatestEventOf, { returnedEvents: m.eventCoverage.returnedEvents, totalEvents: m.eventCoverage.totalEvents }))}</p>
              <ul>
                {m.events.map((event) => (
                  <li key={event.id}>
                    {formatPortalCopy(wording.eventlabelCreatedAtByName, {
                      eventLabel: EVENT_LABELS[event.kind] ?? wording.recorded,
                      createdAt: whenText(event.createdAt, lang),
                      name: review.members.find((member) => member.employeeId === event.actorId)?.name ?? (lang === 'es' ? 'alguien de tu equipo' : 'someone on your team'),
                    })}
                    {event.payload.destination && (
                      <p>
                        {formatPortalCopy(wording.destinationReference, { destination: event.payload.destination })}
                        {formatPortalCopy(wording.referenceReportedByAManagerNotConfirmedByTheProvider, { reference: event.payload.reference })}</p>
                    )}
                    {event.payload.filename && (
                      <p>
                        {formatPortalCopy(wording.filenameDownloadNotConfirmed, { filename: event.payload.filename })}</p>
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
      {review && (exportsDisabled || review.manifests.length > 0) && <PeriodCloseHistory period={period} actorId={actorId} />}
      </ListDisclosure>
    </section>
  );
}
