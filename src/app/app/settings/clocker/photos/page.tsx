import Link from 'next/link';
import {requireRoles} from '@/lib/auth/permissions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ClockerOwnerNav} from '@/components/clocker-owner-nav';
import {ClockerPhotoSettings} from '@/components/clocker-photo/photo-settings';
import {ClockerPhotoNoticeSettings} from '@/components/clocker-photo/notice-settings';
import {SettingsFrame} from '../../wave-c-kit';
import {CorpCard,CorpRow} from '@/components/corp/corp';
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
   <CorpCard as="div" ariaLabel="Photo capture availability"><div className="c-error-card c-photos__state"><span className="c-error-card__title">Photo capture is unavailable</span><span className="c-error-card__body">You can save your preferences. Photo collection is not active on your tablets.</span></div></CorpCard>
   {result.state==='available'?<ClockerPhotoSettings initialPolicy={result.policy} saveAction={saveClockerPhotoPolicyAction} readAction={readClockerPhotoPolicyAction}/>:<CorpCard as="div" ariaLabel="Photo settings unavailable"><div className="c-error-card" role="alert"><h2 className="c-error-card__title">Photo settings are unavailable</h2><p className="c-error-card__body">{result.message}</p><Link className="c-btn c-btn--secondary c-btn--md c-error-card__action" href="/app/settings/clocker/photos">Reload settings</Link></div></CorpCard>}
   {noticeResult.state==='available'?<ClockerPhotoNoticeSettings initialSettings={noticeResult.settings} saveAction={saveClockerPhotoNoticeAction} readAction={readClockerPhotoNoticeAction}/>:<CorpCard as="div" ariaLabel="Assistance settings unavailable"><div className="c-error-card" role="alert"><h2 className="c-error-card__title">Assistance settings are unavailable</h2><p className="c-error-card__body">{noticeResult.message}</p></div></CorpCard>}
   <CorpCard as="div" ariaLabel="Review"><CorpRow href="/app/settings/clocker/photos/review" title="Review punch photos" one chevron/></CorpCard>
  </div>
 </SettingsFrame></ScopedReadFrame>;
}
