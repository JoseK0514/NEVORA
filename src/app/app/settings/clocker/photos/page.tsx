import {scopedObservation} from '@/lib/company-access/observation';
import {requireRoles} from '@/lib/auth/permissions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ClockerPhotoSettings} from '@/components/clocker-photo/photo-settings';
import {ClockerPhotoNoticeSettings} from '@/components/clocker-photo/notice-settings';
import {SettingsPageB} from '../../settings-b';
import '@/components/clocker-owner-page.css';
import {CorpCard,CorpErrorCard,CorpRow} from '@/components/corp/corp';
import {CorpRetryButton} from '@/components/corp/corp-client';
import '@/components/clocker-photo/photo-settings.css';
import '@/components/clocker-owner-b.css';
import {clockerOwnerCopy} from '@/components/clocker-owner-copy';
import {readClockerPhotoPolicyAction,saveClockerPhotoPolicyAction,readClockerPhotoNoticeAction,saveClockerPhotoNoticeAction} from './actions';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Punch photos" };
export const dynamic='force-dynamic';
export default async function ClockerPhotosPage(){
 await requireRoles(['OWNER']);const proof=await requireSessionMutationProof();
 const source=await withOperationalCompany(proof,()=>Promise.all([readClockerPhotoPolicyAction(),readClockerPhotoNoticeAction()]));
 if(source.state==='unavailable')return <OperationalUnavailable title="Photo settings unavailable" reason={source.reason}/>;
 const [result,noticeResult]=source.data,t=clockerOwnerCopy.en;
 const help=noticeResult.state==='available'
  ?<ClockerPhotoNoticeSettings initialSettings={noticeResult.settings} saveAction={saveClockerPhotoNoticeAction} readAction={readClockerPhotoNoticeAction}/>
  :<div className="c-photos__helperror" role="alert"><span className="c-row__title">{t.photosHelpFailedTitle}</span><span className="c-field__help">{noticeResult.message}</span><CorpRetryButton/></div>;
 const review=<CorpRow href="/app/settings/clocker/photos/review" title={t.photosReview} detail={t.photosReviewSub} chevron/>;
 return <ScopedReadFrame observation={scopedObservation(source)}><SettingsPageB back={{href:"/app/settings",label:t.settings}} className="ck-owner ck-frame ck-photos c-photos" title={t.photosTitle} titleId="clocker-photos-title"
  phoneRight={result.state==='available'?<button type="submit" form="photo-policy-form" className="c-setb-save">{t.photosSave}</button>:undefined}>
  {/* Owner premium R13 (round 2): while capture is unavailable, one card says so, holds the settings and their one Save,
    with help for your team and review as rows inside it. The same two reads, forms and actions as before. */}
   {result.state==='available'
    ?<ClockerPhotoSettings initialPolicy={result.policy} saveAction={saveClockerPhotoPolicyAction} readAction={readClockerPhotoPolicyAction}>{help}{review}</ClockerPhotoSettings>
    :<><CorpErrorCard title={t.photosLoadFailedTitle} body={result.message} action={<CorpRetryButton>{t.photosReload}</CorpRetryButton>}/><CorpCard as="div" ariaLabel="Help and review">{help}{review}</CorpCard></>}
 </SettingsPageB></ScopedReadFrame>;
}
