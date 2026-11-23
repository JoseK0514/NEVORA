import type {PinActionResult,PinSaveStatus} from '@/app/app/employees/[employeeId]/clocker-pin/actions';
import {SettingsFrame} from '@/app/app/settings/wave-c-kit';
import {BCard,BState} from './owner-b/b-kit';
import {ClockerPinForm} from './clocker-pin-form';
import {clockerOwnerCopy,type ClockerOwnerLang} from './clocker-owner-copy';
import './clocker-owner-b.css';

/** Where a person's Clocker PIN page was opened from, and so where it goes back to: the person's page, or the list of PINs. */
export type PinOrigin='person'|'pins';
function backOf(origin:PinOrigin,employeeId:string,name:string,lang:ClockerOwnerLang){
 return origin==='pins'?{href:'/app/settings/clocker/pins',label:clockerOwnerCopy[lang].pinsTitle}:{href:`/app/employees/${encodeURIComponent(employeeId)}`,label:name};
}

/** One person's Clocker PIN (Phase 6): the Settings frame (the back link names where it returns, the title, the person's
 * name under it), then one card with the form at the form width. Set and reset are the same form; the words say which. */
export function ClockerPinEditor({employeeId,name,initialVersion,action,checkStatus,origin='person',lang='en'}:{employeeId:string;name:string;initialVersion:number;
 action:(data:FormData)=>Promise<PinActionResult>;checkStatus:(data:FormData)=>Promise<PinSaveStatus>;origin?:PinOrigin;lang?:ClockerOwnerLang}){
 const t=clockerOwnerCopy[lang],back=backOf(origin,employeeId,name,lang);
 // Phase 2 gate (Nov 23): the card's heading already names the person ("Set a PIN for …"), so no line under the title
 // repeats the name.
 return <SettingsFrame className="ck-owner ck-pin" back={back} settingsCrumb={false} title={t.pinTitle}>
  <div className="ck-stack"><ClockerPinForm employeeId={employeeId} name={name} initialVersion={initialVersion} action={action} checkStatus={checkStatus} origin={origin} lang={lang}/></div>
 </SettingsFrame>;
}

/** The same page when a PIN can't be set here: whose page it is, why, and one way on. */
export function ClockerPinClosed({employeeId,name,reason,origin='person',lang='en'}:{employeeId:string;name:string;reason:'owner'|'inactive'|'unavailable';origin?:PinOrigin;lang?:ClockerOwnerLang}){
 const t=clockerOwnerCopy[lang],back=backOf(origin,employeeId,name,lang),person=`/app/employees/${encodeURIComponent(employeeId)}`;
 const title=reason==='owner'?t.pinClosedOwnerTitle:reason==='inactive'?t.pinClosedInactiveTitle(name):t.pinClosedUnavailableTitle;
 const body=reason==='owner'?t.pinClosedOwnerBody:reason==='inactive'?t.pinClosedInactiveBody:t.pinClosedUnavailableBody;
 return <SettingsFrame className="ck-owner ck-pin" back={back} settingsCrumb={false} title={t.pinTitle} summary={name}>
  <div className="ck-stack"><BCard label={title}>
   <BState kind={reason==='unavailable'?'failed':'locked'} alert={reason==='unavailable'} title={title} line={body}>
    {reason==='unavailable'?<a className="b-btn b-btn--teal" href={`${person}/clocker-pin${origin==='pins'?'?from=pins':''}`}>{t.tryAgain}</a>
     :<a className="b-btn b-btn--ghost" href={person}>{t.viewPerson}</a>}
   </BState>
  </BCard></div>
 </SettingsFrame>;
}
