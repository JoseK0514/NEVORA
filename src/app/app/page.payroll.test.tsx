import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from 'react-dom/server';
const state = rs.hoisted(() => ({role: 'OWNER', scope: 'COMPANY', authority: 'ready', payStatements: true, read: rs.fn(), dashboard: rs.fn(), employee: rs.fn()}));
rs.mock('@/lib/auth/session', () => ({requireSession: async () => ({id: 'actor', role: state.role, firstName: 'Fictional'}), requireSessionMutationProof: async () => ({employee: {id: 'actor', role: state.role}, sessionTokenHash: 'a'.repeat(64)})}));
rs.mock('@/lib/data/workspaces', () => ({getWorkspace: async () => ({timeZone: 'America/Puerto_Rico', name: 'Fixture'})}));
rs.mock('@/lib/company-access/operational-scope.server', () => ({readOperationalAuthority: async () => ({state: state.authority, scope: {mode: state.scope}, authority: 'fixture', reason: 'access_denied'}), withOperationalCompany: async (_proof: unknown, load: () => Promise<unknown>) => ({state: 'ready', data: await load(), authority: 'fixture', observedAt: '2026-11-02T12:00:00Z', validForMs: 15000})}));
rs.mock('@/lib/data/manager-dashboard', () => ({loadManagerDashboardData: async () => ({dashboard: {locationReadiness: []}, locations: [], availabilitySubmissionSummary: {}, managerActions: [], daySummaries: [], hourRows: []})}));
rs.mock('@/lib/workspace-presentation/current.server', () => ({currentPresentation: async () => ({modules: {payStatements: state.payStatements}})}));
rs.mock('./my-pay/next-pay', () => ({readNextPay: async () => ({payday: '2026-11-10', daysUntil: 8}), readHomePayrollStatus: state.read}));
rs.mock('@/lib/data/employee-weekly-review.server', () => ({readEmployeeWeeklyReview: async () => ({state: 'unavailable', shifts: [], locations: []})}));
rs.mock('@/lib/data/employee-home.server', () => ({homeAuthority: () => 'fixture'}));
rs.mock('@/lib/time-corrections/authority.server', () => ({correctionAuthority: () => 'fixture'}));
rs.mock('@/components/manager-dashboard', () => ({ManagerDashboard: (props: unknown) => {state.dashboard(props); return <p>Manager Home</p>;}}));
rs.mock('@/components/employee-dashboard', () => ({EmployeeDashboard: (props: unknown) => {state.employee(props); return <p>Employee Home</p>;}}));
rs.mock('@/components/company-access/scoped-read-frame', () => ({ScopedReadFrame: ({children}: {children: ReactNode}) => <>{children}</>}));
rs.mock('@/components/manager-correction-recovery', () => ({ManagerCorrectionRecoveryBoundary: ({children}: {children: ReactNode}) => <>{children}</>}));
rs.mock('@/components/company-access/scoped-operational-views', () => ({ScopedManagementHome: () => <p>Scoped Home</p>}));
rs.mock('@/components/company-access/operational-unavailable', () => ({OperationalUnavailable: () => <p>Home unavailable</p>}));
import DashboardPage from './page';
beforeEach(() => {state.role = 'OWNER'; state.scope = 'COMPANY'; state.authority = 'ready'; state.payStatements = true; state.read.mockReset().mockResolvedValue({state: 'ready', overdue: {payday: '2026-10-27', period: {startDate: '2026-10-19', endDate: '2026-10-25'}}}); state.dashboard.mockClear(); state.employee.mockClear(); rs.stubEnv('NEVORA_PAYROLL_ENABLED', 'true'); rs.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED', 'false');});
afterEach(() => { rs.unstubAllEnvs(); });
it('adds protected preparation facts to authorized Owner overview alongside next payday', async () => {
  renderToStaticMarkup(await DashboardPage({searchParams: Promise.resolve({})}));
  expect(state.read).toHaveBeenCalledOnce();
  expect(state.dashboard).toHaveBeenCalledWith(expect.objectContaining({nextPay: {payday: '2026-11-10', daysUntil: 8}, payrollStatus: {state: 'ready', overdue: {payday: '2026-10-27', period: {startDate: '2026-10-19', endDate: '2026-10-25'}}}}));
});
it.each(['module', 'feature', 'attendance', 'MANAGER', 'LEAD', 'EMPLOYEE', 'scoped', 'denied'])('does not load company payroll history in the %s context', async context => {
  if (context === 'module') state.payStatements = false;
  if (context === 'feature') rs.stubEnv('NEVORA_PAYROLL_ENABLED', 'false');
  if (['MANAGER', 'LEAD', 'EMPLOYEE'].includes(context)) state.role = context;
  if (context === 'scoped') {state.role = 'MANAGER'; state.scope = 'LOCATIONS';}
  if (context === 'denied') state.authority = 'unavailable';
  renderToStaticMarkup(await DashboardPage({searchParams: Promise.resolve(context === 'attendance' ? {view: 'attendance'} : {})}));
  expect(state.read).not.toHaveBeenCalled();
  for (const [props] of state.dashboard.mock.calls) expect(props.payrollStatus).toBeNull();
});
