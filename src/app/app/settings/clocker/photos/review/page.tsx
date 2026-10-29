import Link from 'next/link';
import {requireRoles} from '@/lib/auth/permissions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ClockerOwnerNav} from '@/components/clocker-owner-nav';
import {ClockerPhotoReview} from '@/components/clocker-photo/photo-review';
import {SettingsFrame} from '../../../wave-c-kit';
import {listClockerPunchPhotosAction,readClockerPunchPhotoDetailAction,removeClockerPunchPhotoAction} from './actions';
export const dynamic='force-dynamic';
export default async function ClockerPunchPhotoReviewPage(){
 await requireRoles(['OWNER']);const proof=await requireSessionMutationProof();
 const source=await withOperationalCompany(proof,()=>listClockerPunchPhotosAction({limit:20,cursor:null}));
 if(source.state==='unavailable')return <OperationalUnavailable title="Photo review unavailable" reason={source.reason}/>;const result=source.data;
 return <ScopedReadFrame observation={source}><SettingsFrame title="Photo review" summary="Private company photos. Removing a photo preserves its time record."><ClockerOwnerNav current="photos"/>
  <p><Link className="q-btn q-btn--sec" href="/app/settings/clocker/photos">Photo settings &amp; assistance</Link></p>
  {result.state==='available'?<ClockerPhotoReview initialPage={result.page} listAction={listClockerPunchPhotosAction} detailAction={readClockerPunchPhotoDetailAction} removeAction={removeClockerPunchPhotoAction}/>:<section role="alert"><h2>Photo review is unavailable</h2><p>{result.message}</p><Link className="q-btn q-btn--sec" href="/app/settings/clocker/photos/review">Reload review</Link></section>}
 </SettingsFrame></ScopedReadFrame>;
}
