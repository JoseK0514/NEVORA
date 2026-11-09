import type { PunchAction } from '../punch-types';

export const PHOTO_ACTIONS: readonly PunchAction[] = ['CLOCK_IN', 'START_BREAK', 'END_BREAK', 'CLOCK_OUT'];
export const PHOTO_MAX_BYTES = 524_288;
export const PHOTO_MAX_DIMENSION = 640;
export const PHOTO_UPLOAD_WINDOW_SECONDS = 300;

/** Public policy contains no tenant identity, credentials or storage addresses. */
export type PhotoPolicy = {
  version: number;
  enabled: boolean;
  events: PunchAction[];
  retentionDays: number | null;
  failureBehavior: 'ALLOW_WITH_EXCEPTION' | null;
  captureMaxBytes: typeof PHOTO_MAX_BYTES;
  captureMaxDimension: typeof PHOTO_MAX_DIMENSION;
  uploadWindowSeconds: typeof PHOTO_UPLOAD_WINDOW_SECONDS;
};
export type PhotoPolicyUpdate = {
  expectedVersion: number;
  enabled: boolean;
  events: PunchAction[];
  retentionDays: number | null;
  failureBehavior: 'ALLOW_WITH_EXCEPTION' | null;
};
/** Plain-text values from the effective company configuration, never request selectors.
 * A valid shape does not independently verify cleanup/backup implementation. */
export type PhotoNotice = {
  policyVersion: number;
  profileVersion: number;
  companyName: string;
  retentionDays: number;
  assistanceContact: string;
  assistanceInstructions: string;
  cleanupDisclosure: string;
  backupDisclosure: string;
};
export type PhotoUploadSnapshot = { policyVersion: number; profileVersion: number };
export type PhotoNoticeProfile = { version: number; assistanceContact: string | null; assistanceInstructions: string | null };
export type PhotoNoticeProfileUpdate = { expectedVersion: number; assistanceContact: string; assistanceInstructions: string };
/** Lifecycle disclosures are supplied by the trusted platform, never the company editor. */
export type PhotoLifecycleDisclosures = { cleanupDisclosure: string; backupDisclosure: string };
export type PhotoNoticeContext = { companyName: string | null; policy: PhotoPolicy; profile: PhotoNoticeProfile };
export type PhotoCompanyNoticeSettings = PhotoNoticeContext & { notice: PhotoNotice | null; readiness: 'ready' | 'missing_profile' | 'lifecycle_unverified' };
export type PhotoFailureCode = 'CAMERA_DENIED' | 'CAMERA_UNAVAILABLE' | 'CAPTURE_FAILED' | 'UPLOAD_FAILED' | 'EMPLOYEE_CHANGED' | 'PHOTO_ALTERNATIVE';
export type PhotoStatus = {
  commandId: string;
  state: 'not_required' | 'pending' | 'stored' | 'missing' | 'expired' | 'removed' | 'unknown';
  policyVersion?: number;
  profileVersion?: number;
  uploadDeadline?: string;
  expiresAt?: string;
  code?: PhotoFailureCode;
};
/** Browser metadata has only the original command and opaque current PIN context. */
export type PhotoCommand = { commandId: string; verificationId: string };
export type PhotoFailure = PhotoCommand & { code: PhotoFailureCode };
export type PhotoReference = { deviceId: string; commandId: string };
export type PhotoReviewCursor = PhotoReference & { performedAt: string };
export type PhotoReviewQuery = { limit: number; cursor: PhotoReviewCursor | null };
export type PhotoReviewRecord = {
  reference: PhotoReference; employeeName: string; locationName: string; locationKey: string; timeZone: string;
  action: PunchAction; performedAt: string; policyVersion: number; profileVersion: number; state: PhotoStatus['state'];
  expiresAt: string | null; code?: PhotoFailureCode; hasImage: boolean; removedAt: string | null;
};
export type PhotoReviewPage = { records: PhotoReviewRecord[]; total: number; nextCursor: PhotoReviewCursor | null };
export type PhotoRemovalResult = { reference: PhotoReference; state: 'removed' | 'already_removed' | 'unavailable'; removedAt: string | null };
export type PhotoCleanupResult = { expired: number; orphanFinalized: number };

export type PhotoErrorCode = 'INVALID_INPUT' | 'AUTH_REQUIRED' | 'CONTEXT_CHANGED' | 'COMMAND_REUSED' | 'POLICY_CHANGED' | 'UNAVAILABLE';
const messages: Record<PhotoErrorCode, string> = {
  INVALID_INPUT: 'Check the photo request and try again using the original clock action.',
  AUTH_REQUIRED: 'Verify your PIN again on this registered tablet.',
  CONTEXT_CHANGED: 'Tablet verification changed. Clear the previous photo before continuing.',
  COMMAND_REUSED: 'A different photo already belongs to this clock action.',
  POLICY_CHANGED: 'Photo settings changed. Reload their current values before saving.',
  UNAVAILABLE: 'The photo result could not be confirmed. Check the original clock action; do not create a replacement punch.',
};
export class ClockerPhotoError extends Error {
  constructor(public readonly code: PhotoErrorCode) {
    super(messages[code]);
    this.name = 'ClockerPhotoError';
  }
}
