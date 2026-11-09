import {PHOTO_ACTIONS,type PhotoReference,type PhotoRemovalResult,type PhotoReviewPage,type PhotoReviewRecord} from '../photo-server/contracts';
import {parsePhotoReference,parsePhotoReviewQuery} from '../photo-server/validation';

const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const stamp=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT/.test(value)&&Number.isFinite(Date.parse(value));
export const referenceKey=(value:PhotoReference)=>`${value.deviceId}:${value.commandId}`;
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
export function readPhotoReviewRecord(value:unknown,expected?:PhotoReference):PhotoReviewRecord{
 if(!object(value))throw Error('The photo record could not be verified.');
 const reference=parsePhotoReference(value.reference);
 if(expected&&referenceKey(reference)!==referenceKey(expected)||!text(value.employeeName,320)||!text(value.locationName,160)||
  !text(value.locationKey,64)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.locationKey)||value.locationKey.endsWith('\n')||!text(value.timeZone,100)||
  !PHOTO_ACTIONS.includes(value.action as PhotoReviewRecord['action'])||!stamp(value.performedAt)||!Number.isInteger(value.policyVersion)||Number(value.policyVersion)<0||!Number.isInteger(value.profileVersion)||Number(value.profileVersion)<0||
  !['not_required','pending','stored','missing','expired','removed','unknown'].includes(String(value.state))||
  !(value.expiresAt===null||stamp(value.expiresAt))||!(value.removedAt===null||stamp(value.removedAt))||typeof value.hasImage!=='boolean'||
  value.hasImage&&value.state!=='stored'||value.state==='removed'&&value.removedAt===null||
  value.code!==undefined&&!['CAMERA_DENIED','CAMERA_UNAVAILABLE','CAPTURE_FAILED','UPLOAD_FAILED','EMPLOYEE_CHANGED','PHOTO_ALTERNATIVE'].includes(String(value.code)))throw Error('The photo record could not be verified.');
 new Intl.DateTimeFormat('en-US',{timeZone:value.timeZone});
 return {reference,employeeName:value.employeeName,locationName:value.locationName,locationKey:value.locationKey,timeZone:value.timeZone,action:value.action as PhotoReviewRecord['action'],performedAt:value.performedAt,
  policyVersion:Number(value.policyVersion),profileVersion:Number(value.profileVersion),state:value.state as PhotoReviewRecord['state'],expiresAt:value.expiresAt as string|null,removedAt:value.removedAt as string|null,hasImage:value.hasImage,
  ...(value.code!==undefined?{code:value.code as PhotoReviewRecord['code']}:{})};
}
export function readPhotoReviewPage(value:unknown):PhotoReviewPage{
 if(!object(value)||!Array.isArray(value.records)||value.records.length>50||!Number.isSafeInteger(value.total)||Number(value.total)<value.records.length)throw Error('The photo list could not be verified.');
 const records=value.records.map(record=>readPhotoReviewRecord(record));
 if(new Set(records.map(record=>referenceKey(record.reference))).size!==records.length)throw Error('The photo list could not be verified.');
 const nextCursor=parsePhotoReviewQuery({limit:20,cursor:value.nextCursor}).cursor;
 return {records,total:Number(value.total),nextCursor};
}
export function verifyPhotoRemoval(value:unknown,expected:PhotoReference):PhotoRemovalResult{
 if(!object(value))throw Error('Photo removal could not be confirmed. Check the original photo record.');
 const reference=parsePhotoReference(value.reference);
 if(referenceKey(reference)!==referenceKey(expected)||!['removed','already_removed','unavailable'].includes(String(value.state))||
  !(value.removedAt===null||stamp(value.removedAt))||value.state!=='unavailable'&&value.removedAt===null)throw Error('Photo removal could not be confirmed. Check the original photo record.');
 return {reference,state:value.state as PhotoRemovalResult['state'],removedAt:value.removedAt as string|null};
}
export function photoReviewStateLabel(state:PhotoReviewRecord['state']):string{
 return {stored:'Photo available',missing:'Photo exception recorded',pending:'Photo pending',unknown:'Photo result unconfirmed',expired:'Photo expired',removed:'Photo removed',not_required:'Photo not required'}[state];
}
