export type TimeEntryStatus = "CLOCKED_IN" | "ON_BREAK" | "CLOCKED_OUT";
export type TimeEntry = {
  id: string; employeeId: string; locationId: string; deviceId: string;
  clockInAt: string; clockOutAt?: string; status: TimeEntryStatus;
  createdAt: string; updatedAt: string;
};
export type BreakEntry = { id: string; timeEntryId: string; breakStartAt: string; breakEndAt?: string };
export type ClockerDevice = { id: string; locationId: string; name: string; active: boolean; lastSeenAt?: string };
export type ClockMonitorEmployee = {
  timeEntryId: string; employeeId: string; employeeName: string;
  locationId: string; locationName: string; deviceId: string;
  clockInAt: string; breakStartAt?: string; state: "ON_FLOOR" | "ON_BREAK";
};
export type ClockMonitor =
  | { state: "ready"; employees: ClockMonitorEmployee[] }
  | { state: "unavailable"; reason: "not_configured" | "schema_missing" | "read_failed" };

// The persisted writer uses a server-derived device/employee identity, never
// a browser employee ID. Type-only exports cannot expose its server runtime.
export type { PunchCommand } from './clocker/punch-command';
export type { ClockerPunchService } from './clocker/punches.server';
