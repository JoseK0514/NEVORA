import { describe, expect, it } from "vitest";
import {
  applyAllDays,
  applyWeekdays,
  clearAvailability,
  type AvailabilityState,
} from "./availability-presets";

const initial: AvailabilityState = {
  0: { available: false, startTime: "06:00", endTime: "18:00" },
  1: { available: true, startTime: "07:00", endTime: "15:00" },
  2: { available: false, startTime: "06:00", endTime: "18:00" },
  3: { available: false, startTime: "06:00", endTime: "18:00" },
  4: { available: false, startTime: "06:00", endTime: "18:00" },
  5: { available: false, startTime: "06:00", endTime: "18:00" },
  6: { available: false, startTime: "06:00", endTime: "18:00" },
};

describe("availability quick actions", () => {
  it("applies Monday's hours to Monday through Friday without changing weekends", () => {
    const next = applyWeekdays(initial);

    for (const day of [1, 2, 3, 4, 5]) {
      expect(next[day]).toEqual({
        available: true,
        startTime: "07:00",
        endTime: "15:00",
      });
    }

    expect(next[0].available).toBe(false);
    expect(next[6].available).toBe(false);
  });

  it("applies the current Monday hours to every day", () => {
    const next = applyAllDays(initial);

    for (let day = 0; day < 7; day += 1) {
      expect(next[day]).toEqual({
        available: true,
        startTime: "07:00",
        endTime: "15:00",
      });
    }
  });

  it("clears all days without discarding their remembered times", () => {
    const next = clearAvailability(initial);

    expect(Object.values(next).every((day) => !day.available)).toBe(true);
    expect(next[1].startTime).toBe("07:00");
    expect(next[1].endTime).toBe("15:00");
  });
});
