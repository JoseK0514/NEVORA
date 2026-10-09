import type { Capability, CapabilityField, CapabilityInput } from '../capabilities/types';
import type { ProvisionerScope, TenantProof } from '../tenancy/types';

/** Pure observations, never authentication, proof issuance or an append-only write.
 * The protected adapter must bind these facts to actual sources and current F6
 * authority after F10. A caller-supplied object is not permission to read data. */
export type ActivityProofKind = TenantProof['kind'] | ProvisionerScope['kind'];
export const PRESERVED_ACTIVITY_LEDGERS = [
  'shift_change_events', 'clocker_device_events', 'clocker_pin_events',
  'clocker_break_type_events', 'clocker_command_ledger', 'time_correction_events',
  'timecard_revisions', 'schedule_publication_revisions', 'communication_lifecycle',
  'communication_receipts', 'communication_operations', 'employee_attention_receipts',
  'employee_attention_operations', 'calendar_operations',
] as const;
export type PreservedActivityLedger = typeof PRESERVED_ACTIVITY_LEDGERS[number];
/** Declared safe reference tables for this preparation, not a full inventory.
 * New F tables require an explicit typed adapter/registry extension. Credential
 * stores and capability tables are intentionally absent even for Owner. */
export const ACTIVITY_BUSINESS_SOURCE_TABLES = [
  'workspaces', 'employees', 'locations', 'positions', 'employee_positions',
  'employee_location_eligibility', 'schedules', 'shifts', 'shift_exchanges',
  'shift_callouts', 'time_off_requests', 'availability_windows', 'availability_exceptions',
  'weekly_availability_windows', 'weekly_availability_submissions', 'schedule_templates',
  'schedule_template_shifts', 'schedule_publication_revision_shifts', 'time_entries',
  'break_entries', 'time_correction_requests', 'time_correction_adjustments',
  'clocker_devices', 'clocker_break_types', 'communications', 'communication_revisions',
  ...PRESERVED_ACTIVITY_LEDGERS,
] as const;
export type ActivityBusinessSourceTable = typeof ACTIVITY_BUSINESS_SOURCE_TABLES[number];
export type OwnActivityCapability = 'self.schedule.read' | 'self.time.read' | 'communication.own-receipt.read';

/** Required server-maintained engineering registry, not a new owner policy.
 * No prospective enum spelling/producer mapping is inferred by this helper.
 * Root's typed adapters must derive the final registry from approved commands. */
export type ActivityDefinition = {
  eventType: string; purpose: string; family: string; sourceTables: ActivityBusinessSourceTable[];
  /** Actual observation-start fact; null means prospective recording unverified. */
  prospectiveFrom: string | null;
  managementCapability: Capability; selfCapability: OwnActivityCapability | null;
  summaryFields: CapabilityField[];
  preservedKinds: Partial<Record<PreservedActivityLedger, string[]>>;
};
/** digest is an actual business source/history hash, never a credential, bearer,
 * PIN, lease or session digest. Source-specific adapters must enforce that. */
export type ActivitySourceRef = { workspaceId: string; table: ActivityBusinessSourceTable; id: string; version: string; digest: string | null };
export type ActivityActor = { workspaceId: string; kind: 'EMPLOYEE' | 'SERVICE' | 'UNKNOWN'; id: string | null; proofKind: ActivityProofKind | null };
export type ActivityOperationRef = { workspaceId: string; actorId: string; purpose: string; id: string };
export type ActivityDetailPermission = 'ACTOR_IDENTITY' | 'SOURCE_REFERENCE' | 'SOURCE_HASH' | 'PROVENANCE_REFERENCE' | 'PROVENANCE_HASH';
export type ActivityProvenance =
  | { kind: 'PROSPECTIVE'; operation: ActivityOperationRef }
  | { kind: 'PRESERVED'; ledger: ActivitySourceRef & { table: PreservedActivityLedger }; sourceEventType: string | null };
export type ActivityFootprint = {
  complete: boolean;
  /** Complete current AND historical source/card footprint; never page-local. */
  locationIds: string[];
};
export type ActivityRecordObservation = {
  workspaceId: string; id: string; eventType: string; purpose: string; occurredAt: string;
  actor: ActivityActor; source: ActivitySourceRef; provenance: ActivityProvenance;
  footprint: ActivityFootprint; authorization: CapabilityInput['source'];
  /** Additional current source-adapter ceiling. Permission for the subject's
   * identity does not imply actor identity; own-source access does not imply
   * another actor's operation/ledger/hash. This is plain observation, not proof. */
  detailPermissions: ActivityDetailPermission[];
  /** Values/bodies/snapshots/notes are deliberately absent. Typed domain-value
   * adapters remain required for the final allowed-field detail contract. */
  summary: { changedFields: CapabilityField[] };
};
export type ActivityCoverageGap = {
  from: string | null; until: string | null;
  reason: 'PRE_F_NOT_INSTRUMENTED' | 'SOURCE_NOT_OBSERVED' | 'ADAPTER_LIMIT';
};
export type ActivityCoverageObservation = {
  workspaceId: string; family: string; definitionType: string;
  footprint: ActivityFootprint; authorization: CapabilityInput['source'];
  historical: {
    state: 'PRESERVED_HISTORY' | 'NOT_OBSERVED' | 'UNKNOWN';
    observedFrom: string | null; observedThrough: string | null;
    ledgers: PreservedActivityLedger[]; gaps: ActivityCoverageGap[];
  };
};
export type ActivityQuery = {
  eventTypes?: string[]; sourceIds?: string[]; changedFields?: CapabilityField[];
  from?: string; through?: string;
};
export type ActivityProjectionInput = {
  actor: CapabilityInput['actor']; workspace: CapabilityInput['workspace']; authority: CapabilityInput['authority'];
  observedAt: string; mode: 'READ' | 'COUNT' | 'EXPORT'; requestedFields: CapabilityField[];
  definitions: ActivityDefinition[]; records: ActivityRecordObservation[];
  coverage: ActivityCoverageObservation[]; query?: ActivityQuery;
};
export type ActivityPublicSourceRef = Omit<ActivitySourceRef, 'workspaceId' | 'digest'> & { digest?: string | null };
export type ActivityEntry = {
  id: string; eventType: string; purpose: string; occurredAt: string; provenanceKind: ActivityProvenance['kind'];
  actor?: Omit<ActivityActor, 'workspaceId'>;
  source?: ActivityPublicSourceRef;
  provenance?: { kind: 'PROSPECTIVE'; operation: Omit<ActivityOperationRef, 'workspaceId' | 'actorId'> }
    | { kind: 'PRESERVED'; ledger: ActivityPublicSourceRef; sourceEventType: string | null };
  summary: { changedFields: CapabilityField[] };
};
export type ActivityCoverage = {
  family: string; historical: ActivityCoverageObservation['historical'];
};
export type ActivityProjection =
  | { state: 'ready'; mode: 'READ' | 'EXPORT'; observedAt: string; entries: ActivityEntry[]; coverage: ActivityCoverage[]; count: number }
  | { state: 'ready'; mode: 'COUNT'; observedAt: string; count: number }
  | { state: 'unavailable' };
