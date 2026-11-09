import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PayrollSettings } from './payroll-settings';

const boundary = vi.hoisted(() => ({ native: true, loading: false }));
vi.mock('./use-payroll', () => ({ PAYROLL_SIGNED_OUT: 'Your session ended. Sign in again to see payroll.',
  usePayrollResource: (path: string) => ({ loading: boundary.loading, error: '', reload: async () => {}, data: path === '/api/payroll/runs' ? {version:'PAYROLL_API_V1',capabilities:{canReview:true},runs:[],jobs:[]} : path === '/api/payroll/native-profiles' ? {version:'PAYROLL_NATIVE_PROFILES_V1',configurations:[],openingYtd:[],managerScopes:[]} : { capabilities: { canConfigure: true, internalCalculatorAvailable: boundary.native }, revisions: [], exceptions: [], grants: [], employees: [], futureDraftImpact: [] } }),
  usePayrollOperation: () => ({ busy: false, pending: null, locked: false, resuming: false, message: '', error: '', revisionConflict: false, submit: async () => {} }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/app/settings/payroll' }));
beforeEach(() => { boundary.native = true; boundary.loading = false; });
it('explains native company preferences and automatic publication without asking for provider activation', () => {
  const html = renderToStaticMarkup(<PayrollSettings recoveryScope="fictional-owner" nativeSources={{employees:[],locations:[],breakTypes:[]}} />);
  expect(html).toContain('Native payroll uses verified recorded time');
  expect(html).toContain('automatically after generation');
  expect(html).toContain('Save company preferences');
  expect(html).toContain('specific payroll locations');
  expect(html).not.toContain('name="bankProfile"');
  expect(html).not.toContain('name="sourceProvider"');
  expect(html).not.toContain('name="publish"');
  expect(html).toMatch(/Reason for change[\s\S]*Save company preferences[\s\S]*<\/div><\/fieldset><\/form>/);
});
it('keeps the historical provider preference workflow available before native adoption', () => {
  boundary.native = false;
  const html = renderToStaticMarkup(<PayrollSettings recoveryScope="fictional-owner" nativeSources={{employees:[],locations:[],breakTypes:[]}} />);
  expect(html).toContain('imported provider amounts remain the authority');
  expect(html).toContain('name="bankProfile"');
  expect(html).toContain('name="sourceProvider"');
  expect(html).toContain('name="publish"');
  expect(html).toMatch(/Reason for change[\s\S]*Save company preferences[\s\S]*<\/div><\/fieldset><\/form>/);
});
it('waits for fresh Owner access before presenting saved company preferences', () => {
  boundary.loading = true;
  const html = renderToStaticMarkup(<PayrollSettings recoveryScope="fictional-owner" nativeSources={{employees:[],locations:[],breakTypes:[]}} />);
  expect(html).toContain('Loading payroll settings');
  expect(html).not.toContain('Save company preferences');
});
