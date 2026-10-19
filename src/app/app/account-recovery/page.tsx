import {requireRoles} from '@/lib/auth/permissions';
import {AccountRecovery} from '@/components/account-recovery';
// W2: opened from an employee's page, the form starts with their ID and Back returns there.
// The ID is only a prefill; the server still checks the employee and the attestation.
export default async function AccountRecoveryPage({searchParams}:{searchParams:Promise<{employee?:string;from?:string}>}){const actor=await requireRoles(['OWNER','MANAGER']);const params=await searchParams;const employee=params.employee?.trim().slice(0,200)||undefined;return <AccountRecovery kind="assisted" actorId={actor.id} employeeId={employee} from={params.from==='settings'?'settings':undefined}/>;}
