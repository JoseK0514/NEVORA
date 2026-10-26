import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import {communicationAuthority} from '@/lib/communications/service.server';
import {CommunicationCompose} from '@/components/communication-compose';
export const metadata = { title: "Create update" };
export default async function ComposePage({searchParams}:{searchParams:Promise<{update?:string}>}){const moduleOff=await moduleGate('updates');if(moduleOff)return moduleOff;const proof=await requireSessionMutationProof(),query=await searchParams,authority=communicationAuthority(proof);const access=['OWNER','MANAGER'].includes(proof.employee.role)?await withOperationalCompany(proof,async()=>null):null;if(access?.state==='unavailable')return <OperationalUnavailable title="Updates unavailable" reason={access.reason}/>;const content=<CommunicationCompose key={authority} authority={authority} mode={['OWNER','MANAGER'].includes(proof.employee.role)?'manager':'employee'} updateId={typeof query.update==='string'&&/^[a-f0-9-]{36}$/i.test(query.update)?query.update:undefined}/>;return access?<ScopedReadFrame observation={access}>{content}</ScopedReadFrame>:content;}
