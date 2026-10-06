import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { ClockerBreakTypes } from '@/components/clocker-break-types';
import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { listBreakTypes } from '@/lib/clocker/break-types.server';
import type { BreakType } from '@/lib/clocker/break-types';
import { saveBreakTypeAction } from './actions';
export const dynamic='force-dynamic';
export default async function BreakTypesPage(){
 await requireRoles(['OWNER']);
 const session=await requireSessionMutationProof();
 let types:BreakType[]|null=null;
 try{types=await listBreakTypes({employeeId:session.employee.id,sessionTokenHash:session.sessionTokenHash});}
 catch{/* Show unavailable rather than a false empty catalog. */}
 return <div className="configuration-page">
  <PageHeader eyebrow="Owner controls" title="Break Types" description="Set the options employees choose when starting a break."
   actions={<Link href="/app/settings" className="button secondary">Back to Settings</Link>}/>
  {types?<ClockerBreakTypes initialTypes={types} action={saveBreakTypeAction}/>:<section className="panel">
   <h2>Break settings are unavailable</h2><p>The configuration could not be loaded. Existing break records have not changed.</p>
   <Link href="/app/settings/breaks" className="button secondary">Try Again</Link>
  </section>}
 </div>;
}
