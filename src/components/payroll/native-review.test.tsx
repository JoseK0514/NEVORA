import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PayrollRunsResponse } from '@/lib/payroll/contracts';
import { nativeCapabilities, nativeRun, statement } from './native-ui-fixture.test-support';
import { PayrollRuns } from './payroll-runs';

const boundary = vi.hoisted(() => ({ data: null as PayrollRunsResponse | null, loading: false, error: '' }));
// Only the HTTP/lifecycle boundary is substituted for static render tests.
// Actual operations and lifecycle are exercised in the owned browser harness.
vi.mock('./use-payroll', () => ({
  usePayrollResource: (path: string) => ({ ...boundary, data: path === '/api/payroll/portal-statements' ? { version: 'PAYROLL_PORTAL_STATEMENTS_V1', statements: [] } : boundary.data, reload: async () => {} }),
  usePayrollOperation: () => ({ busy: false, pending: null, resuming: false, message: '', error: '', revisionConflict: false, submit: async () => {}, receipt: null }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/app/payroll' }));
function render() { return renderToStaticMarkup(<PayrollRuns recoveryScope="fictional-scope" />); }
beforeEach(() => { boundary.data = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [nativeRun()], jobs: [] }; boundary.loading = false; boundary.error = ''; });

describe('source-aware payroll review presentation', () => {
  it('renders missing facts as a blocked prerequisite with no import or fabricated money', () => {
    boundary.data!.runs = [nativeRun({ status: 'BLOCKED', rows: null, totals: null, reviewToken: null, exceptions: ['WAGE_PROFILE_REQUIRED:E1'], nativeCalculation: { version: 'NATIVE_RUN_V1', state: 'blocked', ruleRevision: 1, templateVersion: 'NEVORA_NATIVE_PAYSTUB_PDF_V1', employees: [] } })];
    const html = render();
    expect(html).toContain('Needs attention');
    expect(html).toContain('wage profile');
    expect(html).toContain('Recalculate draft');
    expect(html).not.toContain('Import provider amounts');
    expect(html).not.toContain('$0.00');
    expect(html).not.toContain('Approve revision');
    expect(html).not.toContain('Finalized recorded time');
  });
  it('shows saved recorded-time hours, wage rates, tax bases and YTD for the ready revision', () => {
    const html = render();
    expect(html).toContain('Finalized recorded time');
    expect(html).toContain('8 h');
    expect(html).toContain('$20.00');
    expect(html).toContain('Taxable pay');
    expect(html).toContain('Year to date');
    expect(html).toContain('Source and calculation details');
    expect(html).not.toContain('Import provider amounts');
  });
  it('asks for approval of the exact native revision without referring to provider amounts', () => {
    const html = render();
    expect(html).toContain('Approve revision 2');
    expect(html).not.toContain('the provider amounts');
    expect(html).toContain('recorded-time calculation');
  });
  it('separates approved native payroll from automatic publication and exposes no bank/payment export', () => {
    boundary.data!.runs = [nativeRun({ status: 'APPROVED', approvedBy: 'fictional-owner', approvedAt: '2026-10-12T16:00:00Z', documents: [{ ...statement, published: false }] })];
    const html = render();
    expect(html).toContain('Statements not published yet');
    expect(html).toContain('automatically');
    expect(html).not.toContain('Publish employee statements');
    expect(html).not.toContain('Prepare payment instructions');
    expect(html).toContain('Create correction');
  });
  it('preserves linked corrections without rewriting the original review', () => {
    boundary.data!.runs = [nativeRun({ correctionOf: 'original-run', nativeCorrection: { rootRunId: 'original-run', reason: 'Fictional recorded-time correction' } })];
    const html = render();
    expect(html).toContain('Fictional recorded-time correction');
    expect(html).toContain('original-run');
  });
  it('keeps historical provider imports readable alongside native capability', () => {
    boundary.data!.runs = [nativeRun({ sourceAuthority: 'PROVIDER_IMPORT', nativeCalculation: undefined, sourceName: 'Historical fictional accountant' })];
    expect(render()).toContain('Import provider amounts');
    expect(render()).toContain('Historical fictional accountant');
    expect(render()).toContain('Historical provider runs retain their imported amounts');
    expect(render()).not.toContain('a statutory calculator is unavailable');
  });
  it('clears private amounts while current access is reloading', () => {
    boundary.loading = true;
    const html = render();
    expect(html).toContain('Loading payroll');
    expect(html).not.toContain('Fictional Employee');
    expect(html).not.toContain('$160.00');
  });
  it('does not present private run data after review capability is revoked', () => {
    boundary.data!.capabilities = { ...nativeCapabilities, canReview: false, canApprove: false };
    expect(render()).not.toContain('Fictional Employee');
    expect(render()).not.toContain('$160.00');
  });
});
