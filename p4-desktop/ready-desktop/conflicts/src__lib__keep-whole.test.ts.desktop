import { expect, it } from "vitest";
import { keepWhole } from "./keep-whole";

const N = " ";

it("keeps times and dates whole and lets a range break only after its dash", () => {
  expect(keepWhole("Next shift today at 8:00 AM.")).toBe(`Next shift today at 8:00${N}AM.`);
  expect(keepWhole("Time off pending · Oct 28, 2026 – Oct 29, 2026")).toBe(`Time off pending${N}· Oct${N}28,${N}2026${N}– Oct${N}29,${N}2026`);
  expect(keepWhole("Oct 26 – Nov 1")).toBe(`Oct${N}26${N}– Nov${N}1`);
  expect(keepWhole("Sun, Oct 18, 9:10 PM")).toBe(`Sun,${N}Oct${N}18, 9:10${N}PM`);
});

it("keeps weekdays, durations and separators with what they belong to", () => {
  expect(keepWhole("Monday, October 19, 2026")).toBe(`Monday,${N}October${N}19,${N}2026`);
  expect(keepWhole("4h 42m since clock-in · 1h 52m on break")).toBe(`4h${N}42m since clock-in${N}· 1h${N}52m on break`);
  expect(keepWhole("Declined by Morgan Rivera · Oct 17")).toBe(`Declined by Morgan Rivera${N}· Oct${N}17`);
});

it("writes Safari's date-and-time the same way as Chrome's (TC-P3-26)", () => {
  expect(keepWhole("Oct 19 at 12:37 PM")).toBe(`Oct${N}19, 12:37${N}PM`);
  expect(keepWhole("Mon, Oct 19 at 9:11:52 AM")).toBe(`Mon,${N}Oct${N}19, 9:11:52${N}AM`);
});
