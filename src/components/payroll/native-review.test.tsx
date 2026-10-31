import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PayrollRunsResponse } from '@/lib/payroll/contracts';
import { nativeCapabilities, nativeRun, statement } from './native-ui-fixture.test-support';
import { PayrollRuns } from './payroll-runs';

const boundary = vi.hoisted(() => ({ data: null as PayrollRunsResponse | null, loading: false, error: '' }));
// Only the HTTP/lifecycle boundary is substituted for static render tests.
// Actual operations and lifecycle are exercised in the owned browser harness.
vi.mock('./use-payroll', () => ({ PAYROLL_SIGNED_OUT: 'Your session ended. Sign in again to see payroll.',
  usePayrollResource: (path: string) => ({ ...boundary, data: path === '/api/payroll/portal-statements' ? { version: 'PAYROLL_PORTAL_STATEMENTS_V1', statements: [] } : boundary.data, reload: async () => {} }),
  usePayrollOperation: () => ({ busy: false, pending: null, resuming: false, message: '', error: '', revisionConflict: false, submit: async () => {}, receipt: null }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/app/payroll/review', useRouter: () => ({ push: () => {}, replace: () => {} }) }));
const RUN = '18d8e87c-9765-4dbd-9f4b-691b045c8b73';
// Release 1: the review, its fix list and each person's amounts are separate pages of the same workspace.
function render(view: 'review' | 'fix' | 'people' = 'review') { return renderToStaticMarkup(<PayrollRuns recoveryScope="fictional-scope" view={view} runId={RUN} names={{ E1: 'Fictional Employee' }} />); }
beforeEach(() => { boundary.data = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [nativeRun()], jobs: [] }; boundary.loading = false; boundary.error = ''; });

describe('source-aware payroll review presentation', () => {
  it('renders missing facts as a blocked prerequisite with no import or fabricated money', () => {
    boundary.data!.runs = [nativeRun({ status: 'BLOCKED', rows: null, totals: null, reviewToken: null, exceptions: ['WAGE_PROFILE_REQUIRED:E1'], nativeCalculation: { version: 'NATIVE_RUN_V1', state: 'blocked', ruleRevision: 1, templateVersion: 'NEVORA_NATIVE_PAYSTUB_PDF_V1', employees: [] } })];
    const review = render();
    expect(review).toContain('1 thing to fix before approving');
    expect(review).toContain('Stops payroll');
    expect(review).toContain('Fix the thing above to approve.');
    expect(review).not.toContain('Import provider amounts');
    expect(review).not.toContain('$0.00');
    expect(review).not.toContain('I reviewed revision');
    const fix = render('fix');
    expect(fix).toContain('wage profile');
    expect(fix).toContain('For Fictional');
    expect(fix).toContain('Open payroll setup');
    expect(fix).toContain('Recalculate draft');
    expect(fix).not.toContain('Finalized recorded time');
  });
  it('shows saved recorded-time hours, wage rates, tax bases and YTD for the ready revision', () => {
    const html = render('people');
    expect(html).toContain('8 h');
    expect(html).toContain('$20.00');
    expect(html).toContain('Taxable pay');
    expect(html).toContain('Year to date');
    expect(html).toContain('Source and calculation details');
    expect(html).not.toContain('Import provider amounts');
  });
  it('asks for approval of the exact native revision without referring to provider amounts', () => {
    const html = render();
    expect(html).toContain('I reviewed revision 2, the recorded-time calculation');
    expect(html).toContain('Approve payroll');
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
    expect(html).toContain('Correction of an earlier payroll');
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
    for (const view of ['review', 'people'] as const) {
      const html = render(view);
      expect(html).toContain('Loading payroll');
      expect(html).not.toContain('Fictional Employee');
      expect(html).not.toContain('$160.00');
    }
  });
  it('does not present private run data after review capability is revoked', () => {
    boundary.data!.capabilities = { ...nativeCapabilities, canReview: false, canApprove: false };
    expect(render('people')).not.toContain('Fictional Employee');
    expect(render()).not.toContain('$160.00');
  });
});
