import type {ClockView} from '../lib/clocker/punch-client';
export type UnsentMode='confirm-out'|'select-break';
export type ClockContinuation={subject:string;mode:UnsentMode;binding:string};
export function verifiedDeadline(confirmedAt:number,expiresAt:string):number{
 const expiry=Date.parse(expiresAt);if(!Number.isFinite(confirmedAt)||!Number.isFinite(expiry))throw Error('Verification expiry is unavailable.');
 return Math.max(confirmedAt,Math.min(confirmedAt+30000,expiry));
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
