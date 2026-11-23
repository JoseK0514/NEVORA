import './employee-b.css';
import './time.css';
import type {ReactNode} from 'react';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {HandshakeIcon} from '@phosphor-icons/react/dist/ssr/Handshake';
import {BButtonLink,BCard,BHero,BScreen,BStack} from '../owner-b/b-kit';
import {accountCopy,type AccountLang} from './account-copy';

/* Availability on the phone, Direction B (Jose approved the mock "Employee mobile, Direction B", Nov 6, 2026): back to
 * Schedule, the title and its line on the teal hero with Change one week on glass. The week's rows, Save and every
 * notice are the page's own form (employee-mobile/availability.tsx) in a `b-keep` card under this hero (time.css), so
 * the form exists once. Server-safe: no hooks, so the server page can show the same hero before the phone page loads. */

export const AVAILABILITY_B_TITLE_ID='b-avail-title';
export const availabilitySubB=(week:string|null,range?:string,lang:AccountLang='en')=>{const t=accountCopy(lang).availability;return week&&range?t.subWeek(range):t.subUsual;};

export function AvailabilityB({sub,change,children,lang='en'}:{sub:string;/** Change one week's link (the usual week only). */change?:string|null;children?:ReactNode;/** The person's language (server-safe: the page passes it). */lang?:AccountLang}){
 const copy=accountCopy(lang),t=copy.availability;
 return <BScreen back>
  <BHero back={{href:'/app/schedule',label:copy.common.schedule}} title={t.title} titleId={AVAILABILITY_B_TITLE_ID} sub={sub}>
   {/* Scheduling restrictions (U02): the times agreed with the manager are their own page, one tap from here. */}
   <div className="b-hrow">{change?<span data-discard-skip="" style={{display:'contents'}}><BButtonLink href={change} kind="glass"><CalendarBlankIcon size={16} weight="bold" aria-hidden="true"/>{t.changeWeek}</BButtonLink></span>:null}
    <BButtonLink href="/app/availability/agreement" kind="glass"><HandshakeIcon size={16} weight="bold" aria-hidden="true"/>{t.agreed}</BButtonLink></div>
  </BHero>
  {children?<BStack>{children}</BStack>:null}
 </BScreen>;
}

/** The planning read's state (or the first paint's), with its one way forward. */
export function AvailabilityStatusB({message,action,lang='en'}:{message:ReactNode;action?:ReactNode;lang?:AccountLang}){
 return <BCard label={accountCopy(lang).availability.title}><div className="eb-status"><p className="b-state" role="status">{message}</p>{action??null}</div></BCard>;
}
