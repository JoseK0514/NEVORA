import {OwnerOnlyNotice} from '@/components/owner-only-notice';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {calendarAuthority} from '@/lib/calendar/service.server';
import {CalendarSubscriptionPanel} from '@/components/calendar-subscription-panel';
import {EmployeeAccountFrame} from '@/components/employee-mobile/profile';

export const metadata={title:'Add to calendar'};
/** Board E-Calendar: the calendar link that used to sit inside Profile, as its own page (same reads and commands). */
export default async function CalendarPage(){
 // Review F2 (NV-136): a closed page says why, never a silent redirect.
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))return <OwnerOnlyNotice title="Add to calendar" reason="Calendar links are for Employees and Leads." help="They add a person’s own published shifts to their calendar." next={{href:'/app/profile',label:'Go to Profile'}}/>;
 const authority=calendarAuthority(proof);
 return <EmployeeAccountFrame title="Add to calendar" back={{href:'/app/more',label:'More'}} className="em-calendar-page"><CalendarSubscriptionPanel key={authority} authority={authority}/></EmployeeAccountFrame>;
}
