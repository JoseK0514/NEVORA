import type { PunchAction, PunchCommand, PunchExpected } from './punch-types';
export type PunchErrorCode = 'INVALID_INPUT'|'AUTH_REQUIRED'|'CONTEXT_CHANGED'|'STALE_STATE'|'COMMAND_REUSED'|'INVALID_TRANSITION'|'OTHER_LOCATION'|'INTEGRITY'|'CLOCK_INVALID'|'UNAVAILABLE';
const messages:Record<PunchErrorCode,string>={
 INVALID_INPUT:'Check the clock action and reload its current state.',
 AUTH_REQUIRED:'Verify your PIN again on this registered tablet.',
 CONTEXT_CHANGED:'Tablet verification changed. Do not replay the previous action.',
 STALE_STATE:'Your clock state changed. Reload before choosing an action.',
 COMMAND_REUSED:'This command ID already belongs to a different action. Check its saved receipt.',
 INVALID_TRANSITION:'This clock action is not available in the current state.',
 OTHER_LOCATION:'This shift is open at another location. Use a registered tablet at that location.',
 INTEGRITY:'Recorded clock data is inconsistent. No time was changed. Ask your manager for assistance.',
 CLOCK_INVALID:'The server clock does not agree with recorded time. No time was changed.',
 UNAVAILABLE:'The clock result could not be confirmed. Check the original command receipt before retrying.',
};
export class ClockerPunchError extends Error {
 constructor(public readonly code:PunchErrorCode){super(messages[code]);this.name='ClockerPunchError';}
}
const actions:readonly string[]=['CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT'];
function object(value:unknown):value is Record<string,unknown>{return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function exact(value:Record<string,unknown>,keys:string[]){return Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));}
const integer=(value:unknown,min:number):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=min&&value<=2147483647;
const id=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=128&&!/[\u0000-\u001f\u007f]/.test(value);
export function parseCommandId(value:unknown):string{
 if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value))throw new ClockerPunchError('INVALID_INPUT');
 return value;
}
export function parsePunchCommand(value:unknown):PunchCommand{
 if(!object(value)||!exact(value,['commandId','action','verificationId','expected'])||
  typeof value.action!=='string'||!actions.includes(value.action)||
  typeof value.verificationId!=='string'||!/^[a-f0-9]{64}$/.test(value.verificationId)||
  !object(value.expected)||!exact(value.expected,['revision','timeEntryId','timeEntryVersion','breakEntryId','breakEntryVersion']))throw new ClockerPunchError('INVALID_INPUT');
 const e=value.expected;
 if(!integer(e.revision,0)||
  !(e.timeEntryId===null?e.timeEntryVersion===null:id(e.timeEntryId)&&integer(e.timeEntryVersion,1))||
  !(e.breakEntryId===null?e.breakEntryVersion===null:id(e.breakEntryId)&&integer(e.breakEntryVersion,1)&&e.timeEntryId!==null))throw new ClockerPunchError('INVALID_INPUT');
 return {commandId:parseCommandId(value.commandId),action:value.action as PunchAction,verificationId:value.verificationId,
  expected:{revision:e.revision,timeEntryId:e.timeEntryId,timeEntryVersion:e.timeEntryVersion,breakEntryId:e.breakEntryId,breakEntryVersion:e.breakEntryVersion} as PunchExpected};
}
