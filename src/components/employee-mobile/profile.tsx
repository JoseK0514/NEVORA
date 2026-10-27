'use client';

import {useEffect,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {EmployeeAccountPanel} from '../employee-account-panel';
import {PortalSignout} from '../portal-signout';
import {ProfileSettingRows} from '../employee-profile-rows';
import {QuietHeader,QuietNav,QuietPage,QuietRow} from '../quiet/quiet';
import {useThemeChoice,setThemeChoice} from '../theme-switch';
import {switchTo} from '../auth-premium/lang-switch';
import type {AuthLang} from '../../lib/auth-copy';
import {useEmployeeMobile} from './use-mobile';
import './requests.css';
import './profile.css';

export function EmployeeProfilePreferences({lang}:{lang:AuthLang}){
 const theme=useThemeChoice();
 return <div className="em-profile-preferences">
  <div className="em-profile-field"><label htmlFor="em-profile-language">Sign-in language</label><select id="em-profile-language" value={lang} aria-describedby="em-profile-language-hint" onChange={event=>{const next=event.currentTarget.value;if((next==='en'||next==='es')&&next!==lang)switchTo(next);}}><option value="en">English</option><option value="es">Español</option></select><p id="em-profile-language-hint">Used on the sign-in pages. Changing it reloads this page.</p></div>
  <div className="em-profile-field"><label htmlFor="em-profile-theme">Appearance</label><select id="em-profile-theme" value={theme} aria-describedby="em-profile-theme-hint" onChange={event=>{const next=event.currentTarget.value;if(next==='system'||next==='light'||next==='dark')setThemeChoice(next);}}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select><p id="em-profile-theme-hint">For this device. System follows its appearance setting.</p></div>
 </div>;
}

type Props={authority:string;lang:AuthLang;notificationsEnabled:boolean;policies:boolean;legacyHeader:ReactNode;calendar:ReactNode;passkeys:ReactNode};
/** Stable common service slots: changing viewport never replaces their owners. */
export function EmployeeProfilePage({authority,lang,notificationsEnabled,policies,legacyHeader,calendar,passkeys}:Props){
 const mobile=useEmployeeMobile(),[ending,setEnding]=useState(false);
 useEffect(()=>{const end=()=>setEnding(true);window.addEventListener('nevora:signout',end);return()=>window.removeEventListener('nevora:signout',end);},[]);
 useEffect(()=>{
  if(!mobile||!/^#profile-(privacy|terms|support|account-deletion)$/.test(location.hash))return;
  const frame=requestAnimationFrame(()=>{const row=document.getElementById(location.hash.slice(1));row?.querySelector<HTMLAnchorElement>('a')?.focus();});
  return()=>cancelAnimationFrame(frame);
 },[mobile]);
 return <QuietPage className={`q-profile-e${mobile?' em-requests em-profile':''}`}>
  {mobile?<header className="em-request-heading">{!ending?<Link className="em-request-back" href="/app/more"><CaretLeftIcon size={18} aria-hidden="true"/>More</Link>:null}<h1>Profile</h1><p>Settings and your work details</p></header>:ending?<QuietNav/>:legacyHeader}
  <noscript><p className="q-help">Enable JavaScript to view your current profile and calendar settings. You can still sign out below.</p></noscript>
  {ending?<p className="em-profile-notice" role="status">Signing out…</p>:null}
  {!ending?<section aria-labelledby="profile-settings-title" className="em-profile-settings">
   <div className="q-grp"><h2 id="profile-settings-title">Settings</h2></div>
   {mobile?<EmployeeProfilePreferences lang={lang}/>:null}
   <ul className="q-list">
    {!mobile?<ProfileSettingRows lang={lang}/>:null}
    <QuietRow one href="/app/notifications" title="Notifications"/>
    {notificationsEnabled?<li><button type="button" className="q-row q-row--one q-row--btn" popoverTarget="portal-device-settings"><span className="q-rt"><b>Alerts on this device</b></span><CaretRightIcon className="q-chev" aria-hidden="true"/></button></li>:null}
   </ul>
   {notificationsEnabled?null:<p className="q-help">Alerts on this device aren’t turned on for your workplace yet.</p>}
  </section>:null}
  {!ending?<div className="q-profile-cal em-profile-calendar">{calendar}</div>:null}
  {!ending?<EmployeeAccountPanel key={authority} kind="profile" authority={authority} quiet employeeMobile={mobile}/>:null}
  {!ending?<div className="q-profile-security">{passkeys}</div>:null}
  {!ending?<section aria-labelledby="profile-account-title" className="em-profile-account">
   <div className="q-grp"><h2 id="profile-account-title">Your account</h2></div>
   <ul className="q-list">
    {policies?<>
     <QuietRow id="profile-privacy" one href={mobile?'/app/profile/privacy':'/privacy'} title="Privacy Policy"/>
     <QuietRow id="profile-terms" one href={mobile?'/app/profile/terms':'/terms'} title="Terms of Use"/>
     <QuietRow id="profile-support" one href={mobile?'/app/profile/support':'/support'} title="Support"/>
     <QuietRow one href="/app/account/delete" title="Delete my account" variant="danger"/>
    </>:!mobile?<QuietRow one href="/support" title="Support"/>:null}
   </ul>
   {!policies&&mobile?<p className="q-help" role="status">Help and policy information isn’t available right now.</p>:null}
  </section>:null}
  <section aria-label="Session" className="em-profile-session"><PortalSignout><button type="submit" className={mobile?'em-request-secondary em-profile-signout':'q-btn q-btn--sec q-btn--danger profile-signout-row'} disabled={ending}>{ending?'Signing out…':'Sign out'}</button></PortalSignout></section>
 </QuietPage>;
}

export function EmployeeProfileDocumentFrame({title,sub,back,children}:{title:string;sub:string;back:string;children:ReactNode}){
 const mobile=useEmployeeMobile();
 return <QuietPage className={`q-doc em-profile-document${mobile?' em-requests':''}`}>
  <header className="em-request-heading">{mobile?<><Link className="em-request-back" href={back}><CaretLeftIcon size={18} aria-hidden="true"/>Profile</Link><h1>{title}</h1><p>{sub}</p></>:<><QuietNav back={{href:back,label:'Profile'}}/><QuietHeader title={title} sub={sub}/></>}</header>
  <article className="em-document-body">{children}</article>
 </QuietPage>;
}
