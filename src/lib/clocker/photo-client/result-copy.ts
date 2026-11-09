import type {PhotoSessionView} from './session';

/** A time receipt and a photo outcome are independent pieces of evidence. */
export function photoResultMessage(state:Pick<PhotoSessionView,'receipt'|'photoStatus'>):string {
 if(!state.receipt)return 'The clock result is unconfirmed. Check the original action before trying another punch.';
 switch(state.photoStatus?.state){
  case 'stored':return 'Your time and punch photo are recorded.';
  case 'missing':return 'Your time is recorded. The photo was not saved; a photo exception is recorded.';
  case 'not_required':return 'Your time is recorded. A photo was not required for this action.';
  case 'expired':return 'Your time is recorded. The photo window has expired. Ask your company’s assistance contact for help.';
  case 'removed':return 'Your time is recorded. The punch photo was removed. Removing a photo does not remove its time record.';
  default:return 'Your time is recorded. The photo result is unconfirmed. Checking the photo will not repeat your clock action.';
 }
}
export function offlinePhotoMessage(state:Pick<PhotoSessionView,'receipt'|'submissionStarted'>):string {
 const result=state.receipt?'Your time is recorded. The photo result must be checked when this tablet reconnects.'
  :state.submissionStarted?'The clock result is unconfirmed. Check the original action when this tablet reconnects.'
  :'No clock action has been sent. Reconnect or use your company’s assistance option.';
 return `This tablet reports that it is offline. ${result} Photos are not queued in browser storage.`;
}
