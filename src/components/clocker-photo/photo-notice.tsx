'use client';
import type {PhotoNotice,PhotoPolicy} from '@/lib/clocker/photo-server/contracts';
import {parsePhotoNotice} from '@/lib/clocker/photo-server/validation';
import {useClockerCopy} from '../clocker-language';
import styles from './photo.module.css';
export function ClockerPhotoNotice({policy,notice}:{policy:PhotoPolicy;notice:PhotoNotice|null|undefined}){
 const t=useClockerCopy(),current=parsePhotoNotice(notice,policy);
 if(!current)return <p role="status" className={styles.notice}>{t('Your company photo notice is unavailable. Continue without a photo or ask your Owner for help.')}</p>;
 return <aside className={styles.photoNotice} aria-label={t('Company photo notice')}>
  <p className={styles.description}>{t('{company} uses a photo with selected clock actions. Photos are kept for {days} days. Only an authorized Owner can review them.',{company:current.companyName,days:current.retentionDays})}</p>
  <details><summary>{t('View photo notice')}</summary><div className={styles.notice}>
   <p>{t('Clocker takes one photo for this action. The camera stops after capture, cancellation, leaving this screen or verification expiry. It does not record continuously or recognize faces.')}</p>
   <p>{t('Expired photos are unavailable for review. Removing a photo preserves its time record.')}</p>
   <p>{current.cleanupDisclosure}</p><p>{current.backupDisclosure}</p>
   <p>{t('You can continue without a photo. Your clock action and photo exception are confirmed separately.')}</p>
  </div></details>
  <details><summary>{t('Get help')}</summary><div className={styles.notice}><p><strong>{current.assistanceContact}</strong></p><p>{current.assistanceInstructions}</p><p>{t('Use this contact for an assisted alternative, accessibility help or a photo removal request.')}</p></div></details>
 </aside>;
}
