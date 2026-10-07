import type {CorrectionContext} from '@/lib/time-corrections/read-model';

export function correctionStamp(at:string,zone:string){
  return new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(at));
}

export function CorrectionComparison({recordedStartAt,recordedEndAt,context,zone,proposedStartAt,proposedEndAt,recordedLabel='Recorded'}:{
  recordedLabel?:string;recordedStartAt:string|null;recordedEndAt:string|null;context:CorrectionContext;zone:string;proposedStartAt?:string;proposedEndAt?:string;
}){
  const interval=(start:string,end:string)=><><time dateTime={start}>{correctionStamp(start,zone)}</time> → <time dateTime={end}>{correctionStamp(end,zone)}</time></>;
  return <>
    <div className="correction-comparison">
      <div><small>{recordedLabel}</small><strong>{recordedStartAt&&recordedEndAt?interval(recordedStartAt,recordedEndAt):'No recorded entry'}</strong></div>
      <div><small>Current effective</small><strong>{context.state==='confirmed'?interval(context.startAt,context.endAt):context.state==='none'?'No approved missing-time adjustment':'Effective time unconfirmed'}</strong>
        {context.state==='confirmed'?<small>{context.sourceKind==='ADJUSTMENT'?(recordedLabel==='Approved missing time'||!recordedStartAt?'Approved missing time · no device punch':'Approved adjustment · original punch unchanged'):'Recorded time · no approved adjustment'}</small>:null}
      </div>
      {proposedStartAt&&proposedEndAt?<div><small>Proposed · {context.state==='none'?'awaiting approval':'pending review'}</small><strong>{interval(proposedStartAt,proposedEndAt)}</strong></div>:null}
    </div>
    <p className="correction-context-zone">Times in {zone}</p>
  </>;
}

export function PriorCorrectionDecisions({context,zone}:{context:CorrectionContext;zone:string}){
  if(context.state!=='confirmed')return null;
  return <div className="correction-prior-decisions">
    <p>{context.totalDecisions?`Prior decisions · Showing ${context.decisions.length} of ${context.totalDecisions}, most recent first`:'No prior decisions for this recorded time.'}</p>
    {context.decisions.length?<ol>{context.decisions.map((decision,index)=><li key={index}>
      <strong>{decision.status==='APPROVED'?'Approved':'Declined'} · <time dateTime={decision.decidedAt}>{correctionStamp(decision.decidedAt,zone)}</time></strong>
      <span>{correctionStamp(decision.startAt,zone)} → {correctionStamp(decision.endAt,zone)}{decision.status==='REJECTED'?' · did not change effective time':''}</span>
      {decision.note?<span>{decision.note}</span>:null}
    </li>)}</ol>:null}
  </div>;
}
