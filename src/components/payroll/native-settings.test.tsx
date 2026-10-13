import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PayrollSettings } from './payroll-settings';

const boundary = vi.hoisted(() => ({ native: true, loading: false }));
vi.mock('./use-payroll', () => ({
  usePayrollResource: () => ({ loading: boundary.loading, error: '', reload: async () => {}, data: { capabilities: { canConfigure: true, internalCalculatorAvailable: boundary.native }, revisions: [], exceptions: [], grants: [], employees: [], futureDraftImpact: [] } }),
  usePayrollOperation: () => ({ busy: false, pending: null, locked: false, resuming: false, message: '', error: '', revisionConflict: false, submit: async () => {} }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/app/settings/payroll' }));
beforeEach(() => { boundary.native = true; boundary.loading = false; });
it('explains native company preferences and automatic publication without asking for provider activation', () => {
  const html = renderToStaticMarkup(<PayrollSettings recoveryScope="fictional-owner" />);
  expect(html).toContain('Native payroll uses verified recorded time');
  expect(html).toContain('automatically after generation');
  expect(html).toContain('Save company preferences');
  expect(html).toContain('specific payroll locations');
});
it('keeps the historical provider preference workflow available before native adoption', () => {
  boundary.native = false;
  expect(renderToStaticMarkup(<PayrollSettings recoveryScope="fictional-owner" />)).toContain('imported provider amounts remain the authority');
});
it('waits for fresh Owner access before presenting saved company preferences', () => {
  boundary.loading = true;
  const html = renderToStaticMarkup(<PayrollSettings recoveryScope="fictional-owner" />);
  expect(html).toContain('Loading payroll settings');
  expect(html).not.toContain('Save company preferences');
});
