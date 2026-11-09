import { weekStartFor } from '../date-utils';
import type { Employee, Schedule } from '../domain';
import type { GenerationClaims } from '../scheduling/generation-claims';
import type { GenerationInput } from '../scheduling/generation/types';
import { normalizeAssignmentOrigin } from '../scheduling/generation-provenance';
import { resolveOperationalRuleProfile } from '../shift-changes/policy';
import { calloutReleasesShift } from '../shift-changes/terms';
import { businessDateStart } from '../scheduling/periods';
import { mapAvailabilityInputs } from './availability-inputs';
import type { GenerationSource } from './generation-guards';
export type SchedulingFactScope = {
    workspaceId: string;
    startDate: string;
    endDate: string;
    retainAdjacentCommitments: true;
};
export type SchedulingSourceFacts = Pick<GenerationInput, 'workspace' | 'locations' | 'positions' | 'schedules' | 'staffing' | 'coverageWindows' | 'employees' | 'ledger' | 'policy'>;
const time = (v: unknown) => String(v).slice(0, 5);
const optionalTime = (v: unknown) => v == null ? undefined : time(v);
const optionalNumber = (v: unknown) => v == null ? undefined : Number(v);
/** Pure projection of one coherent source; no authority or database reads. The complete
 * nonarchived ledger intentionally retains both adjacent commitments at any distance. */
export function mapSchedulingSourceFacts(source: GenerationSource, scope: SchedulingFactScope): SchedulingSourceFacts {
    businessDateStart(scope.startDate);
    businessDateStart(scope.endDate);
    if (scope.startDate > scope.endDate || scope.retainAdjacentCommitments !== true)
        throw new Error('Invalid scheduling fact horizon.');
    const w = source.workspaces.find(w => w.id === scope.workspaceId);
    if (!w)
        throw new Error('Workspace unavailable.');
    const locations = source.locations.filter(l => l.workspace_id === w.id).map(l => ({
        id: String(l.id),
        workspaceId: String(l.workspace_id),
        clockerKey: String(l.clocker_key),
        name: String(l.name),
        shortName: String(l.short_name),
        active: l.active === true
    }));
    const schedules = source.schedules.map(s => ({
        id: String(s.id),
        locationId: String(s.location_id),
        weekStart: String(s.week_start),
        status: s.status as Schedule['status'],
        ...(s.published_at ? {
            publishedAt: String(s.published_at)
        } : {})
    }));
    const firstWeek = weekStartFor(scope.startDate), lastWeek = weekStartFor(scope.endDate);
    const positions = source.positions.filter(p => p.workspace_id === w.id).map(p => ({
        id: String(p.id),
        workspaceId: String(p.workspace_id),
        name: String(p.name),
        active: p.active === true,
        createdAt: String(p.created_at),
        updatedAt: String(p.updated_at)
    }));
    return {
        workspace: {
            id: String(w.id),
            name: String(w.name),
            timeZone: String(w.time_zone),
            active: w.active === true,
            createdAt: String(w.created_at),
            updatedAt: String(w.updated_at)
        },
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
                ...(setting?.operational_rule_profile != null ? { operationalProfile: resolveOperationalRuleProfile(setting.operational_rule_profile) } : {}),
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
            if (!parent || parent.status === 'ARCHIVED')
                return [];
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
                    isCalloutApproved: source.shift_callouts.some(c => calloutReleasesShift(c, s, parent, String(w.id),String(w.time_zone))),
                    hasCalloutHistory: source.shift_callouts.some(c => c.shift_id === s.id),
                    hasExchangeHistory: source.shift_exchanges.some(x => x.source_shift_id === s.id || x.target_shift_id === s.id),
                    hasPublicationHistory: source.schedule_publication_revision_shifts.some(r => r.source_shift_id === s.id)
                }];
        }),
        policy: {},
    };
}
