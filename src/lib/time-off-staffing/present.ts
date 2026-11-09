import type {ActionItem} from '../action-center/project';
import type {StaffingConflict} from './model';

/* Words for leave and staffing (Direction B, Nov 9, 2026). Display only: the action center item, the conflict and the
 * read's numbers are shown as they are, never recomputed into a different meaning. Copy rules as elsewhere: the person's
 * name first, times whole ("9:00 AM – 5:00 PM"), "midnight" at the day's end, no blame. */

const NBSP='\u00a0';

/** A staffing repair in the Action Center: approved leave over a published shift. It is scheduling work, not another
 * time-off decision, so it never gets Approve or Decline (CLAUDE-CONTRACT.md). */
export function isStaffingRepair(item:Pick<ActionItem,'type'|'id'>&{purpose?:string}):boolean{
 return item.type==='TIME_OFF'&&item.purpose==='STAFFING_REPAIR'&&item.id.startsWith('LEAVE_STAFFING:');
}

export const clockText=(hhmm:string,end=false)=>{const [h,m]=hhmm.split(':').map(Number);if(end&&(h===24||(h===0&&m===0)))return 'midnight';return `${(h%12)||12}:${String(m).padStart(2,'0')}${NBSP}${h<12?'AM':'PM'}`;};
export const dayText=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(`${date}T12:00:00Z`));
export const rangeText=(start:string,end:string)=>start==='00:00'&&(end==='00:00'||end==='24:00')?'All day':`${clockText(start)}${NBSP}– ${clockText(end,true)}`;
const possessive=(name:string)=>`${name}’${/s$/i.test(name)?'':'s'}`;

/** "1 h 30 min", "4 h", "45 min". */
export function minutesText(minutes:number){
 const h=Math.floor(minutes/60),m=minutes%60;
 return [h?`${h}${NBSP}h`:'',m?`${m}${NBSP}min`:''].filter(Boolean).join(' ')||`0${NBSP}min`;
}

/** The person a repair is about: the read's detail starts with their name ("Maria Rivera · Main Office · …"). */
export const repairPerson=(item:ActionItem)=>item.detail.split(' · ')[0]?.trim()||null;
/** "Fill Maria Rivera’s shift". */
export const repairTitle=(item:ActionItem)=>{const person=repairPerson(item);return person?`Fill ${possessive(person)} shift`:'Fill a shift for approved leave';};
/** "Thu, Nov 12 · 7:00 AM – 3:00 PM · Main Office". */
export function repairWhen(item:ActionItem){
 const place=item.detail.split(' · ')[1]?.trim();
 const start=item.dateTime?.slice(0,10),from=item.dateTime?.slice(11,16),to=item.endDateTime?.slice(11,16);
 return [start?dayText(start):null,from&&to?rangeText(from,to):null,place||null].filter(Boolean).join(' · ');
}
/** Who fixes it: the reviewer who approved the leave, or (older approvals with no reviewer) an Owner. */
export function repairOwnerLine(item:ActionItem&{ownerEmployeeId?:string|null},actorId?:string){
 if(item.ownerEmployeeId===null)return 'No one is assigned. An Owner needs to take this.';
 if(actorId&&item.ownerEmployeeId===actorId)return 'You approved this leave, so this is yours to fix.';
 return 'Assigned to the manager who approved the leave.';
}

/** A conflict's shift: "Thu, Nov 12 · 7:00 AM – 3:00 PM · Main Office". */
export const conflictShift=(item:StaffingConflict)=>[dayText(item.date),rangeText(item.startTime,item.endTime),item.locationName].join(' · ');
/** What approving does to coverage: "4 h of this shift would be uncovered". */
export function conflictConsequence(item:StaffingConflict){
 const whole=item.overlapMinutes>=minutesOf(item);
 return whole?`The whole shift (${minutesText(item.overlapMinutes)}) would need someone else`:`${minutesText(item.overlapMinutes)} of this shift would need someone else`;
}
function minutesOf(item:StaffingConflict){
 const [sh,sm]=item.startTime.split(':').map(Number),[eh,em]=item.endTime.split(':').map(Number);
 const start=sh*60+sm,end=eh*60+em;return end>start?end-start:end+1440-start;
}
/** "4 h across 1 shift". */
export function conflictTotal(items:readonly StaffingConflict[]){
 const minutes=items.reduce((total,item)=>total+item.overlapMinutes,0);
 return `${minutesText(minutes)} across ${items.length}${NBSP}${items.length===1?'shift':'shifts'}`;
}
