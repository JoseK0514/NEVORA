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
    expect(html).toContain(thin('Oldest is <span class="c-num">Sep 21 – 27</span>. Scheduled payday was <span class="c-num">Tue, Sep 29</span>.'));
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
  it('names Payroll history once, as the Recent payrolls link', () => {
    const html = home();
    expect(html.match(/href="\/app\/payroll\/history"/g)?.length).toBe(1);
    expect(html).toContain('>Payroll history</a>');
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
    // Two payroll rows for one week differ at a glance: the correction carries a "Correction" pill (Round 5, as on Payroll).
    expect(html).toMatch(new RegExp(thin('Oct 5 – 11') + '</span>[\\s\\S]*?>Correction<'));
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
    expect(html).toContain('<h1 id="b-payroll-title" tabindex="-1">Payroll</h1>');
    expect(html).toContain('Up next · Weekly payroll');
    expect(html).toMatch(/class="b-step b-step--now"><span class="b-step__n" aria-hidden="true">1<\/span>/);
    expect(html).toMatch(/class="b-btn b-btn--teal b-btn--full b-btn--big"[^>]*href="\/app\/payroll\/prepare"[^>]*>Prepare payroll<\/a>/);
    expect(html).toContain('<a class="b-card__a" href="/app/payroll/history">Payroll history</a>');
  });
});

// Nov 14, 2026 inspection (payroll scope wording and hand-offs): NEVORA calculates pay and shares statements; the screens
// say so where it matters. Wording and links only; no command or payload is exercised here.
describe('Payroll scope and hand-offs (Nov 14 inspection)', () => {
  const importRun = (overrides: Parameters<typeof nativeRun>[0] = {}) => nativeRun({ sourceAuthority: 'PROVIDER_IMPORT', nativeCalculation: undefined, ...overrides });
  const review = () => renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="review" runId={nativeRun().id} />);
  it('keeps the scope line under the Payroll title on the phone screen and on wider screens (PY-14)', () => {
    const all = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="home" current={current} canEditSettings />);
    const line = 'Calculate pay and share statements. You pay your team outside NEVORA.';
    expect(onlyB(all)).toContain(`<p class="b-sub c-pay__scope c-pay__scope--hero">${line}</p>`);
    expect(withoutB(all)).toContain(`<span class="c-pay__scope">${line}</span></span>`);
  });
  it('says a passed payday was the scheduled one (PY-14)', () => {
    boundary.data = { ...boundary.data!, missingPeriods: [missing], backlog: { ...backlog, missingCount: 1 } } as unknown as PayrollRunsResponse;
    const all = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="home" current={{ ...current, payday: '2026-01-02' }} timeZone="America/Puerto_Rico" />);
    expect(withoutB(all)).toContain('Scheduled payday was <span class="c-num">Tue, Sep 29</span>.');
    expect(onlyB(all)).toContain('Scheduled payday was Tue, Sep 29');
    expect(onlyB(all)).toContain('>Scheduled payday passed<');
    expect(all).not.toContain('Its payday was');
  });
  it('shows the three steps on wider screens too, worded for how statements are shared (OW-005, PY-4)', () => {
    const html = home();
    expect(html.match(/class="b-step[ "]/g)).toHaveLength(3);
    expect(html).toContain('Statements are shared with your team automatically');
    expect(html).not.toContain('Then share pay statements');
    boundary.data!.capabilities = { ...nativeCapabilities, internalCalculatorAvailable: false };
    expect(home()).toContain('Then share pay statements');
    boundary.data!.runs = [importRun()];
    expect(home()).toContain('Then share pay statements');
  });
  it('keeps one button on the phone while an overdue period leads: this period’s step is a quiet link (OW-005)', () => {
    boundary.data = { ...boundary.data!, missingPeriods: [missing], backlog } as unknown as PayrollRunsResponse;
    const html = onlyB(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="home" current={current} />));
    expect(html.match(/class="b-btn[ "]/g)).toHaveLength(1);
    expect(html).toMatch(/class="b-btn b-btn--teal"[^>]*href="\/app\/payroll\/prepare#unpaid-2026-09-21"[^>]*>Prepare</);
    expect(html).toMatch(/<a class="b-link c-pay__steplink"[^>]*href="\/app\/payroll\/prepare"[^>]*>Prepare payroll<\/a>/);
  });
  it('tells the Owner what is still theirs once a payroll is approved, on Payroll and on Payroll details (PY-3)', () => {
    boundary.data!.runs = [nativeRun({ status: 'APPROVED', approvedAt: '2026-10-12T16:00:00Z' })];
    for (const html of [home(), onlyB(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="home" current={current} />)), review()]) {
      expect(html).toContain('What’s next');
      expect(html).toContain('<li>Pay each person their net pay.</li><li>Send withheld taxes and employer contributions.</li><li>Keep the company summary for your accountant.</li>');
      expect(html).toContain('NEVORA doesn’t pay anyone or send taxes.');
    }
  });
  it('leaves the hand-off off a correction and the payroll it replaced, and says to settle any difference (PY-3, PY-11)', () => {
    const original = nativeRun({ id: 'fictional-original', status: 'APPROVED' });
    const correction = nativeRun({ status: 'APPROVED', correctionOf: 'fictional-original' });
    boundary.data!.runs = [original, correction];
    const html = review();
    expect(html).not.toContain('What’s next');
    expect(html).toContain('If pay changes, settle the difference with the employee outside NEVORA.');
    expect(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="review" runId="fictional-original" />)).not.toContain('What’s next');
  });
  it('says what approving does and doesn’t do before the Approve button (PY-4, PY-9)', () => {
    boundary.data!.runs = [nativeRun()];
    const native = review();
    expect(native.indexOf('NEVORA calculated these amounts from your setup. Check withholding with your accountant.')).toBeGreaterThan(0);
    expect(native).toContain('Approving doesn’t pay anyone or send taxes. Pay statements are shared with each employee once they’re ready.');
    expect(native.indexOf('Approving doesn’t pay anyone')).toBeLessThan(native.search(/<button[^>]*>Approve payroll/));
    boundary.data!.runs = [importRun()];
    const imported = review();
    expect(imported).toContain('<p>Approving doesn’t pay anyone or send taxes.</p>');
    expect(imported).not.toContain('NEVORA calculated these amounts');
    expect(imported).not.toContain('once they’re ready');
  });
  it('doesn’t offer payment instructions on a correction, and says why (PY-17)', () => {
    boundary.data!.runs = [importRun({ status: 'APPROVED' })];
    expect(review()).toContain('Prepare payment instructions');
    boundary.data!.runs = [importRun({ status: 'APPROVED', correctionOf: 'fictional-original' })];
    const html = review();
    expect(html).not.toContain('Prepare payment instructions');
    expect(html).toContain('NEVORA doesn’t make payment instructions for a correction.');
  });
  it('opens Time exports at “Who’s included” from the blocker, in plain words (AR-4)', () => {
    boundary.data!.runs = [nativeRun({ status: 'BLOCKED', rows: null, totals: null, reviewToken: null, exceptions: ['POPULATION_DISPOSITION:E1', 'RULESET_NOT_APPLICABLE:E1'] })];
    const html = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="fix" runId={nativeRun().id} names={{ E1: 'Fictional Person' }} />);
    expect(html).toContain('Choose what to do with 1 person this period');
    expect(html).toMatch(/href="\/app\/payroll-export\?start=2026-10-05&amp;end=2026-10-11#who-is-included">Choose who’s included</);
    // PY-10: a blocker NEVORA can't fix in the app names support, never its code.
    expect(html).toContain('NEVORA can’t calculate paydays in that year yet. Contact support.');
    expect(html).toMatch(/href="\/app\/help">Contact support</);
    expect(html).not.toContain('RULESET_NOT_APPLICABLE');
    expect(html).not.toContain('population');
  });
});

