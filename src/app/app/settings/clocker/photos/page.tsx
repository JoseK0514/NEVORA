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
 return <ScopedReadFrame observation={source}><SettingsFrame back={{href:"/app/settings",label:"Settings"}} title="Punch photos" summary="Company preferences for your shared Clocker tablets."><ClockerOwnerNav current="photos"/>
  {/* Owner premium (visual-craft "Punch photos"): rebuilt on the kit, with 16px gutters on a phone. The state of capture
    first, then the settings cards, then review. Same reads, forms and actions. */}
  <div className="c-page c-embed c-photos c-page--narrow">
   <CorpErrorCard live={false} title="Photo capture is unavailable" body="You can save your preferences. Photo collection is not active on your tablets."/>
   {result.state==='available'?<ClockerPhotoSettings initialPolicy={result.policy} saveAction={saveClockerPhotoPolicyAction} readAction={readClockerPhotoPolicyAction}/>:<CorpErrorCard title="Photo settings are unavailable" body={result.message} action={<CorpRetryButton>Reload settings</CorpRetryButton>}/>}
   {noticeResult.state==='available'?<ClockerPhotoNoticeSettings initialSettings={noticeResult.settings} saveAction={saveClockerPhotoNoticeAction} readAction={readClockerPhotoNoticeAction}/>:<CorpErrorCard title="Assistance settings are unavailable" body={noticeResult.message} action={<CorpRetryButton/>}/>}
   <CorpCard as="div" ariaLabel="Review"><CorpRow href="/app/settings/clocker/photos/review" title="Review punch photos" one chevron/></CorpCard>
  </div>
 </SettingsFrame></ScopedReadFrame>;
}
