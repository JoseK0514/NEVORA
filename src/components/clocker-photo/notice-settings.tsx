'use client';

import {useRef,useState,type FormEvent} from 'react';
import type {PhotoCompanyNoticeSettings,PhotoNoticeProfileUpdate} from '@/lib/clocker/photo-server/contracts';
import type {PhotoNoticeActionResult} from '@/lib/clocker/photo-server/settings-types';
import {noticeSettingsDraft,noticeSettingsUpdate,readCompanyNoticeSettings,verifySavedNoticeSettings} from '@/lib/clocker/photo-client/notice-settings';
import {ClockerPhotoNotice} from './photo-notice';
import {CorpBody,CorpCard} from '../corp/corp';
import {ReturnToNext} from '../team/return-to-next';

export function ClockerPhotoNoticeSettings({initialSettings,saveAction,readAction}:{initialSettings:PhotoCompanyNoticeSettings;
 saveAction:(input:PhotoNoticeProfileUpdate)=>Promise<PhotoNoticeActionResult>;readAction:()=>Promise<PhotoNoticeActionResult>}){
 const [settings,setSettings]=useState(()=>readCompanyNoticeSettings(initialSettings));
 const [draft,setDraft]=useState(()=>noticeSettingsDraft(initialSettings)),[pending,setPending]=useState(false);
 const [feedback,setFeedback]=useState<{text:string;error:boolean}|null>(null);const busy=useRef(false);const [mustReload,setMustReload]=useState(false);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||mustReload)return;let request:PhotoNoticeProfileUpdate;
  try{request=noticeSettingsUpdate(draft,settings.profile.version);}catch(error){setFeedback({text:error instanceof Error?error.message:'Check the assistance fields.',error:true});return;}
  busy.current=true;setPending(true);setFeedback(null);
  try{const result=await saveAction(request);if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
   const saved=verifySavedNoticeSettings(result.settings,request);setSettings(saved);setDraft(noticeSettingsDraft(saved));
   setFeedback({text:saved.readiness==='ready'?'Company assistance settings saved. The current photo notice is prepared. Photo collection has not been activated.'
    :'Company assistance settings saved. The photo notice is not ready yet; photo collection remains unavailable.',error:false});
  }catch{setMustReload(true);setFeedback({text:'The save result could not be confirmed. Reload the current assistance settings before trying again.',error:true});}
  finally{busy.current=false;setPending(false);}
 }
 async function reload(){if(busy.current)return;busy.current=true;setPending(true);setFeedback(null);
  try{const result=await readAction();if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
   const current=readCompanyNoticeSettings(result.settings);setMustReload(false);setSettings(current);setDraft(noticeSettingsDraft(current));setFeedback({text:'Current company assistance settings loaded. Unsaved edits were replaced.',error:false});
  }catch{setMustReload(true);setFeedback({text:'Company assistance settings could not be loaded. Your edits were kept.',error:true});}
  finally{busy.current=false;setPending(false);}
 }
 // Owner premium (visual-craft "Punch photos"): one kit card with the two fields; the notice preview below it.
 return <form className="c-photos__form" onSubmit={save} aria-busy={pending} aria-labelledby="photo-assistance-title">
  <fieldset disabled={pending} className="c-photos__fields"><legend className="c-sr">Photo notice &amp; assistance</legend>
   <CorpCard label={<span id="photo-assistance-title">Photo notice &amp; assistance</span>}>
    <CorpBody>
     <div className="c-form">
      <p className="c-field__help">{settings.companyName?<>Company: <strong>{settings.companyName}</strong>. The company name follows your company profile.</>:'Your company name could not be confirmed. Photo collection remains unavailable.'}</p>
      <div className="c-field"><label className="c-field__label" htmlFor="photo-assistance-contact">Assistance contact</label><input id="photo-assistance-contact" className="c-in" required maxLength={200} value={draft.assistanceContact} autoComplete="off" autoCorrect="off" enterKeyHint="next" aria-describedby="photo-contact-help" onChange={event=>setDraft({...draft,assistanceContact:event.target.value})}/>
       <span id="photo-contact-help" className="c-field__help">Use a real person, team or contact method employees can reach for questions and assisted clock actions.</span></div>
      <div className="c-field"><label className="c-field__label" htmlFor="photo-assistance-instructions">Assistance instructions</label><textarea id="photo-assistance-instructions" className="c-in" required maxLength={1000} rows={4} value={draft.assistanceInstructions} aria-describedby="photo-instructions-help" onChange={event=>setDraft({...draft,assistanceInstructions:event.target.value})}/>
       <span id="photo-instructions-help" className="c-field__help">Explain how to request help or an accessible alternative. Instructions appear as one paragraph on Clocker.</span></div>
     </div>
    </CorpBody>
    <div className="c-card__foot c-photos__foot"><button className="c-btn c-btn--secondary" type="button" onClick={()=>void reload()}>Reload assistance settings</button><button className="c-btn c-btn--secondary" type="submit" disabled={mustReload}>{pending?'Saving…':'Save assistance settings'}</button></div>
   </CorpCard>
  </fieldset>
  {feedback?<p className={feedback.error?'c-photos__feedback c-photos__feedback--error':'c-photos__feedback'} role={feedback.error?'alert':'status'}>{feedback.text}</p>:null}
  <ReturnToNext/>
  <CorpCard label={<span id="company-photo-notice-preview">Current company notice</span>}>
   <CorpBody>{settings.notice?<ClockerPhotoNotice policy={settings.policy} notice={settings.notice}/>:<p className="c-field__help">Photo cleanup and backup details are still being verified; photo collection remains unavailable. Saving assistance does not publish a notice or activate photo collection.</p>}</CorpBody>
  </CorpCard>
 </form>;
}
