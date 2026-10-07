import {requireRoles} from '@/lib/auth/permissions';
import {ClockerRecoveryReview} from '@/components/clocker-recovery-review';
export default async function ClockerRecoveryPage(){const actor=await requireRoles(['OWNER','MANAGER']);return <div className="employee-view"><header className="employee-view-heading"><h1>Clocker Recovery</h1></header><ClockerRecoveryReview actorId={actor.id}/></div>;}
