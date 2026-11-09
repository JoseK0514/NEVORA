import {parseTimecardsResponse,type TimecardsResult} from './read-model';
import type {Period} from './project';
import type {TimecardCommand,TimecardMutation} from './service';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function parseCurrentTimecards(value:unknown,period:Period):Extract<TimecardsResult,{state:'ready'}>{
 if(!object(value)||value.state!=='ready'||!Number.isFinite(value.validForMs)||Number(value.validForMs)<1||Number(value.validForMs)>45000)throw Error('Unconfirmed timecard lifetime');
 return {...parseTimecardsResponse(value,period),validForMs:Number(value.validForMs)};
}
/** Never retire an uncertain command on another operation's or revision's receipt. */
export function parseTimecardReceipt(value:unknown,command:TimecardCommand,httpStatus:number):TimecardMutation{
 if(!object(value))throw Error('Unknown receipt');
 const successful={APPROVE:'approved',FINALIZE:'finalized',REOPEN:'reopened'}[command.action];
 if(value.status===successful&&httpStatus===200&&value.operationId===command.operationId&&value.revision===command.expectedRevision+1&&Object.keys(value).length===3)return value as TimecardMutation;
 if(value.status==='outcome-unknown'&&httpStatus===503&&value.operationId===command.operationId&&Object.keys(value).length===2)return value as TimecardMutation;
 if(value.status==='blocked'&&httpStatus===409&&['self_review','unresolved_time','approval_required','period_state','overlapping_period','payroll_approved'].includes(String(value.reason))&&Object.keys(value).length===2)return value as TimecardMutation;
 if(((value.status==='conflict'&&httpStatus===409)||(value.status==='unavailable'&&httpStatus===503))&&Object.keys(value).length===1)return value as TimecardMutation;
 throw Error('Unknown receipt');
}
