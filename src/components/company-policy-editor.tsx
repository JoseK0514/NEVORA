"use client";
import {DiscardGuard} from "./kit/discard-dialog";
import {useState,useRef,useEffect} from "react";
import {ArrowCounterClockwiseIcon} from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import {ShieldWarningIcon} from "@phosphor-icons/react/dist/ssr/ShieldWarning";
import {CaretRightIcon} from "@phosphor-icons/react/dist/ssr/CaretRight";
import {BState} from "./owner-b/b-kit";
import {CorpFormFooter} from "./corp/corp";
import {FieldB,ResultB,SwitchRowB} from "@/app/app/settings/settings-b-form";
import {formatBusinessDateTimeInput,policyEffectiveInstant} from "@/lib/business-time";
import type {CompanyPolicyHistory,PolicyScopeHistory,PolicyHistoryRevision} from "@/lib/business-improvements/company-policies/history";
import type {CompanyPolicySettings,CompanyPolicyCommand} from "@/lib/business-improvements/company-policies/model";
import {usePortalLang} from "@/lib/i18n/portal-lang";
import {COMPANY_POLICY_COPY,type CompanyPolicyCopy} from "./company-policy-copy";
const fields = [
  ["lateness", "Lateness"], ["earlyDeparture", "Early departure"],
  ["missingClockIn", "Missing clock-in"], ["missingClockOut", "Missing clock-out"],
  ["overtimeRisk", "Actual-time overtime risk"], ["longEntry", "Unusually long entry"],
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
    if(raw===null||String(raw).trim()==="")throw Error("Enter how many minutes for each rule that is on.");
    const old=key==="overtimeRisk"?base.labor?.overtimeRisk:base.attendance?.[key];
    const rule:Record<string,unknown>={thresholdMinutes:Number(raw),comparison:data.get(`${key}.comparison`),effectiveFrom:policyEffectiveInstant(String(data.get(`${key}.effective`)??""),old?.effectiveFrom,timeZone)};
    if(key==="longEntry")Object.assign(rule,{basis:data.get(`${key}.basis`),appliesTo:data.get(`${key}.appliesTo`)});
    if(key==="missingClockIn"||key==="missingClockOut")Object.assign(rule,{association:"CAPTURED_PUBLISHED_SHIFT",cutoff:key==="missingClockOut"?"AFTER_SCHEDULE_END":data.get(`${key}.cutoff`)});
    if(key==="overtimeRisk")Object.assign(rule,{basis:data.get(`${key}.basis`),window:data.get(`${key}.window`),aggregation:data.get(`${key}.aggregation`),dayBoundaryTime:data.get(`${key}.boundary`),...(data.get(`${key}.window`)==="BUSINESS_WEEK"?{weekStartsOn:Number(data.get(`${key}.weekStart`))}:{})});
    section[key]=rule;
  }
  return {version:1,...(base.attendance!==undefined||Object.keys(attendance).length?{attendance}:{}),...(base.labor!==undefined||Object.keys(labor).length?{labor}:{})} as CompanyPolicySettings;
}
function PrivateLaborReview({settings,scope,timeZone,open=false,t}:{settings:CompanyPolicySettings;scope:string;timeZone:string;open?:boolean;t:CompanyPolicyCopy}) {
  const labor=settings.labor,when=(iso:string)=>t.when(iso,timeZone);
  const absent=(value:unknown)=>value===undefined?(scope?t.inheritDefault:t.notSet):value===null?t.explicitlyNotConfigured:null;
  const location=(id:string|null)=>id?t.locationId(id):t.allLocations;
  // Release 1: a row like its siblings ("Policy history"); the values open under it. Editing alerts never changes them.
  return <details className="policy-private-review cp-details" open={open}>
    <summary className="c-row c-row--one"><span className="c-row__main"><span className="c-row__title">{t.laborSettings}</span></span><span className="c-row__value c-row__value--soft">{t.ownerOnly}</span><CaretRightIcon weight="bold" className="c-chev" aria-hidden="true"/></summary>
    <div className="cp-details__body"><p>{t.laborIntro}</p>
    <dl><div><dt>{t.compensationReference}</dt><dd>{absent(labor?.compensation)??<>{labor!.compensation!.ruleReference}<br/>{labor!.compensation!.breakTreatment==="INCLUDE_ALL_RECORDED_BREAKS"?t.includeAllBreaks:t.excludeBreakTypes(labor!.compensation!.excludedBreakTypeIds.join(", "))}<br/>{t.effective} {when(labor!.compensation!.effectiveFrom)}</>}</dd></div>
    <div><dt>{t.employeeRates}</dt><dd>{absent(labor?.rates)??(labor!.rates!.length?<ul>{labor!.rates!.map(rate=><li key={rate.id}><strong>{rate.rate} {rate.currency}</strong> · {rate.rateUnit==="HOUR"?t.perHour:rate.rateUnit==="SHIFT"?t.perShift:t.perSalaryPeriod}<br/>{t.employee} {rate.employeeId} · {location(rate.locationId)} · {t.reference} {rate.id}<br/>{when(rate.validFrom)} — {rate.validUntil?when(rate.validUntil):t.noEndDate}</li>)}</ul>:t.emptyRates)}</dd></div>
    <div><dt>{t.laborBudgets}</dt><dd>{absent(labor?.budgets)??(labor!.budgets!.length?<ul>{labor!.budgets!.map(budget=><li key={budget.id}><strong>{budget.amount} {budget.currency}</strong> · {location(budget.locationId)} · {t.reference} {budget.id}<br/>{when(budget.startAt)} — {when(budget.endAt)}</li>)}</ul>:t.emptyBudgets)}</dd></div>
    <div><dt>{t.calculationReference}</dt><dd>{absent(labor?.calculationMethod)??<>{labor!.calculationMethod!.id} · {t.revisionWord} {labor!.calculationMethod!.revision}</>}</dd></div></dl></div>
  </details>;
}
export function CurrentPolicyRules({settings,scope,timeZone,lang}: {settings:CompanyPolicySettings;scope:string;timeZone:string;lang?:"en"|"es"}) {
  const portal=usePortalLang(),t=COMPANY_POLICY_COPY[lang??portal];
  return <ul className="policy-current-rules">{fields.map(([key])=>{
    const label=t.fields[key];
    const rule=key==="overtimeRisk"?settings.labor?.overtimeRisk:settings.attendance?.[key];
    if(rule===undefined||rule===null) {
      return <li key={key}><strong>{label}</strong><p>{rule===null?t.disabled:scope?t.inheritDefault:t.disabledByDefault}</p></li>;
    }
    const details:Array<[string,string]>=[
      // Final polish (finding 29): plain words for the stored rule (thresholdMinutes, comparison GT/GTE, effectiveFrom).
      [t.afterMinutes,String(rule.thresholdMinutes)],
      [t.whenTimeIs,rule.comparison==="GT"?t.moreThan:t.atLeast],
      [t.startsOn,t.when(rule.effectiveFrom,timeZone)],
    ];
    const longEntry=key==="longEntry"?settings.attendance?.longEntry:null;
    if(longEntry) {
      details.push([t.timeBasis,longEntry.basis==="RECORDED_ELAPSED"?t.recordedElapsed:t.effectiveAfterCorrections]);
      details.push([t.entries,longEntry.appliesTo==="OPEN"?t.currentlyOpen:longEntry.appliesTo==="CLOSED"?t.completed:t.openAndCompleted]);
    }
    const missing=key==="missingClockIn"?settings.attendance?.missingClockIn:key==="missingClockOut"?settings.attendance?.missingClockOut:null;
    if(missing) {
      details.push([t.scheduleAssociation,t.capturedShift]);
      details.push([t.checkInEnds,missing.cutoff==="AFTER_SCHEDULE_START"?t.afterStart:t.afterEnd]);
    }
    const overtime=key==="overtimeRisk"?settings.labor?.overtimeRisk:null;
    if(overtime) {
      details.push([t.timeBasis,overtime.basis==="RECORDED_ELAPSED_INCLUDING_BREAKS"?t.recordedWithBreaks:t.effectiveWithBreaks]);
      details.push([t.window,overtime.window==="BUSINESS_DAY"?t.businessDay:t.businessWeek]);
      details.push([t.aggregation,overtime.aggregation==="COMPANY"?t.acrossCompany:t.atThisLocation]);
      details.push([t.dayStarts,overtime.dayBoundaryTime]);
      if(overtime.window==="BUSINESS_WEEK") {
        details.push([t.weekStartsOn,overtime.weekStartsOn===undefined?t.notSet:t.days[overtime.weekStartsOn]]);
      }
    }
    return <li key={key}><strong>{label}</strong><dl>{details.map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></li>;
  })}</ul>;
}
export function CompanyPolicyEditor({history:initialHistory,locations,timeZone}:{history:CompanyPolicyHistory;locations:{id:string;name:string;active:boolean}[];timeZone:string}) {
  const t=COMPANY_POLICY_COPY[usePortalLang()],when=(iso:string)=>t.when(iso,timeZone);
  const submitGate=useRef(false),readGate=useRef(false),noticeRef=useRef<HTMLDivElement>(null);
  const confirmedReceipt=useRef<number|null>(null);
  const [history,setHistory]=useState(initialHistory),[scope,setScope]=useState("");
  const [draft,setDraft]=useState<Draft|null>(()=>currentDraft(initialHistory,null));
  const [draftEpoch,setDraftEpoch]=useState(0),[modes,setModes]=useState<Record<string,string>>({});
  const [rawFields,setRawFields]=useState<Record<string,string>>({});
  const [notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[readState,setReadState]=useState<ReadState>("ready");
  const [pending,setPending]=useState<CompanyPolicyCommand|null>(null),[conflict,setConflict]=useState(false),[reviewed,setReviewed]=useState(false);
  // Final polish (Nov 20, 2026): Save appears after a change (DESIGN.MD Forms), as on Company profile. A draft is changed
  // once a switch or a field in this scope's form was touched; a fresh draft (another scope, a reload, a save) is not.
  const formKey=`${scope}:${draftEpoch}`;
  const [touched,setTouched]=useState<string|null>(null);
  const dirty=touched===formKey||Object.keys(modes).length>0;
  const current=selectedScope(history,scope||null),company=selectedScope(history,null);
  const writable=!scope||locations.some(item=>item.id===scope&&item.active);
  const editableSettings=draft?.settings;
  const previousValid=history.revisions.filter((item):item is ValidRevision=>item.locationId===(scope||null)&&item.state==="valid"&&item.revision<current.expectedRevision).sort((a,b)=>b.revision-a.revision)[0];
  const scopeOptions=[...locations,...history.scopes.filter(item=>item.locationId&&!locations.some(location=>location.id===item.locationId)).map(item=>({id:item.locationId!,name:t.historicalLocation(item.locationId!),active:false}))];
  function announce(message:string){setNotice(message);requestAnimationFrame(()=>noticeRef.current?.focus({preventScroll:false}));}
  function adoptCurrent(next:CompanyPolicyHistory){confirmedReceipt.current=null;setDraft(currentDraft(next,scope||null));setDraftEpoch(value=>value+1);setModes({});setRawFields({});setReviewed(false);setConflict(false);}
  function denyAccess(){confirmedReceipt.current=null;setPending(null);setDraft(null);setRawFields({});setHistory({revisions:[],scopes:[]});setReadState("unauthorized");announce(t.accessEnded);}
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
      if(reconciled){setPending(null);adoptCurrent(next);announce(t.earlierSaveWent(reconciled.revision,latest.expectedRevision));}
      else if(receipt!==undefined){adoptCurrent(next);announce(t.versionSaved(receipt,latest.expectedRevision));}
      else if(retained){announce(t.stillUnconfirmed(latest.expectedRevision));}
      else if(conflicted||(draft&&latest.expectedRevision!==draft.expectedRevision)){setConflict(true);announce(t.draftNotSaved(latest.expectedRevision));}
      else if(replaceDraft||!draft){adoptCurrent(next);announce(t.versionLoaded(latest.expectedRevision));}
      else{announce(t.historyRefreshed(latest.expectedRevision));}
    }catch{setReadState("unavailable");announce(receipt!==undefined?t.savedButNotLoaded(receipt):t.didntLoad);}
    finally{readGate.current=false;}
  }
  async function submit(form:HTMLFormElement){
    if(submitGate.current||readState!=="ready"||!writable||conflict||!draft||(!pending&&draft.recoveryFrom&&!reviewed))return;
    const command=pending??{operationId:crypto.randomUUID(),expectedRevision:draft.expectedRevision,locationId:scope||null,settings:buildPolicySettings(new FormData(form),draft.settings,timeZone)};
    setDraft({...draft,settings:command.settings});setPending(command);submitGate.current=true;setBusy(true);setNotice(t.saving);
    try{
      const response=await fetch("/api/company-policies",{method:"POST",cache:"no-store",credentials:"same-origin",headers:{"content-type":"application/json","x-nevora-company-policies":"1"},body:JSON.stringify(command)});
      if(response.status===401||response.status===403){denyAccess();return;}
      if(response.status===400){setPending(null);announce(t.checkMinutes);return;}
      if(response.status===409){setPending(null);setConflict(true);announce(t.policiesChanged);await refresh({retained:null,conflicted:true});return;}
      if(!response.ok)throw Error();
      const body=await response.json() as {state?:string;result?:{revision?:number}};
      if(body.state!=="saved"||!Number.isSafeInteger(body.result?.revision)||body.result!.revision!<1)throw Error();
      confirmedReceipt.current=body.result!.revision!;
      setPending(null);await refresh({receipt:confirmedReceipt.current,retained:null});
    }catch{announce(t.saveUnconfirmed);}
    finally{submitGate.current=false;setBusy(false);}
  }
  function startRecovery(){if(!previousValid||!writable||pending||busy||readState!=="ready")return;setDraft({settings:previousValid.settings,expectedRevision:current.expectedRevision,recoveryFrom:previousValid});setDraftEpoch(value=>value+1);setModes({});setRawFields({});setReviewed(false);setConflict(false);announce(t.draftStarted(previousValid.revision,current.expectedRevision));}
  // Quiet (v4): at a location, a rule that follows the company is on when the company's rule is on.
  const inheritedOn=(key:(typeof fields)[number][0])=>{const settings=company.state==="valid"?company.selected.settings:null;const rule=key==="overtimeRisk"?settings?.labor?.overtimeRisk:settings?.attendance?.[key];return rule!==undefined&&rule!==null;};
  const disabledAll=busy||pending!==null||conflict||!writable;
  const showSave=(dirty||busy||pending!==null)&&!!draft&&!draft.recoveryFrom;
  const field=(key:string,name:string,label:string,control:{kind?:"select";type?:string;min?:string;max?:string;fallback:string;options?:[string,string][]})=>{
    const id=`${key}.${name}`;
    const value=rawFields[id]??control.fallback;
    const onChange=(event:{target:{name:string;value:string}})=>setRawFields(values=>({...values,[event.target.name]:event.target.value}));
    return control.kind==="select"
      ?<FieldB kind="select" id={`cp-${key}-${name}`} name={id} label={label} value={value} onChange={onChange}>{control.options!.map(([v,l])=><option key={v} value={v}>{l}</option>)}</FieldB>
      :<FieldB id={`cp-${key}-${name}`} name={id} label={label} type={control.type} min={control.min} max={control.max} value={value} onChange={onChange}/>;
  };
  // Settings in Direction B (Nov 23, 2026): the page's frame (band, ‹ Settings, the title and the phone's Save) is
  // SettingsPageB in page.tsx; this editor draws the cards, each a direct child of the page. Wording is unchanged.
  return <>
    <section className="c-card" aria-labelledby="company-policy-scope-label"><div className="c-setb-fields cp-scope">
      <div className="c-field c-setb-field"><label className="c-field__label" id="company-policy-scope-label" htmlFor="company-policy-scope">{t.appliesTo}</label>
      <select id="company-policy-scope" className="c-in" value={scope} disabled={busy||pending!==null||conflict||readState!=="ready"} onChange={event=>{const next=event.target.value;setScope(next);setDraft(currentDraft(history,next||null));setDraftEpoch(value=>value+1);setModes({});setRawFields({});setReviewed(false);setNotice("");}}><option value="">{t.allLocations}</option>{scopeOptions.map(item=><option key={item.id} value={item.id}>{item.name}{item.active?"":t.inactiveSuffix}</option>)}</select></div>
    </div></section>
    {notice?<ResultB innerRef={noticeRef} tone="info">{notice}</ResultB>:<div ref={noticeRef} tabIndex={-1} className="c-sr" role="status" aria-live="polite"/>}
    {readState!=="ready"?<section className="c-card policy-state" aria-busy={readState==="loading"}><BState silent kind={readState==="loading"?"loading":readState==="unauthorized"?"locked":"failed"} title={readState==="loading"?t.readingPolicies:readState==="unauthorized"?t.accessEndedTitle:t.unavailableTitle} line={readState==="loading"?t.readingLine:readState==="unauthorized"?t.signInLine:t.unavailableLine}><span className="cp-acts">{readState==="unauthorized"?<a className="c-btn c-btn--secondary" href="/login">{t.signInAgain}</a>:<button className="c-btn c-btn--secondary" type="button" disabled={readState==="loading"||busy} onClick={()=>void refresh()}><ArrowCounterClockwiseIcon weight="bold" className="c-ic" aria-hidden="true"/>{t.retryRead}</button>}</span></BState></section>:<>
      {scope&&company.state==="unavailable"?<section className="c-card policy-state"><BState silent kind="paused" title={t.defaultsNeedCorrection} line={t.companyVersionUnusable(company.expectedRevision)}/></section>:null}
      {!writable?<section className="c-card policy-state"><BState silent kind="locked" title={t.historicalTitle} line={t.historicalLine}/></section>:null}
      {current.state==="unavailable"?<section className="c-card policy-state"><BState silent kind="paused" icon={<ShieldWarningIcon weight="bold"/>} title={t.versionUnusable(current.expectedRevision)} line={t.attendanceOff}>{previousValid&&writable?<><p className="cp-more">{t.canStartFrom(previousValid.revision,when(previousValid.changedAt))}</p><span className="cp-acts"><button className="c-btn c-btn--secondary" type="button" disabled={busy||pending!==null} onClick={startRecovery}>{t.startFrom(previousValid.revision)}</button></span></>:<p className="cp-more">{t.correctionHeld}</p>}</BState></section>:null}
      {conflict?<section className="c-card policy-state"><BState silent kind="paused" title={t.freshReview} line={t.draftBelowNotSaved(current.expectedRevision)}>{current.state==="valid"?<details className="policy-current-comparison cp-details"><summary className="c-row c-row--one"><span className="c-row__main"><span className="c-row__title">{t.compareCurrent}</span></span><CaretRightIcon weight="bold" className="c-chev" aria-hidden="true"/></summary><div className="cp-details__body"><CurrentPolicyRules settings={current.selected.settings} scope={scope} timeZone={timeZone}/><PrivateLaborReview settings={current.selected.settings} scope={scope} timeZone={timeZone} t={t}/></div></details>:null}<span className="cp-acts"><button className="c-btn c-btn--secondary" type="button" disabled={busy||pending!==null} onClick={()=>{adoptCurrent(history);announce(t.draftDiscarded(current.expectedRevision));}}>{t.discardDraft}</button></span></BState></section>:null}
      {draft?<>
        {draft.recoveryFrom?<section className="c-card policy-state"><BState silent kind="paused" title={t.reviewReplacement} line={t.startedFrom(draft.recoveryFrom.revision,when(draft.recoveryFrom.changedAt),draft.expectedRevision)}><p className="cp-more">{t.checkEveryRule}</p></BState></section>:null}
        {/* The rules are one card: the switch rows, each rule's fields under its row, the legal line as the card's note and
            Save in its footer (tablets and desktop) or on the band (phones), shown once something changed. */}
        <form id="policy-form" key={formKey} className="c-card c-setb-form policy-form" aria-labelledby="policy-form-label" aria-busy={busy}
          data-save-on-change="" data-dirty={showSave?"":undefined}
          onInput={()=>setTouched(formKey)} onChange={()=>setTouched(formKey)} onSubmit={event=>{event.preventDefault();void submit(event.currentTarget).catch(()=>announce(t.enterMinutes));}}>
        <div className="c-card__head"><h2 className="c-card__label" id="policy-form-label">{t.tellMeAbout}</h2></div>
        <ul className="c-rows q-policy-list">{fields.map(([key]) => {
          const label = t.fields[key];
          const rule = (key === "overtimeRisk" ? editableSettings?.labor?.overtimeRisk : editableSettings?.attendance?.[key]) as Record<string, unknown> | null | undefined;
          const mode=modes[key] ?? (rule === undefined ? "inherit" : rule === null ? "none" : "configured");
          const str=(name:string,fallback:string)=>rule?.[name]!==undefined&&rule?.[name]!==null?String(rule[name]):fallback;
          return (
            <li key={key} className="cp-rule"><fieldset disabled={disabledAll} className="c-setb-fieldset">
              <legend className="c-sr">{label}</legend>
              {/* Quiet (v4): on is a custom threshold; off disables the rule (or keeps the default when nothing was saved).
                  At a location, a rule that follows the company shows the company's state and says so. */}
              <SwitchRowB id={`cp-${key}`} label={t.rowNames[key]} description={scope && mode === "inherit" ? t.companyDefault : undefined} disabled={disabledAll}
                checked={mode === "configured" || (mode === "inherit" && !!scope && inheritedOn(key))}
                onChange={on=>setModes(value=>({...value,[key]:on?"configured":scope||rule!==undefined?"none":"inherit"}))}/>
              <input type="hidden" name={`${key}.mode`} value={mode}/>
              <div className="c-setb-fields cp-rule__fields policy-rule-fields" hidden={mode !== "configured"}>
                {field(key,"threshold",t.afterMinutes,{type:"number",min:"0",max:"525600",fallback:rule?String(rule.thresholdMinutes):""})}
                {field(key,"comparison",t.whenTimeIs,{kind:"select",fallback:str("comparison","GT"),options:[["GT",t.moreThan],["GTE",t.atLeast]]})}
                {field(key,"effective",t.startsOn,{type:"datetime-local",fallback:formatBusinessDateTimeInput(rule?.effectiveFrom ? String(rule.effectiveFrom) : undefined,timeZone)})}
                {key === "longEntry" ? <>
                  {field(key,"basis",t.timeBasis,{kind:"select",fallback:str("basis","RECORDED_ELAPSED"),options:[["RECORDED_ELAPSED",t.recordedElapsed],["EFFECTIVE_ELAPSED",t.effectiveAfterCorrections]]})}
                  {field(key,"appliesTo",t.entries,{kind:"select",fallback:str("appliesTo","BOTH"),options:[["OPEN",t.currentlyOpen],["CLOSED",t.completed],["BOTH",t.openAndCompleted]]})}
                </> : null}
                {key === "missingClockIn" ? field(key,"cutoff",t.checkInEnds,{kind:"select",fallback:str("cutoff","AFTER_SCHEDULE_END"),options:[["AFTER_SCHEDULE_START",t.afterStart],["AFTER_SCHEDULE_END",t.afterEnd]]}) : null}
                {key === "overtimeRisk" ? <>
                  {field(key,"basis",t.timeBasis,{kind:"select",fallback:str("basis","EFFECTIVE_ELAPSED_INCLUDING_BREAKS"),options:[["RECORDED_ELAPSED_INCLUDING_BREAKS",t.recordedWithBreaks],["EFFECTIVE_ELAPSED_INCLUDING_BREAKS",t.effectiveWithBreaks]]})}
                  {field(key,"window",t.window,{kind:"select",fallback:str("window","BUSINESS_WEEK"),options:[["BUSINESS_DAY",t.businessDay],["BUSINESS_WEEK",t.businessWeek]]})}
                  {field(key,"aggregation",t.aggregation,{kind:"select",fallback:str("aggregation","COMPANY"),options:[["COMPANY",t.acrossCompany],["LOCATION",t.atThisLocation]]})}
                  {field(key,"boundary",t.dayStarts,{type:"time",fallback:str("dayBoundaryTime","00:00")})}
                  {field(key,"weekStart",t.weekStartsOn,{kind:"select",fallback:str("weekStartsOn","1"),options:t.days.map((day,i)=>[String(i),day] as [string,string])})}
                </> : null}
                {scope ? <span><button type="button" className="c-link cp-default" onClick={()=>setModes(value=>({...value,[key]:"inherit"}))}>{t.useCompanyDefault}</button></span> : null}
              </div>
              {scope && mode !== "configured" && mode !== "inherit" ? <p className="cp-note">{t.offHere} <button type="button" className="c-link cp-default" onClick={()=>setModes(value=>({...value,[key]:"inherit"}))}>{t.useCompanyDefault}</button></p> : null}
            </fieldset></li>
          );
        })}</ul>
        {draft.recoveryFrom?<label className="c-row cp-confirm policy-replacement-confirm"><input type="checkbox" className="cp-check" checked={reviewed} disabled={disabledAll} onChange={event=>setReviewed(event.target.checked)}/><span className="c-row__main"><span className="c-row__title cp-confirm__t">{t.reviewedConfirm(draft.expectedRevision)}</span></span></label>:null}
        <p className="c-setb-cardnote q-policy-legal">{t.neverChangePay}</p>
        {showSave?<CorpFormFooter><button type="submit" className="c-btn" disabled={busy||conflict||!writable||readState!=="ready"||pending!==null}>{busy?t.saving:t.save}</button></CorpFormFooter>:null}
        {pending||draft.recoveryFrom?<><CorpFormFooter><button className="c-btn" disabled={busy||conflict||!writable||(!pending&&draft.recoveryFrom!==null&&!reviewed)} type="submit">{busy?"Saving…":pending?"Try saving again":"Save replacement version"}</button></CorpFormFooter>
          <div className="c-only-phone c-setb-phoneacts"><button className="c-btn" disabled={busy||conflict||!writable||(!pending&&draft.recoveryFrom!==null&&!reviewed)} type="submit">{busy?"Saving…":pending?"Try saving again":"Save replacement version"}</button></div></>:null}
        </form>
      </>:<p className="c-note q-policy-legal">{t.neverChangePay}</p>}
      <section className="c-card" aria-labelledby="policy-records-label">
        <div className="c-card__head"><h2 className="c-card__label" id="policy-records-label">{t.records}</h2></div>
        <ul className="c-rows">{draft?<li className="q-policy-private"><PrivateLaborReview settings={draft.settings} scope={scope} timeZone={timeZone} open={draft.recoveryFrom!==null} t={t}/></li>:null}<li><details className="cp-details"><summary className="c-row c-row--one"><span className="c-row__main"><span className="c-row__title">{t.history}</span></span><span className="c-row__value c-row__value--soft">{current.state==="not_configured"?t.noChangesYet:t.revision(current.expectedRevision)}</span><CaretRightIcon weight="bold" className="c-chev" aria-hidden="true"/></summary><div className="cp-details__body policy-history"><p>{t.historyIntro}</p><ul>{history.revisions.filter(item=>item.locationId===(scope||null)).sort((a,b)=>b.revision-a.revision).map(item=><li key={item.operationId}><strong>{t.revision(item.revision)}</strong> · {when(item.changedAt)}<br/>{item.state==="unavailable"?<span className="policy-history-unavailable">{t.unusableInHistory}</span>:item.revision===current.expectedRevision?t.currentRevision:t.earlierRevision}<br/>{item.changedKeys===null?t.changeDetailsUnavailable:item.changedKeys.map(key=>{const rule=fields.find(([name])=>key.includes(name));return rule?t.fields[rule[0]]:({"labor.compensation":t.compensationReference,"labor.rates":t.employeeRates,"labor.budgets":t.laborBudgets,"labor.calculationMethod":t.calculationReference}[key]??t.policySetting);}).join(", ")||t.noRuleChanges}</li>)}</ul>{!history.revisions.some(item=>item.locationId===(scope||null))?<p>{t.noSavedChanges}</p>:null}
        <span className="cp-acts"><button className="c-btn c-btn--secondary" type="button" disabled={busy} onClick={()=>void refresh()}>{t.refreshHistory}</button></span></div></details></li></ul>
      </section>
    </>}
    {/* Leaving with rule changes that are not saved asks first (Nov 21, 2026). Not once access has ended or the draft is gone. */}
    <DiscardGuard dirty={dirty&&draft!==null&&readState!=="unauthorized"}/>
  </>;
}
