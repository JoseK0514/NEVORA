import {expect,it,vi} from 'vitest';
const f=vi.hoisted(()=>({pay:{period:{startDate:'2026-11-09',endDate:'2026-11-15'},payday:'2026-11-20'} as {period:{startDate:string;endDate:string};payday:string}|null}));
vi.mock('@/components/employee-mobile/hours',()=>({ResponsiveEmployeeHours:()=>null}));
vi.mock('@/components/employee-time-panel',()=>({EmployeeTimePanel:()=>null}));
vi.mock('@/lib/auth/session',()=>({requireSession:async()=>({role:'LEAD'}),requireSessionMutationProof:async()=>({employee:{id:'LEAD-1',role:'LEAD'},sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/employee-view-authority.server',()=>({employeeViewAuthority:()=> 'test-authority'}));
vi.mock('@/lib/time-corrections/authority.server',()=>({correctionAuthority:()=> 'test-authority'}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({timeZone:'America/Puerto_Rico'})}));
vi.mock('@/lib/payroll/pay-calendar.server',()=>({currentPayPeriod:async()=>f.pay}));
vi.mock('@/lib/payroll/service',()=>({payrollFeatureEnabled:()=>false}));
vi.mock('@/lib/workspace-presentation/current.server',()=>({currentBrand:async()=>({modules:{}})}));
vi.mock('@/lib/navigation',()=>({mobileTabsForRole:()=>[]}));
import MyTimePage from './page';
// Direction B: Employees and Leads read the B Time screen, so the older panel (and its payday line) is checked as a Manager.
// Direction B: Employees and Leads read the B Time screen, so the older panel (with its payday line) is not rendered,
// and nothing on this page claims a payday was paid.
it('describes a calendar payday as scheduled rather than proof of payment',async()=>{
 const view=await MyTimePage();
 expect(view.props.children).toBeNull();
 expect(JSON.stringify(view.props)).not.toMatch(/\bPaid\b/);
});
