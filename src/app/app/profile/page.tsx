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
import {SigBand,SigPage} from '@/components/signature/signature';
import pf from './profile-signature.module.css';
import './profile.css';
import './profile-premium.css';
import {ManagerProfilePage} from '@/components/manager-profile/manager-profile';
import {PasskeySection} from '@/components/passkeys/passkey-section';
import {getWorkspace} from '@/lib/data/workspaces';
import {readAuthLang} from '@/lib/auth-lang.server';
import {LangSwitch} from '@/components/auth-premium/lang-switch';
import {GlobeIcon} from '@phosphor-icons/react/dist/ssr/Globe';
export default async function ProfilePage(){
 const proof=await requireSessionMutationProof();if(['OWNER','MANAGER'].includes(proof.employee.role))return <ManagerProfilePage proof={proof}/>;if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app');
 const authority=employeeViewAuthority(proof,'profile');
 const notificationsEnabled=readNotificationConfig(process.env).featureEnabled;
 const workspaceName=await getWorkspace().then(workspace=>workspace.name).catch(()=>null);
 const lang=await readAuthLang();
 const {firstName,lastName,role}=proof.employee;
 const initials=`${firstName.trim()[0]??''}${lastName.trim()[0]??''}`.toUpperCase();
 const roleLabel=role==='LEAD'?'Lead':'Employee';
 // Signature (phase 2, approved Oct 20, 2026; target docs/product/specs/employee-style/signature/phase-2/p2c-profile.png):
 // the band is a membership card (initials, role, name and company, all from the session); the sheet holds Sign-in and
 // security, Settings, Work details and Sign out. Data reads, controls and the Phase E hooks are unchanged.
 return <ProfileFrame><SigPage className={pf.pfRoot} band={<SigBand eyebrow="Profile" mark={false}>
  <div className={pf.pfCard}>
   <svg className={pf.pfWatermark} viewBox="0 0 360 340" aria-hidden="true" focusable="false"><path d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z"/></svg>
   <div className={pf.pfCardTop}><span className={pf.pfMono} aria-hidden="true">{initials}</span><span className={pf.pfRole}>{roleLabel}</span></div>
   <h1 className={pf.pfName}>{firstName} {lastName}</h1>
   {workspaceName?<p className={pf.pfCompany}><span className="nv-sr">{roleLabel} · </span>{workspaceName}</p>:null}
  </div>
 </SigBand>}>
  <noscript><p>Enable JavaScript to view your current profile and calendar settings. You can still sign out below.</p></noscript>
  <div className={`${pf.pfSection} ${pf.pfFirst}`}><PasskeySection/></div>
  <section className={`profile-settings ${pf.pfSection}`} aria-labelledby="profile-settings-title">
   <h2 id="profile-settings-title" className={pf.pfHeading}>Settings</h2>
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
  <div className={`profile-layout ${pf.pfSection}`}>
   <EmployeeAccountPanel key={authority} kind="profile" authority={authority}/>
  </div>
  <section className={`profile-signout ${pf.pfSignout}`} aria-label="Session"><PortalSignout><button type="submit" className="profile-setting-row profile-signout-row"><span className="profile-setting-copy"><NavIcon name="logout" size={20}/><strong>Sign out</strong></span></button></PortalSignout></section>
 </SigPage></ProfileFrame>;
}
