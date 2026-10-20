import {redirect} from 'next/navigation';
import Link from 'next/link';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {EmployeeAccountPanel} from '@/components/employee-account-panel';
import {readNotificationConfig} from '@/lib/notifications/config';
import {PortalSignout} from '@/components/portal-signout';
import {CalendarSubscriptionPanel} from '@/components/calendar-subscription-panel';
import {calendarAuthority} from '@/lib/calendar/service.server';
import {ProfileFrame} from '@/components/profile-frame';
import {NavIcon} from '@/components/nav-icon';
import {ProfileCalendarDisclosure} from '@/components/profile-calendar-disclosure';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import './profile.css';
import {PageBand} from '@/components/kit/kit';
import {ManagerProfilePage} from '@/components/manager-profile/manager-profile';
import {PasskeySection} from '@/components/passkeys/passkey-section';
import {getWorkspace} from '@/lib/data/workspaces';
import {readAuthLang} from '@/lib/auth-lang.server';
import {LangSwitch} from '@/components/auth-premium/lang-switch';
import {GlobeIcon} from '@phosphor-icons/react/dist/ssr/Globe';
import './profile-premium.css';
export default async function ProfilePage(){
 const proof=await requireSessionMutationProof();if(['OWNER','MANAGER'].includes(proof.employee.role))return <ManagerProfilePage proof={proof}/>;if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app');
 const authority=employeeViewAuthority(proof,'profile');
 const notificationsEnabled=readNotificationConfig(process.env).featureEnabled;
 const workspaceName=await getWorkspace().then(workspace=>workspace.name).catch(()=>null);
 const lang=await readAuthLang();
 const {firstName,lastName,role}=proof.employee;
 const initials=`${firstName.trim()[0]??''}${lastName.trim()[0]??''}`.toUpperCase();
 const roleLabel=role==='LEAD'?'Lead':'Employee';
 // Sign-in redesign (E4): the band carries who you are (initials, name, role and company, all from the session), then
 // Sign-in and security, App settings, Work details and Sign out. Data reads and controls are unchanged.
 return <ProfileFrame><div className="nv-page premium-employee-profile pfx" data-nv-page="">
  <PageBand eyebrow="Profile" title={`${firstName} ${lastName}`} summary={workspaceName?<><span className="nv-nowrap">{roleLabel}{'\u00a0·'}</span> {workspaceName}</>:roleLabel} overlap={false}
   extra={<><span className="pfx-avatar" aria-hidden="true">{initials}</span><svg className="pfx-spark" viewBox="0 0 240 240" aria-hidden="true" focusable="false"><path d="M120 120 154 186H86z"/></svg></>}/>
  <div className="premium-employee-content">
  <noscript><p>Enable JavaScript to view your current profile and calendar settings. You can still sign out below.</p></noscript>
  <div className="pfx-col">
  <PasskeySection/>
  <section className="profile-settings" aria-labelledby="profile-settings-title">
   <h2 id="profile-settings-title">App settings</h2>
   <div className="profile-settings-list">
    <div className="profile-setting-row pfx-lang-row"><span className="profile-setting-copy"><GlobeIcon size={20} aria-hidden="true"/><span><strong>Language</strong><small>Used on the sign-in pages for now.</small></span></span><LangSwitch lang={lang} label="Language"/></div>
    <Link className="profile-setting-row" href="/app/notifications"><span className="profile-setting-copy"><NavIcon name="notifications" size={20}/><span><strong>Notifications</strong><small>Updates about your schedule and requests</small></span></span><CaretRightIcon className="profile-setting-caret" size={18} aria-hidden="true"/></Link>
    {notificationsEnabled
     ? <button type="button" className="profile-setting-row" popoverTarget="portal-device-settings"><span className="profile-setting-copy"><NavIcon name="settings" size={20}/><span><strong>Alerts on this device</strong><small>Choose how this device alerts you</small></span></span><CaretRightIcon className="profile-setting-caret" size={18} aria-hidden="true"/></button>
     : <p className="profile-setting-note">Alerts on this device aren’t turned on for your workplace yet.</p>}
    <ProfileCalendarDisclosure>
     <CalendarSubscriptionPanel key={calendarAuthority(proof)} authority={calendarAuthority(proof)}/>
    </ProfileCalendarDisclosure>
   </div>
  </section>
  </div>
  <div className="pfx-col">
  <div className="profile-layout">
  <EmployeeAccountPanel key={authority} kind="profile" authority={authority}/>
  </div>
  <section className="profile-signout" aria-label="Session"><PortalSignout><button type="submit" className="profile-setting-row profile-signout-row"><span className="profile-setting-copy"><NavIcon name="logout" size={20}/><strong>Sign out</strong></span></button></PortalSignout></section>
  </div>
  </div></div>
 </ProfileFrame>;
}
