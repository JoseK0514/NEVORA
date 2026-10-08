import {expect,it} from 'vitest';
import {validateCommunicationDraft as validate,parseCommunicationTransport as parse} from './validation';
import {canAuthorCommunication} from './policy';
const draft={type:'TODAYS_TEAM',scope:{kind:'TODAYS_TEAM',locationId:'loc-1',businessDate:'2030-10-07'},title:'Update',body:'Operational detail',acknowledgement:'OPTIONAL',expiresAt:null};
it('unicode_code_point_bounds',()=>{
 expect(validate({...draft,title:'😀'.repeat(120),body:'é'.repeat(2000)})?.ok).toBe(true);
 expect(validate({...draft,title:'😀'.repeat(121)})?.ok).toBe(false);
 expect(validate({...draft,body:'😀'.repeat(2001)})?.ok).toBe(false);
 for(const title of ['', ' \n ', 'two\nlines'])expect(validate({...draft,title})?.ok).toBe(false);
});
it('line_endings_normalized',()=>{expect(validate({...draft,title:'  Café 😀  ',body:' \r\nfirst\rsecond\r\nthird  '})).toEqual({ok:true,value:{...draft,title:'Café 😀',body:'first\nsecond\nthird'}});});
it('unsafe_controls_denied',()=>{
 for(const control of ['\u0000','\t','\u007f','\u0085','\u202e','\u2066','\ud800'])expect(validate({...draft,body:`a${control}b`})?.ok).toBe(false);
 expect(validate({...draft,body:'Café 👩‍💻\nNext line'})?.ok).toBe(true);
});
it('oversize_32KiB_denied',()=>{
 expect(parse?.(JSON.stringify(draft))?.ok).toBe(true);
 expect(parse?.(' '.repeat(32768)+JSON.stringify(draft))?.ok).toBe(false);
 expect(parse?.(JSON.stringify({...draft,recipientIds:['coworker']}))?.ok).toBe(false);
 expect(parse?.('{bad json')?.ok).toBe(false);
});
it('strict shapes and plain text preserve escaped rendering responsibility',()=>{
 expect(validate({...draft,body:'<b>Plain text</b> https://example.test'})?.ok).toBe(true);
 for(const mutation of [{scope:{...draft.scope,recipientIds:['x']}},{replyTo:'id'},{attachments:[]},{expiresAt:'tomorrow'},{expiresAt:'2030-02-30T12:00:00Z'},{scope:{...draft.scope,businessDate:'2030-02-30'}}])expect(validate({...draft,...mutation}).ok).toBe(false);
 expect(parse(JSON.stringify(draft).padEnd(32768,' ')).ok).toBe(true);
 expect(parse(JSON.stringify(draft).padEnd(32769,' ')).ok).toBe(false);
});
it.each(['type','acknowledgement'] as const)('E21-QA-D002 rejects non-string %s before producing a draft',field=>{
 const valid=draft[field];
 for(const value of [[valid],[valid,valid],[],null,true,false,17,{}, {value:valid},{toString:()=>valid}]){
  expect(validate({...draft,[field]:value})).toEqual({ok:false,reason:'shape'});
 }
});
it.each(['type','acknowledgement'] as const)('E21-QA-D002 raw JSON cannot coerce non-string %s',field=>{
 for(const value of [[draft[field]],[draft[field],draft[field]],[],null,true,false,17,{}, {value:draft[field]}]){
  expect(parse(JSON.stringify({...draft,[field]:value}))).toEqual({ok:false,reason:'shape'});
 }
});
it.each(['EMPLOYEE','LEAD'])('E21-QA-D002 %s cannot author a required acknowledgement through array coercion',role=>{
 const context={actor:{id:'employee',role,active:true,workspaceId:'workspace-fuel'},workspaceId:'workspace-fuel',workspaceActive:true,timeZone:'America/Puerto_Rico',observedAt:'2030-10-07T12:00:00Z',location:{id:'loc-1',workspaceId:'workspace-fuel',active:true},assignments:[{employeeId:'employee',workspaceId:'workspace-fuel',locationId:'loc-1',sourceShiftId:'shift',assignmentEpisodeId:'episode',termsFingerprint:'terms',published:true,released:false,startAt:'2030-10-07T12:00:00Z',endAt:'2030-10-07T20:00:00Z'}]};
 expect(canAuthorCommunication(draft,context)).toBe(true);
 expect(canAuthorCommunication({...draft,acknowledgement:['REQUIRED']},context)).toBe(false);
 expect(canAuthorCommunication({...draft,type:['TODAYS_TEAM']},context)).toBe(false);
 expect(canAuthorCommunication({...draft,acknowledgement:'REQUIRED'},context)).toBe(false);
});
it('primitive enum type scope and acknowledgement combinations preserve their policy',()=>{
 const cases=[
  {type:'TODAYS_TEAM',scope:draft.scope},
  {type:'LOCATION_ANNOUNCEMENT',scope:{kind:'LOCATION',locationId:'loc-1'}},
  {type:'SHIFT_NOTE',scope:{kind:'SHIFT',locationId:'loc-1',sourceShiftId:'shift',assignmentEpisodeId:'episode',termsFingerprint:'terms'}},
  {type:'OPERATIONAL_UPDATE',scope:{kind:'LOCATION',locationId:'loc-1'}},
 ];
 for(const value of cases)for(const acknowledgement of ['NONE','OPTIONAL','REQUIRED']){
  const input={...draft,...value,acknowledgement},allowed=value.type!=='TODAYS_TEAM'||acknowledgement!=='REQUIRED';
  expect(validate(input).ok).toBe(allowed);expect(parse(JSON.stringify(input)).ok).toBe(allowed);
  const result=validate(input);if(result.ok){expect(result.value.type).toBe(value.type);expect(result.value.acknowledgement).toBe(acknowledgement);}
 }
});
