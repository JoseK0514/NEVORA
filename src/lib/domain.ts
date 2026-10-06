import type { GenerationClaims } from './scheduling/generation-claims';
export type AssignmentOrigin = 'MANAGER' | 'GENERATED';

export type Workspace = { id: string; name: string; timeZone: string; active: boolean; createdAt: string; updatedAt: string };
export type Position = { id: string; workspaceId: string; name: string; active: boolean; createdAt: string; updatedAt: string };

export type UserRole = "OWNER" | "MANAGER" | "LEAD" | "EMPLOYEE";

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  role: UserRole;
  primaryLocationId: string;
  eligibleLocationIds: string[];
  positionIds: string[];
  active: boolean;
};

export type Location = {
  id: string;
  workspaceId: string;
  clockerKey: string;
  name: string;
  shortName: string;
  active: boolean;
};

export type AvailabilityWindow = {
  id: string;
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type ScheduleStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type Schedule = {
  id: string;
  locationId: string;
  weekStart: string;
  status: ScheduleStatus;
  publishedAt?: string;
};

export type Shift = {
  /** Legacy read projections may omit this; final Phase 5 writes require it. */
  assignmentEpisodeId?: string;
  assignmentOrigin?: AssignmentOrigin;
  generatedClaims?: GenerationClaims | null;
  id: string;
  scheduleId: string;
  employeeId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  isDesignatedLead?: boolean;
  positionId?: string;
};

export type RequestStatus = "PENDING" | "APPROVED" | "DENIED" | "CANCELLED";

export type TimeOffRequest = {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  status: RequestStatus;
};

export type ExchangeKind = "COVERAGE" | "SWAP";

export type ShiftExchange = {
  id: string;
  kind: ExchangeKind;
  sourceShiftId: string;
  requestedByEmployeeId: string;
  targetEmployeeId?: string;
  targetShiftId?: string;
  status:
    | "OPEN"
    | "EMPLOYEE_PENDING"
    | "MANAGER_PENDING"
    | "APPROVED"
    | "DENIED"
    | "CANCELLED"
    | "EXPIRED";
};
