import { listPositions } from './positions';
import { listEmployees } from './employees';
import { listWeekShifts } from './schedules';
import { listCoverageWindows, listEmployeeHourTargets, listLocationStaffingSettings } from './schedule-health';
import { calculateScheduleHealth } from '../scheduling/schedule-health';
import { buildPublishReadiness } from '../scheduling/publish-readiness';
import { weekDates } from '../date-utils';

/** The management page and first publication submission review the same facts. */
export async function getSchedulePublishReadiness(weekStart: string, locationId: string) {
  const [shifts, employees, staffing, targets, coverageWindows] =
      await Promise.all([
        listWeekShifts({ weekStart, byBusinessWorkweek: true }),
        listEmployees(),
        listLocationStaffingSettings(),
        listEmployeeHourTargets(),
        listCoverageWindows(),
      ]);

  const targetMap = new Map(
    targets.map((target) => [target.employeeId, target.targetWeeklyHours]),
  );
  const effectiveShifts = shifts.filter((shift) => !shift.isCalloutApproved);
  const health = calculateScheduleHealth({
    positions: await listPositions({includeInactive:true}),
    shifts: effectiveShifts.map((shift) => ({
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
    locations: staffing.map((setting) => ({
      id: setting.locationId,
      name: setting.locationName,
      minimumStaffPerShift: setting.minimumStaffPerShift,
      requiresDesignatedLead: setting.requiresDesignatedLead,
    })),
    employees: employees
      .filter((employee) => employee.active)
      .map((employee) => ({
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        eligibleLocationIds: employee.eligibleLocationIds,
        positionIds: employee.positionIds,
        role: employee.role,
        active: employee.active,
        targetWeeklyHours: targetMap.get(employee.id),
      })),
    coverageWindows,
    weekDates: weekDates(weekStart),
  });

  const readiness = buildPublishReadiness({
    locationId,
    locationCoverage: health.locationCoverage,
    underTargetCount: health.underTargetCount,
    overTargetCount: health.overTargetCount,
    unconfiguredTargetCount: health.unconfiguredTargetCount,
  });

  return {
    ...readiness,
    coverageNeedsSetup: health.locationCoverage.find(location => location.locationId === locationId)?.coverageConfigured === false,
  };
}
