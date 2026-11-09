import type { Location } from "@/lib/domain";
import type {
  CoverageWindow,
  LocationStaffingSetting,
} from "@/lib/data/schedule-health";

/** Local review/test data only. Nothing here seeds or changes a database. */
export const fuelRuleLocations: Location[] = [
  { id: "loc-1", workspaceId: "workspace-fuel", clockerKey: "2", name: "FUEL – 2", shortName: "FUEL – 2", active: true },
  { id: "loc-2", workspaceId: "workspace-fuel", clockerKey: "110", name: "FUEL – 110", shortName: "FUEL – 110", active: true },
];

// Match migration 0002's staffing defaults and 0003's Lead default.
// The real page continues to read editable location_staffing_settings records.
export const fuelRuleStaffing: LocationStaffingSetting[] = [
  {
    locationId: "loc-1",
    locationName: "FUEL – 2",
    minimumStaffPerShift: 2,
    requiresDesignatedLead: true,
  },
  {
    locationId: "loc-2",
    locationName: "FUEL – 110",
    minimumStaffPerShift: 6,
    requiresDesignatedLead: true,
  },
];

// Confirmed scheduling windows, including meal/rest periods: no hour deductions.
// FUEL – 110 weekdays remain unspecified pending the business clarification.
export const fuelRuleCoverageWindows: CoverageWindow[] = [
  ...[1, 2, 3, 4, 5, 6, 0].flatMap((dayOfWeek) => [
    { positionRequirements: [],
      id: `fuel-2-${dayOfWeek}-morning`,
      locationId: "loc-1",
      dayOfWeek,
      startTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "06:30" : "07:00",
      endTime: "14:00",
    },
    { positionRequirements: [],
      id: `fuel-2-${dayOfWeek}-afternoon`,
      locationId: "loc-1",
      dayOfWeek,
      startTime: "14:00",
      endTime: "21:00",
    },
  ]),
  ...[6, 0].flatMap((dayOfWeek) => [
    { positionRequirements: [],
      id: `fuel-110-${dayOfWeek}-morning`,
      locationId: "loc-2",
      dayOfWeek,
      startTime: "07:00",
      endTime: "13:30",
    },
    { positionRequirements: [],
      id: `fuel-110-${dayOfWeek}-afternoon`,
      locationId: "loc-2",
      dayOfWeek,
      startTime: "13:30",
      endTime: "20:00",
    },
  ]),
];
