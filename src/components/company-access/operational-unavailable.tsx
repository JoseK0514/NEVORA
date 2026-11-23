import Link from 'next/link';
import type {AccessFailure} from '@/lib/company-access/model';
import {ScopedReadFrame} from './scoped-read-frame';
import {ScopedRefreshButton} from './scoped-refresh';
import {BButtonLink,BState,BStateScreen} from '../owner-b/b-kit';
import {accessCopy,type AccessLang} from './access-copy';

/** The page's own name for its band when it is closed to this person: "Christmas bonus hours unavailable" is the page
 * "Christmas bonus hours" (and "Horario no disponible" is "Horario"). */
const pageName=(title:string)=>title.replace(/\s+(?:(?:is\s+)?unavailable|no\s+(?:está\s+)?disponibles?)$/i,'')||title;

export function OperationalUnavailable({title,reason,scoped=false,back,closed,lang}:{title?:string;reason:AccessFailure;scoped?:boolean;
 /** SCRUM-215: a page closed because an action grant is missing names that grant and who decides instead. */
 closed?:{title:string;line:string;lang?:'en'|'es'};
 /** Review 30 (D08): the page's way back on the band ("‹ Insights"), as the page itself has, when the page couldn't be
  * read. A page closed for lack of access keeps none: its way back needs the same access. */
 back?:{href:string;label:string};
 /** The person's language (Signed-in Spanish, Nov 23, 2026); the caller passes `title` in the same language. */
 lang?:AccessLang}){
 const t=accessCopy(lang).unavailable;
 const name=title??t.pageUnavailable;
 // Review 30 (D09): a page that needs company-wide access is closed to this Manager, not broken. It is the designed closed
 // state (DESIGN.MD Phase 3, Closed pages): the page's name on the band, the lock in its 48px circle, the reason as the
 // card's title, who can change it, and one tinted step, with signing in again as the quiet way when access just changed.
 // Gate (Nov 23): the line under the title doesn't repeat it. A location-scoped Manager's view keeps its schedule as the step.
 if(reason==='access_denied')return <ScopedReadFrame lang={lang} unavailable={<div className="c-page c-page--narrow c-route-state c-route-state--checking" data-corp="">
  {/* No back link here: the page it leads to (Insights for Christmas bonus hours) needs the same access. */}
  <BStateScreen title={pageName(name)}>
   <BState kind="locked" title={closed?<span lang={closed.lang}>{closed.title}</span>:scoped?t.outsideTitle:t.companyTitle}
    line={closed?<span lang={closed.lang}>{closed.line}</span>:scoped?t.outsideLine:t.companyLine}>
    <div className="b-state-actions b-closed-actions">
     {scoped?<BButtonLink href="/app/schedule" kind="ghost">{t.openSchedule}</BButtonLink>:<BButtonLink href="/app" kind="ghost">{t.returnHome}</BButtonLink>}
     {/* QA A3-06 recheck (Nov 22, 2026): no "Sign in again" here. The person is signed in and lacks access, which is
       * checked live on every load, so signing in again never helps (this drops DESIGN.MD's quiet sign-in link). */}
     {scoped?<Link className="b-closed-also" href="/app">{t.returnHome}</Link>:null}
    </div>
   </BState>
  </BStateScreen>
 </div>}/>;
 const message=reason==='source_changed'?t.source_changed:reason==='source_limit'?t.source_limit:reason==='not_configured'?t.not_configured:t.read_failed;
 // Phase 2 (package D): the one state screen at every width. The band carries the title; one card under it has the
 // sentence and the same actions in the same order (Return to Home, Refresh current view). Wording unchanged.
 return <ScopedReadFrame lang={lang} unavailable={<div className="c-page c-page--narrow c-route-state c-route-state--checking" data-corp="">
  <BStateScreen title={name} back={back}>
   <BState kind="failed" line={message}>
    <div className="b-state-actions">
     <BButtonLink href="/app" kind="teal">{t.returnHome}</BButtonLink>
     {scoped?<BButtonLink href="/app/schedule" kind="quiet">{t.openSchedule}</BButtonLink>:null}
     <ScopedRefreshButton lang={lang}/>
    </div>
   </BState>
  </BStateScreen>
 </div>}/>;
}
