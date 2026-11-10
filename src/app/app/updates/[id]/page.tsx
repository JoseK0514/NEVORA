import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {ResponsiveEmployeeMessages} from '@/components/employee-mobile/messages';
import {communicationAuthority} from '@/lib/communications/service.server';
import {CommunicationDetail} from '@/components/communication-detail';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Update" };
export default async function UpdatePage({params}:{params:Promise<{id:string}>}){const moduleOff=await moduleGate('updates');const proof=await requireSessionMutationProof(),{id}=await params,authority=communicationAuthority(proof);const access=['OWNER','MANAGER'].includes(proof.employee.role)?await withOperationalCompany(proof,async()=>null):null;if(access?.state==='unavailable')return <OperationalUnavailable title="Updates unavailable" reason={access.reason}/>;if(moduleOff)return ['EMPLOYEE','LEAD'].includes(proof.employee.role)?<ResponsiveEmployeeMessages authority={employeeViewAuthority(proof,'communications')} view="detail" id={id}>{moduleOff}</ResponsiveEmployeeMessages>:moduleOff;const content=<CommunicationDetail key={authority+id} id={id} authority={authority} mode={['OWNER','MANAGER'].includes(proof.employee.role)?'manager':'employee'}/>;const result=access?<ScopedReadFrame observation={access}>{content}</ScopedReadFrame>:content;return ['EMPLOYEE','LEAD'].includes(proof.employee.role)?<ResponsiveEmployeeMessages authority={employeeViewAuthority(proof,'communications')} view="detail" id={id}>{result}</ResponsiveEmployeeMessages>:result;}
