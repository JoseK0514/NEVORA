import { managementProof } from '../../test/fixtures/management';
import { it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({
  getDb: () => {
    throw Error("no database");
  },
  queryRows: (rows: unknown) => rows,
}));
import { saveEmployeeSchedulingProfile } from "./employees";
import {
  createCoverageWindow,
  replaceCoverageWindowPositionRequirements,
} from "./schedule-health";
import type { SqlExecutor } from "../notifications/types";
function executor() {
  const transaction = vi.fn(async () => [[{ id: "window", updatedAt:"written-unit-version" }]]);
  return {
    query: vi.fn(async () => [
      {
        id: "w",
        name: "Northside",
        timeZone: "America/New_York",
        active: true,
        updatedAt: "version",
      },
    ]),
    transaction,
  } as unknown as SqlExecutor;
}
it("scheduling profile composes qualification and primary-inclusive eligibility in one guarded batch", async () => {
  const sql = executor();
  await saveEmployeeSchedulingProfile(
    {expectedUpdatedAt:'reviewed-unit-version',proof:managementProof("owner"),
      employeeId: "sam",
      actorEmployeeId: "owner",
      positionIds: ["cashier"],
      eligibleLocationIds: ["west"],
    },
    sql,
  );
  expect(sql.transaction).toHaveBeenCalledTimes(1);
  const batch = vi.mocked(sql.transaction).mock.calls[0][0];
  expect(batch[0].text).toContain("workspaces");
  expect(batch.map((x) => x.text).join("\n")).toContain("employee_positions");
  expect(batch.map((x) => x.text).join("\n")).toContain("primary_location_id");
  expect(batch.map((x) => x.text).join("\n")).toContain(
    "employee_location_eligibility",
  );
});
it("coverage window and quotas commit together", async () => {
  const sql = executor();
  await createCoverageWindow(
    {
      locationId: "west",
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "12:00",
      actorEmployeeId: "owner",
      proof: managementProof("owner"),
      positionRequirements: [{ positionId: "cashier", quantity: 2 }],
    },
    sql,
  );
  expect(sql.transaction).toHaveBeenCalledTimes(1);
  const text = vi
    .mocked(sql.transaction)
    .mock.calls[0][0].map((x) => x.text)
    .join("\n");
  expect(text).toContain("INSERT INTO location_coverage_windows");
  expect(text).toContain("INSERT INTO coverage_window_position_requirements");
});
it.each([0, -1, 1.5, 101])(
  "rejects invalid quota %s before IO",
  async (quantity) => {
    const sql = executor();
    await expect(
      replaceCoverageWindowPositionRequirements(
        {
          windowId: "w",
          actorEmployeeId: "owner",
      proof: managementProof("owner"),
          requirements: [{ positionId: "p", quantity }],
        },
        sql,
      ),
    ).rejects.toThrow("whole");
    expect(sql.transaction).not.toHaveBeenCalled();
  },
);
