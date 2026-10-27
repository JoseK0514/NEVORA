'use client';
import type {ReactNode} from 'react';
import {useEmployeeMobile} from './use-mobile';
import {EmployeeTimeOff} from './timeoff';
import {EmployeeAvailability} from './availability';
export function ResponsiveEmployeePlanning({authority,view,selection,filter='waiting',children}:{authority:string;view:'timeoff'|'availability';selection:string;filter?:string;children:ReactNode}){
 const mobile=useEmployeeMobile();return mobile?<div className="em-requests-mobile">{view==='timeoff'?<EmployeeTimeOff key={authority} authority={authority} selection={selection} filter={filter}/>:<EmployeeAvailability key={authority} authority={authority} selection={selection}/>}</div>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">Loading your planning…</p></div></>;
}
