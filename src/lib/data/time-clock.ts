import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { getDb, queryRows } from "@/lib/db";
import type { ClockMonitor } from "@/lib/time-clock";

type ActiveClockRow = {
  id: string; employee_id: string; employee_name: string;
  location_id: string; location_name: string; device_id: string;
  clock_in_at: Date | string; break_start_at: Date | string | null;
  status: "CLOCKED_IN" | "ON_BREAK";
};
function iso(value: Date | string) { return new Date(value).toISOString(); }

export async function getClockMonitor(): Promise<ClockMonitor> {
  // Guard the repository boundary too: clock data is never employee self-service.
  await requireRoles(MANAGER_ROLES);
  try {
    const sql = getDb();
    const rows = queryRows<ActiveClockRow>(await sql.query(
      `SELECT t.id, t.employee_id,
         e.first_name || ' ' || e.last_name AS employee_name,
         t.location_id, l.short_name AS location_name, t.device_id,
         t.clock_in_at, t.status, b.break_start_at
       FROM time_entries t
       JOIN employees e ON e.id = t.employee_id
       JOIN locations l ON l.id = t.location_id
       LEFT JOIN break_entries b ON b.time_entry_id = t.id AND b.break_end_at IS NULL
       WHERE t.clock_out_at IS NULL
       ORDER BY t.clock_in_at, e.first_name, e.last_name`,
    ));
    const employees = rows.map(row => {
      if ((row.status === "ON_BREAK") !== Boolean(row.break_start_at)) {
        throw new Error("Inconsistent clock state");
      }
      const clockInAt = iso(row.clock_in_at);
      const breakStartAt = row.break_start_at ? iso(row.break_start_at) : undefined;
      if (breakStartAt && breakStartAt < clockInAt) throw new Error("Invalid break range");
      return {
        timeEntryId: row.id, employeeId: row.employee_id, employeeName: row.employee_name,
        locationId: row.location_id, locationName: row.location_name, deviceId: row.device_id,
        clockInAt, breakStartAt, state: breakStartAt ? "ON_BREAK" as const : "ON_FLOOR" as const,
      };
    });
    return { state: "ready", employees };
  } catch (error) {
    if (error instanceof Error && error.message === "DATABASE_URL is not configured.") {
      return { state: "unavailable", reason: "not_configured" };
    }
    if (error && typeof error === "object" && "code" in error && error.code === "42P01") {
      return { state: "unavailable", reason: "schema_missing" };
    }
    return { state: "unavailable", reason: "read_failed" };
  }
}
