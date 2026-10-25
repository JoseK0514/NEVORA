import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { nativeCapabilities, nativeRun } from './native-ui-fixture.test-support';
import { pastPeriodDetail } from './payroll-runs';
import { PayrollDraftQuiet, PayrollReviewQuiet } from './payroll-review-quiet';
import { noticeReadiness, payrollFixGroups } from './workflow-status';
import { aboutPayrollSettings } from './payroll-settings';
import { HOW_INSIGHTS_COUNT } from '../reports';

/* Final pass (Oct 25, 2026), Team U4: business P0-4, T-14, UX-O-34, T-15 and Jose's meal-period warnings. */
vi.mock('next/navigation', () => ({ usePathname: () => '/app/payroll', useRouter: () => ({ push: () => {} }) }));
const operation = { busy: false, pending: null, resuming: false, message: '', error: '', revisionConflict: false, retryAvailable: false, resumeAvailable: false, receipt: null,
  submit: vi.fn(async () => {}), check: async () => {}, retry: async () => {}, resume: () => {}, pauseResume: () => {}, locked: false } as never;

describe('Paid only for completed runs (business P0-4)', () => {
  it('never says Paid for a run that was not approved', () => {
    expect(pastPeriodDetail({ status: 'BLOCKED', payday: '2026-09-29' }, '2026-10-25')).toEqual({ text: 'Payday Tue, Sep 29 passed · Not approved', late: true });
    expect(pastPeriodDetail({ status: 'REVIEW_REQUIRED', payday: '2026-09-29' }, '2026-10-25').text).not.toMatch(/^Paid/);
    expect(pastPeriodDetail({ status: 'APPROVED', payday: '2026-09-29' }, '2026-10-25')).toEqual({ text: 'Paid Tue, Sep 29', late: false });
    expect(pastPeriodDetail({ status: 'BLOCKED', payday: '2026-10-30' }, '2026-10-25')).toEqual({ text: 'Payday Fri, Oct 30', late: false });
  });
});

describe('Payroll period review on Quiet (T-14)', () => {
  it('groups the problems by kind in the Owner’s voice, one row per kind', () => {
    const groups = payrollFixGroups(['WAGE_PROFILE_REQUIRED:E1', 'WAGE_PROFILE_REQUIRED:E2', 'TIME_NOT_FINALIZED:E1', 'LOCATION_COVERAGE_REQUIRED', 'CORRECTION_REASON:kept']);
    expect(groups.map(group => [group.title, group.references.length])).toEqual([['Hourly rate missing', 2], ['Recorded time incomplete', 1], ['Location coverage incomplete', 0]]);
    expect(groups.map(group => group.action).join(' ')).not.toMatch(/Ask the Owner/);
    expect(groups[0].action).toBe('Add their hourly rate in Payroll settings');
  });
  it('renders steps, Needs fixing, meal warnings and Recalculate with no kit tab strip or repeated sentences', () => {
    const run = { ...nativeRun({ status: 'BLOCKED', rows: null, totals: null, reviewToken: null, exceptions: Array.from({ length: 11 }, (_, i) => `WAGE_PROFILE_REQUIRED:E${i}`) }),
      mealWarnings: [{ date: '2026-10-06', kind: 'NO_MEAL_5H' }, { date: '2026-10-07', kind: 'MEAL_TOO_SHORT', minutes: 20 }] };
    const html = renderToStaticMarkup(<PayrollReviewQuiet run={run} capabilities={nativeCapabilities} operation={operation} locked={false} details={false} onBack={() => {}} onDetails={() => {}} />);
    expect(html).toContain('<h1>Oct 5 – 11</h1><p>Payday Fri, Oct 16 · Revision 2</p>');
    expect(html).toContain('Needs fixing');
    expect(html).toContain('<b>Hourly rate missing</b><i>Add their hourly rate in Payroll settings</i></span><span class="q-rv">11 people</span>');
    expect(html.match(/<b>Hourly rate missing<\/b>/g)).toHaveLength(1);
    expect(html).not.toMatch(/Ask the Owner|nv-pageband|section-tabs|pw-stepper/);
    expect(html).toContain('Meal periods to review');
    expect(html).toContain('No meal break in the first 5 hours · Meal break was 20 min');
    expect(html).toContain('These don’t block payroll. No penalty pay is added.');
    expect(html).toContain('>Recalculate</button>');
    expect(html).toContain('Fix the items above, then recalculate.');
    expect(html).toContain('All payroll details');
  });
  it('keeps the approval wording, explicit review and token guard', () => {
    const html = renderToStaticMarkup(<PayrollReviewQuiet run={nativeRun()} capabilities={nativeCapabilities} operation={operation} locked={false} details={false} onBack={() => {}} onDetails={() => {}} />);
    expect(html).toContain('I reviewed revision 2, the recorded-time calculation and all employee details.');
    expect(html).toMatch(/<button class="q-btn" type="button" disabled="">Approve revision 2<\/button>/);
    expect(html).toContain('Net pay · 1 person');
  });
  it('starts a new draft as a modal with date rows and the transition acknowledgement', () => {
    const html = renderToStaticMarkup(<PayrollDraftQuiet initial={{ period: { startDate: '2026-09-28', endDate: '2026-10-04' }, payday: '2026-10-06',
      missing: { period: { startDate: '2026-09-28', endDate: '2026-10-04' }, payday: '2026-10-06', settingsRevision: 1, state: 'AMBIGUOUS_TRANSITION', issues: ['Weekly to every two weeks'] } }} operation={operation} locked={false} onCancel={() => {}} />);
    expect(html).toContain('New payroll draft');expect(html).toContain('>Create</button>');
    expect(html).toContain('value="2026-09-28"');expect(html).toContain('I reviewed this schedule transition, period boundaries and payday.');
    expect(html).toMatch(/type="submit" class="q-nav__r q-nav__r--b" disabled="">Create/);
  });
});

describe('Owner words on payroll settings and Insights (UX-O-34, #44, T-15)', () => {
  it('says who can change payroll and whether notices are sent, with no environment note', () => {
    const lines = aboutPayrollSettings({ ...nativeCapabilities, noticeDelivery: 'DISABLED' } as never);
    expect(lines).toHaveLength(3);
    expect(lines.join(' ')).not.toMatch(/environment|Native payroll requires/);
    expect(noticeReadiness({ ...nativeCapabilities, noticeDelivery: 'DISABLED' } as never)).toBe('Pay notices are off, so nothing is sent to employees.');
  });
  it('explains Insights in five plain one-line bullets', () => {
    expect(HOW_INSIGHTS_COUNT).toHaveLength(5);
    expect(HOW_INSIGHTS_COUNT.join(' ')).not.toMatch(/canonical|immutable|append-only|observation|D2/);
  });
});
