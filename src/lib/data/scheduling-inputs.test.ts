import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  transaction: vi.fn(),
  statements: [] as Array<{ text: string; values: unknown[] }>,
}));
vi.mock("@/lib/db", () => ({
  getDb: () =>
    Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => {
        const statement = { text: strings.join("?"), values };
        mocks.statements.push(statement);
        return statement;
      },
      { query: (text:string, values:unknown[]) => text.includes('WITH cancelled AS') ? {text,values} : mocks.query(text,values), transaction: mocks.transaction },
    ),
  queryRows: (rows: unknown) => rows,
}));
import { getShiftValidationContext, listWeekShifts } from "./schedules";
import {
  listEmployeeHourTargets,
  saveEmployeeHourTargets,
  listLocationStaffingSettings,
} from "./schedule-health";
import {
  replaceWeeklyAvailability,
  listWeeklyAvailability,
  setAvailabilityDeadline,
} from "./week-settings";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.statements.length = 0;
  mocks.transaction.mockResolvedValue([]);
});
describe("scheduling context repository", () => {
  it("loads actual dated cross-location shifts, explicit submission metadata, normal hours and dated exceptions", async () => {
    mocks.query.mockImplementation(async (text: string) => {
      if (text.includes("FROM employees e"))
        return [
          {
            active: true,
            role: "LEAD",
            eligible_location_ids: ["loc-1", "loc-2"],
            target_weekly_hours: "24",
            maximum_weekly_hours: "32",
          },
        ];
      if (text.includes("FROM shifts sh"))
        return [
          {
            id: "previous-night",
            employee_id: "E",
            location_id: "loc-2",
            date: "2026-10-04",
            start_time: "22:00",
            end_time: "04:00",
          },
        ];
      if (text.includes("FROM availability_exceptions"))
        return [
          {
            date: "2026-10-05",
            kind: "UNAVAILABLE",
            start_time: null,
            end_time: null,
          },
        ];
      if (text.includes("FROM weekly_availability_submissions"))
        return [{ week_start: "2026-10-05", uses_normal_availability: true }];
      if (text.includes("FROM weekly_availability_windows")) return [];
      if (text.includes("FROM availability_windows"))
        return [{ day_of_week: 1, start_time: "06:00", end_time: "18:00" }];
      if (text.includes("FROM time_off_requests")) return [];
      return [];
    });
    const context = await getShiftValidationContext({
      employeeId: "E",
      date: "2026-10-05",
      weekStart: "2026-09-28",
    });
    expect(context?.employee).toMatchObject({
      role: "LEAD",
      targetWeeklyHours: 24,
      maximumWeeklyHours: 32,
    });
    expect(context?.weeklyAvailability).toContainEqual(
      expect.objectContaining({
        weekStart: "2026-10-05",
        submitted: true,
        usesNormalAvailability: true,
      }),
    );
    expect(context?.availabilityExceptions).toEqual([
      {
        date: "2026-10-05",
        kind: "UNAVAILABLE",
        startTime: undefined,
        endTime: undefined,
      },
    ]);
    const shiftQuery = mocks.query.mock.calls.find(([text]) =>
      text.includes("FROM shifts sh"),
    );
    expect(shiftQuery?.[0]).not.toContain("s.week_start =");
    expect(shiftQuery?.[0]).toContain("s.status <> 'ARCHIVED'");
    expect(shiftQuery?.[0]).toContain("shift_callouts");
    expect(shiftQuery?.[1]).toEqual(["E", "2026-10-04", "2026-10-12"]);
  });
});
describe("target and maximum persistence", () => {
  it("reads distinct target and maximum values, defaulting only a missing maximum to 40", async () => {
    mocks.query.mockResolvedValue([
      {
        employee_id: "E",
        employee_name: "Sam",
        role: "LEAD",
        primary_location_id: "loc-1",
        target_weekly_hours: "24",
        maximum_weekly_hours: "32",
      },
    ]);
    expect((await listEmployeeHourTargets())[0]).toMatchObject({
      targetWeeklyHours: 24,
      maximumWeeklyHours: 32,
    });
  });
  it("saves target and maximum into the existing settings record", async () => {
    await saveEmployeeHourTargets([
      { employeeId: "E", targetWeeklyHours: 24, maximumWeeklyHours: 40 },
    ]);
    expect(mocks.statements[0].text).toContain("maximum_weekly_hours");
    expect(mocks.statements[0].values).toContain(24);
    expect(mocks.statements[0].values).toContain(40);
  });
});
describe("normal-based weekly submissions", () => {
  it("confirmation without changes persists submission metadata without inventing day overrides", async () => {
    mocks.query.mockResolvedValue([]);
    await replaceWeeklyAvailability(
      "E",
      "2026-10-05",
      [{ dayOfWeek: 1, startTime: "08:00", endTime: "16:00" }],
      [],
    );
    expect(
      mocks.statements.some((s) => s.text.includes("uses_normal_availability")),
    ).toBe(true);
    expect(
      mocks.statements.filter((s) =>
        s.text.includes("INSERT INTO availability_exceptions"),
      ),
    ).toHaveLength(0);
    expect(mocks.statements[0].text).toContain("pg_advisory_xact_lock");
    expect(
      mocks.statements.some(
        (s) =>
          s.text.includes("availability_deadline") && s.text.includes("1 /"),
      ),
    ).toBe(true);
  });
  it("unavailable all week writes seven dated full-day exceptions", async () => {
    mocks.query.mockResolvedValue([]);
    await replaceWeeklyAvailability("E", "2026-10-05", [], []);
    const exceptions = mocks.statements.filter((s) =>
      s.text.includes("INSERT INTO availability_exceptions"),
    );
    expect(exceptions).toHaveLength(7);
    expect(
      exceptions.every(
        (s) => s.values.includes("UNAVAILABLE") && s.values.includes(null),
      ),
    ).toBe(true);
  });
  it("changes only the selected date, preserving other overrides", async () => {
    mocks.query.mockResolvedValue([]);
    await replaceWeeklyAvailability(
      "E",
      "2026-10-05",
      [{ dayOfWeek: 1, startTime: "10:00", endTime: "14:00" }],
      [1],
    );
    const deletes = mocks.statements.filter((s) =>
      s.text.includes("DELETE FROM availability_exceptions"),
    );
    expect(deletes).toHaveLength(1);
    expect(deletes[0].values).toContain("2026-10-05");
    expect(
      mocks.statements.filter((s) =>
        s.text.includes("INSERT INTO availability_exceptions"),
      ),
    ).toHaveLength(1);
  });
  it("reads current normal hours for an unsubmitted week rather than stale seeded hours", async () => {
    mocks.query.mockImplementation(async (text: string) =>
      text.includes("FROM availability_windows")
        ? [{ day_of_week: 1, start_time: "08:00", end_time: "16:00" }]
        : text.includes("FROM weekly_availability_windows")
          ? [{ day_of_week: 1, start_time: "10:00", end_time: "12:00" }]
          : [],
    );
    expect(await listWeeklyAvailability("E", "2026-10-05")).toContainEqual(
      expect.objectContaining({
        dayOfWeek: 1,
        startTime: "08:00",
        endTime: "16:00",
      }),
    );
  });
  it("preserves legacy zero-window submitted weeks as unavailable", async () => {
    mocks.query.mockImplementation(async (text: string) =>
      text.includes("FROM availability_windows")
        ? [{ day_of_week: 1, start_time: "08:00", end_time: "16:00" }]
        : text.includes("FROM weekly_availability_submissions")
          ? [{ week_start: "2026-10-05", uses_normal_availability: false }]
          : [],
    );
    expect(await listWeeklyAvailability("E", "2026-10-05")).toEqual([]);
  });
});

it("a deadline failure during the transaction propagates as a locked submission", async () => {
  mocks.query.mockResolvedValue([]);
  mocks.transaction.mockRejectedValue({ code: "22012" });
  await expect(
    replaceWeeklyAvailability("E", "2026-10-05", [], []),
  ).rejects.toThrow("Weekly availability is locked");
});

it("health reads Sunday carry-in work by business date rather than schedule ownership", async () => {
  mocks.query.mockResolvedValue([]);
  await listWeekShifts({ weekStart: "2026-10-05", byBusinessWorkweek: true });
  const [text, values] = mocks.query.mock.calls[0];
  expect(text).not.toContain("s.week_start =");
  expect(text).toContain("sh.end_time < sh.start_time");
  expect(values).toEqual(["2026-10-05", "2026-10-12", "2026-10-04"]);
});
it("the final deadline guard uses the current clock after the lock wait", async () => {
  mocks.query.mockResolvedValue([]);
  await replaceWeeklyAvailability("E", "2026-10-05", [], []);
  expect(
    mocks.statements.find((statement) =>
      statement.text.includes("deadline_guard"),
    )?.text,
  ).toContain("availability_deadline < clock_timestamp()");
});
it("missing staffing configuration fails explicitly instead of inventing one employee", async () => {
  mocks.query.mockResolvedValue([
    {
      location_id: "loc-2",
      location_name: "FUEL – 110",
      minimum_staff_per_shift: null,
    },
  ]);
  await expect(listLocationStaffingSettings()).rejects.toThrow(
    "Staffing requirement missing for FUEL – 110",
  );
});

it("retries a stale legacy conversion after locking and preserves another saved day's override", async () => {
  let converted = false;
  mocks.query.mockImplementation(async (text: string) => {
    if (text.includes("FROM weekly_availability_submissions"))
      return [
        {
          week_start: "2026-10-05",
          uses_normal_availability: converted,
          submission_version: converted
            ? "2026-10-02T15:01:00.000Z"
            : "2026-10-02T15:00:00.000Z",
        },
      ];
    if (text.includes("FROM availability_exceptions"))
      return converted
        ? [
            {
              date: "2026-10-05",
              kind: "AVAILABLE",
              start_time: "10:00",
              end_time: "12:00",
            },
          ]
        : [];
    if (
      text.includes("FROM availability_windows") ||
      text.includes("FROM weekly_availability_windows")
    )
      return [
        {
          week_start: "2026-10-05",
          day_of_week: 1,
          start_time: "06:00",
          end_time: "18:00",
        },
        {
          week_start: "2026-10-05",
          day_of_week: 2,
          start_time: "06:00",
          end_time: "18:00",
        },
      ];
    return [];
  });
  mocks.transaction
    .mockImplementationOnce(async () => {
      converted = true;
      throw { code: "22P02" };
    })
    .mockResolvedValueOnce([]);
  await replaceWeeklyAvailability(
    "E",
    "2026-10-05",
    [
      { dayOfWeek: 1, startTime: "06:00", endTime: "18:00" },
      { dayOfWeek: 2, startTime: "10:00", endTime: "12:00" },
    ],
    [2],
  );
  expect(mocks.transaction).toHaveBeenCalledTimes(2);
  const retryQueries = mocks.transaction.mock.calls[1][0] as Array<{
    text: string;
    values: unknown[];
  }>;
  expect(
    retryQueries.some((query) => query.text.includes("version_guard")),
  ).toBe(true);
  const deletes = retryQueries.filter((query) =>
    query.text.includes("DELETE FROM availability_exceptions"),
  );
  expect(deletes).toHaveLength(1);
  expect(deletes[0].values).toContain("2026-10-06");
  const inserts = retryQueries.filter((query) =>
    query.text.includes("INSERT INTO weekly_availability_windows"),
  );
  expect(
    inserts.some(
      (query) =>
        query.values.includes(1) &&
        query.values.includes("10:00") &&
        query.values.includes("12:00"),
    ),
  ).toBe(true);
});

it("repeated concurrent availability changes stop after bounded retries", async () => {
  mocks.query.mockResolvedValue([]);
  mocks.transaction.mockRejectedValue({ code: "22P02" });
  await expect(
    replaceWeeklyAvailability("E", "2026-10-05", [], []),
  ).rejects.toThrow("Availability changed while saving");
  expect(mocks.transaction).toHaveBeenCalledTimes(3);
});

describe('notification cancellation joins availability transactions', () => {
 it.each([undefined,'2026-10-06T12:00:00Z'])('deadline change/removal cancels superseded work atomically: %s', async deadlineIso => {
   mocks.query.mockImplementation((text:string,values:unknown[]) => text.includes('WITH cancelled AS') ? {text,values} : []);
   await setAvailabilityDeadline({weekStart:'2026-10-05',deadlineIso,updatedBy:'M'});
   const batch = mocks.transaction.mock.calls[0][0];
   expect(batch).toEqual(expect.arrayContaining([expect.objectContaining({text:expect.stringContaining('UPDATE push_deliveries')})]));
   const cancellation = batch.find((s:{text?:string})=>s.text?.includes('WITH cancelled AS'));
   expect(cancellation.values).toEqual(['2026-10-05',null,deadlineIso ? '2026-10-06T12:00:00.000Z' : null]);
 });
 it('zero-hour submission cancels its reminder in the same transaction', async()=>{
   mocks.query.mockImplementation((text:string,values:unknown[]) => text.includes('WITH cancelled AS') ? {text,values} : []);
   await replaceWeeklyAvailability('E','2026-10-05',[],[]);
   const batch = mocks.transaction.mock.calls[0][0];
   expect(batch).toEqual(expect.arrayContaining([expect.objectContaining({text:expect.stringContaining('UPDATE push_deliveries'),values:['2026-10-05','E',null]})]));
 });
});
