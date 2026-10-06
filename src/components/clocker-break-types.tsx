'use client';

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { ActionMenu } from './action-menu';
import { SelectField } from './select-field';
import { StatusPill } from './status-pill';
import { breakCategories, type BreakType } from '../lib/clocker/break-types';
import type { BreakTypeResult } from '../app/app/settings/breaks/actions';
import styles from './clocker-setup.module.css';
import detail from './clocker-break-types.module.css';

type Selection={operation:'CREATE'|'EDIT'|'ARCHIVE'|'REACTIVATE';type?:BreakType};
export function ClockerBreakTypes({initialTypes,action}:{initialTypes:BreakType[];action(data:FormData):Promise<BreakTypeResult>}){
 const [types,setTypes]=useState(initialTypes),[selection,setSelection]=useState<Selection|null>(null);
 const [pending,setPending]=useState(false),[error,setError]=useState<{message:string;refresh:boolean}|null>(null),[notice,setNotice]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLElement|null>(null),busy=useRef(false);
 useEffect(()=>{
  if(!selection)return;
  const element=dialog.current,previous=document.body.style.overflow;
  element?.showModal();document.body.style.overflow='hidden';
  return()=>{if(element?.open)element.close();document.body.style.overflow=previous;};
 },[selection]);
 function open(next:Selection,event:MouseEvent<HTMLButtonElement>){
  trigger.current=event.currentTarget.closest('[data-break-type]')?.querySelector<HTMLElement>('[popovertarget]')??event.currentTarget;
  const popover=event.currentTarget.closest<HTMLElement>('[popover]');if(popover?.matches(':popover-open'))popover.hidePopover();
  setError(null);setSelection(next);
 }
 function close(){if(busy.current)return;const target=trigger.current;dialog.current?.close();setSelection(null);setError(null);requestAnimationFrame(()=>target?.focus({preventScroll:true}));}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||!selection)return;
  const data=new FormData(event.currentTarget),existing=selection.type;
  data.set('id',existing?.id??'');data.set('expectedVersion',String(existing?.version??0));
  if(selection.operation==='ARCHIVE'||selection.operation==='REACTIVATE'){
   data.set('name',existing!.name);data.set('category',existing!.category);data.set('targetMinutes',existing!.targetMinutes===null?'':String(existing!.targetMinutes));
  }
  data.set('active',String(selection.operation==='ARCHIVE'?false:selection.operation==='REACTIVATE'?true:existing?.active??true));
  busy.current=true;setPending(true);setError(null);
  try{
   const result=await action(data);
   if(!result.ok){setError({message:result.error,refresh:result.refresh});return;}
   setTypes(current=>current.some(type=>type.id===result.breakType.id)?current.map(type=>type.id===result.breakType.id?result.breakType:type):[...current,result.breakType]);
   setNotice(selection.operation==='ARCHIVE'?'Break type archived. Existing records stay unchanged.':selection.operation==='REACTIVATE'?'Break type reactivated.':existing?'Break settings saved. Previous breaks keep their recorded settings.':'Break type created.');
   busy.current=false;close();
  }catch{setError({message:'The update could not be confirmed. Reload Break Types before trying again.',refresh:true});}
  finally{busy.current=false;setPending(false);}
 }
 const editing=selection?.operation==='CREATE'||selection?.operation==='EDIT';
 const title=selection?.operation==='CREATE'?'Add Break Type':selection?.operation==='EDIT'?'Edit Break Type':selection?.operation==='ARCHIVE'?'Archive Break Type?':'Reactivate Break Type?';
 const saveLabel=selection?.operation==='CREATE'?'Create Break Type':selection?.operation==='EDIT'?'Save Changes':selection?.operation==='ARCHIVE'?'Archive Break Type':'Reactivate Break Type';
 return <div className={styles.manager}>
  <div className={styles.toolbar}><p>Each break keeps the name and settings used when it began.</p><div className={styles.buttons}>
   <button className="button secondary" type="button" onClick={()=>window.location.reload()}>Reload Break Types</button>
   <button className="button primary" type="button" onClick={event=>open({operation:'CREATE'},event)}>Add Break Type</button>
  </div></div>
  {notice?<p role="status" className={styles.notice}>{notice}</p>:null}
  <section className={`panel ${styles.deviceList}`} aria-label="Configured break types">
   {types.length?types.map(type=><article key={type.id} data-break-type={type.id} className={styles.deviceRow}>
    <div className={styles.deviceCopy}><h2>{type.name}</h2><div className={detail.metadata}><span>{breakCategories.find(category=>category.value===type.category)?.label}</span><span>{type.targetMinutes===null?'No reference duration':`${type.targetMinutes} min reference`}</span></div></div>
    <div className={styles.rowActions}><StatusPill tone={type.active?'success':'neutral'}>{type.active?'Active':'Archived'}</StatusPill>
     <ActionMenu id={`break-${type.id}`} label="Manage" ariaLabel={`Manage ${type.name}`}>
      <button type="button" className="nevora-action-menu-item" onClick={event=>open({operation:'EDIT',type},event)}>Edit</button>
      <button type="button" className="nevora-action-menu-item" onClick={event=>open({operation:type.active?'ARCHIVE':'REACTIVATE',type},event)}>{type.active?'Archive':'Reactivate'}</button>
     </ActionMenu>
    </div>
   </article>):<div className={styles.empty}><h2>No break types yet</h2><p>Add the break options used by your business. Nothing is preselected or applied to historical records.</p></div>}
  </section>
  <p className={styles.hint}>Reference minutes are informational. They never end a break automatically or deduct worked time.</p>
  <dialog ref={dialog} className={styles.dialog} aria-labelledby="break-editor-title" onCancel={event=>{event.preventDefault();close();}}>
   {selection?<form key={`${selection.operation}-${selection.type?.id??'new'}`} onSubmit={submit} aria-busy={pending}>
    <p className={styles.eyebrow}>Operational settings</p><h2 id="break-editor-title">{title}</h2>
    {editing?<p>Changes apply to future breaks only.</p>:<><p className={styles.deviceContext}>{selection.type?.name}</p><p>{selection.operation==='ARCHIVE'?'Employees cannot start a new break with this type. Breaks already in progress can still end, and recorded settings stay unchanged.':'Make this type available for new breaks again. Previous records stay unchanged.'}</p></>}
    <fieldset className={styles.fields} disabled={pending||Boolean(error?.refresh)}>
     {editing?<>
      <label className={styles.field}>Break name<input name="name" defaultValue={selection.type?.name??''} required maxLength={80} autoComplete="off" autoFocus/></label>
      <SelectField name="category" label="Classification" required defaultValue={selection.type?.category??''} options={[{value:'',label:'Choose a classification',disabled:true},...breakCategories]}/>
      <label className={styles.field}>Reference minutes<input name="targetMinutes" type="text" inputMode="numeric" pattern="[0-9]+" maxLength={4} defaultValue={selection.type?.targetMinutes??''} aria-describedby="break-duration-help"/></label>
      <p id="break-duration-help" className={detail.hint}>Optional, 1–1,440 minutes. Leave blank for no reference duration.</p>
     </>:null}
     <button className="button primary" type="submit">{pending?'Saving…':saveLabel}</button>
    </fieldset>
    {error?<p role="alert" className={styles.error}>{error.message}</p>:null}
    <div className={styles.dialogFooter}><button className="button secondary" type="button" disabled={pending} onClick={close}>Cancel</button>
     {error?.refresh?<button type="button" className="button primary" onClick={()=>window.location.reload()}>Reload Break Types</button>:null}</div>
   </form>:null}
  </dialog>
 </div>;
}
