import {expect,it} from 'vitest';
import type {PunchReceipt} from '../punch-types';
import {photoResultMessage,offlinePhotoMessage} from './result-copy';

const receipt={performedAt:'2030-01-01T00:00:00Z'} as PunchReceipt;
it('claims a recorded exception only for an authoritative missing result alongside a receipt',()=>{
 expect(photoResultMessage({receipt,photoStatus:{commandId:'original',state:'missing'}})).toContain('photo exception is recorded');
 expect(photoResultMessage({receipt,photoStatus:null})).toContain('photo result is unconfirmed');
 expect(photoResultMessage({receipt,photoStatus:{commandId:'original',state:'unknown'}})).not.toContain('exception is recorded');
});
it('never substitutes a photo status for a confirmed time receipt',()=>{
 expect(photoResultMessage({receipt:null,photoStatus:{commandId:'original',state:'stored'}})).toContain('clock result is unconfirmed');
 expect(photoResultMessage({receipt:null,photoStatus:{commandId:'original',state:'missing'}})).not.toContain('Your time is recorded');
});
it('does not infer exception recording or physical erasure from an expired photo window',()=>{
 const text=photoResultMessage({receipt,photoStatus:{commandId:'original',state:'expired'}});
 expect(text).toContain('photo window has expired');expect(text).not.toContain('exception is recorded');expect(text).not.toContain('deleted');
});
it('distinguishes offline before request from a potentially committed original punch',()=>{
 expect(offlinePhotoMessage({receipt:null,submissionStarted:false})).toContain('No clock action has been sent');
 expect(offlinePhotoMessage({receipt:null,submissionStarted:true})).toContain('clock result is unconfirmed');
 expect(offlinePhotoMessage({receipt,submissionStarted:true})).toContain('Your time is recorded');
 expect(offlinePhotoMessage({receipt:null,submissionStarted:true})).not.toContain('No clock action has been sent');
});
it('describes confirmed Owner removal separately from retention expiry or a saved photo',()=>{
 const text=photoResultMessage({receipt,photoStatus:{commandId:'original',state:'removed'}});
 expect(text).toContain('punch photo was removed');expect(text).not.toContain('expired');expect(text).not.toContain('photo are recorded');
});
