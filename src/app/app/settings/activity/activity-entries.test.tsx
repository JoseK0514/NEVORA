import { expect, it } from "@rstest/core";
import { renderToStaticMarkup } from "react-dom/server";
import type { OwnerActivityEntry } from "@/lib/activity/owner-feed";
import { ActivityEntries } from "./activity-entries";
import { activityCopy } from "./activity-copy";

it.each(["en", "es"] as const)("renders only approved fields and the date in the business time zone in %s", (lang) => {
  const entry = { id: "redacted", occurredAt: "2026-11-26T02:30:00.123456Z", actor: { id: "private-actor", name: null },
    change: { kind: "WAGE_CHANGED", employeeId: "private-employee", employeeName: "María Sol", amount: "98765", reason: "Private reason" } } as const;
  const scope: OwnerActivityEntry = { ...entry, id: "scope", change: { kind: "MANAGER_SCOPE_ASSIGNED", employeeId: "manager", employeeName: null,
    scope: { mode: "LOCATIONS", locationIds: ["private-site", "private-west"] } } };
  const schedule: OwnerActivityEntry = { ...entry, id: "schedule", change: { kind: "SCHEDULE_PUBLISHED", weekStart: "2026-11-23", locationId: null, locationName: null } };
  const html = renderToStaticMarkup(<ActivityEntries entries={[entry, scope, schedule]} lang={lang} timeZone="America/Puerto_Rico"/>);
  const t = activityCopy[lang];
  for (const word of [t.kinds.WAGE_CHANGED, "María S.", t.unknown, t.kinds.SCHEDULE_PUBLISHED, t.company, t.locations(2), "10:30", "AST", "25"]) expect(html).toContain(word);
  for (const privateValue of ["98765", "Private reason", "private-actor", "private-employee", "private-site", "private-west"]) expect(html).not.toContain(privateValue);
});

it("covers every event and state in both languages", () => {
  expect(Object.keys(activityCopy.es).sort()).toEqual(Object.keys(activityCopy.en).sort());
  expect(Object.keys(activityCopy.es.kinds).sort()).toEqual(Object.keys(activityCopy.en.kinds).sort());
});
