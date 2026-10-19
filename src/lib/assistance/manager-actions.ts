import { coverageRepairUrl, reportedCoverageState } from '../scheduling/coverage-repair';
import { formatDisplayDate, formatTime } from '../date-utils';

/** "Mon, Oct 12 · 8:00 AM–4:00 PM" for people; ids and links keep ISO values. */
function gapWhen(gap: { date: string; startTime: string; endTime: string }) {
  const start = gap.startTime.slice(0, 5), end = gap.endTime.slice(0, 5);
  const when = start === "00:00" && end === "24:00" ? "all day" : `${formatTime(start)}–${end === "24:00" ? "midnight" : formatTime(end)}`;
  return `${formatDisplayDate(gap.date)} · ${when}`;
}

export type ManagerActionPriority =
  | "URGENT"
  | "REVIEW"
  | "MISSING_INPUT";

export type ManagerActionItem = {
  id: string;
  type:
    | "COVERAGE_GAP"
    | "TIME_OFF"
    | "EXCHANGE"
    | "CALLOUT"
    | "HOURS_REVIEW"
    | "TARGET_MISSING"
    | "AVAILABILITY_MISSING"
    | "ACKNOWLEDGEMENT_MISSING"
    | "DEADLINE_MISSING"
    | "COVERAGE_RULES_MISSING";
  priority: ManagerActionPriority;
  title: string;
  detail: string;
  href: string;
  dateTime?: string;
  employeeId?: string;
  locationId?: string;
};

export type ManagerCoverageGapInput = {
  key: string;
  locationId: string;
  locationName: string;
  date: string;
  startTime: string;
  endTime: string;
  gap: number | null;
  requiresLead?: boolean | null;
  positionCoverage?: {positionId: string; positionName: string; missing: number}[];
};

export type ManagerHourIssueInput = {
  employeeId: string;
  employeeName: string;
  kind: "UNDER" | "OVER" | "TARGET_MISSING";
  scheduledHours?: number;
  targetHours?: number;
};

export type ManagerPendingRequestInput = {
  id: string;
  kind: "TIME_OFF" | "EXCHANGE" | "CALLOUT";
  employeeName: string;
  createdAt: string;
};

export type ManagerEmployeeInput = {
  employeeId: string;
  employeeName: string;
};

export type BuildManagerActionItemsInput = {
  weekStart: string;
  coverageGaps?: ManagerCoverageGapInput[];
  hourIssues?: ManagerHourIssueInput[];
  pendingRequests?: ManagerPendingRequestInput[];
  missingAvailability?: ManagerEmployeeInput[];
  unacknowledgedEmployees?: ManagerEmployeeInput[];
  availabilityDeadlineSet: boolean;
  coverageRulesConfigured: boolean;
};

const PRIORITY_RANK: Record<ManagerActionPriority, number> = {
  URGENT: 0,
  REVIEW: 1,
  MISSING_INPUT: 2,
};

function encode(value: string) {
  return encodeURIComponent(value);
}

function coverageAction(
  weekStart: string,
  gap: ManagerCoverageGapInput,
): ManagerActionItem {
  if (gap.gap === null || gap.requiresLead === null) return {
    id: `COVERAGE:${gap.key}`, type: 'COVERAGE_GAP', priority: 'REVIEW',
    title: `Staffing setup needed at ${gap.locationName}`,
    detail: 'Configure minimum staffing and choose a designated Lead rule.',
    href: '/app/schedule/settings', locationId: gap.locationId,
  };
  const missingPositions = (gap.positionCoverage ?? []).filter(position => position.missing > 0);
  const repairHref = coverageRepairUrl({ version: 1, weekStart, gapKey: gap.key, locationId: gap.locationId,
    date: gap.date, startTime: gap.startTime, endTime: gap.endTime,
    target: missingPositions.length > 1 ? 'CHOOSE' : missingPositions.length === 1 ? 'POSITION' : gap.gap === 0 ? 'LEAD' : 'STAFFING',
    ...(missingPositions.length === 1 ? { positionId: missingPositions[0].positionId } : {}),
    reported: reportedCoverageState({ ...gap, requiresLead: gap.requiresLead ?? gap.gap === 0 }) });
  if (missingPositions.length) return {
    id: `COVERAGE:${gap.key}`, type: 'COVERAGE_GAP', priority: 'URGENT',
    title: `Position coverage missing at ${gap.locationName}`,
    detail: `${gapWhen(gap)} · ${missingPositions.map(position => `${position.positionName}: ${position.missing} missing`).join('; ')}${gap.gap > 0 ? ` · Need ${gap.gap} employees overall` : ''}${gap.requiresLead ? ' · Designated lead required' : ''}`,
    href: repairHref,
    dateTime: `${gap.date}T${gap.startTime}`, locationId: gap.locationId,
  };
  const leadOnly = gap.gap === 0;
  const people = gap.gap === 1 ? "1 employee" : `${gap.gap} employees`;

  return {
    id: `COVERAGE:${gap.key}`,
    type: "COVERAGE_GAP",
    priority: "URGENT",
    title: leadOnly
      ? `Lead coverage missing at ${gap.locationName}`
      : `Coverage gap at ${gap.locationName}`,
    detail: leadOnly
      ? `${gapWhen(gap)} · Designated lead required`
      : `${gapWhen(gap)} · Need ${people}`,
    href: repairHref,
    dateTime: `${gap.date}T${gap.startTime}`,
    locationId: gap.locationId,
  };
}

function requestAction(
  request: ManagerPendingRequestInput,
): ManagerActionItem {
  if (request.kind === "TIME_OFF") {
    return {
      id: `TIME_OFF:${request.id}`,
      type: "TIME_OFF",
      priority: "REVIEW",
      title: "Time-off request",
      detail: `${request.employeeName} is waiting for review.`,
      href: `/app/requests?tab=pending&requestId=${encode(request.id)}`,
      dateTime: request.createdAt,
    };
  }

  if (request.kind === "CALLOUT") {
    return {
      id: `CALLOUT:${request.id}`,
      type: "CALLOUT",
      priority: "REVIEW",
      title: "Unable to Work Request",
      detail: `${request.employeeName} is waiting for review.`,
      href: `/app/exchange?tab=requests&requestId=${encode(request.id)}`,
      dateTime: request.createdAt,
    };
  }

  return {
    id: `EXCHANGE:${request.id}`,
    type: "EXCHANGE",
    priority: "REVIEW",
    title: "Shift Request",
    detail: `${request.employeeName} is waiting for review.`,
    href: `/app/exchange?tab=requests&requestId=${encode(request.id)}`,
    dateTime: request.createdAt,
  };
}

function hourAction(
  weekStart: string,
  issue: ManagerHourIssueInput,
): ManagerActionItem {
  if (issue.kind === "TARGET_MISSING") {
    return {
      id: `HOURS:${issue.employeeId}`,
      type: "TARGET_MISSING",
      priority: "MISSING_INPUT",
      title: "Weekly hour target missing",
      detail: `${issue.employeeName} is not included in hours-balance checks.`,
      href: `/app/schedule/settings?employeeId=${encode(issue.employeeId)}`,
      employeeId: issue.employeeId,
    };
  }

  const scheduled = issue.scheduledHours ?? 0;
  const target = issue.targetHours ?? 0;
  const difference = Math.abs(Math.round((scheduled - target) * 100) / 100);
  const under = issue.kind === "UNDER";

  return {
    id: `HOURS:${issue.employeeId}`,
    type: "HOURS_REVIEW",
    priority: "REVIEW",
    title: under ? "Employee below target" : "Employee above target",
    detail: `${issue.employeeName} · ${scheduled}/${target}h · ${difference}h ${under ? "short" : "over"}`,
    href: `/app/schedule?week=${encode(weekStart)}&employeeId=${encode(issue.employeeId)}`,
    employeeId: issue.employeeId,
  };
}

function availabilityAction(
  weekStart: string,
  employee: ManagerEmployeeInput,
): ManagerActionItem {
  return {
    id: `AVAILABILITY:${employee.employeeId}`,
    type: "AVAILABILITY_MISSING",
    priority: "MISSING_INPUT",
    title: "Availability not submitted",
    detail: `${employee.employeeName} has not submitted availability for this week.`,
    href: `/app/availability?week=${encode(weekStart)}&employeeId=${encode(employee.employeeId)}`,
    employeeId: employee.employeeId,
  };
}

function acknowledgementAction(
  weekStart: string,
  employee: ManagerEmployeeInput,
): ManagerActionItem {
  return {
    id: `ACKNOWLEDGEMENT:${employee.employeeId}`,
    type: "ACKNOWLEDGEMENT_MISSING",
    priority: "REVIEW",
    title: "Schedule acknowledgement pending",
    detail: `${employee.employeeName} has not acknowledged their current published schedule.`,
    href: `/app/schedule?week=${encode(weekStart)}&employeeId=${encode(employee.employeeId)}`,
    employeeId: employee.employeeId,
  };
}

function sortKey(item: ManagerActionItem) {
  return item.dateTime ?? "9999-12-31T23:59:59Z";
}

export function buildManagerActionItems(
  input: BuildManagerActionItemsInput,
): ManagerActionItem[] {
  const items: ManagerActionItem[] = [
    ...(input.coverageGaps ?? []).map((gap) =>
      coverageAction(input.weekStart, gap),
    ),
    ...(input.pendingRequests ?? []).map(requestAction),
    ...(input.hourIssues ?? []).map((issue) =>
      hourAction(input.weekStart, issue),
    ),
    ...(input.missingAvailability ?? []).map((employee) =>
      availabilityAction(input.weekStart, employee),
    ),
    ...(input.unacknowledgedEmployees ?? []).map((employee) =>
      acknowledgementAction(input.weekStart, employee),
    ),
  ];

  if (!input.availabilityDeadlineSet) {
    items.push({
      id: "SETUP:DEADLINE",
      type: "DEADLINE_MISSING",
      priority: "MISSING_INPUT",
      title: "Availability deadline not set",
      detail: "Set the availability deadline before employees finalize availability.",
      href: `/app/schedule?week=${encode(input.weekStart)}`,
    });
  }

  if (!input.coverageRulesConfigured) {
    items.push({
      id: "SETUP:COVERAGE_RULES",
      type: "COVERAGE_RULES_MISSING",
      priority: "MISSING_INPUT",
      title: "Coverage periods not fully configured",
      detail: "Configure expected coverage windows so missing shifts can be detected.",
      href: "/app/schedule/settings",
    });
  }

  return items.sort((a, b) => {
    const priorityDifference =
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDifference !== 0) return priorityDifference;

    const timeDifference = sortKey(a).localeCompare(sortKey(b));
    if (timeDifference !== 0) return timeDifference;

    return a.id.localeCompare(b.id);
  });
}
