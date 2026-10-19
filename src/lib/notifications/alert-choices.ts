import type {RecipientAccess} from './types';
export function alertTopic(kind:string,type=''):string|null {
  return ({TIME_OFF:'time-off',EXCHANGE:'shift-changes',CALLOUT:'unable-to-work',PAYROLL_PREPARATION:'payroll-ready'} as Record<string,string>)[kind]??(['CLOCK_REVIEW_REQUIRED','ATTENDANCE_REVIEW_REQUIRED','TIME_CORRECTION_REVIEW_REQUIRED'].includes(type)?'clock-review':null);
}
export function recipientAlertOn(recipient:RecipientAccess|null,kind:string,type=''):boolean {
  if(!recipient||!['OWNER','MANAGER'].includes(recipient.role))return true;
  const topic=alertTopic(kind,type);
  return !topic||recipient.alertChoices?.[topic]!==false;
}
