"use client";
import {useState,useRef,useEffect} from "react";
import {ArrowCounterClockwiseIcon} from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import {ShieldWarningIcon} from "@phosphor-icons/react/dist/ssr/ShieldWarning";
import {formatBusinessDateTimeInput,formatBusinessTimestamp,policyEffectiveInstant} from "@/lib/business-time";
import type {CompanyPolicyHistory,PolicyScopeHistory,PolicyHistoryRevision} from "@/lib/business-improvements/company-policies/history";
import type {CompanyPolicySettings,CompanyPolicyCommand} from "@/lib/business-improvements/company-policies/model";
const fields = [
  ["lateness", "Lateness"], ["earlyDeparture", "Early departure"],
  ["longEntry", "Unusually long entry"], ["missingClockIn", "Missing clock-in"],
  ["missingClockOut", "Missing clock-out"], ["overtimeRisk", "Actual-time overtime risk"],
] as const;
type ValidRevision=Extract<PolicyHistoryRevision,{state:"valid"}>;
type Draft={settings:CompanyPolicySettings;expectedRevision:number;recoveryFrom:ValidRevision|null};
type ReadState="ready"|"loading"|"unavailable"|"unauthorized";
function selectedScope(history:CompanyPolicyHistory,locationId:string|null):PolicyScopeHistory {
  return history.scopes.find(item=>item.locationId===locationId)??{locationId,expectedRevision:0,state:"not_configured",selected:null};
}
function currentDraft(history:CompanyPolicyHistory,locationId:string|null):Draft|null {
  const current=selectedScope(history,locationId);
  return current.state==="unavailable"?null:{settings:current.state==="valid"?current.selected.settings:{version:1},expectedRevision:current.expectedRevision,recoveryFrom:null};
}
/** Build the complete reviewed snapshot without mutating its validated base.
 * Private labor fields have no authoring controls here and retain their exact values. */
export function buildPolicySettings(data:FormData,base:CompanyPolicySettings,timeZone:string):CompanyPolicySettings {
  const attendance:Record<string,unknown>={...(base.attendance??{})},labor:Record<string,unknown>={...(base.labor??{})};
  for(const[key]of fields){
    const mode=data.get(`${key}.mode`),section=key==="overtimeRisk"?labor:attendance;
    if(mode==="inherit"){delete section[key];continue;}
    if(mode==="none"){section[key]=null;continue;}
    if(mode!=="configured")throw Error("Choose a rule setting.");
    const raw=data.get(`${key}.threshold`);
    if(raw===null||String(raw).trim()==="")throw Error("Choose threshold minutes for each custom rule.");
    const old=key==="overtimeRisk"?base.labor?.overtimeRisk:base.attendance?.[key];
    const rule:Record<string,unknown>={thresholdMinutes:Number(raw),comparison:data.get(`${key}.comparison`),effectiveFrom:policyEffectiveInstant(String(data.get(`${key}.effective`)??""),old?.effectiveFrom,timeZone)};
    if(key==="longEntry")Object.assign(rule,{basis:data.get(`${key}.basis`),appliesTo:data.get(`${key}.appliesTo`)});
    if(key==="missingClockIn"||key==="missingClockOut")Object.assign(rule,{association:"CAPTURED_PUBLISHED_SHIFT",cutoff:key==="missingClockOut"?"AFTER_SCHEDULE_END":data.get(`${key}.cutoff`)});
    if(key==="overtimeRisk")Object.assign(rule,{basis:data.get(`${key}.basis`),window:data.get(`${key}.window`),aggregation:data.get(`${key}.aggregation`),dayBoundaryTime:data.get(`${key}.boundary`),...(data.get(`${key}.window`)==="BUSINESS_WEEK"?{weekStartsOn:Number(data.get(`${key}.weekStart`))}:{})});
    section[key]=rule;
  }
  return {version:1,...(base.attendance!==undefined||Object.keys(attendance).length?{attendance}:{}),...(base.labor!==undefined||Object.keys(labor).length?{labor}:{})} as CompanyPolicySettings;
}
function PrivateLaborReview({settings,scope,timeZone,open=false}:{settings:CompanyPolicySettings;scope:string;timeZone:string;open?:boolean}) {
  const labor=settings.labor;
  const absent=(value:unknown)=>value===undefined?(scope?"Inherit company default":"Not set"):value===null?"Explicitly not configured":null;
  const location=(id:string|null)=>id?`Location ${id}`:"Whole company";
  return <details className="policy-private-review" open={open}>
    <summary>Private labor settings <span>Owner only · preserved in this draft</span></summary>
    <p>Review these existing values before saving. This screen does not change rates, budgets, compensation references, or calculation methods.</p>
    <dl><div><dt>Compensation reference</dt><dd>{absent(labor?.compensation)??<>{labor!.compensation!.ruleReference}<br/>{labor!.compensation!.breakTreatment==="INCLUDE_ALL_RECORDED_BREAKS"?"Include all recorded breaks":`Exclude break types: ${labor!.compensation!.excludedBreakTypeIds.join(", ")||"None"}`}<br/>Effective {formatBusinessTimestamp(labor!.compensation!.effectiveFrom,timeZone)}</>}</dd></div>
    <div><dt>Employee rates</dt><dd>{absent(labor?.rates)??(labor!.rates!.length?<ul>{labor!.rates!.map(rate=><li key={rate.id}><strong>{rate.rate} {rate.currency}</strong> · {rate.rateUnit==="HOUR"?"per hour":rate.rateUnit==="SHIFT"?"per shift":"per salary period"}<br/>Employee {rate.employeeId} · {location(rate.locationId)} · Reference {rate.id}<br/>{formatBusinessTimestamp(rate.validFrom,timeZone)} — {rate.validUntil?formatBusinessTimestamp(rate.validUntil,timeZone):"No end date"}</li>)}</ul>:"Empty rate override — no explicit rates")}</dd></div>
    <div><dt>Labor budgets</dt><dd>{absent(labor?.budgets)??(labor!.budgets!.length?<ul>{labor!.budgets!.map(budget=><li key={budget.id}><strong>{budget.amount} {budget.currency}</strong> · {location(budget.locationId)} · Reference {budget.id}<br/>{formatBusinessTimestamp(budget.startAt,timeZone)} — {formatBusinessTimestamp(budget.endAt,timeZone)}</li>)}</ul>:"Empty budget override — no explicit budgets")}</dd></div>
    <div><dt>Calculation method reference</dt><dd>{absent(labor?.calculationMethod)??<>{labor!.calculationMethod!.id} · revision {labor!.calculationMethod!.revision}</>}</dd></div></dl>
  </details>;
}
export function CompanyPolicyEditor({history:initialHistory,locations,timeZone}:{history:CompanyPolicyHistory;locations:{id:string;name:string;active:boolean}[];timeZone:string}) {
  const submitGate=useRef(false),readGate=useRef(false),noticeRef=useRef<HTMLDivElement>(null);
  const [history,setHistory]=useState(initialHistory),[scope,setScope]=useState("");
  const [draft,setDraft]=useState<Draft|null>(()=>currentDraft(initialHistory,null));
  const [draftEpoch,setDraftEpoch]=useState(0),[modes,setModes]=useState<Record<string,string>>({});
  const [notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[readState,setReadState]=useState<ReadState>("ready");
  const [pending,setPending]=useState<CompanyPolicyCommand|null>(null),[conflict,setConflict]=useState(false),[reviewed,setReviewed]=useState(false);
  const current=selectedScope(history,scope||null),company=selectedScope(history,null);
  const writable=!scope||locations.some(item=>item.id===scope&&item.active);
  const editableSettings=draft?.settings;
  const previousValid=history.revisions.filter((item):item is ValidRevision=>item.locationId===(scope||null)&&item.state==="valid"&&item.revision<current.expectedRevision).sort((a,b)=>b.revision-a.revision)[0];
  const scopeOptions=[...locations,...history.scopes.filter(item=>item.locationId&&!locations.some(location=>location.id===item.locationId)).map(item=>({id:item.locationId!,name:`Historical location · ${item.locationId}`,active:false}))];
  function announce(message:string){setNotice(message);requestAnimationFrame(()=>noticeRef.current?.focus({preventScroll:false}));}
  function adoptCurrent(next:CompanyPolicyHistory){setDraft(currentDraft(next,scope||null));setDraftEpoch(value=>value+1);setModes({});setReviewed(false);setConflict(false);}
  function denyAccess(){setPending(null);setDraft(null);setHistory({revisions:[],scopes:[]});setReadState("unauthorized");announce("Your access ended. Sign in again to view or edit company policies.");}
  useEffect(()=>{
    if(!pending)return;
    const protect=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",protect);return()=>window.removeEventListener("beforeunload",protect);
  },[pending]);
  async function refresh({receipt,replaceDraft=false,retained=pending}:{receipt?:number;replaceDraft?:boolean;retained?:CompanyPolicyCommand|null}={}){
    if(readGate.current)return;
    readGate.current=true;setReadState("loading");
    try{
      const response=await fetch("/api/company-policies",{cache:"no-store",credentials:"same-origin",headers:{"x-nevora-company-policies":"1"}});
      if(response.status===401||response.status===403){denyAccess();return;}
      if(!response.ok)throw Error();
      const body=await response.json() as {state?:string;history?:CompanyPolicyHistory};
      if(body.state!=="ready"||!Array.isArray(body.history?.scopes)||!Array.isArray(body.history?.revisions))throw Error();
      const next=body.history!,latest=selectedScope(next,scope||null);
      setHistory(next);setReadState("ready");
      const reconciled=retained?next.revisions.find(item=>item.operationId===retained.operationId):undefined;
      if(reconciled){setPending(null);adoptCurrent(next);announce(`Retained request saved as revision ${reconciled.revision}. Current selected revision ${latest.expectedRevision}.`);}
      else if(receipt!==undefined){adoptCurrent(next);announce(`Revision ${receipt} saved. Current selected revision ${latest.expectedRevision}.`);}
      else if(replaceDraft){adoptCurrent(next);announce(`Current revision ${latest.expectedRevision} loaded. Review before saving.`);}
      else if(retained){announce(`Current revision ${latest.expectedRevision} loaded. The original request is still unconfirmed; retry that retained request safely.`);}
      else if(conflict){announce(`Your draft was not saved. Current revision ${latest.expectedRevision} loaded for comparison. Use the current revision before making another change.`);}
      else{announce(`Policy history refreshed. Current selected revision ${latest.expectedRevision}.`);}
    }catch{setReadState("unavailable");announce(receipt!==undefined?`Revision ${receipt} was saved, but current policies could not be read. Retry the read before editing.`:"Policies could not be read. Your draft is retained; editing is paused. Retry the read.");}
    finally{readGate.current=false;}
  }
  async function submit(form:HTMLFormElement){
    if(submitGate.current||readState!=="ready"||!writable||conflict||!draft||(!pending&&draft.recoveryFrom&&!reviewed))return;
    const command=pending??{operationId:crypto.randomUUID(),expectedRevision:draft.expectedRevision,locationId:scope||null,settings:buildPolicySettings(new FormData(form),draft.settings,timeZone)};
    setDraft({...draft,settings:command.settings});setPending(command);submitGate.current=true;setBusy(true);setNotice("Saving…");
    try{
      const response=await fetch("/api/company-policies",{method:"POST",cache:"no-store",credentials:"same-origin",headers:{"content-type":"application/json","x-nevora-company-policies":"1"},body:JSON.stringify(command)});
      if(response.status===401||response.status===403){denyAccess();return;}
      if(response.status===400){setPending(null);announce("Check the thresholds and effective dates. Your draft is retained; correct it before saving again.");return;}
      if(response.status===409){setPending(null);setConflict(true);announce("Policies changed. Your draft is retained for comparison; refresh before editing again.");await refresh();return;}
      if(!response.ok)throw Error();
      const body=await response.json() as {state?:string;result?:{revision?:number}};
      if(body.state!=="saved"||!Number.isSafeInteger(body.result?.revision)||body.result!.revision!<1)throw Error();
      setPending(null);await refresh({receipt:body.result!.revision!,retained:null});
    }catch{announce("We could not confirm whether your changes were saved. Values and scope are locked. Retry the retained save safely, or refresh policy history to check the original request.");}
    finally{submitGate.current=false;setBusy(false);}
  }
  function startRecovery(){if(!previousValid||!writable||pending||busy||readState!=="ready")return;setDraft({settings:previousValid.settings,expectedRevision:current.expectedRevision,recoveryFrom:previousValid});setDraftEpoch(value=>value+1);setModes({});setReviewed(false);setConflict(false);announce(`Replacement draft from revision ${previousValid.revision}. The current revision ${current.expectedRevision} remains unavailable until a valid correction is saved.`);}
  return <div className="company-policy-editor">
    <div className="policy-scope-panel"><label>Policy scope <select value={scope} disabled={busy||pending!==null||conflict||readState!=="ready"} onChange={event=>{const next=event.target.value;setScope(next);setDraft(currentDraft(history,next||null));setDraftEpoch(value=>value+1);setModes({});setReviewed(false);setNotice("");}}><option value="">Company default</option>{scopeOptions.map(item=><option key={item.id} value={item.id}>{item.name}{item.active?"":" · inactive"}</option>)}</select></label>
      <p>{scope?"Location rules use company defaults unless you set an override. Choose Disabled to turn a rule off at this location.":"Set company defaults for attendance and recorded-time review. Disabled rules do not produce comparisons."}</p>
      <small>{readState!=="ready"?"Current policies not verified":current.state==="not_configured"?"No saved revision":current.state==="unavailable"?`Unavailable revision ${current.expectedRevision}`:`Saved revision ${current.expectedRevision}`} · Company time: {timeZone.split("/").at(-1)?.replaceAll("_"," ")}</small>
    </div>
    <div ref={noticeRef} tabIndex={-1} className="policy-notice" role="status" aria-live="polite">{notice}</div>
    {readState!=="ready"?<section className="policy-state" aria-busy={readState==="loading"}><h2>{readState==="loading"?"Reading current policies":readState==="unauthorized"?"Policy access ended":"Policies unavailable"}</h2><p>{readState==="loading"?"Editing is paused while the current history is checked.":readState==="unauthorized"?"Sign in with current Owner access to continue.":"Editing is paused. Retry the read to verify current policies; your draft remains in memory."}</p>{readState==="unauthorized"?<a className="button secondary" href="/login">Sign in again</a>:<button className="button secondary" type="button" disabled={readState==="loading"||busy} onClick={()=>void refresh()}><ArrowCounterClockwiseIcon size={18} aria-hidden="true"/>Retry read</button>}</section>:<>
      {scope&&company.state==="unavailable"?<section className="policy-state policy-warning"><h2>Company defaults need a correction</h2><p>Company revision {company.expectedRevision} is unavailable. A valid location revision does not confirm that inherited attendance rules are available. Review the company default separately.</p></section>:null}
      {!writable?<section className="policy-state"><h2>Historical location</h2><p>This location is inactive or no longer in the current catalog. Its original policy history remains available; changes are unavailable.</p></section>:null}
      {current.state==="unavailable"?<section className="policy-state policy-warning"><div className="policy-state-heading"><ShieldWarningIcon size={24} aria-hidden="true"/><h2>Current revision {current.expectedRevision} unavailable</h2></div><p>Attendance rules remain unavailable until a valid correction is saved. Original history is retained; earlier policies have not been activated.</p>{previousValid&&writable?<><p>Revision {previousValid.revision} from {formatBusinessTimestamp(previousValid.changedAt,timeZone)} can be reviewed as a complete replacement draft.</p><button className="button secondary" type="button" disabled={busy||pending!==null} onClick={startRecovery}>Review revision {previousValid.revision} as a replacement draft</button></>:<p>Correction is held until a complete replacement can be reviewed, including attendance and private labor settings.</p>}</section>:null}
      {conflict?<section className="policy-state policy-warning"><h2>Your draft needs a fresh review</h2><p>The retained draft below was not saved. Current selected revision: {current.expectedRevision}. No changes have been automatically combined or overwritten.</p>{current.state==="valid"?<details className="policy-current-comparison"><summary>Compare current saved rules</summary><ul>{fields.map(([key,label])=>{const rule=key==="overtimeRisk"?current.selected.settings.labor?.overtimeRisk:current.selected.settings.attendance?.[key];return<li key={key}>{label}: {rule===undefined?(scope?"Inherit company default":"Disabled by default"):rule===null?"Disabled":`${rule.comparison==="GT"?"Greater than":"At least"} ${rule.thresholdMinutes} minutes · Effective ${formatBusinessTimestamp(rule.effectiveFrom,timeZone)}`}</li>;})}</ul><PrivateLaborReview settings={current.selected.settings} scope={scope} timeZone={timeZone}/></details>:null}<button className="button secondary" type="button" disabled={busy||pending!==null} onClick={()=>{adoptCurrent(history);announce(`Retained draft discarded. Current revision ${current.expectedRevision} loaded.`);}}>Discard draft and use current revision</button></section>:null}
      {draft?<>
        {draft.recoveryFrom?<section className="policy-replacement-review"><h2>Review the complete replacement</h2><p>Draft source: revision {draft.recoveryFrom.revision} · {formatBusinessTimestamp(draft.recoveryFrom.changedAt,timeZone)}. This draft replaces revision {draft.expectedRevision} in full. Intervening values in the unavailable revision cannot be checked.</p><p>Review every attendance rule and the private labor settings below before saving. Saving appends a new revision and retains the original history.</p></section>:null}
        <PrivateLaborReview settings={draft.settings} scope={scope} timeZone={timeZone} open={draft.recoveryFrom!==null}/>
        <form key={`${scope}:${draftEpoch}`} className="employee-form policy-form" aria-busy={busy} onSubmit={event=>{event.preventDefault();void submit(event.currentTarget).catch(()=>announce("Choose threshold minutes and valid effective dates in the company timezone. Times skipped or repeated by daylight saving time need a different selection."));}}>
        {fields.map(([key, label]) => {
          const rule = (
            key === "overtimeRisk"
              ? editableSettings?.labor?.overtimeRisk
              : editableSettings?.attendance?.[key]
          ) as Record<string, unknown> | null | undefined;
          const mode=modes[key] ?? (rule === undefined ? "inherit" : rule === null ? "none" : "configured");
          return (
            <fieldset key={key} disabled={busy || pending !== null || conflict || !writable}>
              <legend>{label}</legend>
              <label>
                Rule setting{" "}
                <select
                  name={`${key}.mode`}
                  value={mode}
                  onChange={event=>setModes(value=>({...value,[key]:event.target.value}))}
                >
                  <option value="inherit">
                    {scope
                      ? "Inherit company default"
                      : "Disabled by default"}
                  </option>
                  <option value="none">Disabled</option>
                  <option value="configured">Custom threshold</option>
                </select>
              </label>
              <div className="policy-rule-fields" hidden={mode !== "configured"}><label>
                Threshold minutes{" "}
                <input
                  name={`${key}.threshold`}
                  type="number"
                  min="0"
                  max="525600"
                  defaultValue={rule ? String(rule.thresholdMinutes) : ""}
                />
              </label>
              <label>
                Comparison{" "}
                <select
                  name={`${key}.comparison`}
                  defaultValue={String(rule?.comparison ?? "GT")}
                >
                  <option value="GT">Greater than</option>
                  <option value="GTE">Greater than or equal</option>
                </select>
              </label>
              <label>
                Effective from{" "}
                <input
                  name={`${key}.effective`}
                  type="datetime-local"
                  defaultValue={formatBusinessDateTimeInput(rule?.effectiveFrom ? String(rule.effectiveFrom) : undefined,timeZone)}
                />
              </label>
              {key === "longEntry" && (
                <>
                  <label>
                    Time basis{" "}
                    <select
                      name={`${key}.basis`}
                      defaultValue={String(rule?.basis ?? "RECORDED_ELAPSED")}
                    >
                      <option value="RECORDED_ELAPSED">Recorded elapsed</option>
                      <option value="EFFECTIVE_ELAPSED">
                        Effective elapsed after corrections
                      </option>
                    </select>
                  </label>
                  <label>
                    Entries{" "}
                    <select
                      name={`${key}.appliesTo`}
                      defaultValue={String(rule?.appliesTo ?? "BOTH")}
                    >
                      <option value="OPEN">Currently open</option>
                      <option value="CLOSED">Completed</option>
                      <option value="BOTH">Open and completed</option>
                    </select>
                  </label>
                </>
              )}
              {key === "missingClockIn" && (
                <label>
                  Observation cutoff{" "}
                  <select
                    name={`${key}.cutoff`}
                    defaultValue={String(rule?.cutoff ?? "AFTER_SCHEDULE_END")}
                  >
                    <option value="AFTER_SCHEDULE_START">
                      After published start
                    </option>
                    <option value="AFTER_SCHEDULE_END">
                      After published end
                    </option>
                  </select>
                </label>
              )}
              {key === "overtimeRisk" && (
                <>
                  <label>
                    Time basis{" "}
                    <select
                      name={`${key}.basis`}
                      defaultValue={String(
                        rule?.basis ?? "EFFECTIVE_ELAPSED_INCLUDING_BREAKS",
                      )}
                    >
                      <option value="RECORDED_ELAPSED_INCLUDING_BREAKS">
                        Recorded elapsed including breaks
                      </option>
                      <option value="EFFECTIVE_ELAPSED_INCLUDING_BREAKS">
                        Effective elapsed including breaks
                      </option>
                    </select>
                  </label>
                  <label>
                    Window{" "}
                    <select
                      name={`${key}.window`}
                      defaultValue={String(rule?.window ?? "BUSINESS_WEEK")}
                    >
                      <option value="BUSINESS_DAY">Business day</option>
                      <option value="BUSINESS_WEEK">Business week</option>
                    </select>
                  </label>
                  <label>
                    Aggregation{" "}
                    <select
                      name={`${key}.aggregation`}
                      defaultValue={String(rule?.aggregation ?? "COMPANY")}
                    >
                      <option value="COMPANY">Across the company</option>
                      <option value="LOCATION">At this location</option>
                    </select>
                  </label>
                  <label>
                    Business day starts{" "}
                    <input
                      type="time"
                      name={`${key}.boundary`}
                      defaultValue={String(rule?.dayBoundaryTime ?? "00:00")}
                    />
                  </label>
                  <label>
                    Week starts on{" "}
                    <select
                      name={`${key}.weekStart`}
                      defaultValue={String(rule?.weekStartsOn ?? 1)}
                    >{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((day,i)=><option key={day} value={i}>{day}</option>)}</select>
                  </label>
                </>
              )}
            </div></fieldset>
          );
        })}
          {draft.recoveryFrom?<label className="policy-replacement-confirm"><input type="checkbox" checked={reviewed} disabled={busy||pending!==null||conflict||!writable} onChange={event=>setReviewed(event.target.checked)}/><span>I reviewed the complete replacement, including attendance and private labor settings. It replaces revision {draft.expectedRevision} in full.</span></label>:null}
          <div className="policy-actions"><button className="button primary" disabled={busy||conflict||!writable||(!pending&&draft.recoveryFrom!==null&&!reviewed)} type="submit">{busy?"Saving…":pending?"Retry retained save":draft.recoveryFrom?"Save replacement revision":"Save policies"}</button></div>
        </form>
      </>:null}
      <div className="policy-actions"><button className="button secondary" type="button" disabled={busy} onClick={()=>void refresh()}><ArrowCounterClockwiseIcon size={18} aria-hidden="true"/>Refresh policy history</button></div>
      <section className="policy-history"><h2>Policy history</h2><p>Saved evidence for this scope. An unavailable revision is retained and cannot be used as a trusted policy.</p><ul>{history.revisions.filter(item=>item.locationId===(scope||null)).sort((a,b)=>b.revision-a.revision).map(item=><li key={item.operationId}><strong>Revision {item.revision}</strong> · {formatBusinessTimestamp(item.changedAt,timeZone)}<br/>{item.state==="unavailable"?<span className="policy-history-unavailable">Revision unavailable — original history retained</span>:item.revision===current.expectedRevision?"Current saved revision":"Earlier valid revision"}<br/>{item.changedKeys===null?"Change details unavailable":item.changedKeys.map(key=>fields.find(([name])=>key.includes(name))?.[1]??({"labor.compensation":"Compensation reference","labor.rates":"Employee rates","labor.budgets":"Labor budgets","labor.calculationMethod":"Calculation method reference"}[key]??"Policy setting")).join(", ")||"No rule changes"}</li>)}</ul>{!history.revisions.some(item=>item.locationId===(scope||null))?<p>No saved policy changes for this scope yet.</p>:null}</section>
    </>}
  </div>;
}
