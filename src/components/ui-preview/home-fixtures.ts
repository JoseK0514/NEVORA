import type {ComponentProps} from 'react';
import type {ManagerDashboard} from '../manager-dashboard';
import type {EmployeeHomeRead, HomeSnapshot} from '@/lib/employee-home/types';
import {buildManagerActionItems} from '@/lib/assistance/manager-actions';
import {parseActionCenter} from '@/lib/action-center/project';
import {projectClockMonitor} from '@/lib/clock-monitor';
import {projectEmployeeTime} from '@/lib/employee-time';
import type {Today} from '@/lib/today/project';
import records from './home-records.json';

/** Display columns copied from the owned fictional preview. No credentials,
 * contact fields, session material or live authority are part of this fixture. */
export const homePreviewRecords = records;
export const previewObservedAt = '2026-10-13T20:49:10Z';
export const previewWeek = '2026-10-12';
const timeZone = records.workspace.time_zone;
const expiry = '2026-10-13T20:49:55Z';

/** People with no weekly hour target, so the Owner preview shows the setup card. */
const previewTargetMissing = ['AUDIT-LEAD', 'AUDIT-LONG', 'payroll-qa-b'];
const actions = buildManagerActionItems({
  weekStart: previewWeek,
  missingAvailability: records.people.map(person => ({
    employeeId: person.id, employeeName: `${person.first_name} ${person.last_name}`,
  })),
  hourIssues: records.people.filter(person => previewTargetMissing.includes(person.id)).map(person => ({
    employeeId: person.id, employeeName: `${person.first_name} ${person.last_name}`, kind: 'TARGET_MISSING' as const,
  })),
  // Coverage periods not configured: the setup card's first step stays open.
  availabilityDeadlineSet: true, coverageRulesConfigured: false,
});

export const previewActionCenter = parseActionCenter({
  state: 'ready', observedAt: previewObservedAt, validForMs: 45000, weekStart: previewWeek,
  items: actions.map(action => ({...action, category: 'scheduling'})),
  counts: {total: actions.length, scheduling: actions.length, requests: 0, timekeeping: 0},
  limitedAttendance: false,
}, previewWeek);

/** Four fictional people on the clock: the Today strip's "Clocked in now" counts these rows. */
const monitorRows = [
  {id: 'sample-entry-1', employee_id: 'AUDIT-M', clock_in_at: '2026-10-13T15:30:00Z', location_id: 'loc-1'},
  {id: 'sample-entry-2', employee_id: 'AUDIT-E', clock_in_at: '2026-10-13T16:04:00Z', location_id: 'loc-1'},
  {id: 'sample-entry-3', employee_id: 'AUDIT-LONG', clock_in_at: '2026-10-13T16:11:00Z', location_id: 'loc-1', break_start_at: '2026-10-13T20:30:00Z'},
  {id: 'sample-entry-4', employee_id: 'AUDIT-LEAD', clock_in_at: '2026-10-13T17:00:00Z', location_id: 'loc-2'},
].map(row => {
  const person = records.people.find(item => item.id === row.employee_id)!;
  const location = records.locations.find(item => item.id === row.location_id)!;
  return {id: row.id, employee_id: row.employee_id, employee_name: `${person.first_name} ${person.last_name}`,
    location_id: location.id, location_name: location.name, device_id: `sample-device-${location.id}`, history_valid: true,
    clock_in_at: row.clock_in_at, status: row.break_start_at ? 'ON_BREAK' : 'CLOCKED_IN', open_break_count: row.break_start_at ? 1 : 0,
    break_start_at: row.break_start_at ?? null, schedule_context: null};
});
export const previewMonitor = projectClockMonitor({
  observedAt: previewObservedAt, expiresAt: expiry, timeZone, rows: monitorRows,
});
const clockedIn = previewMonitor.state === 'ready' ? previewMonitor.employees.length : 0;
/** Today strip for the same frozen moment as every other preview figure. */
export const previewToday: Today = {state: 'ready', observedAt: previewObservedAt, validForMs: 45000, timeZone, today: '2026-10-13',
  counts: {scheduled: clockedIn + 2, clockedIn, late: 1, notClockedIn: 1}, shifts: [], missed: []};
export const previewOwnTime = projectEmployeeTime({
  observedAt: previewObservedAt, expiresAt: expiry, timeZone, recentCount: 0, entries: [],
}, 'AUDIT-E');

const employeeShift = records.shifts.find(shift => shift.employee_id === 'AUDIT-E' && shift.date === '2026-10-14');
if (!employeeShift) throw new Error('The fictional employee shift is missing.');
const employeeLocation = records.locations.find(location => location.id === employeeShift.location_id);
const sources = Object.fromEntries(['schedule', 'acknowledgements', 'exchanges', 'timeOff', 'ownTime', 'communications']
  .map(source => [source, {state: 'complete', observedAt: previewObservedAt, version: 'sample-v1', reason: null}])) as HomeSnapshot['sources'];

export const previewEmployeeHome: EmployeeHomeRead = {
  state: 'ready', allSet: false,
  snapshot: {
    observedAt: previewObservedAt, authority: 'sample-display-only', validForMs: 45000, timeZone,
    sources, publicationState: 'complete',
    // A fictional shift under way, so reviewers can see it lead the card (phone polish B1).
    currentShift: {
      shiftId: 'sample-current-shift', assignmentEpisodeId: 'sample-current-assignment', termsRevision: 1,
      weekStart: previewWeek, date: '2026-10-13',
      startAt: '2026-10-13T12:00:00-04:00', endAt: '2026-10-13T20:00:00-04:00',
      locationId: employeeShift.location_id, locationLabel: employeeLocation?.name ?? 'Main Office',
      positionLabel: employeeShift.position_name, designatedLead: false, publicationRevisionId: 'sample-publication',
    },
    nextShift: {
      shiftId: employeeShift.id, assignmentEpisodeId: 'sample-assignment', termsRevision: 1,
      weekStart: previewWeek, date: employeeShift.date,
      startAt: `${employeeShift.date}T${employeeShift.start_time}-04:00`,
      endAt: `${employeeShift.date}T${employeeShift.end_time}-04:00`,
      locationId: employeeShift.location_id, locationLabel: employeeLocation?.name ?? 'Main Office',
      positionLabel: employeeShift.position_name, designatedLead: false, publicationRevisionId: 'sample-publication',
    },
    attention: [{
      ref: {kind: 'SCHEDULE', id: previewWeek, version: 'sample-publication'}, label: 'Review your published schedule',
      href: `/app/schedule?week=${previewWeek}`, required: true, actionable: true,
      deadlineAt: null, changedAt: previewObservedAt,
    }, {
      ref: {kind: 'EXCHANGE', id: 'sample-swap', version: 'sample-1'}, label: 'Shift swap offered by a teammate',
      href: '/app/exchange?tab=requests', required: false, actionable: true,
      deadlineAt: null, changedAt: previewObservedAt,
    }, {
      ref: {kind: 'TIME_OFF', id: 'sample-leave', version: 'sample-1'}, label: 'Time off approved · Oct 25 – Oct 26, 2026',
      href: '/app/requests?tab=my', required: false, actionable: false,
      deadlineAt: null, changedAt: previewObservedAt,
    }],
  },
};

export const previewManagerHome: ComponentProps<typeof ManagerDashboard> = {
  workspaceName: records.workspace.name, timeZone, firstName: 'Fictional', role: 'OWNER',
  weekStart: previewWeek, weekLabel: 'Oct 12–18, 2026', previousWeek: '2026-10-05', nextWeek: '2026-10-19',
  view: 'overview', readyLocationCount: 1, totalLocations: records.locations.length,
  availabilitySubmitted: 0, activeEmployees: records.people.length, unavailableAllWeek: 0,
  coverageIssueCount: 0, coverageConfigured: true, pendingRequestCount: 0, managerActions: actions,
  days: records.days.map(day => ({date: day.date, weekday: new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', weekday: 'short'})
    .format(new Date(`${day.date}T12:00:00Z`)), day: day.date.slice(-2), shiftCount: day.count, gapCount: 0})),
  locations: records.locations.map(location => {
    const schedule = records.schedules.find(item => item.location_id === location.id);
    return {locationId: location.id, locationName: location.name,
      state: schedule?.status === 'PUBLISHED' ? 'PUBLISHED' : 'NOT_STARTED',
      totalBlocks: 0, coveredBlocks: 0, uncoveredBlocks: 0,
      scheduleStatus: schedule?.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined};
  }),
  scheduleRoster: [], hours: [], requestCounts: {timeOff: 0, exchange: 0, callout: 0}, latestRevision: {revisionNumber: 1, sourceType: 'PUBLISH', createdAt: '2026-10-09T18:30:00.000Z'},
};
