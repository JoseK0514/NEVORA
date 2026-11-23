import {requireRoles} from '@/lib/auth/permissions';
import {ClockerGraceSettings} from '@/components/clocker-schedule-grace';
import {clockerOwnerCopy} from '@/components/clocker-owner-copy';
import {CorpErrorCard} from '@/components/corp/corp';
import {CorpRetryButton} from '@/components/corp/corp-client';
import {SettingsPageB} from '../../settings-b';
import '@/components/clocker-owner-page.css';
import '@/components/clocker-owner-b.css';
import '@/components/clocker-schedule-grace.css';
import {readClockerGraceAction,saveClockerGraceAction} from './actions';
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../../settings-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].shiftMatching }; }
export const dynamic='force-dynamic';
/** The Owner's shift-matching setting for the Clocker: the early clock-in grace. A failed read shows the error card,
 * never a 0 the server did not confirm. */
export default async function ClockerMatchingPage(){
 await requireRoles(['OWNER']);
 const lang=await readPageLang(),result=await readClockerGraceAction(),t=clockerOwnerCopy[lang];
 // Final fixes S2 (G85): the card is a direct child of the page, and a phone saves from the band (shown once the value
 // changed), as every Settings form does; tablets and desktop save from the card's footer.
 return <SettingsPageB back={{href:"/app/settings",label:t.settings}} className="ck-owner ck-frame ck-matching c-grace" title={t.matchingTitle} titleId="clocker-matching-title" lang={lang === "es" ? "es" : undefined}
  phoneRight={result.state==='available'?<button type="submit" form="clocker-grace-form" className="c-setb-save">{t.graceSave}</button>:undefined}>
  {result.state==='available'
   ?<ClockerGraceSettings initial={result.setting} saveAction={saveClockerGraceAction} readAction={readClockerGraceAction} lang={lang}/>
   :<CorpErrorCard title={t.graceLoadFailedTitle} body={t.graceLoadFailedBody} action={<CorpRetryButton>{t.tryAgain}</CorpRetryButton>}/>}
 </SettingsPageB>;
}
