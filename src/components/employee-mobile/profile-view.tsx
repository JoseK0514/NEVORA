'use client';

import Link from 'next/link';
import type {PrivatePanelState} from '../../lib/private-snapshot-client';
import type {EmployeeViewSnapshot} from '../../lib/employee-view';
import {timeZoneLabel} from '../../lib/time-zone-label';

/** Presentation of the existing finite own read. No proof props or separate cache. */
export function EmployeeMobileProfileView({state,onRetry}:{state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void}){
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='profile'?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const phase=state.paused?'paused':ready?'ready':denied?'denied':state.refreshing?'loading':'unavailable';
 return <section className="em-profile-private" aria-label="Your work profile" data-private-view="profile" data-profile-state={phase}>
  {ready?<>
   <header className="em-profile-identity"><h2>{ready.profile.name}</h2><p>{ready.profile.role} · {ready.profile.workspace}</p></header>
   <section aria-labelledby="em-profile-work-title"><h2 id="em-profile-work-title">Work details</h2><dl className="em-profile-facts">
    <div><dt>Locations</dt><dd>{ready.profile.locations.join(' · ')}</dd></div>
    <div><dt>Time zone</dt><dd>{timeZoneLabel(ready.profile.timeZone)}</dd></div>
   </dl><p className="em-profile-note">Something wrong here? Ask your manager to update it.</p></section>
  </>:<p className="em-profile-notice" role="status">{state.paused?'Profile paused. Return to this window while online to refresh.':denied?'Your access changed. Sign in again to check your current details.':state.refreshing?'Checking your current work details…':'We couldn’t load your details. Try again.'}</p>}
  <footer className="em-profile-read-footer"><span>Your information only</span>{denied?<Link className="em-request-secondary" href="/login">Sign in</Link>:<button className="em-request-secondary" type="button" disabled={state.paused||state.refreshing} onClick={onRetry}>{state.refreshing?'Checking…':phase==='unavailable'?'Try again':'Refresh details'}</button>}</footer>
 </section>;
}
