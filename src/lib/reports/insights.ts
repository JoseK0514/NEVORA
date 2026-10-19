import type { PeriodReports } from './project';
import { formatRecordedHours } from '../timecards/project';

export type Insight = { id: string; label: string; value: string; detail: string; href: string; tone?: 'attention' | 'neutral' };

const sum = (values: (string | null)[]) => values.reduce((total, value) => total + (value === null ? BigInt(0) : BigInt(value)), BigInt(0));
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Glanceable answers from the report the page already loaded: no new reads,
 * no scores, nothing shown as zero when its source is incomplete. */
export function periodInsights(report: PeriodReports): Insight[] {
  const planned = report.scheduleVsActual.filter(row => row.scheduledNanoseconds !== null);
  const scheduled = sum(planned.map(row => row.scheduledNanoseconds));
  const worked = sum(planned.map(row => row.recordedNanoseconds));
  const difference = worked - scheduled;
  const notes = report.attendance.groups.length;
  const pendingCards = report.approvals.filter(card => card.state !== 'FINALIZED').length;
  const coverage = report.coverageReliability;
  return [
    { id: 'hours', label: 'Recorded time', value: formatRecordedHours(report.summary.recordedNanoseconds), detail: `${plural(report.summary.employeeCount, 'person', 'people')} · breaks included`, href: '#report-hours' },
    report.planCoverage.state === 'unpublished'
      ? { id: 'plan', label: 'Scheduled vs recorded', value: 'Not available', detail: 'Part of this period isn’t published yet', href: '#report-hours', tone: 'neutral' as const }
      : { id: 'plan', label: 'Scheduled vs recorded', value: `${difference < BigInt(0) ? '−' : '+'}${formatRecordedHours((difference < BigInt(0) ? -difference : difference).toString())}`, detail: `${formatRecordedHours(scheduled.toString())} scheduled · ${formatRecordedHours(worked.toString())} recorded`, href: '#report-hours' },
    report.attendance.state === 'limited'
      ? { id: 'attendance', label: 'Clock-in notes', value: 'Incomplete', detail: 'Some comparisons are unavailable', href: '#report-attendance', tone: 'neutral' as const }
      : { id: 'attendance', label: 'Clock-in notes', value: String(notes), detail: notes ? `${plural(notes, 'clock-in', 'clock-ins')} to look at` : 'Nothing to note', href: '#report-attendance', tone: notes ? 'attention' as const : undefined },
    { id: 'requests', label: 'Time off and callouts', value: String(report.timeOff.length + report.callouts.length), detail: `${plural(report.timeOff.length, 'time-off request', 'time-off requests')} · ${plural(report.callouts.length, 'callout', 'callouts')}`, href: '#report-changes' },
    { id: 'coverage', label: 'Coverage filled', value: coverage.observedCoverageRequests ? `${coverage.completedCoverageRequests} of ${coverage.observedCoverageRequests}` : '—', detail: coverage.observedCoverageRequests ? 'coverage requests filled' : 'No coverage requests', href: '#report-changes' },
    { id: 'approvals', label: 'Timecards to finish', value: String(pendingCards), detail: pendingCards ? `of ${plural(report.approvals.length, 'timecard', 'timecards')} still open` : 'All timecards finalized', href: '#report-approvals', tone: pendingCards ? 'attention' as const : undefined },
  ];
}
