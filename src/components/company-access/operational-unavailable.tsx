import Link from 'next/link';
import type {AccessFailure} from '@/lib/company-access/model';
import {ScopedReadFrame} from './scoped-read-frame';

export function OperationalUnavailable({title='Page unavailable',reason,scoped=false}:{title?:string;reason:AccessFailure;scoped?:boolean}){
 const message=reason==='access_denied'?(scoped?'This view is not available with your current management access. Return to your schedule to choose a location you manage.':'This page needs current company-wide management access. Return to Home, or sign in again if your access changed.'):reason==='source_changed'?'Your access or the company information changed. Reload to review current information.':reason==='source_limit'?'This information could not be loaded completely. Reload or contact your Owner if this continues.':reason==='not_configured'?'Workspace information is not ready. Ask your Owner to review company setup.':'Current information could not be confirmed. Reconnect and reload this page.';
 return <ScopedReadFrame unavailable={<section className="portal-route-state" role="status"><h1>{title}</h1><p>{message}</p><div className="portal-state-actions"><Link className="button secondary" href="/app">Return to Home</Link>{scoped?<Link className="button secondary" href="/app/schedule">Open your schedule</Link>:reason==='access_denied'&&<Link className="button secondary" href="/login">Sign in again</Link>}</div></section>}/>;
}
