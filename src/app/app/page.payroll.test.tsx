import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const state = vi.hoisted(() => ({role: 'OWNER', scope: 'COMPANY', authority: 'ready', payStatements: true, read: vi.fn(), dashboard: vi.fn(), employee: vi.fn()}));
vi.mock('@/lib/auth/session', () => ({requireSession: async () => ({id: 'actor', role: state.role, firstName: 'Fictional'}), requireSessionMutationProof: async () => ({employee: {id: 'actor', role: state.role}, sessionTokenHash: 'a'.repeat(64)})}));
vi.mock('@/lib/data/workspaces', () => ({getWorkspace: async () => ({timeZone: 'America/Puerto_Rico', name: 'Fixture'})}));
vi.mock('@/lib/company-access/operational-scope.server', () => ({readOperationalAuthority: async () => ({state: state.authority, scope: {mode: state.scope}, authority: 'fixture', reason: 'access_denied'}), withOperationalCompany: async (_proof: unknown, load: () => Promise<unknown>) => ({state: 'ready', data: await load(), authority: 'fixture', observedAt: '2026-11-02T12:00:00Z', validForMs: 15000})}));
vi.mock('@/lib/data/manager-dashboard', () => ({loadManagerDashboardData: async () => ({dashboard: {locationReadiness: []}, locations: [], availabilitySubmissionSummary: {}, managerActions: [], daySummaries: [], hourRows: []})}));
vi.mock('@/lib/workspace-presentation/current.server', () => ({currentPresentation: async () => ({modules: {payStatements: state.payStatements}})}));
vi.mock('./my-pay/next-pay', () => ({readNextPay: async () => ({payday: '2026-11-10', daysUntil: 8}), readHomePayrollStatus: state.read}));
vi.mock('@/lib/data/employee-weekly-review.server', () => ({readEmployeeWeeklyReview: async () => ({state: 'unavailable', shifts: [], locations: []})}));
vi.mock('@/lib/data/employee-home.server', () => ({homeAuthority: () => 'fixture'}));
vi.mock('@/lib/time-corrections/authority.server', () => ({correctionAuthority: () => 'fixture'}));
vi.mock('@/components/manager-dashboard', () => ({ManagerDashboard: (props: unknown) => {state.dashboard(props); return <p>Manager Home</p>;}}));
vi.mock('@/components/employee-dashboard', () => ({EmployeeDashboard: (props: unknown) => {state.employee(props); return <p>Employee Home</p>;}}));
vi.mock('@/components/company-access/scoped-read-frame', () => ({ScopedReadFrame: ({children}: {children: ReactNode}) => <>{children}</>}));
vi.mock('@/components/manager-correction-recovery', () => ({ManagerCorrectionRecoveryBoundary: ({children}: {children: ReactNode}) => <>{children}</>}));
vi.mock('@/components/company-access/scoped-operational-views', () => ({ScopedManagementHome: () => <p>Scoped Home</p>}));
vi.mock('@/components/company-access/operational-unavailable', () => ({OperationalUnavailable: () => <p>Home unavailable</p>}));
import DashboardPage from './page';
beforeEach(() => {state.role = 'OWNER'; state.scope = 'COMPANY'; state.authority = 'ready'; state.payStatements = true; state.read.mockReset().mockResolvedValue({state: 'ready', overdue: {payday: '2026-10-27', period: {startDate: '2026-10-19', endDate: '2026-10-25'}}}); state.dashboard.mockClear(); state.employee.mockClear(); vi.stubEnv('NEVORA_PAYROLL_ENABLED', 'true'); vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED', 'false');});
afterEach(() => vi.unstubAllEnvs());
it('adds protected preparation facts to authorized Owner overview alongside next payday', async () => {
  renderToStaticMarkup(await DashboardPage({searchParams: Promise.resolve({})}));
  expect(state.read).toHaveBeenCalledOnce();
  expect(state.dashboard).toHaveBeenCalledWith(expect.objectContaining({nextPay: {payday: '2026-11-10', daysUntil: 8}, payrollStatus: {state: 'ready', overdue: {payday: '2026-10-27', period: {startDate: '2026-10-19', endDate: '2026-10-25'}}}}));
});
it.each(['module', 'feature', 'attendance', 'MANAGER', 'LEAD', 'EMPLOYEE', 'scoped', 'denied'])('does not load company payroll history in the %s context', async context => {
  if (context === 'module') state.payStatements = false;
  if (context === 'feature') vi.stubEnv('NEVORA_PAYROLL_ENABLED', 'false');
  if (['MANAGER', 'LEAD', 'EMPLOYEE'].includes(context)) state.role = context;
  if (context === 'scoped') {state.role = 'MANAGER'; state.scope = 'LOCATIONS';}
  if (context === 'denied') state.authority = 'unavailable';
  renderToStaticMarkup(await DashboardPage({searchParams: Promise.resolve(context === 'attendance' ? {view: 'attendance'} : {})}));
  expect(state.read).not.toHaveBeenCalled();
  for (const [props] of state.dashboard.mock.calls) expect(props.payrollStatus).toBeNull();
});
