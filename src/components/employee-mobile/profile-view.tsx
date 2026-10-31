'use client';

import Link from 'next/link';
import type {PrivatePanelState} from '../../lib/private-snapshot-client';
import type {EmployeeViewSnapshot} from '../../lib/employee-view';
import {timeZoneLabel} from '../../lib/time-zone-label';
import {CorpCard,CorpRow,CorpRows} from '../corp/corp';

/** Board E-Profile, "Personal info": the existing finite own read as rows. No proof props or separate cache.
 * The details refresh on focus and reconnect; a quiet Try again shows only when the read failed. */
export function EmployeeMobileProfileView({state,onRetry}:{state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void}){
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='profile'?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const phase=state.paused?'paused':ready?'ready':denied?'denied':state.refreshing?'loading':'unavailable';
 const value=(text:string|undefined)=>text??'–';
 return <div className="em-account-personal" data-private-view="profile" data-profile-state={phase}>
  <CorpCard id="profile-personal" label="Personal info">
   <CorpRows label="Your work profile">
    <li><CorpRow title="Name" bold one value={value(ready?.profile.name)} valueTone="soft"/></li>
    <li><CorpRow title="Locations" bold one value={value(ready?.profile.locations.join(' · '))} valueTone="soft"/></li>
    <li><CorpRow title="Time zone" bold one value={value(ready?timeZoneLabel(ready.profile.timeZone).replace(/ time$/,''):undefined)} valueTone="soft"/></li>
   </CorpRows>
   {ready?null:<div className="c-card__body c-card__body--tight em-account-personal-status">
    <p className="c-note" role="status">{state.paused?'Profile paused. Return to this window while online to refresh.':denied?'Your access changed. Sign in again to check your current details.':state.refreshing?'Checking your current work details…':'We couldn’t load your details.'}</p>
    {denied?<Link className="c-link" href="/login">Sign in</Link>:phase==='unavailable'?<button className="c-link em-profile-retry" type="button" onClick={onRetry}>Try again</button>:null}
   </div>}
  </CorpCard>
 </div>;
}
