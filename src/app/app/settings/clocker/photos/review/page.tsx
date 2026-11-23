import {scopedObservation} from '@/lib/company-access/observation';
import {requireRoles} from '@/lib/auth/permissions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ClockerOwnerNav} from '@/components/clocker-owner-nav';
import {ClockerPhotoReview} from '@/components/clocker-photo/photo-review';
import {SettingsPageB} from '../../../settings-b';
import {CorpButtonLink,CorpErrorCard} from '@/components/corp/corp';
import {listClockerPunchPhotosAction,readClockerPunchPhotoDetailAction,removeClockerPunchPhotoAction} from './actions';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Review punch photos" };
export const dynamic='force-dynamic';
export default async function ClockerPunchPhotoReviewPage(){
 await requireRoles(['OWNER']);const proof=await requireSessionMutationProof();
 const source=await withOperationalCompany(proof,()=>listClockerPunchPhotosAction({limit:20,cursor:null}));
 if(source.state==='unavailable')return <OperationalUnavailable title="Photo review unavailable" reason={source.reason}/>;const result=source.data;
 return <ScopedReadFrame observation={scopedObservation(source)}><SettingsPageB back={{href:"/app/settings/clocker/photos",label:"Punch photos"}} title="Photo review" titleId="photo-review-title"><ClockerOwnerNav current="photos"/>
  {/* Phase 2 (Nov 23, 2026): the cards are the Settings page's own, in its frame (no second page inside it). */}
  {result.state==='available'?<ClockerPhotoReview initialPage={result.page} listAction={listClockerPunchPhotosAction} detailAction={readClockerPunchPhotoDetailAction} removeAction={removeClockerPunchPhotoAction}/>:<CorpErrorCard title="Photo review is unavailable" body={result.message} action={<CorpButtonLink href="/app/settings/clocker/photos/review" kind="secondary" size="md">Reload review</CorpButtonLink>}/>}
 </SettingsPageB></ScopedReadFrame>;
}
