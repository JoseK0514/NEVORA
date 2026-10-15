/** Frozen service signatures. This interface is a source contract, not an adapter. */
import type { SqlExecutor } from '@/lib/notifications/types';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import type * as M from './model';
import type * as I from '@/lib/auth/invitations/model';
export type InvitationDelivery = {
  send(input: { registeredEmail: string; proof: string; expiresAt: string }): Promise<{ providerAccepted: true }>;
};
export type CompanyAccessBackend = {
  readOwnerOperationalScope(proof: SessionMutationProof, employeeId: string, executor?: SqlExecutor): Promise<M.OperationalRead<M.OwnerOperationalScopeData>>;
  withOperationalCompany<T>(proof: SessionMutationProof, load: () => Promise<T>, executor?: SqlExecutor): Promise<M.OperationalRead<T>>;
  readOperationalAuthority(proof: SessionMutationProof, executor?: SqlExecutor): Promise<M.OperationalAuthorityView>;
  assignOperationalScope(proof: SessionMutationProof, employeeId: string, command: M.ScopeCommand, executor?: SqlExecutor): Promise<M.ScopeResult>;
  readOperationalDirectory(proof: SessionMutationProof, executor?: SqlExecutor): Promise<M.OperationalRead<M.OperationalDirectoryData>>;
  readOperationalSchedule(proof: SessionMutationProof, query: { weekStart: string; locationId?: string }, executor?: SqlExecutor): Promise<M.OperationalRead<M.OperationalScheduleData>>;
  readOperationalShiftEditor(proof: SessionMutationProof, query: { shiftId: string } | { weekStart: string; locationId: string }, executor?: SqlExecutor): Promise<M.OperationalRead<M.OperationalShiftEditorData>>;
  readOperationalClockMonitor(proof: SessionMutationProof, executor?: SqlExecutor): Promise<M.OperationalRead<M.OperationalClockMonitorData>>;
  readOperationalEmployeeProfile(proof: SessionMutationProof, employeeId: string, executor?: SqlExecutor): Promise<M.OperationalRead<M.OperationalEmployeeProfileData>>;
  saveEmployeeCoreAccessProfile(proof: SessionMutationProof, command: M.EmployeeCoreAccessCommand, executor?: SqlExecutor): Promise<M.EmployeeCoreAccessResult>;
  createEmployeeWithAccess(proof: SessionMutationProof, command: M.CreateEmployeeWithAccessCommand, executor?: SqlExecutor): Promise<M.EmployeeCoreAccessResult>;
  readEmployeeCoreAccessOperation(proof: SessionMutationProof, operationId: string, executor?: SqlExecutor): Promise<M.EmployeeCoreAccessResult>;
  readInvitationStatus(proof: SessionMutationProof, employeeId: string, executor?: SqlExecutor): Promise<I.InvitationStatusResult>;
  readInvitationOperation(proof: SessionMutationProof, operationId: string, executor?: SqlExecutor): Promise<I.InvitationResult>;
  issueOrRevokeInvitation(proof: SessionMutationProof, employeeId: string, command: I.InvitationCommand, delivery: InvitationDelivery | null, executor?: SqlExecutor): Promise<I.InvitationResult>;
  claimInvitation(proof: string, password: string, executor?: SqlExecutor): Promise<I.ActivationResult>;
};
