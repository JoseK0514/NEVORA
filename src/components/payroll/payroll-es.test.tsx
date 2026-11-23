// Signed-in Spanish (gap closure, Nov 23, 2026): each main Payroll view renders in Puerto Rico Spanish inside the shared
// PortalLangProvider, with Spanish dates and US-format money (voice.md), and no English words left in its text.
import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PayrollRunsResponse } from '@/lib/payroll/contracts';
import type { OpenPayPeriod } from '@/lib/payroll/pay-calendar.server';
import { PortalLangProvider } from '@/lib/i18n/portal-lang';
import { nativeCapabilities, nativeRun } from './native-ui-fixture.test-support';
import { PayrollRuns, type PayrollView } from './payroll-runs';
import { PayrollSettings } from './payroll-settings';
import { payDay, periodRange } from './payroll-format';

const boundary = rs.hoisted(() => ({ data: null as PayrollRunsResponse | null }));
rs.mock('./use-payroll', () => ({ PAYROLL_SIGNED_OUT: 'Your session ended. Sign in again to see payroll.',
  usePayrollResource: (path: string) => ({ loading: false, error: '', reload: async () => {},
    data: path === '/api/payroll/runs' ? boundary.data : path === '/api/payroll/portal-statements' ? { version: 'PAYROLL_PORTAL_STATEMENTS_V1', statements: [] } : null }),
  usePayrollOperation: () => ({ busy: false, pending: null, locked: false, resuming: false, message: '', error: '', revisionConflict: false, submit: async () => {}, receipt: null }),
}));
rs.mock('next/navigation', () => ({ usePathname: () => '/app/payroll', useRouter: () => ({ push: () => {}, replace: () => {} }) }));

const current = { period: { startDate: '2026-10-05', endDate: '2026-10-11' }, payday: '2099-10-16', frequency: 'WEEKLY' } as OpenPayPeriod;
const missing = { period: { startDate: '2026-09-21', endDate: '2026-09-27' }, payday: '2026-09-29', settingsRevision: 1, state: 'MISSING', issues: [] };
const backlog = { asOfDate: '2026-10-30', rangeStart: '2026-09-01', rangeEnd: '2026-10-30', missingCount: 3, remainingCount: 0, returnedCount: 3, ambiguousCount: 0, overflow: false };

const es = (node: ReactNode) => renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>);
/** The words a person reads: tags, attribute values and the screen-reader-only class names dropped. */
const words = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ');
// English that must not survive in a Spanish render (whole words, so "NEVORA", "PIN", "ID" and amounts are fine).
const ENGLISH = /\b(Payroll|Payday|Prepare|Review|Approve|Approved|People|History|Net|Gross|Try again|Loading|Correction|Pay period|Settings|the|and|your|with)\b/;
const view = (name: PayrollView, runId?: string) => es(<PayrollRuns recoveryScope="fictional" view={name} current={current} canEditSettings runId={runId ?? null} />);

beforeEach(() => { boundary.data = { version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [nativeRun()], jobs: [] }; });

describe('Payroll in Spanish', () => {
  it('writes dates the Spanish way', () => {
    expect(periodRange('2026-09-28', '2026-10-04', 'es')).toBe('28 sep–4 oct');
    expect(periodRange('2026-12-07', '2026-12-13', 'es')).toBe('7–13 dic');
    expect(payDay('2026-10-20', 'es')).toBe('mar, 20 oct');
    expect(payDay('2026-10-20')).toBe('Tue, Oct 20');
  });

  it('renders Pay runs with the unpaid notice, a ready draft and Spanish dates', () => {
    boundary.data = { ...boundary.data!, missingPeriods: [missing], backlog } as unknown as PayrollRunsResponse;
    const html = view('home');
    expect(html).toContain('Nómina');
    expect(html).toContain('21–27 sep');
    expect(html).toContain('Revisar nómina');
    expect(words(html)).not.toMatch(ENGLISH);
  });

  it('renders Prepare payroll', () => {
    const html = view('prepare');
    expect(html).toContain('Preparar nómina');
    expect(words(html)).not.toMatch(ENGLISH);
  });

  it('renders Review payroll with amounts in the US format', () => {
    const run = nativeRun();
    const html = view('review', run.id);
    expect(html).toContain('Revisar nómina');
    expect(html).toMatch(/\$\d{1,3}(,\d{3})*\.\d{2}/);
    expect(words(html)).not.toMatch(ENGLISH);
  });

  it('renders People', () => {
    const html = view('people', nativeRun().id);
    expect(html).toContain('Personas');
    expect(words(html)).not.toMatch(ENGLISH);
  });

  it('renders Fix before payroll for a blocked draft', () => {
    boundary.data!.runs = [nativeRun({ status: 'BLOCKED', rows: null, totals: null, reviewToken: null, exceptions: ['WAGE_PROFILE_REQUIRED:E1'] })];
    const html = view('fix', boundary.data!.runs[0].id);
    expect(words(html)).not.toMatch(ENGLISH);
    expect(html).not.toContain('Fix before payroll');
  });

  it('renders Payroll history', () => {
    boundary.data!.runs = [nativeRun({ status: 'APPROVED', approvedAt: '2026-10-12T15:00:00Z' } as never)];
    const html = view('history');
    expect(html).toContain('Historial');
    expect(words(html)).not.toMatch(ENGLISH);
  });

  it('renders Payroll settings', () => {
    const html = es(<PayrollSettings recoveryScope="fictional-owner" nativeSources={{ employees: [], locations: [], breakTypes: [] }} />);
    expect(html).toContain('nómina');
    expect(words(html)).not.toMatch(/\b(Payroll|Save|Settings|Loading|Try again)\b/);
  });

  it('keeps English outside the provider', () => {
    expect(renderToStaticMarkup(<PayrollRuns recoveryScope="fictional" view="prepare" current={current} />)).toContain('Prepare payroll');
  });
});
