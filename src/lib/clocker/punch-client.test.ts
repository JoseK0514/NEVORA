import { expect, it } from 'vitest';
import { makePunchCommand, punchActions, readPendingPunch, savePendingPunch, forgetPendingPunch, canRetirePendingPunch, parseClockView, parseReceiptReply } from './punch-client';
import type { PunchSnapshot } from './punch-types';
import {readSubjectPendingPunch,saveSubjectPendingPunch,forgetSubjectPendingPunch,pendingPunchReferences} from './punch-client';
const uuid='00000000-0000-4000-8000-000000000001',subject='c'.repeat(64),verificationId='d'.repeat(64);
const type={id:'rest-1',version:1,name:'Rest',category:'REST' as const,targetMinutes:15,active:true};
const entry={id:'entry-1',version:1,locationId:'loc-1',status:'CLOCKED_IN' as const,clockInAt:'2026-10-05T12:00:00.000000+00:00'};
const empty:PunchSnapshot={revision:0,entry:null,break:null};
const working:PunchSnapshot={revision:1,entry,break:null};
const onBreak:PunchSnapshot={revision:2,entry:{...entry,version:2,status:'ON_BREAK'},break:{id:'pause-1',version:1,breakStartAt:'2026-10-05T12:30:00.000000+00:00',type:{id:type.id,version:1,name:'Rest',category:'REST',targetMinutes:15}}};
function view(snapshot=empty){return {state:'ready' as const,subject,verificationId,firstName:'Avery',expiresAt:'2026-10-05T12:01:00.000Z',locationId:'loc-1',snapshot,atOtherLocation:false,breakTypes:[type],allowedActions:!snapshot.entry?['CLOCK_IN' as const]:snapshot.break?['END_BREAK' as const,'CLOCK_OUT' as const]:['START_BREAK' as const,'CLOCK_OUT' as const]};}
function storage(){const map=new Map<string,string>();return {getItem:(key:string)=>map.get(key)??null,setItem:(key:string,value:string)=>{map.set(key,value);},removeItem:(key:string)=>{map.delete(key);},map};}
function recoveryStorage(){const s=storage();return {...s,get length(){return s.map.size;},key:(i:number)=>[...s.map.keys()][i]??null};}
it('UX-05 keeps independent intents through identity switching and clears only an exact resolved intent',()=>{
 const s=recoveryStorage(),a={subject,command:makePunchCommand('CLOCK_IN',view(),uuid)},b={subject:'b'.repeat(64),command:makePunchCommand('CLOCK_IN',{...view(),subject:'b'.repeat(64)},'00000000-0000-4000-8000-000000000002')};
 saveSubjectPendingPunch(s,'2',a);expect(readSubjectPendingPunch(s,'2',b.subject)).toBeNull();saveSubjectPendingPunch(s,'2',b);
 expect(readSubjectPendingPunch(s,'2',subject)).toEqual(a);expect(readSubjectPendingPunch(s,'2',b.subject)).toEqual(b);expect(pendingPunchReferences(s,'2')).toHaveLength(2);
 expect(()=>forgetSubjectPendingPunch(s,'2',{...a,command:b.command})).toThrow();
 forgetSubjectPendingPunch(s,'2',b);expect(readSubjectPendingPunch(s,'2',subject)).toEqual(a);expect(readSubjectPendingPunch(s,'110',subject)).toBeNull();
});
it('UX-05 retains legacy intent in place until exact receipt resolution',()=>{
 const s=recoveryStorage(),a={subject,command:makePunchCommand('CLOCK_IN',view(),uuid)};savePendingPunch(s,'2',a);
 expect(readSubjectPendingPunch(s,'2','b'.repeat(64))).toBeNull();expect(readSubjectPendingPunch(s,'2',subject)).toEqual(a);
 saveSubjectPendingPunch(s,'2',a);expect(s.map.size).toBe(2);forgetSubjectPendingPunch(s,'2',a);expect(s.map.size).toBe(0);
});
it('UX-05 preserves corrupt legacy bytes while separately verified identities can record their own intent',()=>{
 const s=recoveryStorage();s.map.set('nevora.clocker.pending.v1:2','{uncertain legacy');
 const a={subject,command:makePunchCommand('CLOCK_IN',view(),uuid)};saveSubjectPendingPunch(s,'2',a);expect(readSubjectPendingPunch(s,'2',subject)).toEqual(a);
 forgetSubjectPendingPunch(s,'2',a);expect(s.map.get('nevora.clocker.pending.v1:2')).toBe('{uncertain legacy');expect(pendingPunchReferences(s,'2')).toEqual([{commandId:null,action:null}]);
});
it('UX-05 duplicate intent is durable and replacement IDs or corrupt own records fail closed',()=>{
 const s=recoveryStorage(),a={subject,command:makePunchCommand('CLOCK_IN',view(),uuid)};saveSubjectPendingPunch(s,'2',a);saveSubjectPendingPunch(s,'2',a);
 expect(()=>saveSubjectPendingPunch(s,'2',{...a,command:{...a.command,commandId:'00000000-0000-4000-8000-000000000002'}})).toThrow();
 s.map.set([...s.map.keys()][0],'{broken own');expect(()=>readSubjectPendingPunch(s,'2',subject)).toThrow();expect(s.map.size).toBe(1);
});
it('offers only current-state actions and never guesses across locations or missing types',()=>{
 expect(punchActions(view())).toEqual(['CLOCK_IN']);expect(punchActions(view(working))).toEqual(['START_BREAK','CLOCK_OUT']);
 expect(punchActions(view(onBreak))).toEqual(['END_BREAK','CLOCK_OUT']);
 expect(punchActions({...view(working),atOtherLocation:true,locationId:'loc-2',allowedActions:[]})).toEqual([]);
 expect(punchActions({...view(working),breakTypes:[],allowedActions:['CLOCK_OUT']})).toEqual(['CLOCK_OUT']);
});
it('copies the canonical verification and exact entry/break expectation without client time',()=>{
 expect(makePunchCommand('END_BREAK',view(onBreak),uuid)).toEqual({commandId:uuid,action:'END_BREAK',verificationId,expected:{revision:2,timeEntryId:'entry-1',timeEntryVersion:2,breakEntryId:'pause-1',breakEntryVersion:1}});
 expect(Object.keys(makePunchCommand('CLOCK_IN',view(),uuid))).not.toContain('employeeId');
});
it('requires explicit break selection and preserves the observed version',()=>{
 expect(()=>makePunchCommand('START_BREAK',view(working),uuid)).toThrow();
 expect(makePunchCommand('START_BREAK',view(working),uuid,type)).toMatchObject({breakType:{id:'rest-1',version:1}});
 expect(()=>makePunchCommand('START_BREAK',view(working),uuid,{...type,version:9})).toThrow();
});
it('round-trips only minimal recovery intent without names, PINs, times or credentials',()=>{
 const s=storage(),pending={subject,command:makePunchCommand('CLOCK_IN',view(),uuid)};
 expect(readPendingPunch(s,'2')).toBeNull();savePendingPunch(s,'2',pending);expect(readPendingPunch(s,'2')).toEqual(pending);
 expect([...s.map.values()][0]).not.toMatch(/firstName|expiresAt|pin|token|clockInAt|nev_dev/);
 forgetPendingPunch(s,'2');expect(readPendingPunch(s,'2')).toBeNull();
});
it('fails closed on blocked or silently unwritable recovery storage',()=>{
 expect(()=>savePendingPunch({getItem:()=>null,setItem:()=>{},removeItem:()=>{}},'2',{subject,command:makePunchCommand('CLOCK_IN',view(),uuid)})).toThrow();
 expect(()=>readPendingPunch({getItem:()=>{throw Error('denied');},setItem:()=>{},removeItem:()=>{}},'2')).toThrow();
});
it('preserves unresolved commands instead of replacing their request ID',()=>{
 const s=storage(),pending={subject,command:makePunchCommand('CLOCK_IN',view(),uuid)};savePendingPunch(s,'2',pending);
 expect(()=>savePendingPunch(s,'2',{subject,command:{...pending.command,commandId:'00000000-0000-4000-8000-000000000002'}})).toThrow();expect(readPendingPunch(s,'2')).toEqual(pending);
});
it('rejects corrupted or forged recovery records without silently discarding them',()=>{
 const s=storage();savePendingPunch(s,'2',{subject,command:makePunchCommand('CLOCK_IN',view(),uuid)});const key=[...s.map.keys()][0];
 s.map.set(key,'{broken');expect(()=>readPendingPunch(s,'2')).toThrow();
 s.map.set(key,JSON.stringify({subject,command:{...makePunchCommand('CLOCK_IN',view(),uuid),employeeId:'forged'}}));expect(()=>readPendingPunch(s,'2')).toThrow();
});
it('only retires an absent receipt when monotonic state, type or verification makes a later commit impossible',()=>{
 const cmd=makePunchCommand('CLOCK_IN',view(),uuid);
 expect(canRetirePendingPunch(cmd,view())).toBe(false);expect(canRetirePendingPunch(cmd,view(working))).toBe(true);
 expect(canRetirePendingPunch(cmd,{...view(),verificationId:'e'.repeat(64)})).toBe(true);
 const pause=makePunchCommand('START_BREAK',view(working),uuid,type);
 expect(canRetirePendingPunch(pause,{...view(working),breakTypes:[{...type,version:2}]})).toBe(true);
});
it('validates canonical clock-view identity and unavailable states',()=>{
 expect(parseClockView(view())).toEqual(view());
 for(const bad of [{...view(),verificationId:''},{...view(),snapshot:null},{...view(),snapshot:{...empty,revision:-1}},{state:'unavailable'}])expect(()=>parseClockView(bad)).toThrow();
});
it.each(['array-status','invalid-time','missing-break','contradictory-actions','unsafe-type'])('rejects inconsistent view %s',kind=>{
 const good=view(working),bad:Record<string,unknown>={...good};
 if(kind==='array-status')bad.snapshot={...working,entry:{...entry,status:['CLOCKED_IN']}};
 if(kind==='invalid-time')bad.snapshot={...working,entry:{...entry,clockInAt:'nonsense'}};
 if(kind==='missing-break')bad.snapshot={...working,entry:{...entry,status:'ON_BREAK'}};
 if(kind==='contradictory-actions')bad.allowedActions=['CLOCK_IN'];
 if(kind==='unsafe-type')bad.breakTypes=[{...type,targetMinutes:-5}];
 expect(()=>parseClockView(bad)).toThrow();
});
it('never accepts a receipt for another command, action or revision',()=>{
 const cmd=makePunchCommand('CLOCK_IN',view(),uuid),receipt={commandId:uuid,action:'CLOCK_IN',timeEntryId:entry.id,breakEntryId:null,performedAt:entry.clockInAt,snapshot:working,breakType:null};
 expect(parseReceiptReply({state:'committed',receipt},cmd)).toEqual(receipt);
 for(const bad of [{...receipt,commandId:'another'},{...receipt,action:'CLOCK_OUT'},{...receipt,snapshot:{...working,revision:8}},{...receipt,performedAt:'bad'}])expect(()=>parseReceiptReply({state:'committed',receipt:bad},cmd)).toThrow();
});
it('rejects a recorded timestamp that disagrees with the confirmed Clock In',()=>{
 const cmd=makePunchCommand('CLOCK_IN',view(),uuid);
 expect(()=>parseReceiptReply({state:'committed',receipt:{commandId:uuid,action:'CLOCK_IN',timeEntryId:entry.id,breakEntryId:null,performedAt:'2026-10-05T14:00:00Z',snapshot:working}},cmd)).toThrow();
});
it('validates persisted break classification against the exact requested type/version',()=>{
 const cmd=makePunchCommand('START_BREAK',view(working),uuid,type),receipt={commandId:uuid,action:'START_BREAK',timeEntryId:entry.id,breakEntryId:'pause-1',performedAt:onBreak.break!.breakStartAt,snapshot:onBreak,breakType:onBreak.break!.type};
 expect(parseReceiptReply({state:'committed',receipt},cmd)).toEqual(receipt);
 expect(()=>parseReceiptReply({state:'committed',receipt:{...receipt,breakType:{...receipt.breakType,version:5}}},cmd)).toThrow();
});

it('compares recorded break settings semantically rather than by JSON key order',()=>{
 const cmd=makePunchCommand('START_BREAK',view(working),uuid,type);
 const reordered={targetMinutes:15,category:'REST',name:'Rest',version:1,id:'rest-1'};
 const receipt={commandId:uuid,action:'START_BREAK',timeEntryId:entry.id,breakEntryId:'pause-1',performedAt:onBreak.break!.breakStartAt,snapshot:onBreak,breakType:reordered};
 expect(parseReceiptReply({state:'committed',receipt},cmd)).toEqual(receipt);
});

it('accepts a paused trial view for receipt recovery but cannot make a new clock-in',()=>{
 const paused={...view(),breakTypes:[],commerceRestriction:'paused',allowedActions:[]};
 expect(parseClockView(paused)).toEqual(paused);expect(()=>makePunchCommand('CLOCK_IN',parseClockView(paused),uuid)).toThrow();
 expect(parseClockView({...view(working),commerceRestriction:'finish_shift'})).toMatchObject({allowedActions:['START_BREAK','CLOCK_OUT']});
 for(const bad of [{...paused,allowedActions:['CLOCK_IN']},{...view(),commerceRestriction:'finish_shift'},{...paused,commerceRestriction:'free_access'},{...view(working),commerceRestriction:'paused'}])expect(()=>parseClockView(bad)).toThrow();
});
