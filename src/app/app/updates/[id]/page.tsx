import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {communicationAuthority} from '@/lib/communications/service.server';
import {CommunicationDetail} from '@/components/communication-detail';
export default async function UpdatePage({params}:{params:Promise<{id:string}>}){const proof=await requireSessionMutationProof(),{id}=await params,authority=communicationAuthority(proof);const access=['OWNER','MANAGER'].includes(proof.employee.role)?await withOperationalCompany(proof,async()=>null):null;if(access?.state==='unavailable')return <OperationalUnavailable title="Updates unavailable" reason={access.reason}/>;const content=<CommunicationDetail key={authority+id} id={id} authority={authority} mode={['OWNER','MANAGER'].includes(proof.employee.role)?'manager':'employee'}/>;return access?<ScopedReadFrame observation={access}>{content}</ScopedReadFrame>:content;}
