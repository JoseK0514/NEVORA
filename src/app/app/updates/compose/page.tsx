import {requireSessionMutationProof} from '@/lib/auth/session';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import {communicationAuthority} from '@/lib/communications/service.server';
import {CommunicationCompose} from '@/components/communication-compose';
export default async function ComposePage({searchParams}:{searchParams:Promise<{update?:string}>}){const moduleOff=await moduleGate('updates');if(moduleOff)return moduleOff;const proof=await requireSessionMutationProof(),query=await searchParams,authority=communicationAuthority(proof);return <CommunicationCompose key={authority} authority={authority} mode={['OWNER','MANAGER'].includes(proof.employee.role)?'manager':'employee'} updateId={typeof query.update==='string'&&/^[a-f0-9-]{36}$/i.test(query.update)?query.update:undefined}/>;}
