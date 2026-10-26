import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NativeProfilesResponse } from '@/lib/payroll/native/contracts';
import type { PayrollSettingsResponse } from '@/lib/payroll/contracts';
import { buildSetupRecord } from '@/lib/payroll/native/setup';
import { NativePayrollConfig } from './native-payroll-config';
import { nativeCapabilities } from './native-ui-fixture.test-support';

const boundary = vi.hoisted(() => ({ data: null as NativeProfilesResponse | null, loading: false, error: '' }));
vi.mock('./use-payroll', () => ({ PAYROLL_SIGNED_OUT: 'Your session ended. Sign in again to see payroll.', usePayrollResource: (path: string) => ({ ...boundary, data: path === '/api/payroll/runs' ? { version: 'PAYROLL_API_V1', capabilities: { canReview: true }, runs: [], jobs: [] } : boundary.data, reload: async () => {} }), usePayrollOperation: () => ({ busy: false, pending: null, locked: false, message: '', error: '', revisionConflict: false, resuming: false, receipt: null, submit: async () => {} }) }));
const settings: PayrollSettingsResponse = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, revisions: [], exceptions: [], grants: [], employees: [{ id: 'E1', name: 'Luis Ortiz', active: true }], futureDraftImpact: [] };
const sources = { employees: [{ id: 'E1', name: 'Luis Ortiz', role: 'EMPLOYEE', active: true }, { id: 'O1', name: 'Ana Rivera', role: 'OWNER', active: true }], locations: [{ id: 'L1', name: 'Fictional bakery', active: true }], breakTypes: [{ id: 'REST', name: 'Rest break', active: true, category: 'REST' }, { id: 'MEAL', name: 'Meal', active: true, category: 'MEAL' }] };
const render = () => renderToStaticMarkup(<NativePayrollConfig settings={settings} sources={sources} recoveryScope="fictional-owner" />);
const company = { ...buildSetupRecord({ kind: 'COMPANY_DEFAULTS', subjectId: 'COMPANY', taxYear: 0, revision: 1, formVersion: 'NEVORA_PLAIN_PAYROLL_SETUP_V1', operationId: '18d8e87c-9765-4dbd-9f4b-691b045c8b73', enteredBy: { employeeId: 'O1', name: 'Ana Rivera' }, enteredAt: '2026-10-25T14:00:00.000Z', cause: 'OWNER_ENTRY', derivedFrom: { companyDefaults: null, opening: null, locationIds: [] }, facts: { workweek: 'STATUTORY_MONDAY_0001', employerPrograms: [{ code: 'FUTA', applies: true, basisPoints: 60 }, { code: 'PR_UI', applies: true, basisPoints: 340 }, { code: 'CFSE', applies: false, basisPoints: null }], breakPay: [{ typeId: 'REST', treatment: 'PAID_REST' }, { typeId: 'MEAL', treatment: 'UNPAID_RELIEVED_MEAL' }], includeOwners: false } }), verified: true };
beforeEach(() => { boundary.data = { version: 'PAYROLL_NATIVE_PROFILES_V1', configurations: [], openingYtd: [], managerScopes: [], setup: { companyDefaults: null, records: [] } }; boundary.loading = false; boundary.error = ''; settings.capabilities = { ...nativeCapabilities }; });

describe('plain payroll setup', () => {
  it('asks only plain questions: no evidence reference, attestation or fingerprint field', () => {
    const html = render();
    for (const label of ['Company defaults', 'Workweek', 'Employer taxes', 'Break pay', 'Pay Owners through payroll', 'Hourly rate ($)', 'Filing status', 'Starting fresh this year', 'Starting mid-year? Enter year-to-date totals', 'Written agreement for a 30-minute meal', 'Only if you and this employee signed one.'])
      expect(html).toContain(label);
    expect(html).not.toMatch(/evidence reference|SHA-256 input|name="[^"]*(?:evidence|attest|fingerprint|Fingerprint)[^"]*"/i);
    expect(html).not.toContain('<textarea');
  });
  it('defaults break pay per type: Rest paid, Meal an unpaid relieved meal', () => {
    const html = render();
    const selected = (name: string) => /<option value="([A-Z_]+)" selected=""/.exec(html.slice(html.indexOf(`name="${name}"`)).split('</select>')[0])?.[1];
    expect(selected('break.REST')).toBe('PAID_REST');
    expect(selected('break.MEAL')).toBe('UNPAID_RELIEVED_MEAL');
  });
  it('keeps pay setup closed until company defaults exist, then shows Owners as not in payroll', () => {
    expect(render()).toContain('Save the company defaults above first.');
    boundary.data!.setup = { companyDefaults: company, records: [] };
    const html = render();
    expect(html).not.toContain('Save the company defaults above first.');
    expect(html).toContain('Not in payroll');
    expect(html).toContain('Needs pay setup');
  });
  it('shows the server’s recorded evidence read-only under Audit details', () => {
    boundary.data!.setup = { companyDefaults: company, records: [] };
    const html = render();
    expect(html).toContain('Audit details');
    expect(html).toContain('Entered by Ana Rivera on Oct 25, 2026');
    expect(html).toContain(company.factsSha256);
    expect(html).toContain('Matches the saved details');
    expect(html).not.toMatch(new RegExp(`<input[^>]*value="${company.factsSha256}"`));
  });
  it('clears private names while access loads and offers a retry when unavailable', () => {
    boundary.loading = true; expect(render()).not.toContain('Luis Ortiz');
    boundary.loading = false; boundary.data = null; boundary.error = 'Owner access could not be checked';
    expect(render()).toContain('Try again');
  });
  it('shows nothing without current Owner capability', () => {
    settings.capabilities.canConfigure = false;
    expect(render()).toBe('');
  });
});
