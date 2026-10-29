import {expect,it} from 'vitest';
import {parsePendingPunch} from './punch-client';
import {journalKey,legacyRecords} from './recovery-journal';
const pending={subject:'a'.repeat(64),command:{commandId:'11111111-1111-4111-8111-111111111111',action:'CLOCK_IN',verificationId:'b'.repeat(64),expected:{revision:0,timeEntryId:null,timeEntryVersion:null,breakEntryId:null,breakEntryVersion:null}}};
it('accepts only exact recovery payloads, without identity or extra fields',()=>{expect(parsePendingPunch(pending)).toEqual(pending);expect(()=>parsePendingPunch({...pending,pin:'0123'})).toThrow();expect(()=>parsePendingPunch({...pending,subject:'employee-name'})).toThrow();});
it('separates location and subject without delimiter collisions',()=>{expect(journalKey('2',pending.subject)).not.toBe(journalKey('3',pending.subject));expect(()=>journalKey('',pending.subject)).toThrow();});
it('preserves malformed legacy bytes and rejects mismatched subject keys',()=>{
 const records=new Map([['nevora.clocker.pending.v1:2','corrupt'],['nevora.clocker.pending.v2:2:'+pending.subject,JSON.stringify(pending)],['nevora.clocker.pending.v2:2:'+'c'.repeat(64),JSON.stringify(pending)]]);
 const storage={length:records.size,key:(i:number)=>[...records.keys()][i]??null,getItem:(k:string)=>records.get(k)??null};
 const found=legacyRecords(storage,'2');expect(found).toHaveLength(3);expect(found[0].pending).toBeNull();expect(found[1].pending).toEqual(pending);expect(found[2].pending).toBeNull();expect(records.size).toBe(3);
});
