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
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../../../settings-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].reviewPunchPhotos }; }
export const dynamic='force-dynamic';
export default async function ClockerPunchPhotoReviewPage(){
 await requireRoles(['OWNER']);const proof=await requireSessionMutationProof();const lang=await readPageLang(),t=SETTINGS_COPY[lang];
 const source=await withOperationalCompany(proof,()=>listClockerPunchPhotosAction({limit:20,cursor:null}));
 if(source.state==='unavailable')return <OperationalUnavailable lang={lang} title={t.photoReviewUnavailable} reason={source.reason}/>;const result=source.data;
 return <ScopedReadFrame observation={scopedObservation(source)}><SettingsPageB back={{href:"/app/settings/clocker/photos",label:t.punchPhotos}} title={t.photoReview} titleId="photo-review-title" lang={lang === "es" ? "es" : undefined}><ClockerOwnerNav current="photos"/>
  {/* Phase 2 (Nov 23, 2026): the cards are the Settings page's own, in its frame (no second page inside it). */}
  {result.state==='available'?<ClockerPhotoReview initialPage={result.page} listAction={listClockerPunchPhotosAction} detailAction={readClockerPunchPhotoDetailAction} removeAction={removeClockerPunchPhotoAction}/>:<CorpErrorCard title={t.photoReviewIsUnavailable} body={result.message} action={<CorpButtonLink href="/app/settings/clocker/photos/review" kind="secondary" size="md">{t.reloadReview}</CorpButtonLink>}/>}
 </SettingsPageB></ScopedReadFrame>;
}
