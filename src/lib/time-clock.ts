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

// The kiosk write implementation is a separate integration. It must authenticate a
// provisioned device, resolve its location server-side, and apply commands atomically.
// commandId supplies retry identity; expectedTimeEntryId prevents a delayed tablet
// command from mutating a later shift. See docs/architecture/time-clock.md.
export type PunchCommand = {
  commandId: string; employeeId: string;
} & ({ action: "CLOCK_IN" } | { action: "CLOCK_OUT" | "START_BREAK" | "END_BREAK"; expectedTimeEntryId: string });
export interface ClockerPunchService {
  execute(authenticatedDevice: ClockerDevice, command: PunchCommand): Promise<TimeEntry>;
}
