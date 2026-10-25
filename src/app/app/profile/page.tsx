import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {EmployeeAccountPanel} from '@/components/employee-account-panel';
import {readNotificationConfig} from '@/lib/notifications/config';
import {PortalSignout} from '@/components/portal-signout';
import {CalendarSubscriptionPanel} from '@/components/calendar-subscription-panel';
import {calendarAuthority} from '@/lib/calendar/service.server';
import {ProfileCalendarDisclosure} from '@/components/profile-calendar-disclosure';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {QuietNav,QuietPage,QuietRow} from '@/components/quiet/quiet';
import {ProfileSettingRows} from '@/components/employee-profile-rows';
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
 // v5 "One look" (Jose approved round 2 "exactly like this" on Oct 24, 2026; mockup E16): Back to More, who you are,
 // Settings, Work details, Your account and Sign out. Kept from before, beyond the mockup: sign-in security (passkeys),
 // alerts on this device and the calendar subscription. Data reads, controls and hooks are unchanged.
 return <QuietPage className="q-profile-e">
  <QuietNav back={{href:'/app/more',label:'More'}}/>
  <div className="q-who"><span className="q-av q-av--lg" aria-hidden="true">{initials}</span><div><h1>{firstName} {lastName}</h1><p>{roleLabel}{workspaceName?` · ${workspaceName}`:''}</p></div></div>
  <noscript><p className="q-help">Enable JavaScript to view your current profile and calendar settings. You can still sign out below.</p></noscript>
  <section aria-labelledby="profile-settings-title">
   <div className="q-grp"><h2 id="profile-settings-title">Settings</h2></div>
   <ul className="q-list">
    <ProfileSettingRows lang={lang}/>
    <QuietRow one href="/app/notifications" title="Notifications"/>
    {notificationsEnabled?<li><button type="button" className="q-row q-row--one q-row--btn" popoverTarget="portal-device-settings"><span className="q-rt"><b>Alerts on this device</b></span><CaretRightIcon className="q-chev" aria-hidden="true"/></button></li>:null}
   </ul>
   {notificationsEnabled?null:<p className="q-help">Alerts on this device aren’t turned on for your workplace yet.</p>}
  </section>
  <div className="q-profile-cal"><ProfileCalendarDisclosure>
   <CalendarSubscriptionPanel key={calendarAuthority(proof)} authority={calendarAuthority(proof)}/>
  </ProfileCalendarDisclosure></div>
  <EmployeeAccountPanel key={authority} kind="profile" authority={authority} quiet/>
  <div className="q-profile-security"><PasskeySection/></div>
  <section aria-labelledby="profile-account-title">
   <div className="q-grp"><h2 id="profile-account-title">Your account</h2></div>
   <ul className="q-list">
    {policiesVisible()?<>
     <QuietRow one href="/privacy" title="Privacy Policy"/>
     <QuietRow one href="/terms" title="Terms of Use"/>
     <QuietRow one href="/support" title="Support"/>
     <QuietRow one href="/app/account/delete" title="Delete my account" variant="danger"/>
    </>:<QuietRow one href="/support" title="Support"/>}
   </ul>
  </section>
  <section aria-label="Session"><PortalSignout><button type="submit" className="q-btn q-btn--sec q-btn--danger profile-signout-row">Sign out</button></PortalSignout></section>
 </QuietPage>;
}
