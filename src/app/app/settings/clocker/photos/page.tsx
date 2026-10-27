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
import styles from '@/components/clocker-photo/photo.module.css';
import {readClockerPhotoPolicyAction,saveClockerPhotoPolicyAction,readClockerPhotoNoticeAction,saveClockerPhotoNoticeAction} from './actions';
export const dynamic='force-dynamic';
export default async function ClockerPhotosPage(){
 await requireRoles(['OWNER']);const proof=await requireSessionMutationProof();
 const source=await withOperationalCompany(proof,()=>Promise.all([readClockerPhotoPolicyAction(),readClockerPhotoNoticeAction()]));
 if(source.state==='unavailable')return <OperationalUnavailable title="Photo settings unavailable" reason={source.reason}/>;
 const [result,noticeResult]=source.data;
 return <ScopedReadFrame observation={source}><SettingsFrame title="Punch photos" summary="Company preferences for your shared Clocker tablets."><ClockerOwnerNav current="photos"/>
  <div className={styles.form}><section className={styles.notice} aria-label="Photo capture availability"><strong>Photo capture is unavailable</strong><p>You can save your preferences now. Camera collection requires verified platform setup and iPad acceptance before it can be activated.</p></section>
  <Link className="q-btn q-btn--sec" href="/app/settings/clocker/photos/review">Review punch photos</Link>
  {result.state==='available'?<ClockerPhotoSettings initialPolicy={result.policy} saveAction={saveClockerPhotoPolicyAction} readAction={readClockerPhotoPolicyAction}/>:<section role="alert"><h2>Photo settings are unavailable</h2><p>{result.message}</p><Link className="q-btn q-btn--sec" href="/app/settings/clocker/photos">Reload settings</Link></section>}
  {noticeResult.state==='available'?<ClockerPhotoNoticeSettings initialSettings={noticeResult.settings} saveAction={saveClockerPhotoNoticeAction} readAction={readClockerPhotoNoticeAction}/>:<section role="alert"><h2>Assistance settings are unavailable</h2><p>{noticeResult.message}</p></section>}</div>
 </SettingsFrame></ScopedReadFrame>;
}
