import Link from 'next/link';
import type {ReactNode} from 'react';
import {LockSimpleIcon} from '@phosphor-icons/react/dist/ssr/LockSimple';
import type {OperationalShiftEditorData} from '@/lib/company-access/model';
import type {ShiftFormChoice} from '@/components/schedule-shift-form';
import {CorpFormFooter} from '@/components/corp/corp';
import {BCallout} from '@/components/owner-b/b-kit';
import {addDays,formatTime} from '@/lib/date-utils';
import '@/components/schedule-shift-form.css';

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

const dayText=(date:string)=>new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
const initialsOf=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();

/** Why this Manager can't change the shift (or add one here): one short line. */
export function scopedShiftReason(data:OperationalShiftEditorData,placeName:string){
 if(data.saveAvailability==='unavailable')return data.shift?`${placeName} is inactive, so this shift can’t be changed.`:`${placeName} is inactive, so shifts can’t be added.`;
 if(!data.shift)return 'You can’t add shifts here. Ask an Owner.';
 // requires_company: a published shift, or a draft that Build and publish made.
 return data.shift.scheduleStatus==='DRAFT'?'You can’t change a shift made by Build and publish. Ask an Owner.':'You can’t change a published shift. Ask an Owner.';
}

/** The sheet without a form: the title band, the shift's facts in the white card and Done. */
export function ScopedShiftDetails({data,title,subtitle,placeName,backHref,reason,error}:{data:OperationalShiftEditorData;title:string;subtitle?:ReactNode;placeName:string;backHref:string;reason:string;error?:{title:string;body:string}}){
 const shift=data.shift;
 const position=shift?.positionId?data.positionOptions.find(item=>item.id===shift.positionId)?.name??'Position no longer offered':null;
 const overnight=!!shift&&(shift.endTime==='24:00'||shift.endTime<shift.startTime);
 return <div className="c-shift c-shift--view">
  {/* A sheet covers the tab bar (the shell hides it while a sheet page is open). */}
  <span className="q-page" data-q-sheet="" hidden />
  <header className="c-shift__head">
   <span aria-hidden="true" />
   {subtitle?<span className="c-shift__titles"><h1 className="c-shift__title">{title}</h1><span className="c-shift__sub">{subtitle}</span></span>:<h1 className="c-shift__title">{title}</h1>}
   <Link className="c-shift__save c-only-phone" href={backHref}>Done</Link>
  </header>
  <div className="c-shift__form c-shift__view">
   {error?<BCallout tone="red" role="alert" title={error.title}>{error.body}</BCallout>:null}
   <p className="c-shift__why"><LockSimpleIcon className="c-shift__why-ic" size={16} weight="bold" aria-hidden="true" /><span>{reason}</span></p>
   {shift?<dl className="c-shift__facts">
    <div><dt>Person</dt><dd className="c-shift__fact-person"><span className="c-av" aria-hidden="true">{initialsOf(shift.employeeName)}</span><span>{shift.employeeName}</span></dd></div>
    <div><dt>Location</dt><dd>{placeName}</dd></div>
    {position?<div><dt>Position</dt><dd>{position}</dd></div>:null}
    <div><dt>Time</dt><dd>{formatTime(shift.startTime)} – {shift.endTime==='24:00'?'midnight':formatTime(shift.endTime)}{overnight&&shift.endTime!=='24:00'?<span className="c-shift__fact-sub">{`Ends ${dayText(addDays(shift.date,1))}`}</span>:null}</dd></div>
    {shift.isDesignatedLead?<div><dt>Shift lead</dt><dd>Yes</dd></div>:null}
    {shift.notes?<div><dt>Note</dt><dd className="c-shift__fact-note">{shift.notes}</dd></div>:null}
   </dl>:null}
   <CorpFormFooter><Link className="c-btn c-shift__submit" href={backHref}>Done</Link></CorpFormFooter>
  </div>
 </div>;
}
