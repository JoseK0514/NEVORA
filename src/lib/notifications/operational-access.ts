import type {RecipientAccess,SourceKind} from './types';
/** Stored current operational metadata is distinct from scheduling eligibility.
 * Financial kinds and device self-tests keep their independent authority. */
export const isOperationalReviewRecipient=(recipient:RecipientAccess)=>recipient.role==='OWNER'||recipient.role==='MANAGER';
export function operationalNotificationAllowed(kind:SourceKind,recipient:RecipientAccess):boolean{
 return kind==='SELF_TEST'||kind==='PAYROLL_PREPARATION'||kind==='PAYROLL_STATEMENT'||!isOperationalReviewRecipient(recipient)||recipient.operationalCompany===true;
}
