import type { ManagerActionItem } from "./assistance/manager-actions";

export type DashboardLocationCoverage = {
  locationId: string;
  locationName: string;
  totalBlocks: number;
  coveredBlocks: number;
  uncoveredBlocks: number;
  fullyCovered: boolean;
};

export type DashboardScheduleStatus = {
  locationId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type DashboardLocationState =
  | "NOT_STARTED"
  | "NEEDS_ATTENTION"
  | "READY"
  | "PUBLISHED";

export function buildManagerDashboardStatus(input: {
  locations: DashboardLocationCoverage[];
  scheduleStatuses: DashboardScheduleStatus[];
  underTargetCount: number;
  overTargetCount: number;
  unconfiguredTargetCount: number;
  pendingTimeOffCount: number;
  pendingExchangeCount: number;
  pendingCalloutCount: number;
  scheduledEmployees: number;
  acknowledgedEmployees: number;
  hasPublishedSchedule: boolean;
  availabilityDeadlineSet: boolean;
  coverageRulesConfigured: boolean;
  managerActions?: ManagerActionItem[];
}) {
  const locationReadiness = input.locations.map((location) => {
    const schedule = input.scheduleStatuses.find(
      (item) => item.locationId === location.locationId,
    );

    let state: DashboardLocationState = "NOT_STARTED";

    if (schedule?.status === "PUBLISHED") {
      state = "PUBLISHED";
    } else if (schedule && location.fullyCovered) {
      state = "READY";
    } else if (schedule) {
      state = "NEEDS_ATTENTION";
    }

    return {
      ...location,
      scheduleStatus: schedule?.status,
      state,
      coverageGaps: location.uncoveredBlocks,
    };
  });

  const readyLocationCount = locationReadiness.filter(
    (location) =>
      location.state === "READY" || location.state === "PUBLISHED",
  ).length;

  const totalCoverageGaps = input.locations.reduce(
    (sum, location) => sum + location.uncoveredBlocks,
    0,
  );
  const hoursReviewCount =
    input.underTargetCount +
    input.overTargetCount +
    input.unconfiguredTargetCount;
  const pendingRequestCount =
    input.pendingTimeOffCount +
    input.pendingExchangeCount +
    input.pendingCalloutCount;
  const unacknowledgedCount = input.hasPublishedSchedule
    ? Math.max(0, input.scheduledEmployees - input.acknowledgedEmployees)
    : 0;
  const setupAttentionCount =
    Number(!input.availabilityDeadlineSet) +
    Number(!input.coverageRulesConfigured);

  const attentionCount =
    Number(totalCoverageGaps > 0) +
    Number(hoursReviewCount > 0) +
    Number(pendingRequestCount > 0) +
    Number(unacknowledgedCount > 0) +
    setupAttentionCount;

  return {
    locationReadiness,
    readyLocationCount,
    totalCoverageGaps,
    hoursReviewCount,
    pendingRequestCount,
    unacknowledgedCount,
    setupAttentionCount,
    attentionCount,
    actionItemCount: input.managerActions?.length ?? 0,
  };
}
