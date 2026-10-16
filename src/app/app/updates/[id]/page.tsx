import {requireSessionMutationProof} from '@/lib/auth/session';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import {communicationAuthority} from '@/lib/communications/service.server';
import {CommunicationDetail} from '@/components/communication-detail';
export default async function UpdatePage({params}:{params:Promise<{id:string}>}){const moduleOff=await moduleGate('updates');if(moduleOff)return moduleOff;const proof=await requireSessionMutationProof(),{id}=await params,authority=communicationAuthority(proof);return <CommunicationDetail key={authority+id} id={id} authority={authority} mode={['OWNER','MANAGER'].includes(proof.employee.role)?'manager':'employee'}/>;}
