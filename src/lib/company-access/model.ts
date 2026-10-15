// Client-safe DTOs. Versions and selectors are never authorization.
import type { Employee, UserRole } from '@/lib/domain';
import type { EmployeeManagementProfile } from '@/lib/data/employees';
import type { CatalogLocation } from '@/lib/data/locations';
import type { ScheduleShiftRow, ManagementShift } from '@/lib/data/schedules';
import type { ClockMonitorEmployee } from '@/lib/time-clock';

export type ScopeSelection =
  | { mode: 'COMPANY'; locationIds: [] }
  | { mode: 'LOCATIONS'; locationIds: string[] }; // parser requires 1..100

export type AccessFailure = 'access_denied' | 'not_configured' | 'source_changed'
  | 'read_failed' | 'source_limit';
export type SourceCoverage = { kind: 'COMPANY' | 'LOCATIONS'; locationIds: string[] };
export type OperationalRead<T> =
  | { state:'ready'; data:T; coverage:SourceCoverage; authority:string;
      observedAt:string; validForMs:number }
  | { state:'unavailable'; reason:AccessFailure };

export type OperationalAuthorityView =
  | { state:'ready'; employeeId:string; role:UserRole;
      source:'OWNER_ROLE'|'LEGACY_ADOPTION'|'OWNER_ASSIGNMENT'|'UNASSIGNED'|'REVOKED'|'LIFECYCLE_CHANGED';
      scope:ScopeSelection|null; scopeRevision:number; authority:string;
      locations:{id:string;name:string;shortName:string}[];
      observedAt:string; validForMs:number }
  | { state:'unavailable'; reason:AccessFailure };

export type OwnerScopeContext = {
  employeeId:string; employeeUpdatedAt:string; role:UserRole; active:boolean;
  roleGeneration:string; scopeRevision:number;
  scopeState:'ASSIGNED'|'UNASSIGNED'|'REVOKED'|'LIFECYCLE_CHANGED';
  scope:ScopeSelection|null;
};

export type CoreProfileInput = {
  firstName:string; lastName:string; phone:string; email:string|null;
  role:UserRole; primaryLocationId:string; active:boolean;
};
export type ManagerTransitionScope = {
  expectedScopeRevision:number; expectedRoleGeneration:string;
  scope:ScopeSelection;
};
export type EmployeeCoreAccessCommand = {
  operationId:string; employeeId:string; expectedEmployeeUpdatedAt:string;
  profile:CoreProfileInput;
  managerTransitionScope?:ManagerTransitionScope;
};
export type EmployeeCoreAccessReceipt = {
  operationId:string; employeeId:string; updatedAt:string; role:UserRole;
  active:boolean; roleGeneration:string; scopeRevision:number;
  scopeState:'ASSIGNED'|'UNASSIGNED'|'REVOKED'|'LIFECYCLE_CHANGED';
  scope:ScopeSelection|null;
};
export type EmployeeCoreAccessResult =
  | { state:'saved'; receipt:EmployeeCoreAccessReceipt }
  | { state:'conflict'; reason:'employee_changed'|'scope_changed'|'changed_replay' }
  | { state:'invalid'; fieldErrors:{field:string;message:string}[] }
  | { state:'unavailable' }
  | { state:'outcome_unknown'; operationId:string };

export type CreateEmployeeWithAccessCommand = {
  operationId:string;
  employee:{id:string;firstName:string;lastName:string;phone:string;
    email:string|null;role:UserRole;primaryLocationId:string;
    eligibleLocationIds:string[];positionIds:string[]};
  initialManagerScope?:ScopeSelection;
};

export type ScopedRosterEmployee = {
  id:string;firstName:string;lastName:string;role:UserRole;
  locationIds:string[]; // only current authorized memberships
};
export type OperationalDirectoryData =
  | { mode:'COMPANY';employees:Employee[];locations:CatalogLocation[] }
  | { mode:'LOCATIONS';employees:ScopedRosterEmployee[];
      locations:Pick<CatalogLocation,'id'|'name'|'shortName'|'active'>[] };

export type OperationalShiftRow = Pick<ScheduleShiftRow,
  'id'|'scheduleId'|'employeeId'|'employeeName'|'locationId'|'date'|'startTime'|'endTime'|'notes'|'positionId'|'isDesignatedLead'|'isCalloutApproved'>;
export type OperationalEditableShift = Pick<ManagementShift,
  'id'|'scheduleId'|'employeeId'|'employeeName'|'locationId'|'weekStart'|'date'|'startTime'|'endTime'|'notes'|'positionId'|'isDesignatedLead'|'scheduleStatus'|'isCalloutApproved'>;

export type OperationalScheduleData = {
  weekStart:string;selectedLocationId:string|null;
  locations:Pick<CatalogLocation,'id'|'name'|'shortName'|'active'>[];
  shifts:OperationalShiftRow[];
  roster:(ScopedRosterEmployee & {scheduledMinutesInScope:number})[];
  companyControls:{state:'available'}|{state:'requires_company'};
};
export type OperationalShiftEditorData = {
  weekStart:string;locationId:string;
  shift:OperationalEditableShift|null;
  employeeOptions:{id:string;name:string;positionIds:string[]}[];
  positionOptions:{id:string;name:string}[];
  sourceVersion:string;
  saveAvailability:'available'|'requires_company'|'unavailable';
};
export type OperationalClockMonitorData = {
  timeZone:string;employees:ClockMonitorEmployee[];
};
export type OperationalEmployeeProfileData = {
  profile:EmployeeManagementProfile;locations:CatalogLocation[];
  ownerScope:OwnerScopeContext|null;
};

export type ScopeReceipt={operationId:string;employeeId:string;revision:number;
  roleGeneration:string;committedAt:string;action:'ASSIGN'|'REVOKE';
  scope:ScopeSelection|null};
export type ScopeResult=
  |{state:'saved';receipt:ScopeReceipt}
  |{state:'conflict';reason:'employee_changed'|'scope_changed'|'changed_replay'}
  |{state:'invalid';fieldErrors:{field:string;message:string}[]}
  |{state:'unavailable'}
  |{state:'outcome_unknown';operationId:string};

export type ScopeCommand =
  | {action:'ASSIGN';operationId:string;expectedEmployeeVersion:string;
      expectedScopeRevision:number;expectedRoleGeneration:string;scope:ScopeSelection}
  | {action:'REVOKE';operationId:string;expectedEmployeeVersion:string;
      expectedScopeRevision:number;expectedRoleGeneration:string};
export type OperationalFootprint = {kind:'COMPANY'} | {kind:'LOCATIONS';locationIds:readonly string[]};
export type { InvitationCommand, InvitationResult, InvitationStatusResult, InvitationReceipt, DeliveryState, ActivationResult } from '@/lib/auth/invitations/model';
