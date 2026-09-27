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
  active: boolean;
};

export type Location = {
  id: string;
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

export type ScheduleWeek = {
  id: string;
  weekStart: string;
  status: ScheduleStatus;
  publishedAt?: string;
};

export type Shift = {
  id: string;
  scheduleWeekId: string;
  employeeId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
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
