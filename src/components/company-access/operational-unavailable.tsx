import Link from 'next/link';
import type {AccessFailure} from '@/lib/company-access/model';
import {ScopedReadFrame} from './scoped-read-frame';
import {ScopedRefreshButton} from './scoped-refresh';
import {BButtonLink,BState,BStateScreen} from '../owner-b/b-kit';

/** The page's own name for its band when it is closed to this person: "Christmas bonus hours unavailable" is the page
 * "Christmas bonus hours". */
const pageName=(title:string)=>title.replace(/\s+(?:is\s+)?unavailable$/i,'').replace(/\s+no\s+(?:está\s+)?disponibles?$/i,'')||title;

/** Signed-in Spanish: the notice's own words in each portal language (English unchanged, tú). */
export const OPERATIONAL_UNAVAILABLE_COPY={
 en:{page:'Page unavailable',outside:'Outside the locations you manage',companyWide:'Company-wide access needed',pickPlace:'Pick one of your places to see it.',
  ownerCanGive:'An Owner can give it to you.',openSchedule:'Open your schedule',home:'Return to Home',
  changed:'Your access or the company information changed. Reload to review current information.',
  limit:'This information could not be loaded completely. Reload or contact your Owner if this continues.',
  notConfigured:'Workspace information is not ready. Ask your Owner to review company setup.',
  failed:'Current information could not be confirmed. Reconnect and reload this page.'},
 es:{page:'Página no disponible',outside:'Fuera de las localidades que administras',companyWide:'Necesitas acceso a toda la compañía',pickPlace:'Elige una de tus localidades para verla.',
  ownerCanGive:'Un Dueño te lo puede dar.',openSchedule:'Abrir tu horario',home:'Volver a Inicio',
  changed:'Tu acceso o la información de la compañía cambió. Recarga para ver la información actual.',
  limit:'No pudimos cargar toda la información. Recarga o comunícate con tu Dueño si sigue pasando.',
  notConfigured:'La información de la compañía no está lista. Pídele a tu Dueño que revise la configuración.',
  failed:'No pudimos confirmar la información actual. Vuelve a conectarte y recarga esta página.'},
} as const;

export function OperationalUnavailable({title:titleProp,reason,scoped=false,back,closed,lang='en'}:{title?:string;reason:AccessFailure;scoped?:boolean;
 /** Signed-in Spanish: the notice's language (English when left out). */
 lang?:'en'|'es';
 /** SCRUM-215: a page closed because an action grant is missing names that grant and who decides instead. */
 closed?:{title:string;line:string;lang?:'en'|'es'};
 /** Review 30 (D08): the page's way back on the band ("‹ Insights"), as the page itself has, when the page couldn't be
  * read. A page closed for lack of access keeps none: its way back needs the same access. */
 back?:{href:string;label:string}}){
 const t=OPERATIONAL_UNAVAILABLE_COPY[lang],title=titleProp??t.page;
 // Review 30 (D09): a page that needs company-wide access is closed to this Manager, not broken. It is the designed closed
 // state (DESIGN.MD Phase 3, Closed pages): the page's name on the band, the lock in its 48px circle, the reason as the
 // card's title, who can change it, and one tinted step, with signing in again as the quiet way when access just changed.
 // Gate (Nov 23): the line under the title doesn't repeat it. A location-scoped Manager's view keeps its schedule as the step.
 if(reason==='access_denied')return <ScopedReadFrame unavailable={<div className="c-page c-page--narrow c-route-state c-route-state--checking" data-corp="">
  {/* No back link here: the page it leads to (Insights for Christmas bonus hours) needs the same access. */}
  <BStateScreen title={pageName(title)}>
   <BState kind="locked" title={closed?<span lang={closed.lang}>{closed.title}</span>:scoped?t.outside:t.companyWide}
    line={closed?<span lang={closed.lang}>{closed.line}</span>:scoped?t.pickPlace:t.ownerCanGive}>
    <div className="b-state-actions b-closed-actions">
     {scoped?<BButtonLink href="/app/schedule" kind="ghost">{t.openSchedule}</BButtonLink>:<BButtonLink href="/app" kind="ghost">{t.home}</BButtonLink>}
     {/* QA A3-06 recheck (Nov 22, 2026): no "Sign in again" here. The person is signed in and lacks access, which is
       * checked live on every load, so signing in again never helps (this drops DESIGN.MD's quiet sign-in link). */}
     {scoped?<Link className="b-closed-also" href="/app">{t.home}</Link>:null}
    </div>
   </BState>
  </BStateScreen>
 </div>}/>;
 const message=reason==='source_changed'?t.changed:reason==='source_limit'?t.limit:reason==='not_configured'?t.notConfigured:t.failed;
 // Phase 2 (package D): the one state screen at every width. The band carries the title; one card under it has the
 // sentence and the same actions in the same order (Return to Home, Refresh current view). Wording unchanged.
 return <ScopedReadFrame unavailable={<div className="c-page c-page--narrow c-route-state c-route-state--checking" data-corp="">
  <BStateScreen title={title} back={back}>
   <BState kind="failed" line={message}>
    <div className="b-state-actions">
     <BButtonLink href="/app" kind="teal">{t.home}</BButtonLink>
     {scoped?<BButtonLink href="/app/schedule" kind="quiet">{t.openSchedule}</BButtonLink>:null}
     <ScopedRefreshButton/>
    </div>
   </BState>
  </BStateScreen>
 </div>}/>;
}
