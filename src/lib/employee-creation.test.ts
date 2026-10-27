import {expect,it} from 'vitest';
import {creationKey,creationPayload,parseEmployeeCreation,type EmployeeCreationSnapshot,type CreationDraft} from './employee-creation';
const fields={sourceShiftId:'own-shift',sourceEpisodeId:'11111111-1111-4111-8111-111111111111',sourceTermsFingerprint:'v1:'+'a'.repeat(64)};
const target={id:'peer-shift',person:'Blair C.',date:'2026-11-04',startTime:'22:00',endTime:'06:00',location:'West',position:'Support',lead:false,fields:{targetShiftId:'peer-shift',targetEpisodeId:'22222222-2222-4222-8222-222222222222',targetTermsFingerprint:'v1:'+'b'.repeat(64)}};
export const read:Extract<EmployeeCreationSnapshot,{state:'ready'}>={state:'ready',kind:'creation',authority:'a'.repeat(64),observedAt:'2026-10-27T12:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',enabled:true,mode:'swap',selection:'own-shift',source:{id:'own-shift',date:'2026-11-03',weekStart:'2026-11-02',startTime:'08:00',endTime:'16:00',location:'Main',position:'Support',lead:false,fields},targets:[target],partial:false,check:{allowed:true,notice:null},coverage:{allowed:true,notice:null}};
const draft=():CreationDraft=>({sourceKey:creationKey(fields),targetKey:creationKey(target.fields),reason:'',note:''});
it('builds only the deliberately reviewed source/target payload and never silently rebinds changed terms',()=>{
 expect(Object.fromEntries(creationPayload(read,draft())!)).toEqual({kind:'PROPOSE_SWAP',...fields,...target.fields});
 expect(creationPayload({...read,source:{...read.source!,fields:{...fields,sourceTermsFingerprint:'v1:'+'c'.repeat(64)}}},draft())).toBeNull();
 expect(creationPayload({...read,targets:[{...target,fields:{...target.fields,targetTermsFingerprint:'v1:'+'c'.repeat(64)}}]},draft())).toBeNull();
 expect(creationPayload({...read,check:{allowed:false,notice:'Changed'}},draft())).toBeNull();
});
it('applies actual Other detail validation without turning retained reason/note into an automatic report',()=>{
 const report={...read,mode:'callout' as const,targets:[]};const d={...draft(),reason:'OTHER',note:'  '};expect(creationPayload(report,d)).toBeNull();
 const payload=creationPayload(report,{...d,note:'Transportation is unavailable'});expect(Object.fromEntries(payload!)).toEqual({kind:'SUBMIT_CALLOUT',...fields,reasonCode:'OTHER',reasonNote:'Transportation is unavailable'});
 expect(creationPayload({...report,enabled:false},{...d,note:'Three words here'})).toBeNull();
});
it('strictly decodes the own private transport and rejects extra peer/policy data, mixed fields and module-off facts',()=>{
 expect(parseEmployeeCreation(read)).toEqual(read);
 for(const value of [{...read,employeeId:'peer'},{...read,targets:[{...target,employeeId:'peer'}]},{...read,enabled:false},{...read,source:{...read.source,fields:{...fields,targetShiftId:'peer'}}},{...read,source:{...read.source,fields:{...fields,sourceShiftId:'different'}}}])expect(parseEmployeeCreation(value)).toEqual({state:'unavailable',reason:'read_failed'});
 expect(parseEmployeeCreation({...read,targets:null,partial:true,check:{allowed:false,notice:'Unavailable'}}).state).toBe('ready');
});
