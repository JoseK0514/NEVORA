import { expect, it } from "@rstest/core";
import { LOCATION_RETIREMENT_COPY as copy, recoveryRoutes } from "./location-retirement-copy";

it("gives every server retirement blocker its localized recovery action", () => {
  expect(recoveryRoutes).toEqual({
    SCHEDULE: "/app/schedule",
    OPEN_SHIFT_POSTINGS: "/app/exchange/open-shifts",
    OPEN_TIME: "/app/timecards",
    TIME_CORRECTIONS: "/app/timecards/corrections",
    SHIFT_REQUESTS: "/app/inbox#todo-requests",
  });
  expect(Object.keys(copy.en).sort()).toEqual(Object.keys(copy.es).sort());
  for (const lang of ["en", "es"] as const) expect(Object.keys(copy[lang].blockers)).toEqual(Object.keys(recoveryRoutes));
  expect(copy.en.blockers.SCHEDULE).toMatch(/publish/);
  expect(copy.es.blockers.SCHEDULE).toMatch(/publicar/);
});
