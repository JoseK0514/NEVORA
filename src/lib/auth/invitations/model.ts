// Client-safe invitation metadata. Bearer proof/password never belong in these DTOs.
import type { AccessFailure } from '@/lib/company-access/model';
export type InvitationCommand =
 |{action:'ISSUE';operationId:string;expectedEmployeeVersion:string;expectedInvitationRevision:number}
 |{action:'REVOKE';operationId:string;invitationId:string;expectedInvitationRevision:number};
export type ActivationResult = {state:'activated'|'invalid'|'unavailable'|'outcome_unknown'};
export type InvitationStatusResult =
  | { state:'ready'; employeeId:string;employeeVersion:string;
      eligibility:'INVITABLE'|'NO_EMAIL'|'ALREADY_ACTIVATED'|'INACTIVE'|'SELF_ISSUE_DENIED';
      registeredEmailMasked:string|null;invitationRevision:number;
      invitation:null|{id:string;state:'ISSUED'|'CONSUMED'|'REVOKED'|'EXPIRED'|'INVALIDATED';
        issuedAt:string;expiresAt:string;issuerName:string};
      delivery:'UNAVAILABLE'|'PREPARED'|'PROVIDER_ACCEPTED'|'UNKNOWN'|'FAILED';
      allowedCommands:('ISSUE'|'REVOKE')[];retryAfterMs:number|null }
  | { state:'unavailable'; reason:AccessFailure };

export type DeliveryState='PREPARED'|'PROVIDER_ACCEPTED'|'UNKNOWN'|'FAILED';

export type InvitationReceipt={operationId:string;invitationId:string;revision:number;
  employeeId:string;action:'ISSUE'|'REVOKE';committedAt:string;
  expiresAt:string|null;delivery:DeliveryState};

export type InvitationResult=
  |{state:'saved';receipt:InvitationReceipt}
  |{state:'limited';retryAfterMs:number}
  |{state:'conflict';reason:'employee_changed'|'invitation_changed'|'changed_replay'}
  |{state:'invalid';fieldErrors:{field:string;message:string}[]}
  |{state:'unavailable';reason:'delivery_unavailable'|'source_unavailable'}
  |{state:'outcome_unknown';operationId:string};
