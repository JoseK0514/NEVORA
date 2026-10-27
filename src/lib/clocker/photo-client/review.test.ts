import {expect,it} from 'vitest';
import {photoReviewStateLabel,readPhotoReviewPage,readPhotoReviewRecord,verifyPhotoRemoval} from './review';

export const record={reference:{deviceId:'fictional-tablet',commandId:'90ef3e34-415b-4513-bb06-6017d35367e3'},employeeName:'Fictional Employee',locationName:'Fictional Location',locationKey:'fictional-location',timeZone:'America/Puerto_Rico',action:'CLOCK_IN',performedAt:'2030-01-01T00:00:00Z',policyVersion:1,profileVersion:1,state:'stored',expiresAt:'2030-01-30T00:00:00Z',hasImage:true,removedAt:null};
it('keeps exact protected reference, real display data and bounded cursor pagination',()=>{
 const page={records:[record],total:1,nextCursor:null};expect(readPhotoReviewPage(page)).toEqual(page);
 expect(readPhotoReviewRecord({...record,publicUrl:'https://untrusted.example/photo'})).not.toHaveProperty('publicUrl');
});
it('rejects another original record or contradictory image/removed states',()=>{
 expect(()=>readPhotoReviewRecord(record,{...record.reference,deviceId:'other'})).toThrow();
 expect(()=>readPhotoReviewRecord({...record,state:'removed',hasImage:true})).toThrow();
 expect(()=>readPhotoReviewRecord({...record,state:'missing',hasImage:true})).toThrow();
});
it('rejects duplicated, oversized or malformed list responses without marking them current',()=>{
 expect(()=>readPhotoReviewPage({records:[record,record],total:2,nextCursor:null})).toThrow();
 expect(()=>readPhotoReviewPage({records:[],total:-1,nextCursor:null})).toThrow();
 expect(()=>readPhotoReviewPage({records:[],total:0,nextCursor:{deviceId:'other'}})).toThrow();
});
it('accepts an idempotent confirmed removal only for its original reference and timestamp',()=>{
 const removedAt='2030-01-02T00:00:00Z';
 expect(verifyPhotoRemoval({reference:record.reference,state:'already_removed',removedAt},record.reference).state).toBe('already_removed');
 expect(()=>verifyPhotoRemoval({reference:{...record.reference,deviceId:'other'},state:'removed',removedAt},record.reference)).toThrow();
 expect(()=>verifyPhotoRemoval({reference:record.reference,state:'removed',removedAt:null},record.reference)).toThrow();
 expect(verifyPhotoRemoval({reference:record.reference,state:'unavailable',removedAt:null},record.reference).state).toBe('unavailable');
});
it('distinguishes unknown, missing, removed and retention expiry without erasure claims',()=>{
 expect(photoReviewStateLabel('unknown')).toBe('Photo result unconfirmed');expect(photoReviewStateLabel('missing')).toBe('Photo exception recorded');
 expect(photoReviewStateLabel('removed')).toBe('Photo removed');expect(photoReviewStateLabel('expired')).toBe('Photo expired');
});
