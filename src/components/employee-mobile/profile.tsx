'use client';

import {useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {EmployeeAccountView,useEmployeeAccountRead} from '../employee-account-panel';
import {EmployeeProfileB} from '../employee-b/account-b-client';
import {shown} from '../employee-b/account-host';
import {QuietHeader,QuietNav,QuietPage} from '../quiet/quiet';
import {CorpCard,CorpNav,CorpPage,CorpRow,CorpRows,CorpTitle} from '../corp/corp';
import {switchTo} from '../auth-premium/lang-switch';
import {passkeysFlagOn} from '../../lib/passkeys/client';
import type {AuthLang} from '../../lib/auth-copy';
import {useEmployeeMobile} from './use-mobile';
import './requests.css';
import './profile.css';
import './account-corp.css';

/** Board E-Profile, "Display": the sign-in language as a segmented control. Release 1 is light only, so there is no
 * Appearance choice; a stored theme choice is left untouched. Changing the language reloads the page (sign-in pages). */
export function EmployeeProfilePreferences({lang}:{lang:AuthLang}){
 return <CorpCard id="profile-display" label="Display">
  <CorpRows>
   <li><div className="c-row c-row--one em-account-pref">
    <span className="c-row__main"><span className="c-row__title c-row__title--b" id="em-profile-language">Language</span><span className="c-row__detail"><span id="em-profile-language-hint">Sign-in pages only. The rest of NEVORA is in English for now.</span></span></span>
    <div className="c-seg em-account-seg" role="group" aria-labelledby="em-profile-language" aria-describedby="em-profile-language-hint">
     {([['en','English'],['es','Español']] as const).map(([value,name])=><button key={value} type="button" lang={value} aria-pressed={lang===value} onClick={()=>{if(value!==lang)switchTo(value);}}>{name}</button>)}
    </div>
   </div></li>
  </CorpRows>
 </CorpCard>;
}

const subscribeNothing=()=>()=>{};

type Props={authority:string;lang:AuthLang;policies:boolean;/** A Lead (desktop adds Calendar and alerts). */lead?:boolean};
/** Board E-Profile: Personal info, Display and Security cards under "‹ More · Profile and settings", on every width.
 * Calendar, passkeys and device alerts are their own pages; Help, Privacy and Sign out live on More. */
export function EmployeeProfilePage({authority,lang,policies,lead}:Props){
 const router=useRouter(),[ending,setEnding]=useState(false);
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
  <CorpNav phoneOnly back={{href:'/app/more',label:'More'}} title="Profile and settings" titleId="profile-title"/>
  <CorpTitle wide title="Profile and settings"/>
  <noscript><p className="c-note">Enable JavaScript to view your profile and account settings.</p></noscript>
  <ProfileBody key={authority} authority={authority} lang={lang} passkeys={passkeys} policies={policies} security={security} ending={ending} lead={lead}/>
 </CorpPage>;
}

/** One own read for both presentations: the phone screen (Direction B) and the cards tablets and desktop show. Keyed by
 * the authority, as the panel was. */
function ProfileBody({authority,lang,passkeys,policies,security,ending,lead}:{authority:string;lang:AuthLang;passkeys:boolean;policies:boolean;security:boolean;ending:boolean;lead?:boolean}){
 const {state,refresh}=useEmployeeAccountRead('profile',authority);
 return <>
  <EmployeeProfileB state={state} onRetry={refresh} lang={lang} passkeys={passkeys} policies={policies} ending={ending} lead={lead}/>
  {ending?<p className="c-note" role="status">Signing out…</p>:<>
   <EmployeeAccountView kind="profile" state={state} onRetry={refresh} quiet employeeMobile/>
   <EmployeeProfilePreferences lang={lang}/>
   {security?<CorpCard id="profile-security" label="Security">
    <CorpRows>
     {passkeys?<li><CorpRow id="profile-passkeys" href="/app/profile/passkeys" title="Passkeys" bold one/></li>:null}
     {policies?<li><CorpRow id="profile-account-deletion" href="/app/account/delete" title="Delete my account" bold one danger/></li>:null}
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
 const mobile=useEmployeeMobile();
 return <QuietPage className={`q-doc em-profile-document${mobile?' em-requests':''}`}>
  <header className="em-request-heading">{mobile?<><Link className="em-request-back" href={back}><CaretLeftIcon size={18} aria-hidden="true"/>Profile</Link><h1>{title}</h1><p>{sub}</p></>:<><QuietNav back={{href:back,label:'Profile'}}/><QuietHeader title={title} sub={sub}/></>}</header>
  <article className="em-document-body">{children}</article>
 </QuietPage>;
}
