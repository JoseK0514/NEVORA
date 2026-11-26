import { beforeEach, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { PortalLangProvider } from '@/lib/i18n/portal-lang';
import { PayrollSettings } from './payroll-settings';

const boundary = rs.hoisted(() => ({ native: true, loading: false, showDraft: false }));
rs.mock('./use-payroll', () => ({ PAYROLL_SIGNED_OUT: 'Your session ended. Sign in again to see payroll.',
  usePayrollResource: (path: string) => ({ loading: boundary.loading, error: '', reload: async () => {}, data: path === '/api/payroll/runs' ? {version:'PAYROLL_API_V1',capabilities:{canReview:true},runs:[],jobs:[]} : path === '/api/payroll/native-profiles' ? {version:'PAYROLL_NATIVE_PROFILES_V1',configurations:[],openingYtd:[],managerScopes:[]} : { capabilities: { canConfigure: true, internalCalculatorAvailable: boundary.native }, revisions: [], exceptions: [], grants: [], employees: [], futureDraftImpact: boundary.showDraft ? [
    { runId: "fictional-a", period: { startDate: "2026-11-01", endDate: "2026-11-07" }, reason: "Refresh review after changing applicable defaults or exceptions." },
    { runId: "fictional-b", period: { startDate: "2026-11-08", endDate: "2026-11-14" }, reason: "A different draft instruction" },
  ] : [] } }),
  usePayrollOperation: () => ({ busy: false, pending: null, locked: false, resuming: false, message: '', error: '', revisionConflict: false, submit: async () => {} }),
}));
rs.mock('next/navigation', () => ({ usePathname: () => '/app/settings/payroll' }));
beforeEach(() => { boundary.native = true; boundary.loading = false; boundary.showDraft = false; });
it('explains native company preferences and automatic publication without asking for provider activation', () => {
  const html = renderToStaticMarkup(<PayrollSettings recoveryScope="fictional-owner" nativeSources={{employees:[],locations:[],breakTypes:[]}} />);
  // B7 wording (NV-124): payroll settings in plain language, same meaning.
  expect(html).toContain('NEVORA payroll uses finalized timecards');
  expect(html).toContain('then shares it with the employee');
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
// Phase 8 (review B #35): the band carries the approved scope sentence Payroll shows over the same tabs; no stray currency.
it('says what payroll does under the title, as Payroll does', () => {
  const html = renderToStaticMarkup(<PayrollSettings recoveryScope="fictional-owner" />);
  expect(html).toContain('Calculate pay and share statements. You pay your team outside NEVORA.');
  expect(html).not.toContain('US dollars');
});

it('translates the approved draft instruction only for a Spanish profile', () => {
  boundary.showDraft = true;
  const english = 'Refresh review after changing applicable defaults or exceptions.';
  const spanish = 'Vuelve a revisar el borrador si cambias la configuración predeterminada o las excepciones que le aplican.';
  for (const lang of ['es', 'en'] as const) {
    const html = renderToStaticMarkup(<PortalLangProvider lang={lang}><PayrollSettings recoveryScope="fictional-owner" /></PortalLangProvider>);
    expect(html).toContain(lang === 'es' ? spanish : english);
    expect(html).not.toContain(lang === 'es' ? english : spanish);
    expect(html).toContain('A different draft instruction');
  }
});
