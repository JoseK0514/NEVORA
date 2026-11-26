'use client';

import {useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {EmployeeAccountView,useEmployeeAccountRead} from '../employee-account-panel';
import {EmployeeProfileB} from '../employee-b/account-b-client';
import {ProfileSignInId} from './profile-view';
import {shown} from '../employee-b/account-host';
import {QuietHeader,QuietNav,QuietPage} from '../quiet/quiet';
import {CorpCard,CorpNav,CorpPage,CorpRow,CorpRows,CorpTitle} from '../corp/corp';
import {useProfileLanguageChange} from './use-profile-language-change';
import {passkeysFlagOn} from '../../lib/passkeys/client';
import type {AuthLang} from '../../lib/auth-copy';
import {useEmployeeMobile} from './use-mobile';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {profileCopy} from './profile-copy';
import './requests.css';
import './profile.css';
import './account-corp.css';

/** Board E-Profile, "Display": the account language as a segmented control. */
export function EmployeeProfilePreferences({lang}:{lang:AuthLang}){
 const t=profileCopy[usePortalLang()];
 const {pick,busy,failed}=useProfileLanguageChange();
 return <CorpCard id="profile-display" label={t.display}>
  <CorpRows>
   <li><div className="c-row c-row--one em-account-pref">
    <span className="c-row__main"><span className="c-row__title c-row__title--b" id="em-profile-language">{t.language}</span><span className="c-row__detail"><span id="em-profile-language-hint" role={failed?'status':undefined}>{failed?t.languageFailed:t.languageHint}</span></span></span>
    <div className="c-seg em-account-seg" role="group" aria-labelledby="em-profile-language" aria-describedby="em-profile-language-hint">
     {([['en','English'],['es','Español']] as const).map(([value,name])=><button key={value} type="button" lang={value} aria-pressed={lang===value} disabled={busy} onClick={()=>{if(value!==lang)void pick(value);}}>{name}</button>)}
    </div>
   </div></li>
  </CorpRows>
 </CorpCard>;
}

const subscribeNothing=()=>()=>{};

type Props={authority:string;lang:AuthLang;policies:boolean;/** A Lead (desktop adds Calendar and alerts). */lead?:boolean;
 /** The signed-in name the shell already shows (review B6, NV-285): Name says it while the profile read is unavailable. */name?:string;
 /** The Employee ID this person signs in with, from the page's session (inspection Nov 14, BR-13). */employeeId?:string};
/** Board E-Profile: Personal info, Display and Security cards under "‹ More · Profile and settings", on every width.
 * Calendar, passkeys and device alerts are their own pages; Help, Privacy and Sign out live on More. */
export function EmployeeProfilePage({authority,lang,policies,lead,name,employeeId}:Props){
 const router=useRouter(),[ending,setEnding]=useState(false),t=profileCopy[usePortalLang()];
 const passkeys=useSyncExternalStore(subscribeNothing,passkeysFlagOn,passkeysFlagOn);
 useEffect(()=>{const end=()=>setEnding(true);window.addEventListener('nevora:signout',end);return()=>window.removeEventListener('nevora:signout',end);},[]);
 useEffect(()=>{
  // Older links (Schedule's "Add shifts to your calendar") point at Profile's calendar section, now its own page.
  if(location.hash==='#employee-calendar-title'){router.replace('/app/profile/calendar');return;}
  if(!/^#profile-(account-deletion|passkeys)$/.test(location.hash))return;
  // The row on screen: the phone screen's (b-…) or this layout's.
  const frame=requestAnimationFrame(()=>{const id=location.hash.slice(1);shown(document.getElementById(id),document.getElementById('b-'+id))?.focus();});
  return()=>cancelAnimationFrame(frame);
 },[router]);
 const security=passkeys||policies;
 return <CorpPage className="em-account c-page--narrow" labelledBy="profile-title">
  <CorpNav phoneOnly back={{href:'/app/more',label:t.more}} title={t.title} titleId="profile-title"/>
  <CorpTitle wide title={t.title}/>
  <noscript><p className="c-note">{t.noscript}</p></noscript>
  <ProfileBody key={authority} authority={authority} lang={lang} passkeys={passkeys} policies={policies} security={security} ending={ending} lead={lead} name={name} employeeId={employeeId}/>
 </CorpPage>;
}

/** One own read for both presentations: the phone screen (Direction B) and the cards tablets and desktop show. Keyed by
 * the authority, as the panel was. */
function ProfileBody({authority,lang,passkeys,policies,security,ending,lead,name,employeeId}:{authority:string;lang:AuthLang;passkeys:boolean;policies:boolean;security:boolean;ending:boolean;lead?:boolean;name?:string;employeeId?:string}){
 const {state,refresh}=useEmployeeAccountRead('profile',authority),t=profileCopy[usePortalLang()];
 return <>
  <EmployeeProfileB state={state} onRetry={refresh} lang={lang} passkeys={passkeys} policies={policies} ending={ending} lead={lead} name={name} employeeId={employeeId}/>
  {ending?<p className="c-note" role="status">{t.signingOut}</p>:<>
   <ProfileSignInId.Provider value={employeeId}><EmployeeAccountView kind="profile" state={state} onRetry={refresh} quiet employeeMobile/></ProfileSignInId.Provider>
   <EmployeeProfilePreferences lang={lang}/>
   {/* Review F2 (NV-100): "Security" only while it holds passkeys; with deletion alone it is "Account" (as on the B screen). */}
   {security?<CorpCard id="profile-security" label={passkeys?t.security:t.account}>
    <CorpRows>
     {passkeys?<li><CorpRow id="profile-passkeys" href="/app/profile/passkeys" title={t.passkeys} bold one/></li>:null}
     {policies?<li><CorpRow id="profile-account-deletion" href="/app/account/delete" title={t.deleteAccount} bold one danger/></li>:null}
    </CorpRows>
   </CorpCard>:null}
  </>}
 </>;
}

/** A pushed account page (calendar, passkeys, alerts): the phone header and the desktop title, then its cards. */
export function EmployeeAccountFrame({title,back,right,children,className}:{title:string;back:{href:string;label:string};right?:ReactNode;children:ReactNode;className?:string}){
 return <CorpPage className={className?`em-account c-page--narrow ${className}`:'em-account c-page--narrow'} labelledBy="account-page-title">
  <CorpNav phoneOnly back={back} title={title} titleId="account-page-title" right={right}/>
  <CorpTitle wide title={title} actions={right}/>
  {children}
 </CorpPage>;
}

export function EmployeeProfileDocumentFrame({title,sub,back,children}:{title:string;sub:string;back:string;children:ReactNode}){
 const mobile=useEmployeeMobile(),t=profileCopy[usePortalLang()];
 return <QuietPage className={`q-doc em-profile-document${mobile?' em-requests':''}`}>
  <header className="em-request-heading">{mobile?<><Link className="em-request-back" href={back}><CaretLeftIcon size={18} weight="bold" aria-hidden="true"/>{t.profile}</Link><h1>{title}</h1><p>{sub}</p></>:<><QuietNav back={{href:back,label:t.profile}}/><QuietHeader title={title} sub={sub}/></>}</header>
  <article className="em-document-body">{children}</article>
 </QuietPage>;
}
