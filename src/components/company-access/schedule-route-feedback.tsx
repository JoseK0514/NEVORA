import Link from 'next/link';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {schedulingIssueMessage} from '@/lib/scheduling/validate-shift';
import {accessCopy,type AccessLang} from './access-copy';

function knownMessage(messages:Record<string,string>,code:string,lang?:AccessLang){
 if(Object.hasOwn(messages,code))return messages[code];
 // The shared scheduling messages are English only; in Spanish an unknown code takes the generic line instead.
 if(lang==='es')return undefined;
 const standard=schedulingIssueMessage(code);
 return typeof standard==='string'&&standard.trim()?standard:undefined;
}
/** The editor's words for a redirect code (a location Manager's Edit shift); unknown codes get the generic line. */
export function editorErrorText(code:string,lang?:AccessLang){
 const t=accessCopy(lang).route;
 return knownMessage(t.editor,code,lang)??t.shiftNotUpdated;
}

/** Route hints explain a redirect; they are not transaction receipts. Scoped
 * destinations therefore prompt review instead of certifying a save from a URL.
 */
export function ScheduleRouteFeedback({destination='schedule',error,warning,scoped=false,reviewChange=false,dismissHref,lang}:{destination?:'schedule'|'editor';error?:string;warning?:string;scoped?:boolean;reviewChange?:boolean;
 /** Review F3 (NV-090): the same page without ?error, so the note can be dismissed. */ dismissHref?:string;
 /** The person's language (Signed-in Spanish, Nov 23, 2026). */ lang?:AccessLang}){
 const t=accessCopy(lang).route;
 return <>
  {/* Review F3 (NV-090): a route error is a white note under the band (a red warning in a tinted circle, the message, and
    Dismiss), not a pink banner inside it. The message and its alert role are unchanged. */}
  {error&&<div className="c-route-note" role="alert"><span className="c-route-note__icon" aria-hidden="true"><WarningCircleIcon weight="bold"/></span>
   <p className="c-route-note__text">{knownMessage(destination==='editor'?t.editor:t.schedule,error,lang)??(destination==='editor'?t.shiftNotUpdated:t.scheduleNotUpdated)}</p>
   {dismissHref?<Link className="c-route-note__dismiss" href={dismissHref} scroll={false}>{t.dismiss}</Link>:null}</div>}
  {warning&&<p className="form-warning" role="status">{knownMessage(scoped?t.scopedWarnings:t.companyWarnings,warning,lang)??(scoped?t.scopedWarning:t.companyWarning)}</p>}
  {scoped&&reviewChange&&!error&&!warning&&<p className="form-warning" role="status">{t.reviewChange}</p>}
 </>;
}

/** The page's URL with only the given (already checked) parameters, for the note's Dismiss; ?error is never kept. */
export function withoutRouteError(path:string,params:Record<string,string|undefined>){
 const query=new URLSearchParams();
 for(const [key,value] of Object.entries(params))if(key!=='error'&&typeof value==='string')query.set(key,value);
 const text=query.toString();
 return text?`${path}?${text}`:path;
}
