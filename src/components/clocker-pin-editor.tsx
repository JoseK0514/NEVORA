'use client';
import Link from 'next/link';
import {useState} from 'react';
import type {PinActionResult,PinSaveStatus} from '@/app/app/employees/[employeeId]/clocker-pin/actions';
import {QuietNav} from './quiet/quiet';
import {ClockerPinForm} from './clocker-pin-form';
export function ClockerPinEditor({employeeId,name,initialVersion,action,checkStatus}:{employeeId:string;name:string;initialVersion:number;action:(data:FormData)=>Promise<PinActionResult>;checkStatus:(data:FormData)=>Promise<PinSaveStatus>}){
 const [disabled,setDisabled]=useState(true),href=`/app/employees/${encodeURIComponent(employeeId)}`;
 return <div className="q-page wa-pin" data-nv-page="" data-q-sheet=""><QuietNav left={<Link className="q-nav__l q-nav__l--teal" href={href}>Cancel</Link>} title="Clocker PIN" right={<button type="submit" form="clocker-pin-form" disabled={disabled} className="q-nav__r q-nav__r--b">Save</button>}/><div className="q-hd" style={{paddingTop:16}}><h1 style={{fontSize:28,lineHeight:'34px'}}>{name}</h1></div><ClockerPinForm employeeId={employeeId} initialVersion={initialVersion} action={action} checkStatus={checkStatus} onDisabledChange={setDisabled}/></div>;
}
