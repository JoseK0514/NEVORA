'use client';

import {useRef,useState,type FormEvent} from 'react';
import {PHOTO_ACTIONS,type PhotoPolicy,type PhotoPolicyUpdate} from '@/lib/clocker/photo-server/contracts';
import type {PhotoSettingsActionResult} from '@/lib/clocker/photo-server/settings-types';
import {photoSettingsDraft,photoSettingsUpdate,verifySavedPhotoPolicy} from '@/lib/clocker/photo-client/settings';
import {readPhotoPolicy} from '@/lib/clocker/photo-client/session';
import styles from './photo.module.css';

const labels={CLOCK_IN:'Clock in',START_BREAK:'Start break',END_BREAK:'End break',CLOCK_OUT:'Clock out'};
export function ClockerPhotoSettings({initialPolicy,saveAction,readAction}:{initialPolicy:PhotoPolicy;
  saveAction:(policy:PhotoPolicyUpdate)=>Promise<PhotoSettingsActionResult>;readAction:()=>Promise<PhotoSettingsActionResult>}) {
  const [policy,setPolicy]=useState(initialPolicy),[draft,setDraft]=useState(()=>photoSettingsDraft(initialPolicy));
  const [pending,setPending]=useState(false),[feedback,setFeedback]=useState<{text:string;error:boolean}|null>(null);
  const busy=useRef(false);const [mustReload,setMustReload]=useState(false);
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy.current||mustReload)return;
    let request:PhotoPolicyUpdate;
    try{request=photoSettingsUpdate(draft,policy.version);}
    catch(error){setFeedback({text:error instanceof Error?error.message:'Check the photo settings.',error:true});return;}
    busy.current=true;setPending(true);setFeedback(null);
    try{
      const result=await saveAction(request);
      if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
      const saved=verifySavedPhotoPolicy(result.policy,request);setPolicy(saved);setDraft(photoSettingsDraft(saved));
      setFeedback({text:'Company photo settings saved. These preferences apply when photo capture is available.',error:false});
    }catch{setMustReload(true);setFeedback({text:'The settings result could not be confirmed. Reload saved settings before trying again.',error:true});}
    finally{busy.current=false;setPending(false);}
  }
  async function reload(){
    if(busy.current)return;busy.current=true;setPending(true);setFeedback(null);
    try{
      const result=await readAction();
      if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
      const current=readPhotoPolicy(result.policy);setMustReload(false);setPolicy(current);setDraft(photoSettingsDraft(current));
      setFeedback({text:'Current saved settings loaded. Unsaved edits were replaced.',error:false});
    }catch{setMustReload(true);setFeedback({text:'Saved settings could not be loaded. Your edits have been kept.',error:true});}
    finally{busy.current=false;setPending(false);}
  }
  return <form onSubmit={save} className={styles.form} aria-busy={pending}>
    <div className={styles.notice}>These company preferences apply to registered Clocker tablets. Photos are snapshots associated with clock actions; this feature does not record continuous video or recognize faces.</div>
    <fieldset disabled={pending}>
      <legend>Company punch photos</legend>
      <label className={styles.row}><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/><div><strong>Enable punch photos</strong><span>Choose your company’s preference. Photo capture begins when the feature is available on your tablets.</span></div></label>
      <div><h2>Which punches need a photo?</h2><p className={styles.description}>All four punch events are selected initially. Choose what works for your company.</p></div>
      <div className={styles.eventGrid}>{PHOTO_ACTIONS.map(action=><label key={action} className={styles.row}>
        <input type="checkbox" checked={draft.events.includes(action)} onChange={e=>setDraft({...draft,events:e.target.checked?[...draft.events,action]:draft.events.filter(value=>value!==action)})}/>
        <div><strong>{labels[action]}</strong></div></label>)}</div>
      <label className={styles.field}>Keep photos for (days)<input aria-describedby="photo-retention-help" type="number" min={1} max={30} step={1} inputMode="numeric" value={draft.retentionDays} onChange={e=>setDraft({...draft,retentionDays:e.target.value})}/>
        <span id="photo-retention-help" className={styles.description}>Choose 1–30 days. New company settings start at 30 days. Expired photos are unavailable for normal review. Shortening retention also shortens existing photo lifetimes. Increasing it does not extend existing photos. Platform cleanup and backup details must be verified before collection.</span></label>
      <div className={styles.notice}><strong>Valid clock actions stay recorded</strong><p>A missing, declined or unavailable photo creates a separate photo exception. Employees can choose Continue without photo before opening the camera. Only an authorized Owner can review photos.</p>
        <p>Your company’s photo notice and assistance information must be available on Clocker before photos can be collected.</p></div>
      <div className={styles.footer}><button type="submit" disabled={mustReload} className={styles.primary}>{pending?'Saving…':'Save company settings'}</button>
        <button type="button" className={styles.secondary} onClick={()=>void reload()}>Reload saved settings</button><p>Current saved version: {policy.version}<br/>Only an authorized Owner can change these settings.</p></div>
    </fieldset>
    {feedback?<p role={feedback.error?'alert':'status'} className={styles.notice}>{feedback.text}</p>:null}
  </form>;
}
