import Link from 'next/link';
import type {AccessFailure} from '@/lib/company-access/model';
import {ScopedReadFrame} from './scoped-read-frame';
import '@/components/quiet/quiet.css';

export function OperationalUnavailable({title='Page unavailable',reason,scoped=false}:{title?:string;reason:AccessFailure;scoped?:boolean}){
 const message=reason==='access_denied'?(scoped?'This view is not available with your current management access. Return to your schedule to choose a location you manage.':'This page needs current company-wide management access. Return to Home, or sign in again if your access changed.'):reason==='source_changed'?'Your access or the company information changed. Reload to review current information.':reason==='source_limit'?'This information could not be loaded completely. Reload or contact your Owner if this continues.':reason==='not_configured'?'Workspace information is not ready. Ask your Owner to review company setup.':'Current information could not be confirmed. Reconnect and reload this page.';
 // Quiet (v4, inspection Oct 24): the white page, a large title, one sentence and the same actions. Wording unchanged.
 return <ScopedReadFrame unavailable={<section className="q-page q-unavailable" data-nv-page="" role="status">
  <div className="q-hd"><h1>{title}</h1></div>
  <p className="q-body">{message}</p>
  <Link className="q-btn q-btn--sec" href="/app">Return to Home</Link>
  {scoped?<Link className="q-btn q-btn--quiet" href="/app/schedule">Open your schedule</Link>:reason==='access_denied'&&<Link className="q-btn q-btn--quiet" href="/login">Sign in again</Link>}
 </section>}/>;
}
