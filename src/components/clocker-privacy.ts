import type {ClockView} from '../lib/clocker/punch-client';
export type UnsentMode='confirm-out'|'select-break';
export type ClockContinuation={subject:string;mode:UnsentMode;binding:string};
export function verifiedDeadline(confirmedAt:number,expiresAt:string):number{
 const expiry=Date.parse(expiresAt);if(!Number.isFinite(confirmedAt)||!Number.isFinite(expiry))throw Error('Verification expiry is unavailable.');
 return Math.max(confirmedAt,Math.min(confirmedAt+30000,expiry));
}
export type PrivateScreenWindow={deadline:number;monotonicDeadline:number};
/** Wall time can shorten authority; only elapsed monotonic time can bound its maximum. */
export function privateScreenWindow(now:number,expiresAt:string,monotonicNow:number):PrivateScreenWindow|null{
 if(!Number.isFinite(monotonicNow))throw Error('Verification timing is unavailable.');
 const deadline=verifiedDeadline(now,expiresAt),budget=deadline-now;
 return budget>0?{deadline,monotonicDeadline:monotonicNow+budget}:null;
}
export function privateScreenRemaining(window:PrivateScreenWindow,now:number,monotonicNow:number):number{
 return Math.max(0,Math.min(window.deadline-now,window.monotonicDeadline-monotonicNow));
}

function binding(view:ClockView){const s=view.snapshot;return JSON.stringify([s.revision,s.entry?.id,s.entry?.version,s.break?.id,s.break?.version,view.breakTypes.map(t=>[t.id,t.version])]);}
export function continuationFor(view:ClockView,mode:string):ClockContinuation|null{
 if(mode!=='confirm-out'&&mode!=='select-break')return null;
 if(!view.allowedActions.includes(mode==='confirm-out'?'CLOCK_OUT':'START_BREAK'))return null;
 return {subject:view.subject,mode,binding:binding(view)};
}
export function resumeContinuation(held:ClockContinuation|null|undefined,view:ClockView):'ready'|UnsentMode{
 if(!held||held.subject!==view.subject||held.binding!==binding(view))return 'ready';
 return continuationFor(view,held.mode)?.mode??'ready';
}
