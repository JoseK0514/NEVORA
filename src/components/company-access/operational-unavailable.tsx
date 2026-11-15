import type {AccessFailure} from '@/lib/company-access/model';
import {ScopedReadFrame} from './scoped-read-frame';
import {ScopedRefreshButton} from './scoped-refresh';
import {BButtonLink,BState,BStateScreen} from '../owner-b/b-kit';

export function OperationalUnavailable({title='Page unavailable',reason,scoped=false}:{title?:string;reason:AccessFailure;scoped?:boolean}){
 const message=reason==='access_denied'?(scoped?'This view is not available with your current management access. Return to your schedule to choose a location you manage.':'This page needs current company-wide management access. Return to Home, or sign in again if your access changed.'):reason==='source_changed'?'Your access or the company information changed. Reload to review current information.':reason==='source_limit'?'This information could not be loaded completely. Reload or contact your Owner if this continues.':reason==='not_configured'?'Workspace information is not ready. Ask your Owner to review company setup.':'Current information could not be confirmed. Reconnect and reload this page.';
 // Phase 2 (package D): the one state screen at every width. The band carries the title; one card under it has the
 // sentence and the same actions in the same order (Return to Home, the role's other way on, Refresh current view).
 // Wording unchanged. It was the Quiet page, whose sentence drew white on the canvas on tablets and desktop.
 return <ScopedReadFrame unavailable={<div className="c-page c-page--narrow c-route-state c-route-state--checking" data-corp="">
  <BStateScreen title={title}>
   <BState kind={reason==='access_denied'?'locked':'failed'} line={message}>
    <div className="b-state-actions">
     <BButtonLink href="/app" kind="teal">Return to Home</BButtonLink>
     {scoped?<BButtonLink href="/app/schedule" kind="quiet">Open your schedule</BButtonLink>:reason==='access_denied'&&<BButtonLink href="/login" kind="quiet">Sign in again</BButtonLink>}
     <ScopedRefreshButton/>
    </div>
   </BState>
  </BStateScreen>
 </div>}/>;
}
