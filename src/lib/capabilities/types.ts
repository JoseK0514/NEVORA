import type { UserRole } from '../domain';

/** F-P02 names. These are policy vocabulary, never session/proof constructors.
 * Integration is held until the full F10 gate and canonical consumer contracts. */
export const CAPABILITIES = [
  'management.home.read', 'management.own-workforce',
  'self.schedule.read', 'self.workforce.manage', 'self.time.read', 'self.time.request',
  'profile.self.read', 'security.self.manage',
  'employee.roster.read', 'employee.create', 'employee.role.edit', 'employee.core.edit',
  'employee.eligibility.edit', 'employee.positions.edit', 'employee.deactivate', 'employee.restore',
  'authority.grant', 'workspace.edit', 'workspace.suspend', 'workspace.restore', 'catalog.read', 'catalog.manage',
  'configuration.scheduling.manage', 'schedule.draft.read', 'schedule.readiness.read',
  'schedule.assign', 'schedule.generate', 'schedule.publish', 'schedule.restore', 'request.review',
  'attendance.read', 'correction.review', 'timecard.read', 'timecard.approve', 'timecard.finalize', 'timecard.reopen',
  'report.read', 'report.export', 'payroll.read', 'payroll.export', 'action-center.read',
  'communication.team.author', 'communication.management.author', 'communication.revise',
  'communication.withdraw', 'communication.require-ack', 'communication.recipient-receipts.read',
  'communication.own-receipt.read', 'communication.sent-summary.read',
  'calendar.self.issue', 'calendar.self.rotate', 'calendar.self.revoke', 'calendar.self.read', 'calendar.employee.revoke',
  'clocker.device.manage', 'clocker.pin.support', 'clocker.pin.self', 'audit.read', 'audit.self.read',
  'onboarding.configure', 'onboarding.finish', 'csv.preview', 'csv.commit', 'csv.receipt', 'csv.replay', 'csv.reverse',
] as const;
export type Capability = typeof CAPABILITIES[number];
export const CAPABILITY_FIELDS = [
  'employee.identity', 'employee.contact', 'employee.role', 'employee.eligibility', 'employee.positions',
  'schedule', 'readiness', 'generation', 'request', 'attendance', 'timecard', 'payroll',
  'communication.body', 'communication.ownReceipt', 'communication.recipientReceipts', 'communication.sentSummary',
  'calendar.url', 'configuration', 'audit.metadata', 'audit.source', 'csv.contacts',
  'verification.attestation', 'secret.password', 'secret.pin', 'secret.bearer',
] as const;
export type CapabilityField = typeof CAPABILITY_FIELDS[number];
export type AdministrativeScope =
  | { kind: 'ALL_TENANT'; origin: 'LEGACY_COMPATIBILITY' | 'EXPLICIT_GRANT' }
  | { kind: 'LOCATIONS'; origin: 'EXPLICIT_GRANT'; locationIds: string[] };
export type PortalState = 'DISABLED' | 'PROOF_PENDING' | 'ENABLED' | 'SUSPENDED';
export type CapabilityMode = 'READ' | 'MUTATE' | 'COUNT' | 'EXPORT' | 'PREVIEW' | 'RECEIPT' | 'OPEN' | 'RECOVER_OPERATION';
export type ScopePhase = 'CURRENT' | 'HISTORY' | 'RESTORE';
export type PolicySubject = {
  id: string; workspaceId: string; role: UserRole; workforceActive: boolean; portalState: PortalState;
  identityVerified: boolean; locationIds: string[];
  administrativeScope?: AdministrativeScope | null;
  effectiveAdministrativeCapabilities?: Capability[];
};

/** Plain current server observations, NOT trusted evidence. A future consumer
 * derives/rechecks all facts from its protected F10 proof/source under locks.
 * canonicalAllowed preserves scheduling, consent, E2, PIN and lifecycle rules;
 * setting it or other booleans does not authenticate a caller. Complete means
 * the full affected subject/card/source footprint, not a paginated projection. */
export type CapabilityInput = {
  capability: Capability; mode: CapabilityMode; phase: ScopePhase;
  requestedFields: CapabilityField[]; affectedLocationIds: string[];
  actor: { id: string; workspaceId: string; role: UserRole; workforceActive: boolean; portalState: PortalState;
    administrativeScope: AdministrativeScope | null; effectiveAdministrativeCapabilities: Capability[] };
  workspace: { id: string; active: boolean };
  authority: { membershipCurrent: boolean; sessionCurrent: boolean; grantsCurrent: boolean; capturedSelfChange: boolean };
  source: {
    workspaceId: string; current: boolean; footprintComplete: boolean; canonicalAllowed: boolean;
    permittedFields: CapabilityField[];
    locations: { id: string; workspaceId: string; active: boolean }[];
    subject?: PolicySubject;
    resourceOwnerEmployeeId?: string;
    team?: { current: boolean; participant: boolean; type: 'TODAYS_TEAM' | 'LOCATION_ANNOUNCEMENT' | 'OPERATIONAL_UPDATE' | 'SHIFT_NOTE'; authorEmployeeId: string };
    review?: { requiresSecondReviewer: boolean; previousReviewerId: string | null };
    ownerChange?: { current: boolean; usableOwnersRemaining: number };
  };
  /** Explicit resolved administrative role defaults/grants; self-service role
   * variants do not confer administrative powers and are not ceiling inputs. */
  roleGrant?: { role: UserRole; administrativeCapabilities: Capability[]; administrativeScope: AdministrativeScope | null };
  membershipChange?: { nextLocationIds: string[] };
  batchRoles?: UserRole[];
};
export type CapabilityDenial = 'INVALID_INPUT' | 'AUTHORITY_NOT_CURRENT' | 'TENANT_MISMATCH' |
  'SOURCE_NOT_CURRENT' | 'CANONICAL_DENIED' | 'FOOTPRINT_INCOMPLETE' | 'ROLE_DENIED' |
  'ADMIN_SCOPE_REQUIRED' | 'LOCATION_SCOPE_DENIED' | 'LOCATION_INACTIVE' | 'FIELD_DENIED' |
  'CAPABILITY_NOT_GRANTED' | 'GRANT_CEILING_DENIED' | 'SELF_SCOPE_DENIED' | 'TEAM_SCOPE_DENIED' |
  'SELF_REVIEW_DENIED' | 'SECOND_REVIEWER_REQUIRED' | 'OWNER_SUCCESSION_DENIED' |
  'SELF_CHANGE_NOT_CAPTURED' | 'BULK_ROLE_DENIED' | 'CONTROL_PLANE_REQUIRED';
export type CapabilityDecision =
  | { allowed: false; reason: CapabilityDenial }
  | { allowed: true; reason: 'POLICY_ALLOWED'; capability: Capability;
      scope: { workspaceId: string; locationIds: readonly string[]; fields: readonly CapabilityField[];
        roleVariant: 'MANAGEMENT' | 'SELF' | 'TEAM' | 'TENANT'; phase: ScopePhase; mode: CapabilityMode } };
