import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PayrollStepper, payrollSteps } from './payroll-stepper';

const statement = (published: boolean) => ({ id: published ? 'p' : 'u', kind: 'EMPLOYEE_STATEMENT' as const, employeeId: 'e', filename: 's.pdf', sha256: 'x', downloadUrl: '/d', published });
const run = (extra: Partial<Parameters<typeof payrollSteps>[0]> = {}) => ({ status: 'REVIEW_REQUIRED' as const, exceptions: [], rows: [], totals: {} as never, documents: [], ...extra });
const states = (value: Parameters<typeof payrollSteps>[0]) => payrollSteps(value).map(step => `${step.id}:${step.state}`).join(' ');

describe('payroll steps', () => {
  it('describes native calculation and automatic publication without requesting a provider import', () => {
    const native = run({ sourceAuthority: 'NATIVE_RECORDED_TIME' });
    expect(payrollSteps(native)[1].hint).toBe('Calculated from recorded time');
    expect(payrollSteps({ ...native, status: 'BLOCKED', rows: null, totals: null })[1].hint).toBe('Recalculate after resolving prerequisites');
    expect(payrollSteps({ ...native, status: 'APPROVED', documents: [statement(false)] })[4].hint).toBe('Statements publish automatically after verification');
  });
  it('blocks on unfinalized time and waits for amounts', () => {
    expect(states(run({ status: 'WAITING_FOR_AMOUNTS', rows: null, totals: null, exceptions: ['WAITING_FOR_AMOUNTS', 'TIME_NOT_FINALIZED:a', 'TIME_NOT_FINALIZED:b'] })))
      .toBe('hours:blocked amounts:upcoming review:upcoming approve:upcoming publish:upcoming');
    expect(payrollSteps(run({ exceptions: ['TIME_NOT_FINALIZED:a'] }))[0].hint).toBe('1 timecard to finalize');
    expect(states(run({ status: 'WAITING_FOR_AMOUNTS', rows: null, totals: null, exceptions: ['WAITING_FOR_AMOUNTS'] })))
      .toBe('hours:done amounts:current review:upcoming approve:upcoming publish:upcoming');
  });
  it('moves from review to approve to publish on the run state alone', () => {
    expect(states(run({ exceptions: ['POPULATION_DISPOSITION:x'] }))).toBe('hours:done amounts:done review:blocked approve:upcoming publish:upcoming');
    expect(states(run())).toBe('hours:done amounts:done review:done approve:current publish:upcoming');
    expect(states(run({ status: 'APPROVED', documents: [statement(false), statement(true)] }))).toBe('hours:done amounts:done review:done approve:done publish:current');
    expect(payrollSteps(run({ status: 'APPROVED', documents: [statement(false)] }))[4].hint).toBe('1 statement to publish');
    expect(payrollSteps(run({ status: 'APPROVED', documents: [] }))[4]).toMatchObject({ state: 'current', hint: 'Statements are being prepared' });
    expect(payrollSteps(run())[4].hint).toBe('Statements appear after approval');
    expect(states(run({ status: 'APPROVED', documents: [statement(true)] }))).toBe('hours:done amounts:done review:done approve:done publish:done');
  });
  it('marks the step to work on for assistive tech and keeps correction notes out of blocking', () => {
    const html = renderToStaticMarkup(<PayrollStepper run={run({ exceptions: ['CORRECTION_REASON:typo'] })} />);
    expect(html).toMatch(/<li data-state="current" aria-current="step">.*Approve/);
    expect(html).toContain('Approve<span class="sr-only">: in progress. Approve this revision.</span>');
  });
});
