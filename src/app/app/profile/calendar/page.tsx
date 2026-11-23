import {readPageLang} from '@/lib/i18n/page-lang.server';
import {PROFILE_COPY} from '../profile-copy';
import {OwnerOnlyNotice} from '@/components/owner-only-notice';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {calendarAuthority} from '@/lib/calendar/service.server';
import {CalendarSubscriptionPanel} from '@/components/calendar-subscription-panel';
import {EmployeeAccountFrame} from '@/components/employee-mobile/profile';

export async function generateMetadata(){return {title:PROFILE_COPY[await readPageLang()].calendar};}
/** Board E-Calendar: the calendar link that used to sit inside Profile, as its own page (same reads and commands). */
export default async function CalendarPage(){
 // Review F2 (NV-136): a closed page says why, never a silent redirect.
 const proof=await requireSessionMutationProof(),t=PROFILE_COPY[await readPageLang()];if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))return <OwnerOnlyNotice state title={t.calendar} reason={t.calendarReason} help={t.calendarHelp} next={{href:'/app/profile',label:t.goToProfile}}/>;
 const authority=calendarAuthority(proof);
 return <EmployeeAccountFrame title={t.calendar} back={{href:'/app/more',label:t.more}} className="em-calendar-page"><CalendarSubscriptionPanel key={authority} authority={authority}/></EmployeeAccountFrame>;
}
