'use client';
import {useEffect,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {planningId} from '@/lib/employee-planning';
import {useEmployeeBScreen} from './use-mobile';
import {EmployeeTimeOff} from './timeoff';
import {EmployeeAvailability} from './availability';
export function ResponsiveEmployeePlanning({authority,view,selection,filter='waiting',children}:{authority:string;view:'timeoff'|'availability';selection:string;filter?:string;children:ReactNode}){
 const mobile=useEmployeeBScreen(),router=useRouter();
 useEffect(()=>{if(!mobile||view!=='timeoff'||selection!=='list')return;try{const hash=decodeURIComponent(window.location.hash.slice(1));if(hash.startsWith('request-')&&planningId(hash.slice(8)))router.replace('/app/requests?requestId='+encodeURIComponent(hash.slice(8)),{scroll:false});}catch{}},[mobile,view,selection,router]);
 return mobile?<div className="em-requests-mobile">{view==='timeoff'?<EmployeeTimeOff key={authority} authority={authority} selection={selection} filter={filter}/>:<EmployeeAvailability key={authority} authority={authority} selection={selection}/>}</div>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">Loading your planning…</p></div></>;
}
