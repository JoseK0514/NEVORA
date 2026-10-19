import {requireRoles} from '@/lib/auth/permissions';
import {AccountRecovery} from '@/components/account-recovery';
import {getWorkspace} from '@/lib/data/workspaces';
// W2: opened from an employee's page, the form starts with their ID and Back returns there.
// The ID is only a prefill; the server still checks the employee and the attestation.
export default async function AccountRecoveryPage({searchParams}:{searchParams:Promise<{employee?:string;from?:string}>}){const actor=await requireRoles(['OWNER','MANAGER']);const params=await searchParams;const employee=params.employee?.trim().slice(0,200)||undefined;const {timeZone}=await getWorkspace();
 // Settings is Owner-only, so only an Owner's Back returns there.
 return <AccountRecovery kind="assisted" actorId={actor.id} employeeId={employee} timeZone={timeZone} from={params.from==='settings'&&actor.role==='OWNER'?'settings':undefined}/>;}
