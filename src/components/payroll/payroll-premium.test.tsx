import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PayrollRunsResponse } from '@/lib/payroll/contracts';
import type { OpenPayPeriod } from '@/lib/payroll/pay-calendar.server';
import { nativeCapabilities, nativeRun, statement } from './native-ui-fixture.test-support';
import { PayrollRuns } from './payroll-runs';
import { payrollTabs } from './payroll-tabs';
import { problemsMessage } from './form-keys';
import { onlyB, withoutB } from '../owner-b/test-support';

// Owner premium (Oct 31) presentation only: next-step labels, unpaid periods first, Pay history identity, tabs.
const boundary = rs.hoisted(() => ({ data: null as PayrollRunsResponse | null, statements: [] as unknown[] }));
rs.mock('./use-payroll', () => ({ PAYROLL_SIGNED_OUT: 'Your session ended. Sign in again to see payroll.',
  usePayrollResource: (path: string) => ({ loading: false, error: '', data: path === '/api/payroll/portal-statements' ? { version: 'PAYROLL_PORTAL_STATEMENTS_V1', statements: boundary.statements } : boundary.data, reload: async () => {} }),
  usePayrollOperation: () => ({ busy: false, pending: null, resuming: false, message: '', error: '', revisionConflict: false, submit: async () => {}, receipt: null }),
}));
rs.mock('next/navigation', () => ({ usePathname: () => '/app/payroll', useRouter: () => ({ push: () => {}, replace: () => {} }) }));

const current: OpenPayPeriod = { period: { startDate: '2026-10-05', endDate: '2026-10-11' }, payday: '2099-10-16', frequency: 'WEEKLY' } as OpenPayPeriod;
const missing = { period: { startDate: '2026-09-21', endDate: '2026-09-27' }, payday: '2026-09-29', settingsRevision: 1, state: 'MISSING', issues: [] };
const backlog = { asOfDate: '2026-10-30', rangeStart: '2026-09-01', rangeEnd: '2026-10-30', missingCount: 3, remainingCount: 0, returnedCount: 3, ambiguousCount: 0, overflow: false };
// The corporate layout (tablets and desktop); the Direction B phone screen is tested in owner-b/owner-b.test.tsx.
const home = (extra: Partial<Parameters<typeof PayrollRuns>[0]> = {}) => withoutB(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="home" current={current} canEditSettings {...extra} />));
beforeEach(() => { boundary.data = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [], jobs: [] }; boundary.statements = []; });

describe('Payroll next step (A2)', () => {
  it('prepares when no draft exists, and the label matches the Prepare payroll page', () => {
    const html = home();
    // Nov 1 upscale: Up next is one row that opens the step (no button); the step is in its name.
    // Sweep 1: named by its own text (no aria-label); the step it opens is read, not drawn.
    expect(html).toMatch(/<li class="c-payroll__upnext"><a class="c-row" href="\/app\/payroll\/prepare">/);
    expect(html).toMatch(/<li class="c-payroll__upnext">.*?<span class="c-sr">\. Prepare payroll<\/span>/);
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
    expect(html).toContain('Oldest is <span class="c-num">Sep 21–27</span>. Scheduled payday was <span class="c-num">Tue, Sep 29</span>.');
    // Nov 1 upscale: the page's one filled button, which opens the period on Prepare payroll (it never prepares anything
    // by itself).
    expect(html).toMatch(/class="c-btn c-btn--md c-pay__unpaid-go" href="\/app\/payroll\/prepare#unpaid-2026-09-21">Prepare Sep 21–27</);
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
    // One filled button on the page (the oldest period's); the current week's Prepare is a teal text action. Phase 8
    // (a.md #35): each Prepare says its period ("Prepare Sep 21 – 27"), as Payroll's own button does.
    const buttons = html.match(/<button[^>]*>Prepare [A-Z][a-z]{2} \d/g) ?? [];
    expect(buttons.length).toBe(2);
    expect(html).toContain('>Prepare Sep 21–27<');
    expect(html).toContain('>Prepare Oct 5–11<');
    // Phase 8 (a.md #15): a period's payday comes from the pay schedule, and a passed one says so.
    expect(html).toContain('Scheduled payday was <span class="c-num">');
    expect(buttons.filter(button => /class="c-btn[ "]/.test(button))).toHaveLength(1);
    expect(buttons.find(button => /class="c-btn[ "]/.test(button))).toContain('aria-label="Prepare Sep 21–27 payroll"');
    expect(buttons.find(button => button.includes('c-pay__quiet-go'))).toContain('aria-label="Prepare Oct 5–11 payroll"');
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
    // Phase 8 (a.md #15): a date from the pay schedule is the "Scheduled payday".
    expect(html).toMatch(/ · Scheduled payday <span class="c-num">[A-Z][a-z]{2}, Oct 16<\/span>/);
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
    // Premium pass: the facts are the kit's BSegs; "Payday" keeps its date on one line and the dot belongs to the next fact.
    expect(html).toContain('Payday\u00a0<span class="c-num">Fri,\u00a0Oct\u00a016</span></span></span><span class="b-segs__i"><span class="b-sr"> · </span>Correction');
    expect(html).toContain('Replaced by a correction');
    // One date format: "Oct 5 – 11", never "Oct 5 – Oct 11".
    expect(html).not.toContain('Oct 5 – Oct 11');
    // The correction comes before the statement it replaces.
    const statements = html.slice(html.indexOf('id="payroll-statements"'));
    expect(statements.indexOf('· Correction</span>')).toBeLessThan(statements.indexOf('Replaced by a correction'));
    // One teal action per row (View); Download is a labelled neutral pill (Phase 8, a.md #21), as DocumentRow draws it.
    expect(html.match(/c-pay__stmt-view/g)?.length).toBe(2);
    expect(html.match(/c-pay__download"[^>]*>(?:<svg[\s\S]*?<\/svg>)Download</g)?.length).toBe(2);
    expect(html).not.toContain('c-pay__icon-btn');
    // Two payroll rows for one week differ at a glance: the correction carries a "Correction" pill (Round 5, as on Payroll).
    expect(html).toMatch(new RegExp('Oct 5–11' + '[\\s\\S]*?>Correction<'));
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
    expect(html).toMatch(/<span class="c-title__sub">Oct 5–11 · Payday [A-Z][a-z]{2}, Oct 16 · Approved [A-Z][a-z]{2} 12<\/span>/);
    expect(html).not.toContain('c-note--center');
    // The action rows end in chevrons.
    expect(html).toMatch(/<span class="c-row__title">Fix this payroll<\/span>.*?<svg[^>]*class="c-chev"/);
  });
});

describe('Payroll tabs and forms', () => {
  it('leaves Timecards out and calls the runs page Pay runs, under the band title Payroll', () => {
    const tabs = payrollTabs('OWNER', nativeCapabilities);
    expect(tabs?.map(item => item.label)).toEqual(['Pay runs', 'Time exports', 'Settings']);
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
    // Final regression review #4: the kicker is one facts line (BSegs); the dot belongs to the fact after it.
    expect(html).toContain('<span class="b-segs__i">Up next</span><span class="b-segs__i"><span class="b-sr"> · </span>Weekly payroll</span>');
    expect(html).toMatch(/class="b-step b-step--now"><span class="b-step__n" aria-hidden="true">1<\/span>/);
    // Phase 8 (a.md #35): before a draft exists the action names its period.
    expect(html).toMatch(/class="b-btn b-btn--teal b-btn--full b-btn--big"[^>]*href="\/app\/payroll\/prepare"[^>]*>Prepare Oct 5–11<\/a>/);
    // Phase 8 (a.md #28): no tile is a bare dash before the payroll holds amounts.
    expect(html).toContain('>Scheduled payday</span>');
    expect(html).not.toContain('>Gross</span>');
    expect(html).not.toMatch(/b-live__v">—</);
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
    expect(html).toMatch(/class="b-btn b-btn--teal"[^>]*href="\/app\/payroll\/prepare#unpaid-2026-09-21"[^>]*>Prepare Sep 21–27</);
    expect(html).toMatch(/<a class="b-link c-pay__steplink"[^>]*href="\/app\/payroll\/prepare"[^>]*>Prepare Oct 5–11<\/a>/);
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


// Backend contract (Nov 15, 2026): the runs read names the current period; a correction carries correctionDelta.
describe('Payroll reads the current period and correction differences from the server', () => {
  it('uses currentPeriod for Up next and links to that period’s timecards with the day approval opens', () => {
    boundary.data = { ...boundary.data!, currentPeriod: { period: { startDate: '2026-11-09', endDate: '2026-11-15' }, payday: '2026-11-20', asOfDate: '2026-11-15', timeZone: 'America/Puerto_Rico', settingsRevision: 2 } };
    const html = home().replace(/[   ]/g, ' ');
    expect(html).toContain('Nov 9–15');
    expect(html).not.toContain('Oct 5 – 11');
    expect(html).toContain('href="/app/timecards?start=2026-11-09&amp;end=2026-11-15"');
    expect(html).toContain('Can be approved from Mon, Nov 16');
    // The day after the period ends, the line says so, without claiming what is still left to approve.
    boundary.data = { ...boundary.data!, currentPeriod: { ...boundary.data!.currentPeriod!, asOfDate: '2026-11-16' } };
    expect(home()).toContain('>Pay period ended<');
    expect(home()).not.toContain('Approve this period');
  });
  it('null means no pay schedule; an older read without the field keeps the route’s period', () => {
    boundary.data = { ...boundary.data!, currentPeriod: null };
    expect(home()).toContain('No pay schedule yet');
    expect(home()).not.toContain('/app/timecards?start=');
    boundary.data = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [], jobs: [] };
    expect(home().replace(/[   ]/g, ' ')).toContain('href="/app/timecards?start=2026-10-05&amp;end=2026-10-11"');
  });
  it('a correction shows the signed net pay differences on statements, never as money paid', () => {
    const original = nativeRun({ id: 'run-original', status: 'APPROVED' });
    const correction = nativeRun({ id: 'run-correction', correctionOf: 'run-original', correctionDelta: { totalNetMinor: '-250', employees: [
      { employeeId: 'E1', previousNetMinor: '81200', netMinor: '82450', deltaNetMinor: '1250' },
      { employeeId: 'E2', previousNetMinor: '50000', netMinor: '48500', deltaNetMinor: '-1500' },
      { employeeId: 'E3', previousNetMinor: '30000', netMinor: '30000', deltaNetMinor: '0' }] } });
    boundary.data = { ...boundary.data!, runs: [original, correction] };
    const html = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="review" runId="run-correction" names={{ E1: 'Fictional One' }} />).replace(/ /g, ' ');
    expect(html).toContain('Net pay on statements: −$2.50</b> across 2 people');
    expect(html).toContain('<span>Fictional One</span><span class="c-num">was $812.00 · now $824.50</span><b class="c-num">+$12.50</b>');
    expect(html).toContain('<span>A team member</span><span class="c-num">was $500.00 · now $485.00</span><b class="c-num">−$15.00</b>');
    expect(html).not.toContain('$300.00');
    expect(html).toContain('settle the difference with the employee outside NEVORA');
    expect(html).not.toMatch(/paid to|remitted|deposited/i);
    // Without the comparison (null: both populations aren't available), nothing is estimated.
    boundary.data = { ...boundary.data!, runs: [original, { ...correction, correctionDelta: null }] };
    expect(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="review" runId="run-correction" />)).not.toContain('Net pay on statements');
  });
});

it('the phone steps card lists Timecards as a step line before its action, and a non-zero total with no per-person change says no more', () => {
  boundary.data = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [], jobs: [], currentPeriod: { period: { startDate: '2026-11-09', endDate: '2026-11-15' }, payday: '2026-11-20', asOfDate: '2026-11-15', timeZone: 'America/Puerto_Rico', settingsRevision: 2 } };
  const phone = onlyB(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="home" current={current} canEditSettings />));
  const card = phone.slice(phone.indexOf('id="b-payroll-steps"'));
  expect(card).toMatch(/<a class="b-step b-step--link"[^>]*href="\/app\/timecards\?start=2026-11-09&amp;end=2026-11-15"/);
  // Sweep 1: its name is its visible text (Timecards, then the line), with no aria-label that differs from it.
  expect(card.replace(/[\u00a0\u2009\u202f]/g, ' ')).toContain('Can be approved from Mon, Nov 16');
  expect(card).not.toMatch(/<a class="b-step b-step--link"[^>]*aria-label=/);
  expect(card.indexOf('b-step--link')).toBeLessThan(card.search(/>Prepare [A-Z][a-z]{2} \d+–\d+<\/a>/));
  expect(card.search(/>Prepare [A-Z][a-z]{2} \d+–\d+<\/a>/)).toBeGreaterThan(0);
  const original = nativeRun({ id: 'run-original', status: 'APPROVED' });
  boundary.data = { ...boundary.data, runs: [original, nativeRun({ id: 'run-c', correctionOf: 'run-original', correctionDelta: { totalNetMinor: '500', employees: [{ employeeId: 'E1', previousNetMinor: '100', netMinor: '100', deltaNetMinor: '0' }] } })] };
  const html = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="review" runId="run-c" />).replace(/\u00a0/g, ' ');
  expect(html).toContain('Net pay on statements: +$5.00</b></p>');
  expect(html).not.toContain('no one’s net pay changes');
});

it('batch 1 item 1: a payroll a correction replaced says so, opens the correction, and isn’t fixed or paid again', () => {
  const original = nativeRun({ id: 'run-original', status: 'APPROVED' });
  const correction = nativeRun({ id: 'run-fix', status: 'APPROVED', correctionOf: 'run-original' });
  boundary.data = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [correction, original], jobs: [] };
  const html = withoutB(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="review" runId="run-original" />));
  expect(html).toContain('Replaced by a correction');
  expect(html).toContain('href="/app/payroll/review?run=run-fix"');
  expect(html).not.toContain('Fix this payroll');
  expect(html).not.toContain('Prepare payment instructions');
  const fix = withoutB(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="review" runId="run-fix" />));
  expect(fix).not.toContain('Replaced by a correction');
});

it('batch 1 item 3: on the phone, a replaced payroll in Recent payrolls says so once, in its line', () => {
  const week = { period: { startDate: '2026-09-28', endDate: '2026-10-04' }, payday: '2026-10-09' };
  const original = nativeRun({ id: 'run-original', status: 'APPROVED', ...week });
  const correction = nativeRun({ id: 'run-fix', status: 'APPROVED', correctionOf: 'run-original', ...week });
  boundary.data = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [correction, original], jobs: [] };
  const phone = onlyB(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="home" current={current} canEditSettings />));
  const recent = phone.slice(phone.indexOf('id="b-payroll-recent"'));
  expect(recent).toContain('Replaced by a correction');
  expect(recent).not.toMatch(/b-chip[^>]*>(?:<[^>]+>)*Replaced</);
});

it('batch 1 item 2: People for a replaced payroll says so in its period line', () => {
  const original = nativeRun({ id: 'run-original', status: 'APPROVED' });
  const correction = nativeRun({ id: 'run-fix', status: 'APPROVED', correctionOf: 'run-original' });
  boundary.data = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [correction, original], jobs: [] };
  expect(withoutB(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="people" runId="run-original" />))).toContain('· Replaced by a correction');
  expect(withoutB(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="people" runId="run-fix" />))).not.toContain('Replaced by a correction');
  // Batch 1 item 3: the approved group title stays, and "Net pay" is said once as its column label, not on each row.
  const people = withoutB(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="people" runId="run-fix" />));
  expect(people).toContain('>Employee amounts</h2><div class="c-pay__sec-aside"><span class="c-pay__aside">Net pay</span></div>');
  expect(people).not.toContain('<span class="c-row__detail"><span>Net pay</span></span>');
});

it('keeps an independently blocked publication failed and withholds retry and sharing',()=>{
 const run=nativeRun({status:'APPROVED'}), job={id:'fictional-publication',runId:run.id,kind:'PUBLISH' as const,status:'FAILED' as const,attempts:1,error:'INDEPENDENT_PAYROLL_APPROVAL_REQUIRED'};
 boundary.data={version:'PAYROLL_API_V1',capabilities:nativeCapabilities,runs:[run],jobs:[job]};
 const html=renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="review" runId={run.id}/>);
 expect(html).toContain('Ask another authorized payroll approver');expect(html).not.toContain('Retry pay statement sharing');
 expect(html).not.toContain('INDEPENDENT_PAYROLL_APPROVAL_REQUIRED');expect(html).not.toContain('>Share pay statements</button>');
});
