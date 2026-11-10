'use client';
import Link from 'next/link';
import {useRef,useState,type ReactNode} from 'react';
import type {OperationalShiftEditorData} from '@/lib/company-access/model';
import {addDays,formatDayLabel,formatTime,formatWeekRange,isDateInWeek} from '@/lib/date-utils';
import {ConfigurationForm,type ConfigurationResult} from '@/components/configuration-form';
import {SelectField} from '@/components/select-field';
import {NavIcon} from '@/components/nav-icon';
import styles from './company-access.module.css';

type Prefill={date?:string;employeeId?:string;positionId?:string;startTime?:string;endTime?:string;lead?:boolean};
type Props={data:OperationalShiftEditorData;action:(data:FormData)=>Promise<ConfigurationResult>;deleteAction?:(data:FormData)=>Promise<unknown>;locationName?:string;prefill?:Prefill;feedback?:ReactNode};
/** Uses the minimal scoped DTO directly. Existing server actions reauthorize and
 * validate the complete assignment; a read hint or sourceVersion is not authority.
 */
export function ScopedManualShiftForm(props:Props){
 const {data,prefill}=props;
 return <ScopedManualShiftEditor key={JSON.stringify([data.shift?.id??null,data.weekStart,data.locationId,data.shift?null:prefill??null])} {...props}/>;
}
function ScopedManualShiftEditor({data,action,deleteAction,locationName,prefill={},feedback}:Props){
 const shift=data.shift;
 const initialPerson=shift?.employeeId??(data.employeeOptions.some(p=>p.id===prefill.employeeId)?prefill.employeeId:'')??'';
 const initialPosition=shift?.positionId??(data.employeeOptions.find(p=>p.id===initialPerson)?.positionIds.includes(prefill.positionId??'')&&data.positionOptions.some(p=>p.id===prefill.positionId)?prefill.positionId:'')??'';
 const [person,setPerson]=useState(initialPerson),[position,setPosition]=useState(initialPosition);
 const [date,setDate]=useState(shift?.date??(prefill.date&&isDateInWeek(prefill.date,data.weekStart)?prefill.date:data.weekStart));
 const [start,setStart]=useState(shift?.startTime??prefill.startTime??'');
 const initialEnd=shift?.endTime??prefill.endTime??'';
 const [end,setEnd]=useState(initialEnd==='24:00'?'00:00':initialEnd),[retainedMidnight,setRetainedMidnight]=useState(initialEnd==='24:00');
 const [lead,setLead]=useState(shift?.isDesignatedLead??prefill.lead??false),[uncertain,setUncertain]=useState(false);
 const [working,setWorking]=useState(false),[removing,setRemoving]=useState(false),[confirmDelete,setConfirmDelete]=useState(false),[deleteFeedback,setDeleteFeedback]=useState('');
 const busy=useRef(false);
 const employee=data.employeeOptions.find(p=>p.id===person);
 const choices=data.positionOptions.filter(p=>employee?.positionIds.includes(p.id));
 const retainedPosition=!!position&&!choices.some(p=>p.id===position);
 const retainedPerson=!!person&&!data.employeeOptions.some(p=>p.id===person);
 const back='/app/schedule?'+new URLSearchParams({week:data.weekStart,location:data.locationId});
 const recordedPeriod=shift?`${formatDayLabel(shift.date).weekday}, ${formatDayLabel(shift.date).day}, ${formatTime(shift.startTime)}–${formatTime(shift.endTime)}${shift.endTime==='24:00'||shift.endTime<shift.startTime?' the following day':''}`:'';
 async function perform(fields:FormData,submit:(fields:FormData)=>Promise<unknown>=action):Promise<ConfigurationResult>{
  if(busy.current||uncertain)return {error:'Review the original save before making another change.'};
  busy.current=true;setWorking(true);let timer:ReturnType<typeof setTimeout>|undefined;
  try{
   const result=await Promise.race([submit(fields),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Change not confirmed')),20000);})]);
   if(!result||typeof result!=='object')throw Error('Save not confirmed');
   const feedback=result as Record<string,unknown>;
   if(typeof feedback.error!=='string'&&typeof feedback.success!=='string')throw Error('Change not confirmed');
   return {error:typeof feedback.error==='string'?feedback.error:undefined,success:typeof feedback.success==='string'?feedback.success:undefined};
  }catch{
   setUncertain(true);
   return {error:'This change could not be confirmed. Review the current schedule before making another change; the action may already have completed.'};
  }finally{clearTimeout(timer);busy.current=false;setWorking(false);}
 }
 async function remove(){if(!shift||!deleteAction||busy.current||uncertain)return;setRemoving(true);try{const fields=new FormData();fields.set('shiftId',shift.id);const feedback=await perform(fields,deleteAction);setDeleteFeedback(feedback.error??feedback.success??'Review the current schedule before continuing.');}finally{setRemoving(false);}}
 return <div className={styles.scopedPage}><header><h1>{shift?'Edit draft shift':'Create shift'}</h1><p>{locationName??'Your selected location'} · {formatWeekRange(data.weekStart)}</p></header>
  {feedback}<ConfigurationForm action={fields=>perform(fields)} className={styles.scopedForm}>
   <fieldset disabled={uncertain||working} className={styles.stack}>
    <input type="hidden" name="weekStart" value={data.weekStart}/><input type="hidden" name="locationId" value={data.locationId}/>{shift&&<input type="hidden" name="shiftId" value={shift.id}/>}
    <section className={'panel '+styles.stack}><h2>Assignment</h2>{!data.employeeOptions.length&&<p role="status">No eligible employees are available at this location. Ask your Owner to review employee assignments.</p>}
     <SelectField className={styles.search} name="employeeId" label="Employee" value={person} required onChange={event=>{const next=event.target.value;setPerson(next);setPosition(current=>data.employeeOptions.find(p=>p.id===next)?.positionIds.includes(current)?current:'');setLead(false);}} options={[{value:'',label:'Select employee',disabled:true},...(retainedPerson?[{value:person,label:(shift?.employeeName??'Current employee')+' (unavailable)',disabled:true}]:[]),...data.employeeOptions.map(p=>({value:p.id,label:p.name}))]}/>
     {employee&&<p className="muted">Selected employee: {employee.name} ({employee.id})</p>}
     <SelectField className={styles.search} name="positionId" label="Position" value={position} onChange={event=>setPosition(event.target.value)} options={[{value:'',label:'No position'},...choices.map(p=>({value:p.id,label:p.name})),...(retainedPosition?[{value:position,label:'Current position (unavailable)',disabled:true}]:[])]}/>
     <label className={styles.scopedLead}><input type="checkbox" name="isDesignatedLead" checked={lead} onChange={event=>setLead(event.target.checked)}/><span>Shift lead<small>For an Owner, Manager, or Lead. Eligibility is checked when you save.</small></span></label>
    </section>
    <section className={'panel '+styles.stack}><h2>Date and time</h2>
     <label className={styles.search}>Date<input type="date" name="date" value={date} onChange={event=>setDate(event.target.value)} min={data.weekStart} max={addDays(data.weekStart,6)} required/></label>
     <div className={styles.scopedTimes}><label className={styles.search}>Start time<input type="time" name="startTime" value={start} onChange={event=>setStart(event.target.value)} required/></label><label className={styles.search}>End time<input type="time" value={end} onChange={event=>{setEnd(event.target.value);setRetainedMidnight(false);}} required/><input type="hidden" name="endTime" value={retainedMidnight?'24:00':end}/></label></div>
     {retainedMidnight||!!start&&!!end&&end<start?<p className="muted">This shift ends the following day.</p>:null}
     <label className={styles.search}><span>Notes <small className="muted">(optional)</small></span><textarea name="notes" defaultValue={shift?.notes??''} rows={3}/></label>
    </section>
    <p className="muted">NEVORA checks current access, qualifications, availability and schedule conflicts when you save.</p>
    <div className={styles.actions}><Link className="button secondary" href={back}>Cancel</Link><button className="button primary" type="submit" disabled={!data.employeeOptions.length}><NavIcon name="shift"/>Save shift</button></div>
   </fieldset>
  </ConfigurationForm>
  {shift&&deleteAction&&<section className={'panel '+styles.stack} aria-busy={removing}><h2>Delete draft shift</h2>{confirmDelete?<><p>Delete the draft for {shift.employeeName} on {recordedPeriod}? This removes the recorded shift from the schedule.</p><div className={styles.actions}><button type="button" className="button danger-button" disabled={working||uncertain} onClick={()=>void remove()}>{removing?'Deleting…':'Delete this draft shift'}</button><button type="button" className="button secondary" disabled={working||uncertain} onClick={()=>setConfirmDelete(false)}>Keep shift</button></div></>:<button type="button" className="button secondary" disabled={working||uncertain} onClick={()=>setConfirmDelete(true)}>Review deletion</button>}{removing&&<p role="status">Deleting shift…</p>}{deleteFeedback&&<p role="alert">{deleteFeedback}</p>}</section>}
  {uncertain&&<Link className="button secondary" href={back}>Review current schedule</Link>}
 </div>;
}
