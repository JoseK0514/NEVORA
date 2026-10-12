import {requireRoles} from '@/lib/auth/permissions';
import {AccountRecovery} from '@/components/account-recovery';
import './assisted-recovery.css';
export default async function AccountRecoveryPage(){const actor=await requireRoles(['OWNER','MANAGER']);return <div className="employee-view"><AccountRecovery kind="assisted" actorId={actor.id}/></div>;}
