import { beforeEach, expect, it, vi } from "vitest";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getClockMonitor } from "./time-clock";
vi.mock("@/lib/auth/session", () => ({ requireSession: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => import("../auth/permissions"));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/lib/db", async () => ({ ...await vi.importActual<typeof import("../db")>("../db"), getDb: vi.fn() }));
const query = vi.fn();
const row = { id: "entry-1", employee_id: "employee-1", employee_name: "Sam Cruz", location_id: "loc-2", location_name: "FUEL – 110", device_id: "device-2", clock_in_at: "2030-10-07T23:00:00Z", status: "CLOCKED_IN", break_start_at: null };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireSession).mockResolvedValue({ id: "owner", firstName: "Alex", lastName: "Rivera", role: "OWNER", primaryLocationId: "loc-1" });
  vi.mocked(getDb).mockReturnValue({ query } as unknown as ReturnType<typeof getDb>);
});
it("uses persisted open punches without a current-date or active-employee filter", async () => {
  query.mockResolvedValue([row, { ...row, id: "entry-2", employee_id: "employee-2", status: "ON_BREAK", break_start_at: "2030-10-08T03:30:00Z" }]);
  const result = await getClockMonitor();
  expect(result).toEqual({ state: "ready", employees: [expect.objectContaining({ state: "ON_FLOOR", clockInAt: "2030-10-07T23:00:00.000Z" }), expect.objectContaining({ state: "ON_BREAK", breakStartAt: "2030-10-08T03:30:00.000Z" })] });
  const sql = query.mock.calls[0][0];
  expect(sql).toContain("WHERE t.clock_out_at IS NULL"); expect(sql).not.toMatch(/CURRENT_DATE|e.active/);
});
it("only reports an empty state after a successful empty query", async () => {
  query.mockResolvedValue([]); const result = await getClockMonitor();
  expect(result).toEqual({ state: "ready", employees: [] });
});
it.each([
  [new Error("DATABASE_URL is not configured."), "not_configured"],
  [Object.assign(new Error("Missing relation"), { code: "42P01" }), "schema_missing"],
  [new Error("Network error"), "read_failed"],
] as const)("reports unavailable data separately from zero activity", async (error, reason) => {
  query.mockRejectedValue(error); const result = await getClockMonitor();
  expect(result).toEqual({ state: "unavailable", reason });
});
it("fails closed for mismatched break and punch state", async () => {
  query.mockResolvedValue([{ ...row, status: "ON_BREAK" }]);
  expect(await getClockMonitor()).toEqual({ state: "unavailable", reason: "read_failed" });
});
it.each(["EMPLOYEE", "LEAD"] as const)("denies %s at the clock repository boundary", async role => {
  vi.mocked(requireSession).mockResolvedValue({ id: "employee-1", firstName: "Sam", lastName: "Cruz", role, primaryLocationId: "loc-1" });
  await expect(getClockMonitor()).rejects.toThrow("redirect:/app"); expect(getDb).not.toHaveBeenCalled();
});
