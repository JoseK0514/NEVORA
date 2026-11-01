'use client';

import {useRef,useState,type FormEvent} from 'react';
import type {PhotoCompanyNoticeSettings,PhotoNoticeProfileUpdate} from '@/lib/clocker/photo-server/contracts';
import type {PhotoNoticeActionResult} from '@/lib/clocker/photo-server/settings-types';
import {noticeSettingsDraft,noticeSettingsUpdate,readCompanyNoticeSettings,verifySavedNoticeSettings} from '@/lib/clocker/photo-client/notice-settings';
import {ClockerPhotoNotice} from './photo-notice';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {ReturnToNext} from '../team/return-to-next';

export function ClockerPhotoNoticeSettings({initialSettings,saveAction,readAction}:{initialSettings:PhotoCompanyNoticeSettings;
 saveAction:(input:PhotoNoticeProfileUpdate)=>Promise<PhotoNoticeActionResult>;readAction:()=>Promise<PhotoNoticeActionResult>}){
 const [settings,setSettings]=useState(()=>readCompanyNoticeSettings(initialSettings));
 const [draft,setDraft]=useState(()=>noticeSettingsDraft(initialSettings)),[pending,setPending]=useState(false);
 const [feedback,setFeedback]=useState<{text:string;error:boolean}|null>(null);const busy=useRef(false);const [mustReload,setMustReload]=useState(false);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||mustReload)return;let request:PhotoNoticeProfileUpdate;
  try{request=noticeSettingsUpdate(draft,settings.profile.version);}catch(error){setFeedback({text:error instanceof Error?error.message:'Check the help details.',error:true});return;}
  busy.current=true;setPending(true);setFeedback(null);
  try{const result=await saveAction(request);if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
   const saved=verifySavedNoticeSettings(result.settings,request);setSettings(saved);setDraft(noticeSettingsDraft(saved));
   setFeedback({text:'Help details saved. Saving doesn’t turn on photos.',error:false});
  }catch{setMustReload(true);setFeedback({text:'We couldn’t confirm that save. Reload help details before you try again.',error:true});}
  finally{busy.current=false;setPending(false);}
 }
 async function reload(){if(busy.current)return;busy.current=true;setPending(true);setFeedback(null);
  try{const result=await readAction();if(result.state!=='available'){setMustReload(true);setFeedback({text:result.message,error:true});return;}
   const current=readCompanyNoticeSettings(result.settings);setMustReload(false);setSettings(current);setDraft(noticeSettingsDraft(current));setFeedback({text:'Saved help details loaded. Unsaved changes were replaced.',error:false});
  }catch{setMustReload(true);setFeedback({text:'Couldn’t load saved help details. Your changes are still here.',error:true});}
  finally{busy.current=false;setPending(false);}
 }
 // Owner premium R13 (round 2): a closed row inside the Punch photos card ("Help for your team"). Opened, it holds this
 // form's two fields and its own Save; Reload shows only when a save couldn't be confirmed. Its own <form>, never nested
 // in the photo settings form, so neither reads the other's fields. The notice preview shows only once a notice exists.
 return <details className="c-photos__help" open={mustReload||undefined}>
  <summary className="c-row"><span className="c-row__main"><span className="c-row__title">Help for your team</span>
   <span className="c-row__detail"><span>{settings.profile.assistanceContact??'Not set yet'}</span></span></span><CaretDownIcon className="c-chev c-photos__caret" aria-hidden="true"/></summary>
  <form className="c-photos__helpform" onSubmit={save} aria-busy={pending} aria-labelledby="photo-assistance-title">
   <h3 className="c-sr" id="photo-assistance-title">Help for your team</h3>
   <fieldset disabled={pending} className="c-photos__fields"><legend className="c-sr">Help for your team</legend>
    {settings.companyName?null:<p className="c-field__help">Your company name is missing. Add it in Company profile.</p>}
    <div className="c-field"><label className="c-field__label" htmlFor="photo-assistance-contact">Assistance contact</label><input id="photo-assistance-contact" className="c-in" required maxLength={200} value={draft.assistanceContact} autoComplete="off" autoCorrect="off" enterKeyHint="next" aria-describedby="photo-contact-help" onChange={event=>setDraft({...draft,assistanceContact:event.target.value})}/>
     <span id="photo-contact-help" className="c-field__help">Who your team can ask for help, like a manager’s name and phone number.</span></div>
    <div className="c-field"><label className="c-field__label" htmlFor="photo-assistance-instructions">Assistance instructions</label><textarea id="photo-assistance-instructions" className="c-in" required maxLength={1000} rows={4} value={draft.assistanceInstructions} aria-describedby="photo-instructions-help" onChange={event=>setDraft({...draft,assistanceInstructions:event.target.value})}/>
     <span id="photo-instructions-help" className="c-field__help">How to ask for help. Shows on the tablet.</span></div>
    {settings.notice?<ClockerPhotoNotice policy={settings.policy} notice={settings.notice}/>:<p className="c-field__help">Saving this doesn’t turn on photos or show a notice to your team.</p>}
    {feedback?<p className={feedback.error?'c-photos__feedback c-photos__feedback--error':'c-photos__feedback'} role={feedback.error?'alert':'status'}>{feedback.text}</p>:null}
    <div className="c-photos__helpactions">
     {mustReload?<button className="c-btn c-btn--secondary" type="button" onClick={()=>void reload()}>Reload help details</button>:null}
     <button className="c-btn c-btn--secondary" type="submit" disabled={mustReload}>{pending?'Saving…':'Save help details'}</button>
    </div>
   </fieldset>
   <ReturnToNext/>
  </form>
 </details>;
}
