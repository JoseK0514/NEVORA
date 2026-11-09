import { PHOTO_ACTIONS, PHOTO_MAX_BYTES, PHOTO_MAX_DIMENSION, PHOTO_UPLOAD_WINDOW_SECONDS,
  ClockerPhotoError, type PhotoCommand, type PhotoFailure, type PhotoNotice, type PhotoNoticeProfile, type PhotoNoticeProfileUpdate,
  type PhotoPolicy, type PhotoPolicyUpdate, type PhotoReference, type PhotoReviewQuery, type PhotoUploadSnapshot } from './contracts';

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const whole = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const fullMatch = (value: unknown, expression: RegExp): value is string => typeof value === 'string' && expression.test(value) && !value.endsWith('\n');

function command(value: Record<string, unknown>): PhotoCommand {
  if (!fullMatch(value.commandId, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/) ||
      !fullMatch(value.verificationId, /^[a-f0-9]{64}$/)) throw new ClockerPhotoError('INVALID_INPUT');
  return { commandId: value.commandId, verificationId: value.verificationId };
}
export function parsePhotoCommand(value: unknown): PhotoCommand {
  if (!object(value) || !exact(value, ['commandId', 'verificationId'])) throw new ClockerPhotoError('INVALID_INPUT');
  return command(value);
}
export function parsePhotoFailure(value: unknown): PhotoFailure {
  if (!object(value) || !exact(value, ['commandId', 'verificationId', 'code']) ||
      !['CAMERA_DENIED', 'CAMERA_UNAVAILABLE', 'CAPTURE_FAILED', 'UPLOAD_FAILED', 'EMPLOYEE_CHANGED', 'PHOTO_ALTERNATIVE'].includes(String(value.code))) {
    throw new ClockerPhotoError('INVALID_INPUT');
  }
  return { ...command(value), code: value.code as PhotoFailure['code'] };
}
export function parsePhotoPolicyUpdate(value: unknown): PhotoPolicyUpdate {
  if (!object(value) || !exact(value, ['expectedVersion', 'enabled', 'events', 'retentionDays', 'failureBehavior']) ||
      !whole(value.expectedVersion, 0, 2_147_483_646) || typeof value.enabled !== 'boolean' ||
      !Array.isArray(value.events) || value.events.length > 4 ||
      value.events.some(action => !PHOTO_ACTIONS.includes(action)) || new Set(value.events).size !== value.events.length ||
      !(value.retentionDays === null || whole(value.retentionDays, 1, 30)) ||
      !(value.failureBehavior === null || value.failureBehavior === 'ALLOW_WITH_EXCEPTION')) {
    throw new ClockerPhotoError('INVALID_INPUT');
  }
  // Only a first policy save receives the approved defaults. Disabled legacy
  // policies keep explicitly stored NULL values; no implicit backfill occurs.
  const retentionDays = value.expectedVersion === 0 && value.retentionDays === null ? 30 : value.retentionDays as number | null;
  const failureBehavior = value.expectedVersion === 0 && value.failureBehavior === null ? 'ALLOW_WITH_EXCEPTION' : value.failureBehavior as PhotoPolicyUpdate['failureBehavior'];
  if (value.enabled && (!value.events.length || retentionDays === null || failureBehavior === null)) throw new ClockerPhotoError('INVALID_INPUT');
  return { expectedVersion: value.expectedVersion, enabled: value.enabled,
    events: PHOTO_ACTIONS.filter(action => (value.events as unknown[]).includes(action)),
    retentionDays, failureBehavior };
}
/** Approved defaults do not claim persistence, notice readiness or activation. */
export function unconfiguredPhotoPolicy(): PhotoPolicy {
  return { version: 0, enabled: false, events: [...PHOTO_ACTIONS], retentionDays: 30, failureBehavior: 'ALLOW_WITH_EXCEPTION',
    captureMaxBytes: PHOTO_MAX_BYTES, captureMaxDimension: PHOTO_MAX_DIMENSION, uploadWindowSeconds: PHOTO_UPLOAD_WINDOW_SECONDS };
}

const noticeFields = ['policyVersion', 'profileVersion', 'companyName', 'retentionDays', 'assistanceContact', 'assistanceInstructions', 'cleanupDisclosure', 'backupDisclosure'] as const;
function noticeText(value: unknown, limit: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > limit || /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(text) ||
      /\{\{|\}\}|\[(?:company name|retention days|assistance contact|cleanup disclosure|backup disclosure)\]/i.test(text)) return null;
  return text;
}
/** Missing, stale or placeholder notice values keep real capture unavailable.
 * The server provider must supply verified effective company/lifecycle details. */
export function parsePhotoNotice(value: unknown, policy: PhotoPolicy, expectedProfileVersion?: number): PhotoNotice | null {
  if (!object(value) || !exact(value, noticeFields) || !whole(value.policyVersion, 0, 2_147_483_646) ||
      !whole(value.profileVersion, 1, 2_147_483_646) || (expectedProfileVersion !== undefined && value.profileVersion !== expectedProfileVersion) ||
      value.policyVersion !== policy.version || !whole(value.retentionDays, 1, 30) || value.retentionDays !== policy.retentionDays) return null;
  const companyName = noticeText(value.companyName, 160);
  const assistanceContact = noticeText(value.assistanceContact, 200);
  const assistanceInstructions = noticeText(value.assistanceInstructions, 1000);
  const cleanupDisclosure = noticeText(value.cleanupDisclosure, 1500);
  const backupDisclosure = noticeText(value.backupDisclosure, 1500);
  if (!companyName || !assistanceContact || !assistanceInstructions || !cleanupDisclosure || !backupDisclosure) return null;
  return { policyVersion: value.policyVersion, profileVersion: value.profileVersion, companyName, retentionDays: value.retentionDays,
    assistanceContact, assistanceInstructions, cleanupDisclosure, backupDisclosure };
}
export function parsePhotoUploadSnapshot(value: unknown): PhotoUploadSnapshot {
  if (!object(value) || !exact(value, ['policyVersion', 'profileVersion']) ||
      !whole(value.policyVersion, 1, 2_147_483_646) || !whole(value.profileVersion, 1, 2_147_483_646)) throw new ClockerPhotoError('INVALID_INPUT');
  return { policyVersion: value.policyVersion, profileVersion: value.profileVersion };
}
export function unconfiguredPhotoNoticeProfile(): PhotoNoticeProfile {
  return { version: 0, assistanceContact: null, assistanceInstructions: null };
}
export function parsePhotoNoticeProfileUpdate(value: unknown): PhotoNoticeProfileUpdate {
  if (!object(value) || !exact(value, ['expectedVersion', 'assistanceContact', 'assistanceInstructions']) ||
      !whole(value.expectedVersion, 0, 2_147_483_646)) throw new ClockerPhotoError('INVALID_INPUT');
  const assistanceContact = noticeText(value.assistanceContact, 200);
  const assistanceInstructions = noticeText(value.assistanceInstructions, 1000);
  if (!assistanceContact || !assistanceInstructions) throw new ClockerPhotoError('INVALID_INPUT');
  return { expectedVersion: value.expectedVersion, assistanceContact, assistanceInstructions };
}
export function publicPhotoNoticeProfile(value: unknown): PhotoNoticeProfile {
  if (!object(value) || !exact(value, ['version', 'assistanceContact', 'assistanceInstructions']) ||
      !whole(value.version, 1, 2_147_483_646)) throw new ClockerPhotoError('UNAVAILABLE');
  const profile = parsePhotoNoticeProfileUpdate({ expectedVersion: value.version, assistanceContact: value.assistanceContact,
    assistanceInstructions: value.assistanceInstructions });
  return { version: value.version, assistanceContact: profile.assistanceContact, assistanceInstructions: profile.assistanceInstructions };
}
export function parsePhotoReference(value: unknown): PhotoReference {
  if (!object(value) || !exact(value, ['deviceId', 'commandId']) ||
      !fullMatch(value.deviceId, /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/)) throw new ClockerPhotoError('INVALID_INPUT');
  return { deviceId: value.deviceId, commandId: command({ commandId: value.commandId, verificationId: '0'.repeat(64) }).commandId };
}
export function parsePhotoReviewQuery(value: unknown): PhotoReviewQuery {
  if (!object(value) || !exact(value, ['limit', 'cursor']) || !whole(value.limit, 1, 50)) throw new ClockerPhotoError('INVALID_INPUT');
  if (value.cursor === null) return { limit: value.limit, cursor: null };
  if (!object(value.cursor) || !exact(value.cursor, ['performedAt', 'deviceId', 'commandId']) ||
      !fullMatch(value.cursor.performedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/) ||
      !Number.isFinite(Date.parse(value.cursor.performedAt))) throw new ClockerPhotoError('INVALID_INPUT');
  return { limit: value.limit, cursor: { ...parsePhotoReference({ deviceId: value.cursor.deviceId, commandId: value.cursor.commandId }), performedAt: value.cursor.performedAt } };
}
export function publicPhotoPolicy(value: Omit<PhotoPolicy, 'captureMaxBytes' | 'captureMaxDimension' | 'uploadWindowSeconds'>): PhotoPolicy {
  const parsed = parsePhotoPolicyUpdate({ expectedVersion: value.version, enabled: value.enabled,
    events: value.events, retentionDays: value.retentionDays, failureBehavior: value.failureBehavior });
  return { version: parsed.expectedVersion, enabled: parsed.enabled, events: parsed.events,
    retentionDays: parsed.retentionDays, failureBehavior: parsed.failureBehavior,
    captureMaxBytes: PHOTO_MAX_BYTES, captureMaxDimension: PHOTO_MAX_DIMENSION, uploadWindowSeconds: PHOTO_UPLOAD_WINDOW_SECONDS };
}
