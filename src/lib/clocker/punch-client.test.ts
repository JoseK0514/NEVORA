import { expect, it } from 'vitest';
import { makePunchCommand, punchActions, readPendingPunch, savePendingPunch, forgetPendingPunch, canRetirePendingPunch, parseClockView, parseReceiptReply } from './punch-client';
import type { PunchState } from './punch-command';
const uuid='00000000-0000-4000-8000-000000000001';
const empty:PunchState={revision:0,currentEntry:null};
const entry={id:'entry-1',version:1,locationId:'loc-1',status:'CLOCKED_IN' as const,clockInAt:'2026-10-05T12:00:00.000000Z',clockOutAt:null,breaks:[]};
const working:PunchState={revision:1,currentEntry:entry};
const onBreak:PunchState={revision:2,currentEntry:{...entry,version:2,status:'ON_BREAK',breaks:[{id:'pause-1',version:1,startAt:'2026-10-05T12:30:00.000000Z',endAt:null}]}};
const subject='c'.repeat(64),context='d'.repeat(64);
function storage(){const map=new Map<string,string>();return {getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{map.set(key,value);},removeItem:(key:string)=>{map.delete(key);},map};}
it('offers only current-state actions at the correct location',()=>{
 expect(punchActions(empty,'loc-1')).toEqual(['CLOCK_IN']);
 expect(punchActions(working,'loc-1')).toEqual(['START_BREAK','CLOCK_OUT']);
 expect(punchActions(onBreak,'loc-1')).toEqual(['END_BREAK','CLOCK_OUT']);
 expect(punchActions(working,'loc-2')).toEqual([]);
});
it('copies expected state and entry/break versions rather than guessing or using client time',()=>{
 expect(makePunchCommand('END_BREAK',onBreak,uuid)).toEqual({commandId:uuid,action:'END_BREAK',expectedRevision:2,expectedEntryId:'entry-1',expectedEntryVersion:2,expectedBreakId:'pause-1',expectedBreakVersion:1});
 expect(Object.keys(makePunchCommand('CLOCK_IN',empty,uuid))).not.toContain('employeeId');
});
it('round-trips only minimal recovery data without names, PINs, times or authentication context',()=>{
 const s=storage(),pending={subject,command:makePunchCommand('CLOCK_IN',empty,uuid)};
 expect(readPendingPunch(s,'2')).toBeNull();savePendingPunch(s,'2',pending);expect(readPendingPunch(s,'2')).toEqual(pending);
 const bytes=[...s.map.values()][0];expect(bytes).not.toMatch(/firstName|expiresAt|pin|token|context|clockInAt/);
 forgetPendingPunch(s,'2');expect(readPendingPunch(s,'2')).toBeNull();
});
it('fails closed on blocked or silently unwritable storage before a command is sent',()=>{
 const denied={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
 expect(()=>savePendingPunch(denied,'2',{subject,command:makePunchCommand('CLOCK_IN',empty,uuid)})).toThrow();
 const broken={getItem:()=>{throw Error('denied');},setItem:()=>{},removeItem:()=>{}};
 expect(()=>readPendingPunch(broken,'2')).toThrow();
});
it('preserves unresolved commands instead of overwriting them with a new request',()=>{
 const s=storage(),pending={subject,command:makePunchCommand('CLOCK_IN',empty,uuid)};
 savePendingPunch(s,'2',pending);
 expect(()=>savePendingPunch(s,'2',{subject,command:{...pending.command,commandId:'00000000-0000-4000-8000-000000000002'}})).toThrow();
 expect(readPendingPunch(s,'2')).toEqual(pending);
});
it('rejects corrupted or forged recovery records rather than silently discarding them',()=>{
 const s=storage();savePendingPunch(s,'2',{subject,command:makePunchCommand('CLOCK_IN',empty,uuid)});
 const key=[...s.map.keys()][0];s.map.set(key,'{broken');expect(()=>readPendingPunch(s,'2')).toThrow();
 s.map.set(key,JSON.stringify({subject,command:{...makePunchCommand('CLOCK_IN',empty,uuid),employeeId:'forged'}}));expect(()=>readPendingPunch(s,'2')).toThrow();
});
it('only retires an unconfirmed action when its expected state can no longer match',()=>{
 const cmd=makePunchCommand('CLOCK_IN',empty,uuid);
 expect(canRetirePendingPunch(cmd,empty,'loc-1')).toBe(false);
 expect(canRetirePendingPunch(cmd,working,'loc-1')).toBe(true);
 expect(canRetirePendingPunch(makePunchCommand('CLOCK_OUT',working,uuid),working,'loc-2')).toBe(true);
});
it('validates clock-view identity binding and unavailable data',()=>{
 const value={state:'ready',subject,context,firstName:'Avery',expiresAt:'2026-10-05T12:01:00.000Z',locationId:'loc-1',clock:empty};
 expect(parseClockView(value)).toEqual(value);
 for(const bad of [{...value,context:''},{...value,clock:null},{...value,clock:{revision:-1,currentEntry:null}},{state:'unavailable'}])expect(()=>parseClockView(bad)).toThrow();
});
it('never accepts a receipt for another command or action',()=>{
 const cmd=makePunchCommand('CLOCK_IN',empty,uuid),receipt={commandId:uuid,action:'CLOCK_IN',revision:1,recordedAt:entry.clockInAt,entry};
 expect(parseReceiptReply({state:'recorded',receipt},cmd)).toEqual(receipt);
 for(const bad of [{...receipt,commandId:'another'},{...receipt,action:'CLOCK_OUT'},{...receipt,revision:8},{...receipt,recordedAt:'bad'}])expect(()=>parseReceiptReply({state:'recorded',receipt:bad},cmd)).toThrow();
});

it('rejects a non-string status even when it can stringify to a valid clock state',()=>{
 expect(()=>parseClockView({state:'ready',subject,context,firstName:'Avery',expiresAt:'2026-10-05T12:01:00.000Z',locationId:'loc-1',
  clock:{revision:1,currentEntry:{...entry,status:['CLOCKED_IN']}}})).toThrow();
});
it('rejects receipts whose record time disagrees with the confirmed transition',()=>{
 const cmd=makePunchCommand('CLOCK_IN',empty,uuid);
 expect(()=>parseReceiptReply({state:'recorded',receipt:{commandId:uuid,action:'CLOCK_IN',revision:1,recordedAt:'2026-10-05T14:00:00.000000Z',entry}},cmd)).toThrow();
});
