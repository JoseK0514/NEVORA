'use client';
import {useId,useRef} from 'react';
import {useRouter} from 'next/navigation';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {weekStartFor} from '../../lib/date-utils';
export function EmployeeMobileWeekPicker({weekStart,keep=''}:{weekStart:string;keep?:string}){
 const router=useRouter(),id=useId(),details=useRef<HTMLDetailsElement>(null);
 const label=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(new Date(`${weekStart}T12:00:00Z`));
 return <details className="em-week-picker" ref={details} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();details.current?.removeAttribute('open');details.current?.querySelector('summary')?.focus();}}}>
  <summary aria-label={`Choose schedule week, week of ${label}`}>Week of {label}<CaretDownIcon aria-hidden="true" size={18}/></summary>
  <form onSubmit={event=>{event.preventDefault();const value=new FormData(event.currentTarget).get('day');if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return;const date=new Date(`${value}T12:00:00Z`);if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)return;details.current?.removeAttribute('open');router.push(`/app/schedule?week=${weekStartFor(value)}&day=${encodeURIComponent(value)}${keep}`);}}>
   <label htmlFor={id}>Choose any day in the week</label><input id={id} name="day" type="date" defaultValue={weekStart} required/><button className="em-button" type="submit">View week</button>
  </form>
 </details>;
}
