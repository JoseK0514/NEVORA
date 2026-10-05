'use client';
import {useId,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ShiftChangeForm} from './shift-change-form';
import {calloutReasonNoteError} from '../lib/shift-changes/command-parser';
const reasons=[['ILLNESS','Illness / sick'],['FAMILY_EMERGENCY','Family emergency'],['TRANSPORTATION','Transportation issue'],['SCHOOL','School conflict'],['PERSONAL_EMERGENCY','Personal emergency'],['OTHER','Other']];
/** Keep the employee's unsent reason in this mounted form during RSC refresh.
 * New terms require another deliberate submit; refresh never sends a report. */
export function ReviewedCalloutForm({fields}:{fields:Readonly<Record<string,string>>|null}){
 const [reason,setReason]=useState(''),[note,setNote]=useState('');const router=useRouter();
 const noteInput=useRef<HTMLTextAreaElement>(null),detailsId=useId();
 return <ShiftChangeForm fields={fields??{}} className="employee-form shift-change-form">
  <label>Reason<select name="reasonCode" value={reason} onChange={e=>{setReason(e.target.value);noteInput.current?.setCustomValidity(calloutReasonNoteError(e.target.value,note)??'');}} required><option value="" disabled>Select a reason</option>{reasons.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
  <label>Additional details <span id={detailsId}>Required when selecting Other: at least 3 characters of detail.</span><textarea ref={noteInput} aria-describedby={detailsId} required={reason==='OTHER'} minLength={reason==='OTHER'?3:undefined} name="reasonNote" maxLength={300} rows={4} value={note} onChange={e=>{setNote(e.target.value);e.target.setCustomValidity(calloutReasonNoteError(reason,e.target.value)??'');}} placeholder="Add any details management should know..."/></label>
  {!fields?<p role="alert">The assignment changed. Your reason is preserved. Refresh and review before submitting.</p>:null}
  {!fields?<button className="button secondary" type="button" onClick={()=>router.refresh()}>Refresh and review assignment</button>:null}
  <div className="form-footer"><Link className="button secondary" href="/app/exchange?tab=my">Cancel</Link><button className="employee-action primary" type="submit" disabled={!fields}>Submit Call-out</button></div>
 </ShiftChangeForm>;
}
