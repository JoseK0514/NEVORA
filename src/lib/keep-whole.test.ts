import { expect, it } from "vitest";
import { keepWhole } from "./keep-whole";

it("keeps times and dates whole and lets a range break only after its dash", () => {
  expect(keepWhole("Next shift today at 8:00 AM.")).toBe("Next shift today at 8:00 AM.");
  expect(keepWhole("Time off pending · Oct 28, 2026 – Oct 29, 2026")).toBe("Time off pending · Oct 28, 2026 – Oct 29, 2026");
  expect(keepWhole("Oct 26 – Nov 1")).toBe("Oct 26 – Nov 1");
  expect(keepWhole("Sun, Oct 18, 9:10 PM")).toBe("Sun, Oct 18, 9:10 PM");
});
