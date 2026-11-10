"use client";
import {useState,useRef,useEffect} from "react";
import {ArrowCounterClockwiseIcon} from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import {ShieldWarningIcon} from "@phosphor-icons/react/dist/ssr/ShieldWarning";
import {CaretRightIcon} from "@phosphor-icons/react/dist/ssr/CaretRight";
import {QuietHeader,QuietNav} from "./quiet/quiet";
import {formatBusinessDateTimeInput,formatBusinessTimestamp,policyEffectiveInstant} from "@/lib/business-time";
import type {CompanyPolicyHistory,PolicyScopeHistory,PolicyHistoryRevision} from "@/lib/business-improvements/company-policies/history";
import type {CompanyPolicySettings,CompanyPolicyCommand} from "@/lib/business-improvements/company-policies/model";
const fields = [
  ["lateness", "Lateness"], ["earlyDeparture", "Early departure"],
  ["missingClockIn", "Missing clock-in"], ["missingClockOut", "Missing clock-out"],
  ["overtimeRisk", "Actual-time overtime risk"], ["longEntry", "Unusually long entry"],
] as const;
/** Quiet (v4): the switch rows' names, from the approved mockup ("Alert me about"). */
const rowNames: Record<(typeof fields)[number][0], string> = {
  lateness: "Late arrivals", earlyDeparture: "Early departures", missingClockIn: "Missed clock-ins",
  missingClockOut: "Missed clock-outs", overtimeRisk: "Close to overtime", longEntry: "Very long shifts",
};
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
  const location=(id:string|null)=>id?`Location ${id}`:"All locations";
  // Release 1: a row like its siblings ("Policy history"); the values open under it. Editing alerts never changes them.
  return <details className="policy-private-review q-details" open={open}>
    <summary className="q-row q-row--one"><span className="q-rt"><b>Labor settings</b></span><span className="q-rv q-rv--l">Owner only</span><CaretRightIcon className="q-chev" aria-hidden="true"/></summary>
    <div className="q-rule__body"><p>Pay rates, budgets and pay rules saved with these policies. Changing an alert keeps them as they are.</p>
    <dl><div><dt>Compensation reference</dt><dd>{absent(labor?.compensation)??<>{labor!.compensation!.ruleReference}<br/>{labor!.compensation!.breakTreatment==="INCLUDE_ALL_RECORDED_BREAKS"?"Include all recorded breaks":`Exclude break types: ${labor!.compensation!.excludedBreakTypeIds.join(", ")||"None"}`}<br/>Effective {formatBusinessTimestamp(labor!.compensation!.effectiveFrom,timeZone)}</>}</dd></div>
    <div><dt>Employee rates</dt><dd>{absent(labor?.rates)??(labor!.rates!.length?<ul>{labor!.rates!.map(rate=><li key={rate.id}><strong>{rate.rate} {rate.currency}</strong> · {rate.rateUnit==="HOUR"?"per hour":rate.rateUnit==="SHIFT"?"per shift":"per salary period"}<br/>Employee {rate.employeeId} · {location(rate.locationId)} · Reference {rate.id}<br/>{formatBusinessTimestamp(rate.validFrom,timeZone)} — {rate.validUntil?formatBusinessTimestamp(rate.validUntil,timeZone):"No end date"}</li>)}</ul>:"Empty rate override — no explicit rates")}</dd></div>
    <div><dt>Labor budgets</dt><dd>{absent(labor?.budgets)??(labor!.budgets!.length?<ul>{labor!.budgets!.map(budget=><li key={budget.id}><strong>{budget.amount} {budget.currency}</strong> · {location(budget.locationId)} · Reference {budget.id}<br/>{formatBusinessTimestamp(budget.startAt,timeZone)} — {formatBusinessTimestamp(budget.endAt,timeZone)}</li>)}</ul>:"Empty budget override — no explicit budgets")}</dd></div>
    <div><dt>Calculation method reference</dt><dd>{absent(labor?.calculationMethod)??<>{labor!.calculationMethod!.id} · revision {labor!.calculationMethod!.revision}</>}</dd></div></dl></div>
  </details>;
}
export function CurrentPolicyRules({settings,scope,timeZone}: {settings:CompanyPolicySettings;scope:string;timeZone:string}) {
  return <ul className="policy-current-rules">{fields.map(([key,label])=>{
    const rule=key==="overtimeRisk"?settings.labor?.overtimeRisk:settings.attendance?.[key];
    if(rule===undefined||rule===null) {
      return <li key={key}><strong>{label}</strong><p>{rule===null?"Disabled":scope?"Inherit company default":"Disabled by default"}</p></li>;
    }
    const details:Array<[string,string]>=[
      ["Threshold minutes",String(rule.thresholdMinutes)],
      ["Comparison",rule.comparison==="GT"?"Greater than":"Greater than or equal"],
      ["Effective from",formatBusinessTimestamp(rule.effectiveFrom,timeZone)],
    ];
    const longEntry=key==="longEntry"?settings.attendance?.longEntry:null;
    if(longEntry) {
      details.push(["Time basis",longEntry.basis==="RECORDED_ELAPSED"?"Recorded elapsed":"Effective elapsed after corrections"]);
      details.push(["Entries",longEntry.appliesTo==="OPEN"?"Currently open":longEntry.appliesTo==="CLOSED"?"Completed":"Open and completed"]);
    }
    const missing=key==="missingClockIn"?settings.attendance?.missingClockIn:key==="missingClockOut"?settings.attendance?.missingClockOut:null;
    if(missing) {
      details.push(["Schedule association","Captured published shift"]);
      details.push(["Check-in window ends",missing.cutoff==="AFTER_SCHEDULE_START"?"After published start":"After published end"]);
    }
    const overtime=key==="overtimeRisk"?settings.labor?.overtimeRisk:null;
    if(overtime) {
      details.push(["Time basis",overtime.basis==="RECORDED_ELAPSED_INCLUDING_BREAKS"?"Recorded elapsed including breaks":"Effective elapsed including breaks"]);
      details.push(["Window",overtime.window==="BUSINESS_DAY"?"Business day":"Business week"]);
      details.push(["Aggregation",overtime.aggregation==="COMPANY"?"Across the company":"At this location"]);
      details.push(["Business day starts",overtime.dayBoundaryTime]);
      if(overtime.window==="BUSINESS_WEEK") {
        const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        details.push(["Week starts on",overtime.weekStartsOn===undefined?"Not set":days[overtime.weekStartsOn]]);
      }
    }
    return <li key={key}><strong>{label}</strong><dl>{details.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></li>;
  })}</ul>;
}
export function CompanyPolicyEditor({history:initialHistory,locations,timeZone}:{history:CompanyPolicyHistory;locations:{id:string;name:string;active:boolean}[];timeZone:string}) {
  const submitGate=useRef(false),readGate=useRef(false),noticeRef=useRef<HTMLDivElement>(null);
  const confirmedReceipt=useRef<number|null>(null);
  const [history,setHistory]=useState(initialHistory),[scope,setScope]=useState("");
  const [draft,setDraft]=useState<Draft|null>(()=>currentDraft(initialHistory,null));
  const [draftEpoch,setDraftEpoch]=useState(0),[modes,setModes]=useState<Record<string,string>>({});
  const [rawFields,setRawFields]=useState<Record<string,string>>({});
  const [notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[readState,setReadState]=useState<ReadState>("ready");
  const [pending,setPending]=useState<CompanyPolicyCommand|null>(null),[conflict,setConflict]=useState(false),[reviewed,setReviewed]=useState(false);
  const current=selectedScope(history,scope||null),company=selectedScope(history,null);
  const writable=!scope||locations.some(item=>item.id===scope&&item.active);
  const editableSettings=draft?.settings;
  const previousValid=history.revisions.filter((item):item is ValidRevision=>item.locationId===(scope||null)&&item.state==="valid"&&item.revision<current.expectedRevision).sort((a,b)=>b.revision-a.revision)[0];
  const scopeOptions=[...locations,...history.scopes.filter(item=>item.locationId&&!locations.some(location=>location.id===item.locationId)).map(item=>({id:item.locationId!,name:`Historical location · ${item.locationId}`,active:false}))];
  function announce(message:string){setNotice(message);requestAnimationFrame(()=>noticeRef.current?.focus({preventScroll:false}));}
  function adoptCurrent(next:CompanyPolicyHistory){confirmedReceipt.current=null;setDraft(currentDraft(next,scope||null));setDraftEpoch(value=>value+1);setModes({});setRawFields({});setReviewed(false);setConflict(false);}
  function denyAccess(){confirmedReceipt.current=null;setPending(null);setDraft(null);setRawFields({});setHistory({revisions:[],scopes:[]});setReadState("unauthorized");announce("Your access ended. Sign in again to view or edit company policies.");}
  useEffect(()=>{
    if(!pending)return;
    const protect=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",protect);return()=>window.removeEventListener("beforeunload",protect);
  },[pending]);
  async function refresh({receipt=confirmedReceipt.current??undefined,replaceDraft=false,retained=pending,conflicted=conflict}:{receipt?:number;replaceDraft?:boolean;retained?:CompanyPolicyCommand|null;conflicted?:boolean}={}){
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
      if(reconciled){setPending(null);adoptCurrent(next);announce(`Your earlier save went through as version ${reconciled.revision}. You’re now viewing version ${latest.expectedRevision}.`);}
      else if(receipt!==undefined){adoptCurrent(next);announce(`Version ${receipt} saved. You’re now viewing version ${latest.expectedRevision}.`);}
      else if(retained){announce(`Version ${latest.expectedRevision} loaded. We still couldn’t confirm your earlier save. Try saving again; it won’t save twice.`);}
      else if(conflicted||(draft&&latest.expectedRevision!==draft.expectedRevision)){setConflict(true);announce(`Your draft wasn’t saved. Version ${latest.expectedRevision} is loaded so you can compare. Start from it before making another change.`);}
      else if(replaceDraft||!draft){adoptCurrent(next);announce(`Version ${latest.expectedRevision} loaded. Check it before saving.`);}
      else{announce(`Policy history refreshed. You’re viewing version ${latest.expectedRevision}.`);}
    }catch{setReadState("unavailable");announce(receipt!==undefined?`Version ${receipt} was saved, but policies didn’t load. Refresh before editing.`:"Policies didn’t load. Your draft is kept, and editing is paused until you refresh.");}
    finally{readGate.current=false;}
  }
  async function submit(form:HTMLFormElement){
    if(submitGate.current||readState!=="ready"||!writable||conflict||!draft||(!pending&&draft.recoveryFrom&&!reviewed))return;
    const command=pending??{operationId:crypto.randomUUID(),expectedRevision:draft.expectedRevision,locationId:scope||null,settings:buildPolicySettings(new FormData(form),draft.settings,timeZone)};
    setDraft({...draft,settings:command.settings});setPending(command);submitGate.current=true;setBusy(true);setNotice("Saving…");
    try{
      const response=await fetch("/api/company-policies",{method:"POST",cache:"no-store",credentials:"same-origin",headers:{"content-type":"application/json","x-nevora-company-policies":"1"},body:JSON.stringify(command)});
      if(response.status===401||response.status===403){denyAccess();return;}
      if(response.status===400){setPending(null);announce("Check the thresholds and start dates. Your draft is kept; fix it, then save again.");return;}
      if(response.status===409){setPending(null);setConflict(true);announce("Policies changed. Your draft is kept so you can compare; refresh before editing again.");await refresh({retained:null,conflicted:true});return;}
      if(!response.ok)throw Error();
      const body=await response.json() as {state?:string;result?:{revision?:number}};
      if(body.state!=="saved"||!Number.isSafeInteger(body.result?.revision)||body.result!.revision!<1)throw Error();
      confirmedReceipt.current=body.result!.revision!;
      setPending(null);await refresh({receipt:confirmedReceipt.current,retained:null});
    }catch{announce("We couldn’t confirm your changes were saved. Your values are locked. Try saving again (it won’t save twice), or refresh the history to check.");}
    finally{submitGate.current=false;setBusy(false);}
  }
  function startRecovery(){if(!previousValid||!writable||pending||busy||readState!=="ready")return;setDraft({settings:previousValid.settings,expectedRevision:current.expectedRevision,recoveryFrom:previousValid});setDraftEpoch(value=>value+1);setModes({});setRawFields({});setReviewed(false);setConflict(false);announce(`Draft started from version ${previousValid.revision}. Version ${current.expectedRevision} can’t be used until you save a corrected version.`);}
  // Quiet (v4): at a location, a rule that follows the company is on when the company's rule is on.
  const inheritedOn=(key:(typeof fields)[number][0])=>{const settings=company.state==="valid"?company.selected.settings:null;const rule=key==="overtimeRisk"?settings?.labor?.overtimeRisk:settings?.attendance?.[key];return rule!==undefined&&rule!==null;};
  return <div className="company-policy-editor q-page q-policies" data-nv-page="">
    <QuietNav back={{href:"/app/settings",label:"Settings"}} title="Company policies" right={draft?<button type="submit" form="policy-form" className="q-nav__r q-nav__r--b" aria-label="Save policies"
      disabled={!draft||busy||conflict||!writable||readState!=="ready"||pending!==null||draft.recoveryFrom!==null}>{busy?"Saving…":"Save"}</button>:undefined}/>
    <QuietHeader title="Company policies"/>
    <ul className="q-list" style={{marginTop:16}}><li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b id="company-policy-scope-label">Applies to</b></span>
      <select className="q-select-row__control" aria-labelledby="company-policy-scope-label" value={scope} disabled={busy||pending!==null||conflict||readState!=="ready"} onChange={event=>{const next=event.target.value;setScope(next);setDraft(currentDraft(history,next||null));setDraftEpoch(value=>value+1);setModes({});setRawFields({});setReviewed(false);setNotice("");}}><option value="">All locations</option>{scopeOptions.map(item=><option key={item.id} value={item.id}>{item.name}{item.active?"":" · inactive"}</option>)}</select>
      <CaretRightIcon className="q-chev" aria-hidden="true"/></label></li></ul>
    <div ref={noticeRef} tabIndex={-1} className="policy-notice" role="status" aria-live="polite">{notice}</div>
    {readState!=="ready"?<section className="policy-state" aria-busy={readState==="loading"}><h2>{readState==="loading"?"Reading current policies":readState==="unauthorized"?"Policy access ended":"Policies unavailable"}</h2><p>{readState==="loading"?"Editing is paused while the current history is checked.":readState==="unauthorized"?"Sign in with current Owner access to continue.":"Editing is paused. Retry the read to verify current policies; your draft remains in memory."}</p>{readState==="unauthorized"?<a className="button secondary" href="/login">Sign in again</a>:<button className="button secondary" type="button" disabled={readState==="loading"||busy} onClick={()=>void refresh()}><ArrowCounterClockwiseIcon size={18} aria-hidden="true"/>Retry read</button>}</section>:<>
      {scope&&company.state==="unavailable"?<section className="policy-state policy-warning"><h2>Company defaults need a correction</h2><p>Company version {company.expectedRevision} can’t be used. This location’s own rules don’t confirm the attendance rules it inherits. Check the company default separately.</p></section>:null}
      {!writable?<section className="policy-state"><h2>Historical location</h2><p>This location is inactive or was removed. You can still see its policy history, but you can’t change it.</p></section>:null}
      {current.state==="unavailable"?<section className="policy-state policy-warning"><div className="policy-state-heading"><ShieldWarningIcon size={24} aria-hidden="true"/><h2>Version {current.expectedRevision} can’t be used</h2></div><p>Attendance rules are off until you save a corrected version. The history is kept, and earlier versions weren’t turned back on.</p>{previousValid&&writable?<><p>Version {previousValid.revision} from {formatBusinessTimestamp(previousValid.changedAt,timeZone)} can be used to start a full replacement.</p><button className="button secondary" type="button" disabled={busy||pending!==null} onClick={startRecovery}>Start from version {previousValid.revision}</button></>:<p>Correction is held until a complete replacement can be reviewed, including attendance and private labor settings.</p>}</section>:null}
      {conflict?<section className="policy-state policy-warning"><h2>Your draft needs a fresh review</h2><p>The draft below wasn’t saved. You’re viewing version {current.expectedRevision}. Nothing was merged or overwritten.</p>{current.state==="valid"?<details className="policy-current-comparison"><summary>Compare current saved rules</summary><CurrentPolicyRules settings={current.selected.settings} scope={scope} timeZone={timeZone}/><PrivateLaborReview settings={current.selected.settings} scope={scope} timeZone={timeZone}/></details>:null}<button className="button secondary" type="button" disabled={busy||pending!==null} onClick={()=>{adoptCurrent(history);announce(`Retained draft discarded. Current revision ${current.expectedRevision} loaded.`);}}>Discard draft and use the current version</button></section>:null}
      {draft?<>
        {draft.recoveryFrom?<section className="policy-replacement-review"><h2>Review the complete replacement</h2><p>Started from version {draft.recoveryFrom.revision} · {formatBusinessTimestamp(draft.recoveryFrom.changedAt,timeZone)}. This draft replaces version {draft.expectedRevision} in full. Values in the unusable version can’t be checked.</p><p>Check every attendance rule and the private labor settings below before saving. Saving adds a new version and keeps the history.</p></section>:null}
        <form id="policy-form" key={`${scope}:${draftEpoch}`} className="employee-form policy-form" aria-busy={busy} onSubmit={event=>{event.preventDefault();void submit(event.currentTarget).catch(()=>announce("Choose threshold minutes and valid effective dates in the company timezone. Times skipped or repeated by daylight saving time need a different selection."));}}>
        <div className="q-grp"><h2>Tell me about</h2></div>
        <ul className="q-list q-policy-list">{fields.map(([key, label]) => {
          const rule = (
            key === "overtimeRisk"
              ? editableSettings?.labor?.overtimeRisk
              : editableSettings?.attendance?.[key]
          ) as Record<string, unknown> | null | undefined;
          const mode=modes[key] ?? (rule === undefined ? "inherit" : rule === null ? "none" : "configured");
          return (
            <li key={key} className="q-policy"><fieldset disabled={busy || pending !== null || conflict || !writable}>
              <legend className="q-sr">{label}</legend>
              {/* Quiet (v4): on is a custom threshold; off disables the rule (or keeps the default when nothing was saved).
                  At a location, a rule that follows the company shows the company's state and says so. */}
              <label className="q-row q-row--one q-policy__row">
                <span className="q-rt"><b>{rowNames[key]}</b>{scope && mode === "inherit" ? <i>Company default</i> : null}</span>
                <input type="checkbox" role="switch" className="q-tog" aria-label={rowNames[key]}
                  checked={mode === "configured" || (mode === "inherit" && !!scope && inheritedOn(key))}
                  onChange={event=>setModes(value=>({...value,[key]:event.target.checked?"configured":scope||rule!==undefined?"none":"inherit"}))}/>
              </label>
              <input type="hidden" name={`${key}.mode`} value={mode}/>
              <div className="policy-rule-fields q-rule__body" hidden={mode !== "configured"}><label>
                Threshold minutes{" "}
                <input
                  name={`${key}.threshold`}
                  type="number"
                  min="0"
                  max="525600"
                  value={rawFields[`${key}.threshold`] ?? (rule ? String(rule.thresholdMinutes) : "")}
                  onChange={event=>setRawFields(values=>({...values,[event.target.name]:event.target.value}))}
                />
              </label>
              <label>
                <span id={`${key}.comparison-label`}> Comparison </span>
                <select
                  aria-labelledby={`${key}.comparison-label`}
                  name={`${key}.comparison`}
                  value={rawFields[`${key}.comparison`] ?? (String(rule?.comparison ?? "GT"))}
                  onChange={event=>setRawFields(values=>({...values,[event.target.name]:event.target.value}))}
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
                  value={rawFields[`${key}.effective`] ?? (formatBusinessDateTimeInput(rule?.effectiveFrom ? String(rule.effectiveFrom) : undefined,timeZone))}
                  onChange={event=>setRawFields(values=>({...values,[event.target.name]:event.target.value}))}
                />
              </label>
              {key === "longEntry" && (
                <>
                  <label>
                <span id={`${key}.basis-label`}> Time basis </span>
                <select
                      aria-labelledby={`${key}.basis-label`}
                  name={`${key}.basis`}
                      value={rawFields[`${key}.basis`] ?? (String(rule?.basis ?? "RECORDED_ELAPSED"))}
                  onChange={event=>setRawFields(values=>({...values,[event.target.name]:event.target.value}))}
                    >
                      <option value="RECORDED_ELAPSED">Recorded elapsed</option>
                      <option value="EFFECTIVE_ELAPSED">
                        Effective elapsed after corrections
                      </option>
                    </select>
                  </label>
                  <label>
                <span id={`${key}.appliesTo-label`}> Entries </span>
                <select
                      aria-labelledby={`${key}.appliesTo-label`}
                  name={`${key}.appliesTo`}
                      value={rawFields[`${key}.appliesTo`] ?? (String(rule?.appliesTo ?? "BOTH"))}
                  onChange={event=>setRawFields(values=>({...values,[event.target.name]:event.target.value}))}
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
                <span id={`${key}.cutoff-label`}> Check-in window ends </span>
                <select
                    aria-labelledby={`${key}.cutoff-label`}
                  name={`${key}.cutoff`}
                    value={rawFields[`${key}.cutoff`] ?? (String(rule?.cutoff ?? "AFTER_SCHEDULE_END"))}
                  onChange={event=>setRawFields(values=>({...values,[event.target.name]:event.target.value}))}
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
                <span id={`${key}.basis-label`}> Time basis </span>
                <select
                      aria-labelledby={`${key}.basis-label`}
                  name={`${key}.basis`}
                      value={rawFields[`${key}.basis`] ?? (String(
                        rule?.basis ?? "EFFECTIVE_ELAPSED_INCLUDING_BREAKS",
                      ))}
                  onChange={event=>setRawFields(values=>({...values,[event.target.name]:event.target.value}))}
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
                <span id={`${key}.window-label`}> Window </span>
                <select
                      aria-labelledby={`${key}.window-label`}
                  name={`${key}.window`}
                      value={rawFields[`${key}.window`] ?? (String(rule?.window ?? "BUSINESS_WEEK"))}
                  onChange={event=>setRawFields(values=>({...values,[event.target.name]:event.target.value}))}
                    >
                      <option value="BUSINESS_DAY">Business day</option>
                      <option value="BUSINESS_WEEK">Business week</option>
                    </select>
                  </label>
                  <label>
                <span id={`${key}.aggregation-label`}> Aggregation </span>
                <select
                      aria-labelledby={`${key}.aggregation-label`}
                  name={`${key}.aggregation`}
                      value={rawFields[`${key}.aggregation`] ?? (String(rule?.aggregation ?? "COMPANY"))}
                  onChange={event=>setRawFields(values=>({...values,[event.target.name]:event.target.value}))}
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
                      value={rawFields[`${key}.boundary`] ?? (String(rule?.dayBoundaryTime ?? "00:00"))}
                  onChange={event=>setRawFields(values=>({...values,[event.target.name]:event.target.value}))}
                    />
                  </label>
                  <label>
                <span id={`${key}.weekStart-label`}> Week starts on </span>
                <select
                      aria-labelledby={`${key}.weekStart-label`}
                  name={`${key}.weekStart`}
                      value={rawFields[`${key}.weekStart`] ?? (String(rule?.weekStartsOn ?? 1))}
                  onChange={event=>setRawFields(values=>({...values,[event.target.name]:event.target.value}))}
                    >{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((day,i)=><option key={day} value={i}>{day}</option>)}</select>
                  </label>
                </>
              )}
              {scope ? <button type="button" className="q-link q-policy__default" onClick={()=>setModes(value=>({...value,[key]:"inherit"}))}>Use company default</button> : null}
            </div>{scope && mode !== "configured" && mode !== "inherit" ? <p className="q-help q-policy__note">Off at this location. <button type="button" className="q-link" onClick={()=>setModes(value=>({...value,[key]:"inherit"}))}>Use company default</button></p> : null}</fieldset></li>
          );
        })}</ul>
          {draft.recoveryFrom?<label className="policy-replacement-confirm"><input type="checkbox" checked={reviewed} disabled={busy||pending!==null||conflict||!writable} onChange={event=>setReviewed(event.target.checked)}/><span>I reviewed the complete replacement, including attendance and private labor settings. It replaces version {draft.expectedRevision} in full.</span></label>:null}
          {pending||draft.recoveryFrom?<div className="policy-actions"><button className="q-btn" disabled={busy||conflict||!writable||(!pending&&draft.recoveryFrom!==null&&!reviewed)} type="submit">{busy?"Saving…":pending?"Try saving again":"Save replacement version"}</button></div>:null}
        </form>
      </>:null}
      <p className="q-help q-policy-legal">Alerts only flag times for you to check, from each rule’s start date. They never change pay.</p>
      <div className="q-grp"><h2>Records</h2></div>
      <ul className="q-list">{draft?<li className="q-policy-private"><PrivateLaborReview settings={draft.settings} scope={scope} timeZone={timeZone} open={draft.recoveryFrom!==null}/></li>:null}<li><details className="q-details"><summary className="q-row q-row--one"><span className="q-rt"><b>History</b></span><span className="q-rv q-rv--l">{current.state==="not_configured"?"No changes yet":`Revision ${current.expectedRevision}`}</span><CaretRightIcon className="q-chev" aria-hidden="true"/></summary><div className="q-rule__body"><section className="policy-history"><h2>Policy history</h2><p>Saved versions for this location. A version marked unusable stays in the history but isn’t applied.</p><ul>{history.revisions.filter(item=>item.locationId===(scope||null)).sort((a,b)=>b.revision-a.revision).map(item=><li key={item.operationId}><strong>Revision {item.revision}</strong> · {formatBusinessTimestamp(item.changedAt,timeZone)}<br/>{item.state==="unavailable"?<span className="policy-history-unavailable">This version can’t be used. It stays in the history.</span>:item.revision===current.expectedRevision?"Current saved revision":"Earlier valid revision"}<br/>{item.changedKeys===null?"Change details unavailable":item.changedKeys.map(key=>fields.find(([name])=>key.includes(name))?.[1]??({"labor.compensation":"Compensation reference","labor.rates":"Employee rates","labor.budgets":"Labor budgets","labor.calculationMethod":"Calculation method reference"}[key]??"Policy setting")).join(", ")||"No rule changes"}</li>)}</ul>{!history.revisions.some(item=>item.locationId===(scope||null))?<p>No saved policy changes here yet.</p>:null}</section>
        <button className="q-btn q-btn--sec" type="button" disabled={busy} onClick={()=>void refresh()}>Refresh policy history</button></div></details></li></ul>
    </>}
  </div>;
}
