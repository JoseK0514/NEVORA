'use client';
import {useId,useRef} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {weekStartFor} from '../../lib/date-utils';
import {useMobileLang} from './mobile-lang';
import {dateText} from './mobile-format';
import {weekPickerCopy} from './copy/week-picker';
export function EmployeeMobileWeekPicker({weekStart,keep=''}:{weekStart:string;keep?:string}){
 const router=useRouter(),id=useId(),details=useRef<HTMLDetailsElement>(null),lang=useMobileLang(),t=weekPickerCopy[lang];
 const label=dateText(weekStart,lang,{month:'short',day:'numeric',year:'numeric'});
 return <details className="em-week-picker" ref={details} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();details.current?.removeAttribute('open');details.current?.querySelector('summary')?.focus();}}}>
  <summary aria-label={t.choose(label)}>{t.weekOf}{label}<CaretDownIcon aria-hidden="true" size={18} weight="bold"/></summary>
  <form onSubmit={event=>{event.preventDefault();const value=new FormData(event.currentTarget).get('day');if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return;const date=new Date(`${value}T12:00:00Z`);if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)return;details.current?.removeAttribute('open');router.push(`/app/schedule?week=${weekStartFor(value)}&day=${encodeURIComponent(value)}${keep}`);}}>
   <label htmlFor={id}>{t.anyDay}</label><input id={id} name="day" type="date" defaultValue={weekStart} required/><button className="em-button" type="submit">{t.view}</button><Link className="em-calendar-link" href="/app/profile#employee-calendar-title">{t.sync}</Link>
  </form>
 </details>;
}
