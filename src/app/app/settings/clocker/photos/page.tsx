import {requireRoles} from '@/lib/auth/permissions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ClockerOwnerNav} from '@/components/clocker-owner-nav';
import {ClockerPhotoSettings} from '@/components/clocker-photo/photo-settings';
import {ClockerPhotoNoticeSettings} from '@/components/clocker-photo/notice-settings';
import {SettingsFrame} from '../../wave-c-kit';
import {CorpCard,CorpErrorCard,CorpRow} from '@/components/corp/corp';
import {CorpRetryButton} from '@/components/corp/corp-client';
import '@/components/clocker-photo/photo-settings.css';
import {readClockerPhotoPolicyAction,saveClockerPhotoPolicyAction,readClockerPhotoNoticeAction,saveClockerPhotoNoticeAction} from './actions';
export const dynamic='force-dynamic';
export default async function ClockerPhotosPage(){
 await requireRoles(['OWNER']);const proof=await requireSessionMutationProof();
 const source=await withOperationalCompany(proof,()=>Promise.all([readClockerPhotoPolicyAction(),readClockerPhotoNoticeAction()]));
 if(source.state==='unavailable')return <OperationalUnavailable title="Photo settings unavailable" reason={source.reason}/>;
 const [result,noticeResult]=source.data;
 const help=noticeResult.state==='available'
  ?<ClockerPhotoNoticeSettings initialSettings={noticeResult.settings} saveAction={saveClockerPhotoNoticeAction} readAction={readClockerPhotoNoticeAction}/>
  :<div className="c-photos__helperror" role="alert"><span className="c-row__title">Couldn’t load help for your team</span><span className="c-field__help">{noticeResult.message}</span><CorpRetryButton/></div>;
 const review=<CorpRow href="/app/settings/clocker/photos/review" title="Review punch photos" one chevron/>;
 return <ScopedReadFrame observation={source}><SettingsFrame back={{href:"/app/settings",label:"Settings"}} title="Punch photos" summary="Photos on your shared Clocker tablets."><ClockerOwnerNav current="photos"/>
  {/* Owner premium R13 (round 2): while capture is unavailable, one card says so, holds the settings and their one Save,
    with help for your team and review as rows inside it. The same two reads, forms and actions as before. */}
  <div className="c-page c-embed c-photos c-page--narrow">
   {result.state==='available'
    ?<ClockerPhotoSettings initialPolicy={result.policy} saveAction={saveClockerPhotoPolicyAction} readAction={readClockerPhotoPolicyAction}>{help}{review}</ClockerPhotoSettings>
    :<><CorpErrorCard title="Couldn’t load photo settings" body={result.message} action={<CorpRetryButton>Reload settings</CorpRetryButton>}/><CorpCard as="div" ariaLabel="Help and review">{help}{review}</CorpCard></>}
  </div>
 </SettingsFrame></ScopedReadFrame>;
}
