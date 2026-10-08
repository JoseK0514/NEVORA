import {expect,it} from 'vitest';
// Missing domain is an executed expectation in each RED case, not an import crash.
const modules=import.meta.glob('./validation.ts',{eager:true}) as Record<string,{validateCommunicationDraft?:(v:unknown)=>{ok:boolean;value?:Record<string,unknown>};parseCommunicationTransport?:(v:string)=>{ok:boolean}}>;
const validate=(v:unknown)=>modules['./validation.ts']?.validateCommunicationDraft?.(v);
const draft={type:'TODAYS_TEAM',scope:{kind:'TODAYS_TEAM',locationId:'loc-1',businessDate:'2030-10-07'},title:'Update',body:'Operational detail',acknowledgement:'OPTIONAL',expiresAt:null};
it('unicode_code_point_bounds',()=>{
 expect(validate({...draft,title:'😀'.repeat(120),body:'é'.repeat(2000)})?.ok).toBe(true);
 expect(validate({...draft,title:'😀'.repeat(121)})?.ok).toBe(false);
 expect(validate({...draft,body:'😀'.repeat(2001)})?.ok).toBe(false);
 for(const title of ['', ' \n ', 'two\nlines'])expect(validate({...draft,title})?.ok).toBe(false);
});
it('line_endings_normalized',()=>{expect(validate({...draft,title:'  Café 😀  ',body:' \r\nfirst\rsecond\r\nthird  '})?.value).toEqual({...draft,title:'Café 😀',body:'first\nsecond\nthird'});});
it('unsafe_controls_denied',()=>{
 for(const control of ['\u0000','\t','\u007f','\u0085','\u202e','\u2066','\ud800'])expect(validate({...draft,body:`a${control}b`})?.ok).toBe(false);
 expect(validate({...draft,body:'Café 👩‍💻\nNext line'})?.ok).toBe(true);
});
it('oversize_32KiB_denied',()=>{
 const parse=modules['./validation.ts']?.parseCommunicationTransport;
 expect(parse?.(JSON.stringify(draft))?.ok).toBe(true);
 expect(parse?.(' '.repeat(32768)+JSON.stringify(draft))?.ok).toBe(false);
 expect(parse?.(JSON.stringify({...draft,recipientIds:['coworker']}))?.ok).toBe(false);
 expect(parse?.('{bad json')?.ok).toBe(false);
});
