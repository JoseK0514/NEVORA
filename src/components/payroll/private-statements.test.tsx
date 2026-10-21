import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentLink } from './payroll-ui';
import { MyPay } from './my-pay';
import { PayrollRuns } from './payroll-runs';
import { nativeRun, statement } from './native-ui-fixture.test-support';

const boundary = vi.hoisted(() => ({ loading: false, error: '', statements: [] as unknown[], runs: [] as unknown[] }));
vi.mock('./use-payroll', () => ({ PAYROLL_SIGNED_OUT: 'Your session ended. Sign in again to see payroll.',
  usePayrollResource: (path: string) => ({ data: path === '/api/payroll/runs' ? { version: 'PAYROLL_API_V1', capabilities: { enabled: true, canConfigure: true, canReview: true, canApprove: true, internalCalculatorAvailable: true }, runs: boundary.runs, jobs: [] } : { statements: boundary.statements }, loading: boundary.loading, error: boundary.error, reload: async () => {} }),
  usePayrollOperation: () => ({ busy: false, pending: null, resuming: false, message: '', error: '', revisionConflict: false, submit: async () => {}, receipt: null }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/app/payroll' }));
beforeEach(() => { boundary.loading = false; boundary.error = ''; boundary.statements = [statement]; boundary.runs = [nativeRun({ status: 'APPROVED', documents: [statement], correctionOf: 'fictional-original', nativeCorrection: { rootRunId: 'fictional-original', reason: 'Fictional payroll correction' } })]; });

describe('private employee statement presentation', () => {
  it('provides separate safe inline and attachment destinations for identical document identity', () => {
    const html = renderToStaticMarkup(<DocumentLink document={{ ...statement, downloadUrl: 'https://foreign.invalid/download', viewUrl: 'https://foreign.invalid/view' }} />);
    expect(html).toContain(`href="${statement.downloadUrl}"`);
    expect(html).toContain(`href="${statement.viewUrl}"`);
    expect(html).toContain('View');
    expect(html).toContain('Download');
    expect(html).not.toContain('foreign.invalid');
  });
  it('does not claim an unpublished private document is available in the employee account', () => {
    const html = renderToStaticMarkup(<DocumentLink document={{ ...statement, published: false }} />);
    expect(html).toContain('not published');
    expect(html).not.toContain('Published to employee');
  });
  it('preserves the period/payday in own published history with a viewing action', () => {
    const html = renderToStaticMarkup(<MyPay />);
    // Signature My pay (approved): the period in short form and the payday as a long date.
    expect(html).toContain('Oct 5–11');
    expect(html).toContain('Payday </span>October 16');
    expect(html).toContain(statement.viewUrl);
  });
  it('clears the own statement identity while current private access is loading', () => {
    boundary.loading = true;
    const html = renderToStaticMarkup(<MyPay />);
    expect(html).toContain('Loading your statements');
    expect(html).not.toContain(statement.id);
  });
  it('shows current scoped employee history and preserves the linked correction context', () => {
    const html = renderToStaticMarkup(<PayrollRuns recoveryScope="fictional-owner" />);
    expect(html).toContain('Private employee statements');
    expect(html).toContain('Fictional payroll correction');
    expect(html).toContain(statement.viewUrl);
  });
  it('distinguishes empty own history from a failed private read', () => {
    boundary.statements = [];
    expect(renderToStaticMarkup(<MyPay />)).toContain('No published statements yet');
    boundary.error = 'Fictional private access unavailable';
    expect(renderToStaticMarkup(<MyPay />)).toContain('Statements unavailable');
    expect(renderToStaticMarkup(<MyPay />)).not.toContain('No published statements yet');
  });
});
