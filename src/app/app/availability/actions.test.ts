import { beforeEach, expect, it, vi } from "vitest";
import { managementProof } from '../../../test/fixtures/management';
vi.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: async () => managementProof('E', 'EMPLOYEE') }));
const mocks = vi.hoisted(() => ({ normal: vi.fn(), weekly: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({
  requireSelfService: async () => ({ id: "E", role: "EMPLOYEE" }),
}));
vi.mock("@/lib/data/availability", () => ({
  replaceAvailability: mocks.normal,
}));
vi.mock("@/lib/data/week-settings", () => ({
  getWeekSettings: async () => null,
  replaceWeeklyAvailability: mocks.weekly,
  AvailabilityDeadlineError: class extends Error {},
  AvailabilityConcurrencyError: class extends Error {},
}));
vi.mock("@/lib/date-utils", () => import("../../../lib/date-utils"));
vi.mock(
  "@/lib/scheduling/periods",
  () => import("../../../lib/scheduling/periods"),
);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
import {
  saveAvailabilityAction,
  saveWeeklyAvailabilityAction,
} from "./actions";
beforeEach(() => vi.clearAllMocks());
it.each(["00:00", "24:00"])(
  "normal and weekly inputs support a midnight day endpoint (%s)",
  async (midnight) => {
    const data = new FormData();
    data.set("weekStart", "2026-10-05");
    data.set("available-0", "on");
    data.set("start-0", "22:00");
    data.set("end-0", midnight);
    data.set("available-1", "on");
    data.set("start-1", "00:00");
    data.set("end-1", "06:00");
    data.set("changedDays", "0,1");
    await expect(saveAvailabilityAction(data)).rejects.toThrow("saved=1");
    await expect(saveWeeklyAvailabilityAction(data)).rejects.toThrow("saved=1");
    const expected = [
      { dayOfWeek: 0, startTime: "22:00", endTime: "24:00" },
      { dayOfWeek: 1, startTime: "00:00", endTime: "06:00" },
    ];
    expect(mocks.normal).toHaveBeenCalledWith("E", expected, managementProof('E', 'EMPLOYEE'));
    expect(mocks.weekly).toHaveBeenCalledWith(
      "E",
      "2026-10-05",
      expected,
      [0, 1], managementProof('E', 'EMPLOYEE'),
    );
  },
);
it("midnight-to-midnight means a complete available calendar day", async () => {
  const data = new FormData();
  data.set("available-1", "on");
  data.set("start-1", "00:00");
  data.set("end-1", "00:00");
  await expect(saveAvailabilityAction(data)).rejects.toThrow("saved=1");
  expect(mocks.normal).toHaveBeenCalledWith("E", [
    { dayOfWeek: 1, startTime: "00:00", endTime: "24:00" },
  ], managementProof('E', 'EMPLOYEE'));
});
it.each(["25:00", "12:99"])(
  "rejects malformed available hours %s before writing",
  async (time) => {
    const data = new FormData();
    data.set("available-1", "on");
    data.set("start-1", time);
    data.set("end-1", "24:00");
    await expect(saveAvailabilityAction(data)).rejects.toThrow("invalid");
    expect(mocks.normal).not.toHaveBeenCalled();
  },
);
