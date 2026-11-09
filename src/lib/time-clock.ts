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
  elapsedMinutes: number; breakElapsedMinutes: number | null;
  positionName: string | null; scheduleMatch: "MATCHED" | "UNMATCHED" | "AMBIGUOUS" | null;
};
export type ClockMonitor =
  | { state: "ready"; observedAt: string; timeZone: string; validForMs: number; employees: ClockMonitorEmployee[] }
  | { state: "unavailable"; reason: "not_configured" | "schema_missing" | "read_failed" | "access_denied" };

// The implemented server-only writer lives in ./clocker/punches.server.ts.
// Only these authority-free command/receipt types may be shared with clients.
export type { PunchCommand, PunchReceipt, PunchSnapshot } from './clocker/punch-types';
