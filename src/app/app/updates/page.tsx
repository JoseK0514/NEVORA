import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import {communicationAuthority} from '@/lib/communications/service.server';
import {EmployeeUpdates} from '@/components/employee-updates';
export const metadata = { title: "Updates" };

export default async function UpdatesPage(){const moduleOff=await moduleGate('updates');if(moduleOff)return moduleOff;const proof=await requireSessionMutationProof();const access=['OWNER','MANAGER'].includes(proof.employee.role)?await withOperationalCompany(proof,async()=>null):null;if(access?.state==='unavailable')return <OperationalUnavailable title="Updates unavailable" reason={access.reason}/>;const authority=communicationAuthority(proof);const content=<EmployeeUpdates key={authority} authority={authority} mode={['OWNER','MANAGER'].includes(proof.employee.role)?'manager':'employee'}/>;return access?<ScopedReadFrame observation={access}>{content}</ScopedReadFrame>:content;}
