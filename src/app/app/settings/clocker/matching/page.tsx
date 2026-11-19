import {requireRoles} from '@/lib/auth/permissions';
import {ClockerGraceSettings} from '@/components/clocker-schedule-grace';
import {clockerOwnerCopy} from '@/components/clocker-owner-copy';
import {CorpErrorCard} from '@/components/corp/corp';
import {CorpRetryButton} from '@/components/corp/corp-client';
import {SettingsFrame} from '../../wave-c-kit';
import '@/components/clocker-owner-b.css';
import '@/components/clocker-schedule-grace.css';
import {readClockerGraceAction,saveClockerGraceAction} from './actions';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Shift matching" };
export const dynamic='force-dynamic';
/** The Owner's shift-matching setting for the Clocker: the early clock-in grace. A failed read shows the error card,
 * never a 0 the server did not confirm. */
export default async function ClockerMatchingPage(){
 await requireRoles(['OWNER']);
 const result=await readClockerGraceAction(),t=clockerOwnerCopy.en;
 return <SettingsFrame back={{href:"/app/settings",label:t.settings}} className="ck-owner ck-matching" title={t.matchingTitle} summary={t.matchingSub}>
  <div className="c-page c-embed c-grace c-page--narrow">
   {result.state==='available'
    ?<ClockerGraceSettings initial={result.setting} saveAction={saveClockerGraceAction} readAction={readClockerGraceAction}/>
    :<CorpErrorCard title={t.graceLoadFailedTitle} body={t.graceLoadFailedBody} action={<CorpRetryButton>{t.tryAgain}</CorpRetryButton>}/>}
  </div>
 </SettingsFrame>;
}
