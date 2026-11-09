import { moduleGate } from "@/lib/workspace-presentation/current.server";
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { ClockerBreakTypes } from '@/components/clocker-break-types';
import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { listBreakTypes } from '@/lib/clocker/break-types.server';
import type { BreakType } from '@/lib/clocker/break-types';
import { saveBreakTypeAction } from './actions';
import { EmptyState, SettingsFrame } from '../wave-c-kit';
export const dynamic='force-dynamic';
export default async function BreakTypesPage(){
  const moduleOff = await moduleGate("breaks");
  if (moduleOff) return moduleOff;

 await requireRoles(['OWNER']);
 const session=await requireSessionMutationProof();
 let types:BreakType[]|null=null;
 try{types=await listBreakTypes({employeeId:session.employee.id,sessionTokenHash:session.sessionTokenHash});}
 catch{/* Show unavailable rather than a false empty catalog. */}
 if(types)return <ClockerBreakTypes initialTypes={types} action={saveBreakTypeAction}/>;
 return <SettingsFrame title="Break types" summary="The breaks your team can start at the Clocker.">
  <section className="nv-card" role="alert" aria-labelledby="break-types-unavailable-title">
   <EmptyState tone="urgent" icon={<WarningCircleIcon size={22} weight="bold"/>} titleId="break-types-unavailable-title" title="Couldn’t load break types."
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- a retry after a failed server read reloads the whole document so every read runs again, with or without JavaScript
    action={<a href="/app/settings/breaks" className="nv-btn" data-kind="primary">Try again</a>}>
    The settings couldn’t be read. Existing break records haven’t changed.
   </EmptyState>
  </section>
 </SettingsFrame>;
}
