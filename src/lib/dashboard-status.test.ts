import { describe, expect, it } from "vitest";
import { buildManagerDashboardStatus } from "./dashboard-status";

describe("buildManagerDashboardStatus", () => {
  it("reports the normalized manager action count separately from attention areas", () => {
    const result = buildManagerDashboardStatus({
      locations: [],
      scheduleStatuses: [],
      underTargetCount: 0,
      overTargetCount: 0,
      unconfiguredTargetCount: 0,
      pendingTimeOffCount: 0,
      pendingExchangeCount: 0,
      pendingCalloutCount: 0,
      scheduledEmployees: 0,
      acknowledgedEmployees: 0,
      hasPublishedSchedule: false,
      availabilityDeadlineSet: true,
      coverageRulesConfigured: true,
      managerActions: [
        {
          id: "A",
          type: "TIME_OFF",
          priority: "REVIEW",
          title: "Time-off request",
          detail: "A request needs review.",
          href: "/app/requests?tab=team",
        },
        {
          id: "B",
          type: "AVAILABILITY_MISSING",
          priority: "MISSING_INPUT",
          title: "Availability not submitted",
          detail: "An employee has not submitted.",
          href: "/app/availability",
        },
      ],
    });

    expect(result.attentionCount).toBe(0);
    expect(result.actionItemCount).toBe(2);
  });

  it("summarizes location readiness and manager attention", () => {
    const result = buildManagerDashboardStatus({
      locations: [
        {
          locationId: "loc-1",
          locationName: "FUEL - 2",
          totalBlocks: 6,
          coveredBlocks: 6,
          uncoveredBlocks: 0,
          fullyCovered: true,
        },
        {
          locationId: "loc-2",
          locationName: "FUEL - 110",
          totalBlocks: 8,
          coveredBlocks: 6,
          uncoveredBlocks: 2,
          fullyCovered: false,
        },
      ],
      scheduleStatuses: [
        { locationId: "loc-1", status: "DRAFT" },
        { locationId: "loc-2", status: "DRAFT" },
      ],
      underTargetCount: 2,
      overTargetCount: 1,
      unconfiguredTargetCount: 1,
      pendingTimeOffCount: 2,
      pendingExchangeCount: 1,
      pendingCalloutCount: 1,
      scheduledEmployees: 12,
      acknowledgedEmployees: 7,
      hasPublishedSchedule: true,
      availabilityDeadlineSet: false,
      coverageRulesConfigured: true,
    });

    expect(result.readyLocationCount).toBe(1);
    expect(result.totalCoverageGaps).toBe(2);
    expect(result.hoursReviewCount).toBe(4);
    expect(result.pendingRequestCount).toBe(4);
    expect(result.unacknowledgedCount).toBe(5);
    expect(result.attentionCount).toBe(5);
    expect(result.locationReadiness[0]).toMatchObject({
      locationName: "FUEL - 2",
      state: "READY",
      scheduleStatus: "DRAFT",
    });
    expect(result.locationReadiness[1]).toMatchObject({
      state: "NEEDS_ATTENTION",
      coverageGaps: 2,
    });
  });

  it("does not count acknowledgements before anything is published", () => {
    const result = buildManagerDashboardStatus({
      locations: [],
      scheduleStatuses: [],
      underTargetCount: 0,
      overTargetCount: 0,
      unconfiguredTargetCount: 0,
      pendingTimeOffCount: 0,
      pendingExchangeCount: 0,
      pendingCalloutCount: 0,
      scheduledEmployees: 5,
      acknowledgedEmployees: 0,
      hasPublishedSchedule: false,
      availabilityDeadlineSet: true,
      coverageRulesConfigured: true,
    });

    expect(result.unacknowledgedCount).toBe(0);
    expect(result.attentionCount).toBe(0);
  });

  it("flags missing coverage rules and availability deadline as setup attention", () => {
    const result = buildManagerDashboardStatus({
      locations: [],
      scheduleStatuses: [],
      underTargetCount: 0,
      overTargetCount: 0,
      unconfiguredTargetCount: 0,
      pendingTimeOffCount: 0,
      pendingExchangeCount: 0,
      pendingCalloutCount: 0,
      scheduledEmployees: 0,
      acknowledgedEmployees: 0,
      hasPublishedSchedule: false,
      availabilityDeadlineSet: false,
      coverageRulesConfigured: false,
    });

    expect(result.setupAttentionCount).toBe(2);
    expect(result.attentionCount).toBe(2);
  });
});
