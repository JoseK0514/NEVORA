import {requireRoles} from '@/lib/auth/permissions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ClockerOwnerNav} from '@/components/clocker-owner-nav';
import {ClockerPhotoReview} from '@/components/clocker-photo/photo-review';
import {SettingsFrame} from '../../../wave-c-kit';
import {CorpButtonLink,CorpErrorCard} from '@/components/corp/corp';
import '@/components/clocker-photo/photo-settings.css';
import {listClockerPunchPhotosAction,readClockerPunchPhotoDetailAction,removeClockerPunchPhotoAction} from './actions';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Review punch photos" };
export const dynamic='force-dynamic';
export default async function ClockerPunchPhotoReviewPage(){
 await requireRoles(['OWNER']);const proof=await requireSessionMutationProof();
 const source=await withOperationalCompany(proof,()=>listClockerPunchPhotosAction({limit:20,cursor:null}));
 if(source.state==='unavailable')return <OperationalUnavailable title="Photo review unavailable" reason={source.reason}/>;const result=source.data;
 return <ScopedReadFrame observation={source}><SettingsFrame back={{href:"/app/settings/clocker/photos",label:"Punch photos"}} title="Photo review" summary="Private company photos. Removing a photo preserves its time record."><ClockerOwnerNav current="photos"/>
  {/* Codex A2: the back link is the way to photo settings; the content sits in the settings page's 16px gutter. */}
  <div className="c-page c-embed c-photos c-page--narrow">
  {result.state==='available'?<ClockerPhotoReview initialPage={result.page} listAction={listClockerPunchPhotosAction} detailAction={readClockerPunchPhotoDetailAction} removeAction={removeClockerPunchPhotoAction}/>:<CorpErrorCard title="Photo review is unavailable" body={result.message} action={<CorpButtonLink href="/app/settings/clocker/photos/review" kind="secondary" size="md">Reload review</CorpButtonLink>}/>}
  </div>
 </SettingsFrame></ScopedReadFrame>;
}
