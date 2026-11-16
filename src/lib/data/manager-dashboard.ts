import 'server-only';
import {listPositions} from './positions';
import {durationMinutes,weekDates,isValidWeekStart} from '../date-utils';
import {listPendingTimeOffRequests} from './requests';
import {listManagerPendingExchanges} from './exchanges';
import {listPendingCallouts} from './callouts';
import {listCoverageWindows,listEmployeeHourTargets,listLocationStaffingSettings} from './schedule-health';
import {listScheduleStatuses,listWeekShifts} from './schedules';
import {getAcknowledgementSummary,listUnacknowledgedEmployeeIds} from './acknowledgements';
import {getAvailabilitySubmissionSummary} from './availability-submissions';
import {getWeekSettings} from './week-settings';
import {listEmployees,listLocations} from './employees';
import {getLatestPublicationRevision} from './publication-revisions';
import {calculateScheduleHealth} from '../scheduling/schedule-health';
import {buildManagerDashboardStatus} from '../dashboard-status';
import {businessDate} from '../business-time';
import {buildManagerActionItems,markUpcomingCoverage} from '../assistance/manager-actions';
import {getWorkspace,workspaceReadGuard} from './workspaces';
import {managementSessionStatements} from './management-session';
import {neonNotificationExecutor} from './notification-transactions';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import type { SchedulingActionCapture } from '../action-center/canonical-source';

async function loadManagerDashboardDataCore(weekStart:string,proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor(), capture?: (value: SchedulingActionCapture) => void){
 if(process.env.NODE_ENV!=='production')await (await import('../dev/inspection.server')).forceInspectionError('home-read');
 if(!isValidWeekStart(weekStart))throw Error('Invalid dashboard week');
 const workspace=await getWorkspace(executor);
 const guards=[...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=$1 FOR SHARE',values:[proof.employee.id]},...managementSessionStatements(proof,proof.employee.id)];
 await executor.transaction(guards);
  const [
    shifts,
    scheduleStatuses,
    staffingSettings,
    employeeTargets,
    coverageWindows,
    pendingTimeOff,
    pendingExchanges,
    pendingCallouts,
    acknowledgements,
    weekSettings,
    availabilitySubmissionSummary,
    unacknowledgedEmployeeIds,
    employees,
    locations,
    latestRevision,
    healthShifts,
  ] = await Promise.all([
    listWeekShifts({ weekStart }),
    listScheduleStatuses(weekStart),
    listLocationStaffingSettings(),
    listEmployeeHourTargets(),
    listCoverageWindows(),
    listPendingTimeOffRequests(),
    listManagerPendingExchanges(),
    listPendingCallouts(),
    getAcknowledgementSummary(weekStart),
    getWeekSettings(weekStart),
    getAvailabilitySubmissionSummary(weekStart),
    listUnacknowledgedEmployeeIds(weekStart),
    listEmployees(),
    listLocations(),
    getLatestPublicationRevision(weekStart),
    listWeekShifts({ weekStart, byBusinessWorkweek: true }),
  ]);

  const effectiveShifts = shifts.filter((shift) => !shift.isCalloutApproved);
  const shiftsByEmployee = new Map<string, typeof effectiveShifts>();
  for (const shift of effectiveShifts) {
    const employeeShifts = shiftsByEmployee.get(shift.employeeId) ?? [];
    employeeShifts.push(shift);
    shiftsByEmployee.set(shift.employeeId, employeeShifts);
  }

  const scheduleRoster = employees
    .filter((employee) => employee.active)
    .map((employee) => ({
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      eligibleLocationIds: employee.eligibleLocationIds,
      positionIds: employee.positionIds,
      role: employee.role,
      shifts: (shiftsByEmployee.get(employee.id) ?? []).map((shift) => ({
        id: shift.id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        positionId: shift.positionId,
      isDesignatedLead: shift.isDesignatedLead,
      })),
    }));

  const targetMap = new Map(
    employeeTargets.map((target) => [
      target.employeeId,
      target.targetWeeklyHours,
    ]),
  );

  const positions = await listPositions({includeInactive:true});
  const health = calculateScheduleHealth({
      positions,
    shifts: healthShifts.filter(shift => !shift.isCalloutApproved).map((shift) => ({
      id: shift.id,
      employeeId: shift.employeeId,
      employeeName: shift.employeeName,
      locationId: shift.locationId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      positionId: shift.positionId,
      isDesignatedLead: shift.isDesignatedLead,
    })),
    locations: staffingSettings.map((location) => ({
      id: location.locationId,
      name: location.locationName,
      minimumStaffPerShift: location.minimumStaffPerShift,
      requiresDesignatedLead: location.requiresDesignatedLead,
    })),
    employees: employeeTargets.map((employee) => ({
      id: employee.employeeId,
      name: employee.employeeName,
      eligibleLocationIds: employee.eligibleLocationIds,
      positionIds: employee.positionIds,
      role: employee.role,
      active: true,
      targetWeeklyHours: targetMap.get(employee.employeeId),
    })),
    coverageWindows,
    weekDates: weekDates(weekStart),
  });

  const coverageRulesConfigured =
    staffingSettings.length > 0 &&
    staffingSettings.every((location) =>
      location.minimumStaffPerShift !== null && location.requiresDesignatedLead !== null && coverageWindows.some(
        (window) => window.locationId === location.locationId,
      ),
    );
  const hasPublishedSchedule = scheduleStatuses.some(
    (schedule) => schedule.status === "PUBLISHED",
  );

  const employeeNameMap = new Map(
    employeeTargets.map((employee) => [
      employee.employeeId,
      employee.employeeName,
    ]),
  );

  const actionInput: Parameters<typeof buildManagerActionItems>[0] = {
    weekStart,
    coverageGaps: health.coverageBlocks
      .filter((block) => !block.covered)
      .map((block) => ({
        key: block.key,
        locationId: block.locationId,
        locationName: block.locationName,
        date: block.date,
        startTime: block.startTime,
        endTime: block.endTime,
        gap: block.gap,
        positionCoverage: block.positionCoverage,
        requiresLead: block.requiresLead && !block.leadCovered,
      })),
    hourIssues: [
      ...health.hourBalances.flatMap((balance) =>
        balance.status === "ON_TARGET"
          ? []
          : [
              {
                employeeId: balance.employeeId,
                employeeName: balance.employeeName,
                kind: balance.status as "UNDER" | "OVER",
                scheduledHours: balance.scheduledHours,
                targetHours: balance.targetHours,
              },
            ],
      ),
      ...employeeTargets
        .filter((employee) => employee.targetWeeklyHours === undefined)
        .map((employee) => ({
          employeeId: employee.employeeId,
          employeeName: employee.employeeName,
          kind: "TARGET_MISSING" as const,
        })),
    ],
    pendingRequests: [
      ...pendingTimeOff.map((request) => ({
        id: request.id,
        kind: "TIME_OFF" as const,
        employeeName: request.employeeName,
        createdAt: request.createdAt,
      })),
      ...pendingExchanges.map((request) => ({
        id: request.id,
        kind: "EXCHANGE" as const,
        employeeName: request.requestedByName,
        createdAt: request.createdAt,
      })),
      ...pendingCallouts.map((request) => ({
        id: request.id,
        kind: "CALLOUT" as const,
        employeeName: request.employeeName,
        createdAt: request.createdAt,
      })),
    ],
    missingAvailability: availabilitySubmissionSummary.missingEmployeeIds.map(
      (employeeId) => ({
        employeeId,
        employeeName: employeeNameMap.get(employeeId) ?? employeeId,
      }),
    ),
    unacknowledgedEmployees: unacknowledgedEmployeeIds.map((employeeId) => ({
      employeeId,
      employeeName: employeeNameMap.get(employeeId) ?? employeeId,
    })),
    availabilityDeadlineSet: Boolean(weekSettings?.availabilityDeadline),
    coverageRulesConfigured,
  };
  const managerActions = markUpcomingCoverage(buildManagerActionItems(actionInput),businessDate(new Date(),workspace.timeZone));

  const dashboard = buildManagerDashboardStatus({
    locations: health.locationCoverage,
    scheduleStatuses,
    underTargetCount: health.underTargetCount,
    overTargetCount: health.overTargetCount,
    unconfiguredTargetCount: health.unconfiguredTargetCount,
    pendingTimeOffCount: pendingTimeOff.length,
    pendingExchangeCount: pendingExchanges.length,
    pendingCalloutCount: pendingCallouts.length,
    scheduledEmployees: acknowledgements.scheduledEmployees,
    acknowledgedEmployees: acknowledgements.acknowledgedEmployees,
    hasPublishedSchedule,
    availabilityDeadlineSet: Boolean(weekSettings?.availabilityDeadline),
    coverageRulesConfigured,
    managerActions,
  });

  const dates = weekDates(weekStart);
  const coverageGaps = health.coverageBlocks.filter((block) => !block.covered);
  const daySummaries = dates.map((date) => ({
    date,
    weekday: new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }),
    day: String(Number(date.slice(-2))),
    shiftCount: effectiveShifts.filter((shift) => shift.date === date).length,
    gapCount: coverageGaps.filter((block) => block.date === date).length,
  }));

  const balanceMap = new Map(
    health.hourBalances.map((balance) => [balance.employeeId, balance]),
  );
  const hourRows = employeeTargets.map((employee) => {
    const balance = balanceMap.get(employee.employeeId);
    const scheduledHours = balance
      ? balance.scheduledHours
      : Math.round(
          (effectiveShifts
            .filter((shift) => shift.employeeId === employee.employeeId)
            .reduce(
              (sum, shift) =>
                sum + durationMinutes(shift.startTime, shift.endTime),
              0,
            ) /
            60) *
            100,
        ) / 100;

    return {
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      role: employee.role,
      scheduledHours,
      targetHours: employee.targetWeeklyHours,
      status: balance
        ? balance.status
        : ("TARGET_MISSING" as const),
    };
  });


 await executor.transaction(guards);
 capture?.({ workspaceId: workspace.id, actorEmployeeId: proof.employee.id, weekStart, actionInput, healthShifts,
   positions, employeeTargets, staffingSettings, coverageWindows, pendingTimeOff, pendingExchanges, pendingCallouts,
   availabilityDeadline: weekSettings?.availabilityDeadline ?? null });
 // Nov 9, 2026: canonical coverage minutes (staffing, positions and lead apart), for the whole week and per location.
 const coverageMinutes={all:health.coverageMinutes,byLocation:Object.fromEntries(health.locationCoverage.map(location=>[location.locationId,location.coverageMinutes]))};
 return {dashboard,locations,availabilitySubmissionSummary,coverageRulesConfigured,managerActions,scheduleRoster,daySummaries,hourRows,pendingTimeOff,pendingExchanges,pendingCallouts,latestRevision,coverageMinutes};
}

// Internal only: not a protected F10 reader and not a public DTO extension.
export async function loadManagerDashboardData(weekStart:string,proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()){
 return loadManagerDashboardDataCore(weekStart,proof,executor);
}
export async function loadManagerDashboardDataWithInternalCapture(weekStart:string,proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()){
 const retained: {capture: SchedulingActionCapture | null} = {capture:null};
 const view = await loadManagerDashboardDataCore(weekStart,proof,executor,value => { retained.capture = value; });
 return { view, capture: retained.capture };
}
