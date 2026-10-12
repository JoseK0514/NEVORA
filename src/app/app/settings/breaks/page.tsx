import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { PageHeader } from '@/components/page-header';
import { ClockerBreakTypes } from '@/components/clocker-break-types';
import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { listBreakTypes } from '@/lib/clocker/break-types.server';
import type { BreakType } from '@/lib/clocker/break-types';
import { saveBreakTypeAction } from './actions';
import './break-types.css';
export const dynamic='force-dynamic';
export default async function BreakTypesPage(){
 await requireRoles(['OWNER']);
 const session=await requireSessionMutationProof();
 let types:BreakType[]|null=null;
 try{types=await listBreakTypes({employeeId:session.employee.id,sessionTokenHash:session.sessionTokenHash});}
 catch{/* Show unavailable rather than a false empty catalog. */}
 return <div className="configuration-page break-types-page">
  <Link href="/app/settings" className="break-types-back"><ArrowLeftIcon size={18} aria-hidden="true"/>Back to Settings</Link>
  <PageHeader title="Break Types" description="A clear set of break options for your team."/>
  {types?<ClockerBreakTypes initialTypes={types} action={saveBreakTypeAction}/>:<section className="panel break-types-unavailable" role="alert">
   <WarningCircleIcon size={28} aria-hidden="true"/>
   <h2>Break settings are unavailable</h2><p>The configuration could not be loaded. Existing break records have not changed.</p>
   <Link href="/app/settings/breaks" className="button secondary">Try Again</Link>
  </section>}
 </div>;
}
