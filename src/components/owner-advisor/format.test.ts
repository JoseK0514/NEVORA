import { expect, it } from "@rstest/core";
import { spanishTimes, attentionDetail, clockRange, dayText, hoursText, periodText, shiftLength, shiftRange, stateText, whenText } from "./format";

it("says the server's attention sentences with correct plurals and a 12-hour clock, and leaves others exactly as written", () => {
  expect(attentionDetail("1 published shifts started without a recorded clock-in. Verify attendance before choosing coverage."))
    .toBe("1 published shift started without a recorded clock-in. Verify attendance before choosing coverage.");
  expect(attentionDetail("2 published shifts started without a recorded clock-in. Verify attendance before choosing coverage."))
    .toBe("2 published shifts started without a recorded clock-in. Verify attendance before choosing coverage.");
  expect(attentionDetail("1 finished published shifts have no recorded punches. Review the records before correcting time."))
    .toBe("1 finished published shift has no recorded punches. Review the records before correcting time.");
  expect(attentionDetail("1 planning periods need review, starting 23:30. Maximum staffing shortfall: 1. Includes draft commitments; verify published staffing separately."))
    .toBe("1 planning period needs review, starting 11:30 PM. Maximum staffing shortfall:\u00a01. Includes draft commitments; verify published staffing separately.");
  expect(attentionDetail("3 planning periods need review, starting 09:00. Maximum staffing shortfall: 2.")).toBe("3 planning periods need review, starting 9:00 AM. Maximum staffing shortfall:\u00a02.");
  const other = "Coverage cannot be fully assessed until missing or invalid staffing and coverage rules are reviewed.";
  expect(attentionDetail(other)).toBe(other);
});

it("reads dates, periods, clock ranges and instants the way people say them, in the workspace's zone", () => {
  expect(dayText("2026-11-18")).toBe("Wed, Nov 18");
  expect(dayText("2027-01-04", "en", "2026")).toBe("Mon, Jan 4, 2027");
  expect(periodText("2026-10-01", "2026-10-07")).toBe("Oct 1–7");
  expect(periodText("2026-10-01", "2026-10-01")).toBe("Thu, Oct 1");
  expect(clockRange("08:00", "12:00")).toBe("8:00 AM – 12:00 PM");
  expect(clockRange("22:00", "24:00")).toBe("10:00 PM – 12:00 AM");
  expect(clockRange("00:00", "24:00")).toBe("All day");
  // One time format (Nov 23, 2026): a whole-day shift reads "All day" and an end at midnight "12:00 AM"; the length
  // (shiftLength) is said beside it, so neither reads as zero hours.
  expect(shiftRange("00:00", "24:00")).toBe("All day");
  expect(shiftRange("18:45", "24:00")).toBe("6:45 PM – 12:00 AM");
  expect(shiftLength("00:00", "24:00")).toBe("24 h");
  expect(shiftLength("18:45", "24:00")).toBe("5 h 15 min");
  expect(hoursText(2880)).toBe("48 h");
  expect(hoursText(0)).toBe("0 h");
  expect(stateText("DRAFT")).toBe("Draft");
  expect(stateText("IN_REVIEW")).toBe("In review");
  expect(stateText("DRAFT", "es")).toBe("DRAFT");
  // 01:27 UTC on Nov 19 is 9:27 PM on Nov 18 in Puerto Rico.
  expect(whenText("2026-11-19T01:27:26Z", "America/Puerto_Rico", "2026-11-18")).toBe("9:27 PM");
  expect(whenText("2026-11-19T01:27:26Z", "America/Puerto_Rico", "2026-11-19")).toBe("Wed, Nov 18, 9:27 PM");
});

it("keeps each Spanish time together for both input formats", () => {
  expect(spanishTimes("8:00 AM – 1:05 PM", "es")).toBe("8:00\u00a0a.\u00a0m. – 1:05\u00a0p.\u00a0m.");
  expect(spanishTimes("1:05 p. m.", "es")).toBe("1:05\u00a0p.\u00a0m.");
  expect(spanishTimes("8:00 AM – 1:05 PM", "en")).toBe("8:00 AM – 1:05 PM");
});
