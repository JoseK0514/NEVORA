import { expect, it } from "vitest";
import { retiredViewDestination } from "./retired-views";

it("sends the old Home schedule to /app/schedule with its week, day, location and person", () => {
  expect(retiredViewDestination({ view: "schedule", week: "2026-10-12", day: "2026-10-14", location: "loc 1", employee: "AUDIT-E" }))
    .toBe("/app/schedule?week=2026-10-12&day=2026-10-14&location=loc+1#schedule-employee-AUDIT-E");
  expect(retiredViewDestination({ view: "schedule" })).toBe("/app/schedule");
});

it("drops context that isn't a valid week or date instead of passing it on", () => {
  expect(retiredViewDestination({ view: "schedule", week: "2026-10-13", day: "not-a-date" })).toBe("/app/schedule");
});

it("sends old request links to the Inbox filtered to Requests and leaves Home's own views alone", () => {
  expect(retiredViewDestination({ view: "requests", week: "2026-10-12" })).toBe("/app/inbox?filter=requests");
  for (const view of [undefined, "overview", "attendance", "team", "activity", "unknown"]) expect(retiredViewDestination({ view })).toBeNull();
});
