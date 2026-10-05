export type PunchAction = 'CLOCK_IN' | 'START_BREAK' | 'END_BREAK' | 'CLOCK_OUT';
export type PunchCommand = {
 commandId: string; action: PunchAction; expectedRevision: number;
 expectedEntryId: string | null; expectedEntryVersion: number | null;
 expectedBreakId: string | null; expectedBreakVersion: number | null;
};
export type PunchBreak = { id: string; version: number; startAt: string; endAt: string | null };
export type PunchEntry = {
 id: string; version: number; locationId: string; status: 'CLOCKED_IN' | 'ON_BREAK' | 'CLOCKED_OUT';
 clockInAt: string; clockOutAt: string | null; breaks: PunchBreak[];
};
export type PunchState = { revision: number; currentEntry: PunchEntry | null };
export type PunchReceipt = { commandId: string; action: PunchAction; revision: number; recordedAt: string; entry: PunchEntry };
export type PunchErrorCode = 'INVALID' | 'STALE' | 'TRANSITION' | 'WRONG_LOCATION' | 'COMMAND_REUSED' | 'UNAVAILABLE' | 'UNAUTHORIZED';
const messages: Record<PunchErrorCode,string> = {
 INVALID: 'Invalid punch command. Refresh the tablet state before continuing.',
 STALE: 'Your clock state changed. Refresh before trying another action.',
 TRANSITION: 'This action is not available for your current clock state.',
 WRONG_LOCATION: 'This entry belongs to another location. Use its registered Clocker.',
 COMMAND_REUSED: 'This command identifier was already used for a different request.',
 UNAVAILABLE: 'The punch result could not be confirmed. Check its status before retrying.',
 UNAUTHORIZED: 'Tablet verification expired or changed. Enter your PIN again.',
};
export class ClockerPunchError extends Error {
 constructor(public readonly code: PunchErrorCode) { super(messages[code]); this.name='ClockerPunchError'; }
}
const keys = ['commandId','action','expectedRevision','expectedEntryId','expectedEntryVersion','expectedBreakId','expectedBreakVersion'];
const positive=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>0&&v<=2147483647;
const id=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
export function parsePunchCommand(input: unknown): PunchCommand {
 const invalid=()=>{throw new ClockerPunchError('INVALID');};
 if(!input||typeof input!=='object'||Array.isArray(input))return invalid();
 const row=input as Record<string,unknown>;
 if(Object.keys(row).length!==keys.length||keys.some(k=>!Object.hasOwn(row,k)))return invalid();
 if(typeof row.commandId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(row.commandId))return invalid();
 if(typeof row.action!=='string'||!['CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT'].includes(row.action))return invalid();
 if(typeof row.expectedRevision!=='number'||!Number.isInteger(row.expectedRevision)||row.expectedRevision<0||row.expectedRevision>=2147483647)return invalid();
 const entry=row.expectedEntryId===null&&row.expectedEntryVersion===null?false:id(row.expectedEntryId)&&positive(row.expectedEntryVersion)?true:null;
 const pause=row.expectedBreakId===null&&row.expectedBreakVersion===null?false:id(row.expectedBreakId)&&positive(row.expectedBreakVersion)?true:null;
 if(entry===null||pause===null||(!entry&&pause))return invalid();
 if(row.action==='CLOCK_IN'&&(entry||pause))return invalid();
 if(row.action!=='CLOCK_IN'&&!entry)return invalid();
 if(row.action==='START_BREAK'&&pause)return invalid();
 if(row.action==='END_BREAK'&&!pause)return invalid();
 return Object.fromEntries(keys.map(k=>[k,row[k]])) as PunchCommand;
}
