import { selectGenerationScope } from '../scheduling/generation/scope';
import { addDays, weekStartFor } from '../date-utils';
import type { Employee, Schedule } from '../domain';
import type { SqlExecutor } from '../notifications/types';
import { businessDateStart } from '../scheduling/periods';
import { normalizeAssignmentOrigin } from '../scheduling/generation-provenance';
import type { GenerationClaims } from '../scheduling/generation-claims';
import type { GenerationInput } from '../scheduling/generation/types';
import { mapAvailabilityInputs } from './availability-inputs';
import type { GenerationExclusion } from './generation-exclusions';
import { GenerationPermissionError, GenerationScopeError, GenerationTargetNotDraftError, readGenerationSource, type GenerationSource } from './generation-guards';
import { neonNotificationExecutor } from './notification-transactions';
export type GenerationRequest = {
  workspaceId: string;
  actorEmployeeId: string;
  weekStart: string;
  mode: GenerationInput['mode'];
  locationScope: GenerationInput['scope'];
};
/** Internal server snapshot. Never serialize this object into an action result. */
export type GenerationSnapshot = {
  source: GenerationSource;
  changedAt: string;
  input: GenerationInput;
};
// Retain the approved node/evaluator ceilings, with conservative cumulative enumeration.
// Dense fixtures may return a legal BUDGET_EXHAUSTED partial; no request overrides.
export const GENERATION_LIMITS = Object.freeze({
  maxNodes: 20_000,
  maxEvaluations: 200_000,
  maxPeriods: 10_000
});
const time = (v: unknown) => String(v).slice(0, 5);
const optionalTime = (v: unknown) => v == null ? undefined : time(v);
const optionalNumber = (v: unknown) => v == null ? undefined : Number(v);
function validateRequest(request: GenerationRequest) {
  if (!request || typeof request.workspaceId !== 'string' || !request.workspaceId.trim() || typeof request.actorEmployeeId !== 'string' || !request.actorEmployeeId.trim() || !['BUILD_WEEK', 'FILL_GAPS_ONLY'].includes(request.mode) || !request.locationScope || !['ALL', 'SELECTED'].includes(request.locationScope.kind)) throw new GenerationScopeError();
  businessDateStart(request.weekStart);
  if (weekStartFor(request.weekStart) !== request.weekStart) throw new GenerationScopeError();
  if (request.locationScope.kind === 'SELECTED' && (!Array.isArray(request.locationScope.locationIds) || request.locationScope.locationIds.length === 0 || request.locationScope.locationIds.some(id => typeof id !== 'string' || !id.trim()) || new Set(request.locationScope.locationIds).size !== request.locationScope.locationIds.length)) throw new GenerationScopeError();
}

/** One complete MVCC statement; mapping never makes additional reads. */
async function mapGenerationSnapshot(request: GenerationRequest, executor: SqlExecutor): Promise<GenerationSnapshot> {
  validateRequest(request);
  const {
    source,
    changedAt
  } = await readGenerationSource(executor);
  const w = source.workspaces.find(w => w.id === request.workspaceId && w.active === true);
  const actor = source.employees.find(e => e.id === request.actorEmployeeId && e.active === true && ['OWNER', 'MANAGER'].includes(String(e.role)));
  if (!w || !actor || !source.locations.some(l => l.id === actor.primary_location_id && l.workspace_id === w.id)) throw new GenerationPermissionError();
  const locations = source.locations.filter(l => l.workspace_id === w.id).map(l => ({
    id: String(l.id),
    workspaceId: String(l.workspace_id),
    clockerKey: String(l.clocker_key),
    name: String(l.name),
    shortName: String(l.short_name),
    active: l.active === true
  }));
  const scope = structuredClone(request.locationScope);
  if (scope.kind === 'SELECTED' && scope.locationIds.some(id => !locations.some(l => l.id === id))) throw new GenerationScopeError();
  const schedules = source.schedules.map(s => ({
    id: String(s.id),
    locationId: String(s.location_id),
    weekStart: String(s.week_start),
    status: s.status as Schedule['status'],
    ...(s.published_at ? {
      publishedAt: String(s.published_at)
    } : {})
  }));
  const firstWeek = addDays(request.weekStart, -7),
    lastWeek = addDays(request.weekStart, 7);
  const positions = source.positions.filter(p => p.workspace_id === w.id).map(p => ({
    id: String(p.id),
    workspaceId: String(p.workspace_id),
    name: String(p.name),
    active: p.active === true,
    createdAt: String(p.created_at),
    updatedAt: String(p.updated_at)
  }));
  const input: GenerationInput = {
    workspace: {
      id: String(w.id),
      name: String(w.name),
      timeZone: String(w.time_zone),
      active: w.active === true,
      createdAt: String(w.created_at),
      updatedAt: String(w.updated_at)
    },
    weekStart: request.weekStart,
    mode: request.mode,
    scope,
    locations,
    positions,
    schedules,
    staffing: source.location_staffing_settings.map(s => ({
      locationId: String(s.location_id),
      locationName: locations.find(l => l.id === s.location_id)?.shortName ?? '',
      minimumStaffPerShift: s.minimum_staff_per_shift == null ? null : Number(s.minimum_staff_per_shift),
      requiresDesignatedLead: s.requires_designated_lead == null ? null : s.requires_designated_lead === true
    })),
    coverageWindows: source.location_coverage_windows.map(c => ({
      id: String(c.id),
      locationId: String(c.location_id),
      dayOfWeek: Number(c.day_of_week),
      startTime: time(c.start_time),
      endTime: time(c.end_time),
      minimumStaff: optionalNumber(c.minimum_staff),
      positionRequirements: source.coverage_window_position_requirements.filter(r => r.coverage_window_id === c.id).map(r => ({
        positionId: String(r.position_id),
        quantity: Number(r.quantity)
      }))
    })),
    employees: source.employees.map(e => {
      const employeeRows = (table: keyof GenerationSource) => source[table].filter(r => r.employee_id === e.id);
      const availability = mapAvailabilityInputs(employeeRows('availability_windows'), employeeRows('weekly_availability_windows'), employeeRows('weekly_availability_submissions').map(s => ({
        ...s,
        submission_version: s.updated_at
      })), employeeRows('availability_exceptions'), firstWeek, lastWeek);
      const setting = source.employee_scheduling_settings.find(s => s.employee_id === e.id);
      return {
        id: String(e.id),
        firstName: String(e.first_name),
        lastName: String(e.last_name),
        phone: String(e.phone),
        role: e.role as Employee['role'],
        primaryLocationId: String(e.primary_location_id),
        active: e.active === true,
        eligibleLocationIds: employeeRows('employee_location_eligibility').map(r => String(r.location_id)),
        positionIds: employeeRows('employee_positions').filter(r => positions.some(p => p.id === r.position_id && p.active)).map(r => String(r.position_id)),
        targetWeeklyHours: optionalNumber(setting?.target_weekly_hours),
        maximumWeeklyHours: Number(setting?.maximum_weekly_hours ?? 40),
        availability: availability.normal,
        weeklyAvailability: availability.weeks,
        availabilityExceptions: availability.exceptions,
        approvedTimeOff: employeeRows('time_off_requests').filter(r => r.status === 'APPROVED').map(r => ({
          startDate: String(r.start_date),
          endDate: String(r.end_date),
          startTime: optionalTime(r.start_time),
          endTime: optionalTime(r.end_time),
          status: 'APPROVED'
        }))
      };
    }),
    // Dates, not owning schedule weeks, define retained commitments. Include prior-Sunday
    // carry-in and all next-week hours for Sunday periods reaching Monday.
    ledger: source.shifts.flatMap(s => {
      const parent = schedules.find(p => p.id === s.schedule_id);
      if (!parent || parent.status === 'ARCHIVED' || String(s.date) < addDays(request.weekStart, -1) || String(s.date) >= addDays(request.weekStart, 14)) return [];
      return [{
        id: String(s.id),
        scheduleId: String(s.schedule_id),
        employeeId: String(s.employee_id),
        locationId: parent.locationId,
        date: String(s.date),
        startTime: time(s.start_time),
        endTime: time(s.end_time),
        positionId: s.position_id == null ? undefined : String(s.position_id),
        isDesignatedLead: s.is_designated_lead === true,
        assignmentOrigin: normalizeAssignmentOrigin(s.assignment_origin),
        generatedClaims: s.generated_claims as GenerationClaims | null,
        scheduleStatus: parent.status,
        isCalloutApproved: source.shift_callouts.some(c => c.shift_id === s.id && c.employee_id === s.employee_id && c.status === 'APPROVED'),
        hasCalloutHistory: source.shift_callouts.some(c => c.shift_id === s.id),
        hasExchangeHistory: source.shift_exchanges.some(x => x.source_shift_id === s.id || x.target_shift_id === s.id),
        hasPublicationHistory: source.schedule_publication_revision_shifts.some(r => r.source_shift_id === s.id)
      }];
    }),
    exclusions: source.schedule_generation_exclusions.map(e => ({
      id: String(e.id),
      workspaceId: String(e.workspace_id),
      weekStart: String(e.week_start),
      locationId: String(e.location_id),
      assignmentStart: String(e.assignment_start),
      assignmentEnd: String(e.assignment_end),
      positionId: e.position_id == null ? null : String(e.position_id),
      claims: e.claims as GenerationClaims,
      deletedSourceShiftId: e.deleted_source_shift_id == null ? null : String(e.deleted_source_shift_id),
      createdBy: String(e.created_by),
      createdAt: String(e.created_at),
      clearedBy: e.cleared_by == null ? null : String(e.cleared_by),
      clearedAt: e.cleared_at == null ? null : String(e.cleared_at)
    }) satisfies GenerationExclusion),
    // Existing persistence has no business/day policy settings; shared validator defaults apply.
    policy: {},
    limits: {
      ...GENERATION_LIMITS
    }
  };
  return {
    source,
    changedAt,
    input
  };
}

/** Strict write snapshot: only READY attempted locations can block the operation. */
export async function readGenerationSnapshot(request: GenerationRequest, executor: SqlExecutor = neonNotificationExecutor()): Promise<GenerationSnapshot> {
  const snapshot = await mapGenerationSnapshot(request, executor);
  const scope = selectGenerationScope(snapshot.input);
  const blockedIds = scope.issues.filter(issue => issue.code === 'TARGET_NOT_DRAFT').map(issue => issue.locationId!);
  if (blockedIds.length) throw new GenerationTargetNotDraftError(blockedIds.map(id => snapshot.input.locations.find(l => l.id === id)!.shortName));
  return snapshot;
}

/** Read-only Manager review needs unavailable targets too; never used by the writer. */
export async function readGenerationReviewSnapshot(request: GenerationRequest, executor: SqlExecutor = neonNotificationExecutor()): Promise<GenerationSnapshot> {
  return mapGenerationSnapshot(request, executor);
}
