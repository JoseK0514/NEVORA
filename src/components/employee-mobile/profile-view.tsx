'use client';

import Link from 'next/link';
import {createContext,useContext} from 'react';
import type {PrivatePanelState} from '../../lib/private-snapshot-client';
import type {EmployeeViewSnapshot} from '../../lib/employee-view';
import {timeZoneLabel} from '../../lib/time-zone-label';
import {CorpCard,CorpRow,CorpRows} from '../corp/corp';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {profileViewCopy} from './profile-view-copy';

/** The Employee ID a person signs in with, from the page's session (inspection Nov 14, BR-13). The profile read doesn't
 * carry it, so the page hands it down beside the read; like the rows from the read, it is hidden while the view is paused. */
export const ProfileSignInId=createContext<string|undefined>(undefined);

/** Board E-Profile, "Personal info": the existing finite own read as rows. No proof props or separate cache.
 * The details refresh on focus and reconnect; a quiet Try again shows only when the read failed. */
export function EmployeeMobileProfileView({state,onRetry}:{state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void}){
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='profile'?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const phase=state.paused?'paused':ready?'ready':denied?'denied':state.refreshing?'loading':'unavailable';
 const value=(text:string|undefined)=>text??'–';
 const signInId=useContext(ProfileSignInId),t=profileViewCopy[usePortalLang()];
 return <div className="em-account-personal" data-private-view="profile" data-profile-state={phase}>
  <CorpCard id="profile-personal" label={t.personalInfo}>
   <CorpRows label={t.workProfile}>
    <li><CorpRow title={t.name} bold one value={value(ready?.profile.name)} valueTone="soft"/></li>
    <li><CorpRow title={t.employeeId} bold detail={t.signInWithId} value={value(state.paused?undefined:signInId)} valueTone="soft"/></li>
    <li><CorpRow title={t.locations} bold one value={value(ready?.profile.locations.join(' · '))} valueTone="soft"/></li>
    <li><CorpRow title={t.timeZone} bold one value={value(ready?timeZoneLabel(ready.profile.timeZone).replace(/ time$/,''):undefined)} valueTone="soft"/></li>
   </CorpRows>
   {ready?null:<div className="c-card__body c-card__body--tight em-account-personal-status">
    <p className="c-note" role="status">{state.paused?t.paused:denied?t.denied:state.refreshing?t.checking:t.failed}</p>
    {denied?<Link className="c-link" href="/login">{t.signIn}</Link>:phase==='unavailable'?<button className="c-link em-profile-retry" type="button" onClick={onRetry}>{t.tryAgain}</button>:null}
   </div>}
  </CorpCard>
 </div>;
}
