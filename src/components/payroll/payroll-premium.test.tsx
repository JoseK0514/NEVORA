import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PayrollRunsResponse } from '@/lib/payroll/contracts';
import type { OpenPayPeriod } from '@/lib/payroll/pay-calendar.server';
import { nativeCapabilities, nativeRun, statement } from './native-ui-fixture.test-support';
import { PayrollRuns } from './payroll-runs';
import { payrollTabs } from './payroll-tabs';
import { problemsMessage } from './form-keys';
import { onlyB, withoutB } from '../owner-b/test-support';

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
/** Payroll writes a range with thin spaces around the dash (R2). */
const thin = (text: string) => text.replaceAll(' – ', '\u2009–\u2009');
// The corporate layout (tablets and desktop); the Direction B phone screen is tested in owner-b/owner-b.test.tsx.
const home = (extra: Partial<Parameters<typeof PayrollRuns>[0]> = {}) => withoutB(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="home" current={current} canEditSettings {...extra} />));
beforeEach(() => { boundary.data = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [], jobs: [] }; boundary.statements = []; });

describe('Payroll next step (A2)', () => {
  it('prepares when no draft exists, and the label matches the Prepare payroll page', () => {
    const html = home();
    // Nov 1 upscale: Up next is one row that opens the step (no button); the step is in its name.
    expect(html).toMatch(/<li class="c-payroll__upnext"><a class="c-row" aria-label="Weekly payroll, [^"]*\. Prepare payroll" href="\/app\/payroll\/prepare">/);
    expect(html).not.toContain('c-btn');
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

describe('Unpaid periods first (A6, round 2 R3)', () => {
  it('names the oldest period whose payday passed in one white card with one red title, with only known facts', () => {
    boundary.data = { ...boundary.data!, missingPeriods: [missing], backlog } as unknown as PayrollRunsResponse;
    const html = home();
    expect(html).toContain('3 pay periods have no payroll');
    expect(html).toContain(thin('Oldest is <span class="c-num">Sep 21 – 27</span>. Its payday was <span class="c-num">Tue, Sep 29</span>.'));
    // Nov 1 upscale: the page's one filled button, which opens the period on Prepare payroll (it never prepares anything
    // by itself).
    expect(html).toMatch(/class="c-btn c-btn--md c-pay__unpaid-go" href="\/app\/payroll\/prepare#unpaid-2026-09-21">Prepare Sep 21 – 27</);
    expect(html.match(/class="c-btn[ "]/g)).toHaveLength(1);
    expect(html.match(/c-pay__unpaid-title/g)?.length).toBe(1);
    expect(html).not.toContain('c-callout--red');
    // The quiet tools row isn't repeated under the notice.
    expect(html).not.toContain('Periods with no payroll');
  });
  it('shows no notice when no unpaid payday has passed, and no count it doesn’t have', () => {
    boundary.data = { ...boundary.data!, missingPeriods: [{ ...missing, payday: '2099-01-01' }], backlog: { ...backlog, missingCount: null, overflow: true } } as unknown as PayrollRunsResponse;
    const html = home();
    expect(html).not.toContain('c-pay__unpaid');
    expect(html).toContain('Periods with no payroll');
    expect(html).toContain('>Check<');
  });
  it('isn’t repeated on Prepare payroll, where the oldest period’s row opens with the one filled Prepare payroll', () => {
    boundary.data = { ...boundary.data!, missingPeriods: [missing, { ...missing, period: { startDate: '2026-09-28', endDate: '2026-10-04' }, payday: '2026-10-06' }], backlog } as unknown as PayrollRunsResponse;
    const html = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="prepare" current={current} />);
    expect(html).not.toContain('c-pay__unpaid');
    expect(html).not.toContain('Start with the oldest');
    expect(html).toContain('Periods with no payroll');
    // One filled button on the page (the oldest period's); the current week's Prepare payroll is a teal text action.
    const buttons = html.match(/<button[^>]*>Prepare payroll</g) ?? [];
    expect(buttons.length).toBe(2);
    expect(buttons.filter(button => /class="c-btn[ "]/.test(button))).toHaveLength(1);
    expect(buttons.find(button => /class="c-btn[ "]/.test(button))).toContain(thin('aria-label="Prepare payroll for Sep 21 – 27"'));
    expect(buttons.find(button => button.includes('c-pay__quiet-go'))).toContain(thin('aria-label="Prepare payroll for Oct 5 – 11"'));
    expect(html).not.toContain('c-btn--secondary');
    expect(html).not.toContain('Prepare draft');
  });
});

describe('One status for the open period (R7)', () => {
  it('drops the due pill and never invents a prepare-by date before payday', () => {
    const html = home();
    expect(html).not.toContain('Due in');
    expect(html).not.toContain('Not prepared yet');
    // Nov 1 upscale: the row says the period and the payday, nothing else.
    expect(html).not.toContain('Prepare by payday');
    expect(html).toMatch(/ · Payday <span class="c-num">[A-Z][a-z]{2}, Oct 16<\/span>/);
  });
  it('names Pay history once, as the Recent payrolls link', () => {
    const html = home();
    expect(html.match(/href="\/app\/payroll\/history"/g)?.length).toBe(1);
    expect(html).toContain('>Pay history</a>');
  });
});

describe('Pay history (A11, round 2 R9)', () => {
  it('names each statement from records, never from its file name, in two lines with period, payday and relationship', () => {
    const original = nativeRun({ id: 'fictional-original', status: 'APPROVED', rows: null, documents: [{ ...statement, id: 'doc-original', filename: 'statement-ZZ9999-parsed-name.pdf' }] });
    const correction = nativeRun({ id: 'fictional-correction', status: 'APPROVED', rows: null, correctionOf: 'fictional-original', documents: [statement] });
    boundary.data!.runs = [original, correction];
    boundary.statements = [{ ...statement, id: 'doc-original', filename: 'statement-ZZ9999-parsed-name.pdf' }, statement];
    const html = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="history" names={{ E1: 'Fictional Person' }} />);
    expect(html).toContain('Fictional Person');
    // The file name and revision leave the row: only the Download label and tooltip hold them.
    expect(html).not.toMatch(/>[^<]*ZZ9999[^<]*</);
    expect(html).not.toMatch(/>[^<]*Revision[^<]*</);
    expect(html).toContain('title="statement-ZZ9999-parsed-name.pdf, revision 2"');
    expect(html).toContain('Payday <span class="c-num">Fri, Oct 16</span>\u00a0· Correction');
    expect(html).toContain('Replaced by a correction');
    // One date format: "Oct 5 – 11", never "Oct 5 – Oct 11".
    expect(html).not.toContain('Oct 5 – Oct 11');
    // The correction comes before the statement it replaces.
    expect(html.indexOf('· Correction</span>')).toBeLessThan(html.indexOf('Replaced by a correction'));
    // One teal action per row (View); Download is a neutral icon button.
    expect(html.match(/c-pay__stmt-view/g)?.length).toBe(2);
    expect(html.match(/c-pay__icon-btn/g)?.length).toBe(2);
    // Two payroll rows for one week differ in their titles.
    expect(html).toContain(thin('<span class="c-num">Oct 5 – 11</span> · Correction'));
  });
  it('says Employee statement when no record names the person', () => {
    boundary.data!.runs = [nativeRun({ status: 'APPROVED', rows: null, documents: [statement] })];
    boundary.statements = [statement];
    const html = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="history" />);
    expect(html).toContain('Employee statement');
  });
  it('never shows a missing payroll amount as zero, and Approved never says Paid', () => {
    boundary.data!.runs = [nativeRun({ status: 'APPROVED', totals: null, rows: null })];
    const html = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="history" />);
    expect(html).not.toContain('$0.00');
    expect(html).toContain('Approved');
    expect(html).not.toMatch(/\bPaid\b/);
  });
});

describe('Payroll details documents (R9)', () => {
  it('names a statement from the payroll’s own rows and keeps the file name out of the row', () => {
    boundary.data!.runs = [nativeRun({ status: 'APPROVED', approvedAt: '2026-10-12T16:00:00Z', documents: [{ ...statement, filename: 'statement-ZZ9999.pdf' }] })];
    const html = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="review" runId={nativeRun().id} />);
    expect(html).toContain('>Fictional Employee<');
    expect(html).toContain('Pay statement · Shared with employee');
    expect(html).not.toMatch(/>[^<]*statement-ZZ9999[^<]*</);
    expect(html).not.toContain('Revision 2 approved');
    // Nov 1 upscale: the status (and the day it was approved) is the subtitle; no floating line under the cards.
    expect(html).toMatch(/<span class="c-title__sub">Oct 5 – 11 · Payday [A-Z][a-z]{2}, Oct 16 · Approved [A-Z][a-z]{2} 12<\/span>/);
    expect(html).not.toContain('c-note--center');
    // The action rows end in chevrons.
    expect(html).toMatch(/<span class="c-row__title">Fix this payroll<\/span>.*?<svg[^>]*class="c-chev"/);
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

describe('Direction B phone screen (Payroll)', () => {
  it('heads the ink hero with the open period, then the three steps with the same next-step button, and Recent payrolls with net pay', () => {
    boundary.data = { version: 'PAYROLL_RUNS_V1', runs: [], capabilities: nativeCapabilities, missingPeriods: [] } as unknown as PayrollRunsResponse;
    const html = onlyB(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="home" current={current} canEditSettings />)).replace(/\u2009/g, ' ');
    expect(html).toContain('class="b-screen b-screen--ink"');
    expect(html).toContain('<h1 id="b-payroll-title">Payroll</h1>');
    expect(html).toContain('Up next · Weekly payroll');
    expect(html).toMatch(/class="b-step b-step--now"><span class="b-step__n" aria-hidden="true">1<\/span>/);
    expect(html).toMatch(/class="b-btn b-btn--teal b-btn--full b-btn--big"[^>]*href="\/app\/payroll\/prepare"[^>]*>Prepare payroll<\/a>/);
    expect(html).toContain('<a class="b-card__a" href="/app/payroll/history">Pay history</a>');
  });
});
