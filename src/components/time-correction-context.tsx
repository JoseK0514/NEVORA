import type {CorrectionContext} from '@/lib/time-corrections/read-model';
import { timeZoneLabel } from '@/lib/time-zone-label';

const yearIn=(at:string|Date,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric'}).format(new Date(at));
/** "Nov 3, 9:02 AM" (the year only when it isn't this year). */
export function correctionStamp(at:string,zone:string){
  const year=yearIn(at,zone)!==yearIn(new Date(),zone);
  return new Intl.DateTimeFormat('en-US',{timeZone:zone,...(year?{year:'numeric'}:{}),month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(at));
}
/** The end of an interval: its time alone when it falls on the start's day ("Nov 3, 9:02 AM → 5:32 PM"). */
function correctionEnd(start:string,end:string,zone:string){
  const day=(at:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
  return day(start)===day(end)?new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(end)):correctionStamp(end,zone);
}

/** "+35 min", "−1 h 10 min": how much longer or shorter the asked-for time is than the time it changes. */
function lengthChange(baseStart:string,baseEnd:string,start:string,end:string){
  const minutes=Math.round(((Date.parse(end)-Date.parse(start))-(Date.parse(baseEnd)-Date.parse(baseStart)))/60_000);
  if(!minutes)return null;
  const size=Math.abs(minutes),hours=Math.floor(size/60),rest=size%60;
  return `${minutes>0?'+':'−'}${hours?`${hours} h${rest?` ${rest} min`:''}`:`${rest} min`}`;
}

export function CorrectionComparison({recordedStartAt,recordedEndAt,context,zone,proposedStartAt,proposedEndAt,proposedLabel,recordedLabel='Recorded',compact=false,note}:{
  proposedLabel?:string;recordedLabel?:string;recordedStartAt:string|null;recordedEndAt:string|null;context:CorrectionContext;zone:string;proposedStartAt?:string;proposedEndAt?:string;
  /** Review B6 (NV-080), a manager deciding: two tiles (Recorded, Asked for) with the changed time in bold and how much it
   * changes; Current effective only when it differs from Recorded; the helper lines folded into one (`note`). */
  compact?:boolean;note?:string;
}){
  const interval=(start:string,end:string)=><><time dateTime={start}>{correctionStamp(start,zone)}</time> → <time dateTime={end}>{correctionEnd(start,end,zone)}</time></>;
  if(compact&&proposedStartAt&&proposedEndAt){
    const effective=context.state==='confirmed'?{start:context.startAt,end:context.endAt}:null;
    const differs=!!effective&&(!recordedStartAt||!recordedEndAt||Date.parse(effective.start)!==Date.parse(recordedStartAt)||Date.parse(effective.end)!==Date.parse(recordedEndAt));
    const base=differs?effective:recordedStartAt&&recordedEndAt?{start:recordedStartAt,end:recordedEndAt}:effective;
    const change=base?lengthChange(base.start,base.end,proposedStartAt,proposedEndAt):null;
    const moved=(a:string|undefined,b:string|undefined)=>!!a&&!!b&&Date.parse(a)!==Date.parse(b);
    const startTime=<time dateTime={proposedStartAt}>{correctionStamp(proposedStartAt,zone)}</time>,endTime=<time dateTime={proposedEndAt}>{correctionEnd(proposedStartAt,proposedEndAt,zone)}</time>;
    return <>
      <div className="correction-comparison correction-comparison--compact">
        <div><small>{recordedLabel}</small><strong>{recordedStartAt&&recordedEndAt?interval(recordedStartAt,recordedEndAt):'No recorded entry'}</strong></div>
        {differs&&effective?<div><small>Current effective</small><strong>{interval(effective.start,effective.end)}</strong>
          {context.state==='confirmed'&&context.sourceKind==='ADJUSTMENT'?<small>{recordedLabel==='Approved missing time'||!recordedStartAt?'Approved missing time · no device punch':'Approved adjustment · original punch unchanged'}</small>:null}</div>:null}
        <div className="correction-comparison__ask"><small>Asked for{change?<span className="correction-comparison__chg">{change}</span>:null}</small>
          <strong>{base&&moved(base.start,proposedStartAt)?<b>{startTime}</b>:startTime} → {base&&moved(base.end,proposedEndAt)?<b>{endTime}</b>:endTime}</strong></div>
      </div>
      <p className="correction-context-zone">{[`Times in ${timeZoneLabel(zone)}`,note].filter(Boolean).join('. ')}{note?'.':''}</p>
    </>;
  }
  return <>
    <div className="correction-comparison">
      <div><small>{recordedLabel}</small><strong>{recordedStartAt&&recordedEndAt?interval(recordedStartAt,recordedEndAt):'No recorded entry'}</strong></div>
      <div><small>Current effective</small><strong>{context.state==='confirmed'?interval(context.startAt,context.endAt):context.state==='none'?'No approved missing-time adjustment':'Effective time unconfirmed'}</strong>
        {context.state==='confirmed'?<small>{context.sourceKind==='ADJUSTMENT'?(recordedLabel==='Approved missing time'||!recordedStartAt?'Approved missing time · no device punch':'Approved adjustment · original punch unchanged'):'Recorded time · no approved adjustment'}</small>:null}
      </div>
      {proposedStartAt&&proposedEndAt?<div><small>{proposedLabel??('Proposed · '+(context.state==='none'?'awaiting approval':'pending review'))}</small><strong>{interval(proposedStartAt,proposedEndAt)}</strong></div>:null}
    </div>
    <p className="correction-context-zone">Times in {timeZoneLabel(zone)}</p>
  </>;
}

export function PriorCorrectionDecisions({context,zone}:{context:CorrectionContext;zone:string}){
  if(context.state!=='confirmed')return null;
  return <div className="correction-prior-decisions">
    <p>{context.totalDecisions?`Prior decisions · Showing ${context.decisions.length} of ${context.totalDecisions}, most recent first`:'No prior decisions for this recorded time.'}</p>
    {context.decisions.length?<ol>{context.decisions.map((decision,index)=><li key={index}>
      <strong>{decision.status==='APPROVED'?'Approved':'Declined'} · <time dateTime={decision.decidedAt}>{correctionStamp(decision.decidedAt,zone)}</time></strong>
      <span>{correctionStamp(decision.startAt,zone)} → {correctionEnd(decision.startAt,decision.endAt,zone)}{decision.status==='REJECTED'?' · did not change effective time':''}</span>
      {decision.note?<span>{decision.note}</span>:null}
    </li>)}</ol>:null}
  </div>;
}
