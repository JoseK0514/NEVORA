import './employee-b.css';
import './time.css';
import type {ReactNode} from 'react';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {BButtonLink,BCard,BHero,BScreen,BStack} from '../owner-b/b-kit';

/* Availability on the phone, Direction B (Jose approved the mock "Employee mobile, Direction B", Nov 6, 2026): back to
 * Schedule, the title and its line on the teal hero with Change one week on glass. The week's rows, Save and every
 * notice are the page's own form (employee-mobile/availability.tsx) in a `b-keep` card under this hero (time.css), so
 * the form exists once. Server-safe: no hooks, so the server page can show the same hero before the phone page loads. */

export const AVAILABILITY_B_TITLE_ID='b-avail-title';
export const availabilitySubB=(week:string|null,range?:string)=>week&&range?`Used for the week of ${range}`:'Your usual week, used to build your schedule';

export function AvailabilityB({sub,change,children}:{sub:string;/** Change one week's link (the usual week only). */change?:string|null;children?:ReactNode}){
 return <BScreen back>
  <BHero back={{href:'/app/schedule',label:'Schedule'}} title="Availability" titleId={AVAILABILITY_B_TITLE_ID} sub={sub}>
   {change?<div className="b-hrow"><BButtonLink href={change} kind="glass"><CalendarBlankIcon size={16} weight="bold" aria-hidden="true"/>Change one week</BButtonLink></div>:null}
  </BHero>
  {children?<BStack>{children}</BStack>:null}
 </BScreen>;
}

/** The planning read's state (or the first paint's), with its one way forward. */
export function AvailabilityStatusB({message,action}:{message:ReactNode;action?:ReactNode}){
 return <BCard label="Availability"><div className="eb-status"><p className="b-state" role="status">{message}</p>{action??null}</div></BCard>;
}
