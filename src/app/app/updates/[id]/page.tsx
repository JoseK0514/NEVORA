import {requireSessionMutationProof} from '@/lib/auth/session';
import {communicationAuthority} from '@/lib/communications/service.server';
import {CommunicationDetail} from '@/components/communication-detail';
export default async function UpdatePage({params}:{params:Promise<{id:string}>}){const proof=await requireSessionMutationProof(),{id}=await params,authority=communicationAuthority(proof);return <CommunicationDetail key={authority+id} id={id} authority={authority} mode={['OWNER','MANAGER'].includes(proof.employee.role)?'manager':'employee'}/>;}
