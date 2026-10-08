import type { UserRole } from '../domain';
import type { NotificationEvent } from '../assistance/notification-events';
import type { PublishedShiftSnapshot } from '../assistance/publication-diff';
import type { EmployeeAcknowledgementState } from '../assistance/acknowledgement-state';
import type { ManagerActionItem } from '../assistance/manager-actions';
import type { PublicationRevision } from '../data/publication-revisions';
import type { TimeOffListItem } from '../data/requests';
import type { ExchangeRecord } from '../data/exchanges';
import type { CalloutRecord } from '../data/callouts';
import type { WeekSettings } from '../data/week-settings';
import type { AvailabilitySubmissionListItem } from '../data/availability-submissions';

export type PushEnvironment = 'test' | 'production';
export type SourceKind = 'SCHEDULE' | 'TIME_OFF' | 'EXCHANGE' | 'CALLOUT' | 'AVAILABILITY' | 'MANAGER_SUMMARY' | 'SELF_TEST' | 'COMMUNICATION';
/** SELF_TEST id = internal subscription id, version = verified ownership generation. */
export type SourceRef = { kind: SourceKind; id: string; version: string };
export type NotificationIntent = NotificationEvent & {
  id: string; environment: PushEnvironment; source: SourceRef; effectiveVersion: string;
  purpose: 'EVENT' | 'REMINDER' | 'SUMMARY' | 'TEST'; urgency: 'normal' | 'high';
  dueAt: string; expiresAt: string; itemKeys?: readonly string[];
};
export type RecipientAccess = { employeeId: string; role: UserRole; active: boolean; allowedLocationIds: readonly string[] };
/** Per-account projection of the existing publication/acknowledgement records. */
export type EmployeePublicationProjection = {
  effectiveVersion: string; publishedAt: string;
  acknowledgement?: EmployeeAcknowledgementState;
  acknowledgedRevisionShifts?: readonly PublishedShiftSnapshot[];
};
type SnapshotBase<K extends SourceKind> = { source: SourceRef & { kind: K }; updatedAt: string };
export type ScheduleSourceSnapshot = SnapshotBase<'SCHEDULE'> & {
  kind: 'SCHEDULE'; revision: PublicationRevision;
  previousShifts: readonly PublishedShiftSnapshot[]; currentShifts: readonly PublishedShiftSnapshot[];
  employeePublications?: Readonly<Record<string, EmployeePublicationProjection>>;
};
export type SourceSnapshot =
  | (SnapshotBase<'COMMUNICATION'> & {kind:'COMMUNICATION';recipientIds:readonly string[];expiresAt:string|null})
  | ScheduleSourceSnapshot
  | (SnapshotBase<'TIME_OFF'> & { kind: 'TIME_OFF'; record: TimeOffListItem })
  | (SnapshotBase<'EXCHANGE'> & { kind: 'EXCHANGE'; record: ExchangeRecord; eligibleEmployeeIds?:readonly string[]; completionDeadline?:string|null; semanticNeedKey?:string; attentionReason?:string })
  | (SnapshotBase<'CALLOUT'> & { kind: 'CALLOUT'; record: CalloutRecord })
  | (SnapshotBase<'AVAILABILITY'> & { kind: 'AVAILABILITY'; settings: WeekSettings; submissions: readonly AvailabilitySubmissionListItem[] })
  | (SnapshotBase<'MANAGER_SUMMARY'> & { kind: 'MANAGER_SUMMARY'; weekStart: string; items: readonly ManagerActionItem[]; expiresAt: string })
  | (SnapshotBase<'SELF_TEST'> & { kind: 'SELF_TEST'; employeeId: string; expiresAt: string });
export type PushEnvelope = { notificationId: string; kind: string; ownershipGeneration: string; expiresAt: string; tag: string; title: string; body: string };
export type SqlStatement = { text: string; values: readonly unknown[] };
export type SqlExecutor = { query<T>(statement: SqlStatement, signal?: AbortSignal): Promise<T[]>; transaction(statements: readonly SqlStatement[], signal?: AbortSignal): Promise<unknown[][]> };
export type SourceCheck = { deliverable: boolean; reason: string; effectiveVersion: string; expiresAt: string; destination?: string };
export type ProviderResult = { kind: 'accepted' } | { kind: 'retry'; errorClass: string; retryAfterSeconds?: number } | { kind: 'invalid_subscription' } | { kind: 'failed'; errorClass: string };
export type WorkerReport = { maintenance?:import('../data/shift-change-maintenance').MaintenanceReport; claimed: number; accepted: number; retried: number; failed: number; expired: number; cancelled: number; noSubscription: number; disabled: boolean };
export type NotificationPolicy = {
  timeZone: string; quietStartHour: 21; quietEndHour: 7;
  availabilityLeadHours: 24; acknowledgementDelayHours: 24; managerCollectionMinutes: 5; urgentLeadHours: 12;
  maxAttempts: 5; retryMinutes: readonly [1, 5, 15, 60]; leaseSeconds: 120; batchSize: 10; concurrency: 2; budgetMs: 20000; attemptDeadlineMs: 8000;
};
export type PushRuntimeConfig = Omit<NotificationConfig, 'policy'>;
export type NotificationConfig = {
  workspace?: import('../domain').Workspace;
  featureEnabled: boolean; deliveryEnabled: boolean; testDeliveryEnabled: boolean;
  testAccountIds: readonly string[]; environment: PushEnvironment; portalOrigin: string; policy: NotificationPolicy;
  workerSecret?: string; vapidPublicKey?: string; vapidPrivateKey?: string; vapidSubject?: string; subscriptionEncryptionKey?: string;
};

/** Server-verified input only: Task 3 validates consent, proofs and encrypts material. */
export type OwnedEnrollment = {
  employeeId: string; installationHash: string; environment: PushEnvironment;
  endpointFingerprint: string; encryptedMaterial: string; sessionHash: string;
  generation: string; expectedGeneration: string | null; expiresAt: string | null;
};
/** Server-generated random token hash inside the authenticated installation cookie. */
export type InstallationProof = { installationHash: string; environment: PushEnvironment; generation: string; associatedSessionHash?: string };
/** Task 3 must verify receipt signature/lifetime before passing this projection. */
export type VerifiedCleanupReceipt = InstallationProof & { sessionHash: string; issuedAt: string; expiresAt: string; revokeSession?: boolean; sessionRevocations?: readonly { sessionHash: string; issuedAt: string; expiresAt: string }[]; recoveryBlocked?: boolean };
export type EnrollmentResult = { state: 'active'; generation: string } | { state: 'conflict' };
export type DeviceStatus = { supported: boolean; enabled: boolean; ownershipGeneration?: string; vapidPublicKey?: string; configurationAvailable: boolean; testAllowed: boolean; dismissalScope?: string };
export type CleanupResult = { state: 'complete' } | { state: 'pending' };
export type InstallationRecord = Pick<PushSubscriptionRecord, 'id' | 'employeeId' | 'installationHash' | 'environment' | 'generation' | 'endpointFingerprint' | 'sessionHash' | 'expiresAt' | 'lastTestAt'> & { status: 'active' | 'detached' | 'invalid' };
export type PushSubscriptionRecord = {
  id: string; employeeId: string; installationHash: string; environment: PushEnvironment;
  endpointFingerprint: string; encryptedMaterial: string; generation: string;
  sessionHash: string; consentAt: string; updatedAt: string; expiresAt: string | null;
  status: 'active'; lastTestAt: string | null;
};
export type DeliveryClaim = {
  deliveryId: string; intentId: string; subscriptionId: string; generation: string;
  leaseToken: string; leaseExpiresAt: string; attemptCount: number; intent: NotificationIntent;
};
/** Retry requires a future nextAttemptAt; accepted means provider acceptance, not display. */
export type DeliveryCompletion = {
  state: 'provider_accepted' | 'retry_pending' | 'failed' | 'expired' | 'cancelled';
  nextAttemptAt?: string; errorClass?: string;
};
export type SubscriptionRepository = {
  findInstallation(installationHash: string, environment: PushEnvironment): Promise<InstallationRecord | null>;
  queueSelfTest(input: { proof: InstallationProof; employeeId: string; sessionHash: string; intent: NotificationIntent }): Promise<boolean>;
  enroll(input: OwnedEnrollment): Promise<EnrollmentResult>;
  detach(input: InstallationProof): Promise<CleanupResult>;
  cleanupRemovedSessions(environment: PushEnvironment, limit: number): Promise<number>;
  listActive(recipientId: string, environment: PushEnvironment): Promise<PushSubscriptionRecord[]>;
  invalidate(subscriptionId: string, generation: string): Promise<void>;
  reconcile(receipt: VerifiedCleanupReceipt): Promise<CleanupResult>;
};
export type DeliveryRepository = {
  materialize(intentIds: readonly string[]): Promise<void>;
  claim(input: { now: Date; limit: number; leaseSeconds: number; mode: 'new' | 'retry' | 'all'; recipientIds?: readonly string[] }): Promise<DeliveryClaim[]>;
  finish(claim: DeliveryClaim, result: DeliveryCompletion): Promise<boolean>;
  release(claim: DeliveryClaim): Promise<boolean>;
  /** Unattempted quiet-hour/due deferral; restores the claimed attempt, retains expiry. */
  defer(claim: DeliveryClaim, nextAttemptAt: Date): Promise<boolean>;
  cancelForGeneration(installationHash: string, generation: string): Promise<void>;
};

/** Canonical current-state read/guard contract. Task 7 supplies authoritative
 * business-source and reminder queries; all consumers must fail closed on outage. */
export type NotificationStateRepository = {
  findIntent(notificationId: string): Promise<NotificationIntent | null>;
  recipientAccess(employeeId: string): Promise<RecipientAccess | null>;
  readSource(source: SourceRef): Promise<SourceSnapshot | null>;
  /** Delivery is the default. Authenticated opens may retain terminal participant history. */
  check(intent: NotificationIntent, recipientId: string, now: Date, use?: 'delivery' | 'open'): Promise<SourceCheck>;
  listReminderCandidates(now: Date, limit: number, shouldContinue?: () => boolean, visit?: (source: SourceSnapshot) => Promise<void>): Promise<SourceSnapshot[]>;
};
