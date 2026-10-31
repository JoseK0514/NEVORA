import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {calendarAuthority} from '@/lib/calendar/service.server';
import {CalendarSubscriptionPanel} from '@/components/calendar-subscription-panel';
import {EmployeeAccountFrame} from '@/components/employee-mobile/profile';

export const metadata={title:'Add to calendar'};
/** Board E-Calendar: the calendar link that used to sit inside Profile, as its own page (same reads and commands). */
export default async function CalendarPage(){
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app/profile');
 const authority=calendarAuthority(proof);
 return <EmployeeAccountFrame title="Add to calendar" back={{href:'/app/more',label:'More'}} className="em-calendar-page"><CalendarSubscriptionPanel key={authority} authority={authority}/></EmployeeAccountFrame>;
}
