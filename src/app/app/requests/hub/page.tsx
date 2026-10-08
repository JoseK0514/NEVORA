import Link from 'next/link';
import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {NavIcon} from '@/components/nav-icon';
export default async function RequestsHubPage(){
 const {employee}=await requireSessionMutationProof();
 if(!['EMPLOYEE','LEAD'].includes(employee.role))redirect('/app');
 return <div className="employee-view employee-account-view">
  <header className="employee-view-heading"><div><p className="employee-view-eyebrow">Your requests</p><h1>Requests</h1></div></header>
  <section className="employee-view-surface employee-destination-list" aria-label="Request types">
   <Link href="/app/requests?tab=my"><NavIcon name="timeOff" employee size={22}/><span><strong>Time Off</strong><small>View your requests or request time off</small></span><span aria-hidden="true">→</span></Link>
   <Link href="/app/exchange?tab=requests"><NavIcon name="exchange" employee size={22}/><span><strong>Shift Requests</strong><small>Review swaps, coverage and callouts</small></span><span aria-hidden="true">→</span></Link>
  </section>
 </div>;
}
