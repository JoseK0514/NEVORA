import {requireSessionMutationProof} from '@/lib/auth/session';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import {communicationAuthority} from '@/lib/communications/service.server';
import {EmployeeUpdates} from '@/components/employee-updates';
export default async function UpdatesPage(){const moduleOff=await moduleGate('updates');if(moduleOff)return moduleOff;const proof=await requireSessionMutationProof();const authority=communicationAuthority(proof);return <EmployeeUpdates key={authority} authority={authority} mode={['OWNER','MANAGER'].includes(proof.employee.role)?'manager':'employee'}/>;}
