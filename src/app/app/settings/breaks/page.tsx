import { moduleGate } from "@/lib/workspace-presentation/current.server";
import { ClockerBreakTypes } from '@/components/clocker-break-types';
import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { listBreakTypes } from '@/lib/clocker/break-types.server';
import type { BreakType } from '@/lib/clocker/break-types';
import { saveBreakTypeAction } from './actions';
import { CorpErrorCard } from '@/components/corp/corp';
import { SettingsPageB } from '../settings-b';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Breaks" };
export const dynamic='force-dynamic';
export default async function BreakTypesPage(){
  const moduleOff = await moduleGate("breaks");
  if (moduleOff) return moduleOff;

 await requireRoles(['OWNER']);
 const session=await requireSessionMutationProof();
 let types:BreakType[]|null=null;
 try{types=await listBreakTypes({employeeId:session.employee.id,sessionTokenHash:session.sessionTokenHash});}
 catch{/* Show unavailable rather than a false empty catalog. */}
 // J9 in Direction B (Nov 23, 2026): the shared Settings frame; a failed read is the kit's one failure card, same words.
 return <SettingsPageB title="Break types" titleId="break-types-title">
  {types?<ClockerBreakTypes initialTypes={types} action={saveBreakTypeAction}/>
   :<CorpErrorCard title="Couldn’t load break types." body="The settings couldn’t be read. Existing break records haven’t changed."
    // eslint-disable-next-line next-preserved/no-html-link-for-pages -- a retry after a failed server read reloads the whole document so every read runs again, with or without JavaScript
    action={<a href="/app/settings/breaks" className="c-btn c-btn--secondary">Try again</a>}/>}
 </SettingsPageB>;
}
