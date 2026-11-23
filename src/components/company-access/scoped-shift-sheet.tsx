import Link from 'next/link';
import type {ReactNode} from 'react';
import {LockSimpleIcon} from '@phosphor-icons/react/dist/ssr/LockSimple';
import type {OperationalShiftEditorData} from '@/lib/company-access/model';
import type {ShiftFormChoice} from '@/components/schedule-shift-form';
import {CorpFormFooter} from '@/components/corp/corp';
import {BCallout} from '@/components/owner-b/b-kit';
import {addDays,formatTime} from '@/lib/date-utils';
import '@/components/schedule-shift-form.css';
import {esTimes} from '@/components/copy-receipt-copy';
import {accessCopy,esDay,type AccessLang} from './access-copy';

/* A location Manager's Add shift and Shift details (Phase 2, queue C2-Ml and C4-Ml): the Owner's sheet
 * (ScheduleShiftForm) fed with the scoped editor read, and, where the save isn't open to them, the same sheet with the
 * shift's facts and one line that says why. Reads, actions and posted fields are the scoped ones. */

/** The scoped editor's people as the sheet's choices. Each carries the places (of these reads) they can work. The scoped
 * read has no access role, so a changed person turns Shift lead off (as the scoped form did); the server checks the lead. */
export function scopedShiftChoices(reads:OperationalShiftEditorData[],retained?:{id:string;name:string}):ShiftFormChoice[]{
 const people=new Map<string,ShiftFormChoice>();
 for(const read of reads)for(const option of read.employeeOptions){
  const known=people.get(option.id);
  if(known){if(!known.locationIds?.includes(read.locationId))known.locationIds?.push(read.locationId);continue;}
  people.set(option.id,{...nameParts(option.name),id:option.id,role:'EMPLOYEE',active:true,positionIds:[...option.positionIds],locationIds:[read.locationId]});
 }
 // Editing a shift whose person is no longer on the location's roster keeps their name, not as a choice.
 if(retained&&!people.has(retained.id))people.set(retained.id,{...nameParts(retained.name),id:retained.id,role:'EMPLOYEE',active:false,positionIds:[]});
 return [...people.values()];
}

/** The positions the scoped reads offer, for the sheet's Position list. */
export function scopedShiftPositions(reads:OperationalShiftEditorData[]){
 const positions=new Map<string,{id:string;name:string;active:boolean}>();
 for(const read of reads)for(const position of read.positionOptions)positions.set(position.id,{id:position.id,name:position.name,active:true});
 return [...positions.values()];
}

function nameParts(name:string){
 const [firstName='',...rest]=name.trim().split(/\s+/);
 return {firstName,lastName:rest.join(' ')};
}

const dayText=(date:string,lang?:AccessLang)=>lang==='es'?esDay(date):new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
const initialsOf=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();

/** Why this Manager can't change the shift (or add one here): one short line. */
export function scopedShiftReason(data:OperationalShiftEditorData,placeName:string,lang?:AccessLang){
 const t=accessCopy(lang).shift;
 if(data.saveAvailability==='unavailable')return data.shift?t.inactiveChange(placeName):t.inactiveAdd(placeName);
 if(!data.shift)return t.cantAdd;
 // requires_company: a published shift, or a draft that Build and publish made.
 return data.shift.scheduleStatus==='DRAFT'?t.cantChangeBuilt:t.cantChangePublished;
}

/** The sheet without a form: the title band, the shift's facts in the white card and Done. */
export function ScopedShiftDetails({data,title,subtitle,placeName,backHref,reason,error,lang}:{data:OperationalShiftEditorData;title:string;subtitle?:ReactNode;placeName:string;backHref:string;reason:string;error?:{title:string;body:string};
 /** The person's language (Signed-in Spanish, Nov 23, 2026); the caller passes title, reason and error in it. */ lang?:AccessLang}){
 const t=accessCopy(lang).shift,time=(value:string)=>lang==='es'?esTimes(formatTime(value)):formatTime(value);
 const shift=data.shift;
 const position=shift?.positionId?data.positionOptions.find(item=>item.id===shift.positionId)?.name??t.positionGone:null;
 const overnight=!!shift&&(shift.endTime==='24:00'||shift.endTime<shift.startTime);
 return <div className="c-shift c-shift--view">
  {/* A sheet covers the tab bar (the shell hides it while a sheet page is open). */}
  <span className="q-page" data-q-sheet="" hidden />
  <header className="c-shift__head">
   <span aria-hidden="true" />
   {subtitle?<span className="c-shift__titles"><h1 className="c-shift__title">{title}</h1><span className="c-shift__sub">{subtitle}</span></span>:<h1 className="c-shift__title">{title}</h1>}
   <Link className="c-shift__save c-only-phone" href={backHref}>{t.done}</Link>
  </header>
  <div className="c-shift__form c-shift__view">
   {error?<BCallout tone="red" role="alert" title={error.title}>{error.body}</BCallout>:null}
   <p className="c-shift__why"><LockSimpleIcon className="c-shift__why-ic" size={16} weight="bold" aria-hidden="true" /><span>{reason}</span></p>
   {shift?<dl className="c-shift__facts">
    <div><dt>{t.person}</dt><dd className="c-shift__fact-person"><span className="c-av" aria-hidden="true">{initialsOf(shift.employeeName)}</span><span>{shift.employeeName}</span></dd></div>
    <div><dt>{t.location}</dt><dd>{placeName}</dd></div>
    {position?<div><dt>{t.position}</dt><dd>{position}</dd></div>:null}
    <div><dt>{t.time}</dt><dd>{time(shift.startTime)} – {shift.endTime==='24:00'?t.midnight:time(shift.endTime)}{overnight&&shift.endTime!=='24:00'?<span className="c-shift__fact-sub">{t.ends(dayText(addDays(shift.date,1),lang))}</span>:null}</dd></div>
    {shift.isDesignatedLead?<div><dt>{t.shiftLead}</dt><dd>{t.yes}</dd></div>:null}
    {shift.notes?<div><dt>{t.note}</dt><dd className="c-shift__fact-note">{shift.notes}</dd></div>:null}
   </dl>:null}
   <CorpFormFooter><Link className="c-btn c-shift__submit" href={backHref}>{t.done}</Link></CorpFormFooter>
  </div>
 </div>;
}
