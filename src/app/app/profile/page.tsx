import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {readNotificationConfig} from '@/lib/notifications/config';
import {CalendarSubscriptionPanel} from '@/components/calendar-subscription-panel';
import {calendarAuthority} from '@/lib/calendar/service.server';
import {ProfileCalendarDisclosure} from '@/components/profile-calendar-disclosure';
import {QuietNav} from '@/components/quiet/quiet';
import {EmployeeProfilePage} from '@/components/employee-mobile/profile';
import {policiesVisible} from '@/lib/legal/policies';
import {ManagerProfilePage} from '@/components/manager-profile/manager-profile';
import {PasskeySection} from '@/components/passkeys/passkey-section';
import {getWorkspace} from '@/lib/data/workspaces';
import {readAuthLang} from '@/lib/auth-lang.server';

export const metadata = { title: "Profile" };
export default async function ProfilePage(){
 const proof=await requireSessionMutationProof();if(['OWNER','MANAGER'].includes(proof.employee.role))return <ManagerProfilePage proof={proof}/>;if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app');
 const authority=employeeViewAuthority(proof,'profile');
 const notificationsEnabled=readNotificationConfig(process.env).featureEnabled;
 const workspaceName=await getWorkspace().then(workspace=>workspace.name).catch(()=>null);
 const lang=await readAuthLang();
 const {firstName,lastName,role}=proof.employee;
 const initials=`${firstName.trim()[0]??''}${lastName.trim()[0]??''}`.toUpperCase();
 const roleLabel=role==='LEAD'?'Lead':'Employee';
 const calAuthority=calendarAuthority(proof);
 return <EmployeeProfilePage authority={authority} lang={lang} notificationsEnabled={notificationsEnabled} policies={policiesVisible()}
  legacyHeader={<><QuietNav back={{href:'/app/more',label:'More'}}/><div className="q-who"><span className="q-av q-av--lg" aria-hidden="true">{initials}</span><div><h1>{firstName} {lastName}</h1><p>{roleLabel}{workspaceName?` · ${workspaceName}`:''}</p></div></div></>}
  calendar={<ProfileCalendarDisclosure><CalendarSubscriptionPanel key={calAuthority} authority={calAuthority}/></ProfileCalendarDisclosure>}
  passkeys={<PasskeySection/>}/>;
}
