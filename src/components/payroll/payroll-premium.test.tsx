import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PayrollRunsResponse } from '@/lib/payroll/contracts';
import type { OpenPayPeriod } from '@/lib/payroll/pay-calendar.server';
import { nativeCapabilities, nativeRun, statement } from './native-ui-fixture.test-support';
import { PayrollRuns } from './payroll-runs';
import { payrollTabs } from './payroll-tabs';
import { problemsMessage } from './form-keys';

// Owner premium (Oct 31) presentation only: next-step labels, unpaid periods first, Pay history identity, tabs.
const boundary = vi.hoisted(() => ({ data: null as PayrollRunsResponse | null, statements: [] as unknown[] }));
vi.mock('./use-payroll', () => ({ PAYROLL_SIGNED_OUT: 'Your session ended. Sign in again to see payroll.',
  usePayrollResource: (path: string) => ({ loading: false, error: '', data: path === '/api/payroll/portal-statements' ? { version: 'PAYROLL_PORTAL_STATEMENTS_V1', statements: boundary.statements } : boundary.data, reload: async () => {} }),
  usePayrollOperation: () => ({ busy: false, pending: null, resuming: false, message: '', error: '', revisionConflict: false, submit: async () => {}, receipt: null }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/app/payroll', useRouter: () => ({ push: () => {}, replace: () => {} }) }));

const current: OpenPayPeriod = { period: { startDate: '2026-10-05', endDate: '2026-10-11' }, payday: '2099-10-16', frequency: 'WEEKLY' } as OpenPayPeriod;
const missing = { period: { startDate: '2026-09-21', endDate: '2026-09-27' }, payday: '2026-09-29', settingsRevision: 1, state: 'MISSING', issues: [] };
const backlog = { asOfDate: '2026-10-30', rangeStart: '2026-09-01', rangeEnd: '2026-10-30', missingCount: 3, remainingCount: 0, returnedCount: 3, ambiguousCount: 0, overflow: false };
const home = (extra: Partial<Parameters<typeof PayrollRuns>[0]> = {}) => renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="home" current={current} canEditSettings {...extra} />);
beforeEach(() => { boundary.data = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [], jobs: [] }; boundary.statements = []; });

describe('Payroll next step (A2)', () => {
  it('prepares when no draft exists, and the label matches the Prepare payroll page', () => {
    const html = home();
    expect(html).toContain('>Prepare payroll<');
    expect(html).toContain('href="/app/payroll/prepare"');
    expect(html).not.toContain('>Review<');
  });
  it('reviews the issue when something stops the open draft', () => {
    boundary.data!.runs = [nativeRun({ status: 'BLOCKED', rows: null, totals: null, reviewToken: null, exceptions: ['WAGE_PROFILE_REQUIRED:E1'] })];
    const html = home();
    expect(html).toContain('>Review issue<');
    expect(html).toContain('/app/payroll/fix?run=');
  });
  it('reviews a ready draft', () => {
    boundary.data!.runs = [nativeRun()];
    expect(home()).toContain('>Review payroll<');
  });
  it('leads a blocked review with Review issue and keeps Approve unavailable and secondary', () => {
    boundary.data!.runs = [nativeRun({ status: 'BLOCKED', rows: null, totals: null, reviewToken: null, exceptions: ['WAGE_PROFILE_REQUIRED:E1'] })];
    const html = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="review" runId={nativeRun().id} />);
    expect(html).toMatch(/c-btn--full[^"]*" href="\/app\/payroll\/fix\?run=[^"]+">Review issue</);
    const approve = html.match(/<button[^>]*>Approve payroll/)?.[0] ?? '';
    expect(approve).toContain('c-btn--secondary');
    expect(approve).toContain('disabled=""');
  });
});

describe('Unpaid periods first (A6)', () => {
  it('names the oldest period whose payday passed, in one red notice, with only known facts', () => {
    boundary.data = { ...boundary.data!, missingPeriods: [missing], backlog } as unknown as PayrollRunsResponse;
    const html = home();
    expect(html).toContain('3 pay periods weren’t run');
    expect(html).toContain('Oldest: Sep 21 – 27 · payday was Tue, Sep 29.');
    expect(html).toContain('href="/app/payroll/prepare#unpaid-2026-09-21"');
    expect(html.match(/c-callout--red/g)?.length).toBe(1);
    // The quiet tools row isn't repeated under the notice.
    expect(html).not.toContain('Periods with no payroll');
  });
  it('shows no notice when no unpaid payday has passed, and no count it doesn’t have', () => {
    boundary.data = { ...boundary.data!, missingPeriods: [{ ...missing, payday: '2099-01-01' }], backlog: { ...backlog, missingCount: null, overflow: true } } as unknown as PayrollRunsResponse;
    const html = home();
    expect(html).not.toContain('c-callout--red');
    expect(html).toContain('Periods with no payroll');
  });
});

describe('Pay history (A11)', () => {
  it('names each statement from records, never from its file name, with period, payday and relationship', () => {
    const original = nativeRun({ id: 'fictional-original', status: 'APPROVED', rows: null, documents: [{ ...statement, id: 'doc-original', filename: 'statement-ZZ9999-parsed-name.pdf' }] });
    const correction = nativeRun({ id: 'fictional-correction', status: 'APPROVED', rows: null, correctionOf: 'fictional-original', documents: [statement] });
    boundary.data!.runs = [original, correction];
    boundary.statements = [{ ...statement, id: 'doc-original', filename: 'statement-ZZ9999-parsed-name.pdf' }, statement];
    const html = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="history" names={{ E1: 'Fictional Person' }} />);
    expect(html).toContain('Fictional Person');
    expect(html).not.toContain('ZZ9999 ');
    expect(html).toContain('Payday Fri, Oct 16');
    expect(html).toContain('Correction of Oct 5 – Oct 11');
    expect(html).toContain('Replaced by a correction');
    // The correction comes before the statement it replaces.
    expect(html.indexOf('Correction of')).toBeLessThan(html.indexOf('Replaced by a correction'));
    // One teal action per row (View); Download is a neutral icon button.
    expect(html.match(/c-pay__stmt-view/g)?.length).toBe(2);
    expect(html.match(/c-pay__icon-btn/g)?.length).toBe(2);
  });
  it('says Employee statement when no record names the person', () => {
    boundary.data!.runs = [nativeRun({ status: 'APPROVED', rows: null, documents: [statement] })];
    boundary.statements = [statement];
    const html = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="history" />);
    expect(html).toContain('Employee statement');
  });
});

describe('Payroll tabs and forms', () => {
  it('leaves Timecards out and calls the Payroll page Payroll', () => {
    const tabs = payrollTabs('OWNER', nativeCapabilities);
    expect(tabs?.map(item => item.label)).toEqual(['Payroll', 'Time exports', 'Payroll settings']);
  });
  it('names every missing field in one message', () => {
    const field = (name: string) => ({ getAttribute: (key: string) => key === 'aria-label' ? name : null, validity: { valueMissing: true }, validationMessage: '' }) as unknown as HTMLInputElement;
    expect(problemsMessage([field('Payday after period end'), field('Reason for change')])).toBe('Fill in 2 fields: Payday after period end and Reason for change.');
    expect(problemsMessage([field('Reason for change')])).toBe('Fill in Reason for change.');
  });
});
