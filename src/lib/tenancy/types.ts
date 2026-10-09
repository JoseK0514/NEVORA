import type { UserRole } from '../domain';

// No exported value/constructor can supply either brand. Runtime authority is
// independently enforced by the issuer's private object-identity registries.
declare const tenantProofBrand: unique symbol;
declare const provisionerScopeBrand: unique symbol;
type Issued<K extends string> = Readonly<{ kind: K; [tenantProofBrand]: true }>;
export type PortalProof = Issued<'PORTAL'>;
export type ClockerProof = Issued<'CLOCKER'>;
export type CalendarReadProof = Issued<'CALENDAR_READ'>;
export type WorkerProof = Issued<'WORKER'>;
export type TenantProof = PortalProof | ClockerProof | CalendarReadProof | WorkerProof;
export type ProvisionerScope = Readonly<{ kind: 'PROVISIONER'; [provisionerScopeBrand]: true }>;

type TenantFactsBase<K extends TenantProof['kind']> = Readonly<{
  kind: K; workspaceId: string; workspaceVersion: string; workspaceIncarnation: string;
  resolvedAt: string; expiresAt: string;
}>;
export type PortalProofFacts = TenantFactsBase<'PORTAL'> & Readonly<{
  locator: string; employeeId: string; employeeVersion: string; authorizationVersion: string;
  portalAccessVersion: string; sessionTokenHash: string; sessionExpiresAt: string; role: UserRole;
  capabilityPolicyRevision: string; capabilities: readonly string[];
  /** Union of permitted tenant locations, not scheduling eligibility. */
  allowedLocationIds: readonly string[]; administrativeLocationIds: readonly string[];
}>;
export type ClockerProofFacts = TenantFactsBase<'CLOCKER'> & Readonly<{
  locationId: string; deviceId: string; deviceVersion: string; credentialHash: string;
  credentialVersion: string; pinSessionTokenHash: string; pinVersion: string; pinKeyIdentity: string;
  employeeId: string; employeeVersion: string; pinSessionExpiresAt: string;
}>;
export type CalendarReadProofFacts = TenantFactsBase<'CALENDAR_READ'> & Readonly<{
  subscriptionId: string; digest: string; generation: string; employeeId: string;
  employeeVersion: string; authorizationVersion: string; allowedLocationIds: readonly string[];
}>;
export type WorkerProofFacts = TenantFactsBase<'WORKER'> & Readonly<{
  workerId: string; workerCredentialDigest: string; workerGrantVersion: string; environment: WorkerEnvironment;
  deliveryId: string; intentId: string; subscriptionId: string; generation: string;
  leaseTokenHash: string; leaseExpiresAt: string;
}>;
export type TenantProofFacts = PortalProofFacts | ClockerProofFacts | CalendarReadProofFacts | WorkerProofFacts;
export type WorkerEnvironment = 'test' | 'production';
export type ProvisionerEnvironment = 'local' | 'test';
export type ProvisionerPurpose = 'TENANT_BOOTSTRAP' | 'INITIAL_OWNER_VERIFICATION' | 'TENANT_RESTORE' | 'OWNER_ACCESS_REVERIFICATION';
export type ProvisionerScopeFacts = Readonly<{
  kind: 'PROVISIONER'; operatorId: string; operatorGrantId: string; operatorGrantVersion: string;
  operatorCredentialDigest: string; environment: ProvisionerEnvironment; purpose: ProvisionerPurpose;
  workspaceId: string | null; bootstrapNonce: string | null; subjectEmployeeId: string;
  workspaceIncarnation: string | null; sourceVersion: string | null; verifiedIdentityReference: string | null;
  requestId: string; requestDigest: string; operationId: string; payloadDigest: string;
  resolvedAt: string; expiresAt: string;
}>;
export type ProofResolution<P extends TenantProof> = Readonly<{ status: 'ALLOW'; proof: P }> | Readonly<{ status: 'DENY' | 'UNAVAILABLE' }>;
export type ScopeResolution = Readonly<{ status: 'ALLOW'; scope: ProvisionerScope }> | Readonly<{ status: 'DENY' | 'UNAVAILABLE' }>;
export type WorkerIdentity = Readonly<{ workerId: string; credentialDigest: string; environment: WorkerEnvironment }>;
export type WorkerLeaseClaim = Readonly<{ deliveryId: string; generation: string; leaseToken: string }>;
export type ProvisionerOperator = Readonly<{
  operatorId: string; credentialDigest: string; requestId: string; requestDigest: string;
  operationId: string; payloadDigest: string;
}>;
