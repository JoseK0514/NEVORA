'use client';
import Link from 'next/link';
import {useState} from 'react';
import type {PinActionResult,PinSaveStatus} from '@/app/app/employees/[employeeId]/clocker-pin/actions';
import {QuietNav} from './quiet/quiet';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {ClockerPinForm} from './clocker-pin-form';
import './clocker-pin-page.css';
/** Clocker PIN. A phone gets the sheet (Cancel · Clocker PIN · Save); tablets and desktop get a normal page: the person's
 * name as the 22/600 title with "Clocker PIN" under it and Cancel and Save in the title row (Owner premium A7), then the
 * boxes. Both Saves submit the same form; Save stays off until both PINs have four digits. */
export function ClockerPinEditor({employeeId,name,initialVersion,action,checkStatus}:{employeeId:string;name:string;initialVersion:number;action:(data:FormData)=>Promise<PinActionResult>;checkStatus:(data:FormData)=>Promise<PinSaveStatus>}){
 const [disabled,setDisabled]=useState(true),href=`/app/employees/${encodeURIComponent(employeeId)}`;
 return <div className="q-page wa-pin" data-nv-page="" data-q-sheet="">
  {/* Closing F1 (NV-256): the bar's link is the phone sheet's Cancel, and "‹ Maria Rivera" on tablets and desktop, where the
    bar is the band's back link and the title is "Clocker PIN" (clocker-pin-page.css swaps them). */}
  <QuietNav left={<Link className="q-nav__l q-nav__l--teal" href={href}><span className="wa-pin__cancel">Cancel</span><span className="wa-pin__back"><CaretLeftIcon className="q-ic q-ic--s" weight="bold" aria-hidden="true"/>{name}</span></Link>} title="Clocker PIN" right={<button type="submit" form="clocker-pin-form" disabled={disabled} className="q-nav__r q-nav__r--b">Save</button>}/>
  <div className="q-hd wa-pin__hd"><div className="wa-pin__title">
   <h1><span className="wa-pin__h-phone">{name}</span><span className="wa-pin__h-wide">Clocker PIN</span></h1></div>
   <div className="wa-pin__actions"><button type="submit" form="clocker-pin-form" disabled={disabled} className="q-btn">Save</button></div></div>
  <ClockerPinForm employeeId={employeeId} initialVersion={initialVersion} action={action} checkStatus={checkStatus} onDisabledChange={setDisabled}/>
 </div>;
}
