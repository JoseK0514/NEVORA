import { moduleGate } from "@/lib/workspace-presentation/current.server";
import { ClockerBreakTypes } from '@/components/clocker-break-types';
import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { listBreakTypes } from '@/lib/clocker/break-types.server';
import type { BreakType } from '@/lib/clocker/break-types';
import { saveBreakTypeAction } from './actions';
import { CorpErrorCard } from '@/components/corp/corp';
import { SettingsPageB } from '../settings-b';
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../settings-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].breaks }; }
export const dynamic='force-dynamic';
export default async function BreakTypesPage(){
  const moduleOff = await moduleGate("breaks");
  if (moduleOff) return moduleOff;

 await requireRoles(['OWNER']);
 const lang=await readPageLang(),t=SETTINGS_COPY[lang];
 const session=await requireSessionMutationProof();
 let types:BreakType[]|null=null;
 try{types=await listBreakTypes({employeeId:session.employee.id,sessionTokenHash:session.sessionTokenHash});}
 catch{/* Show unavailable rather than a false empty catalog. */}
 // J9 in Direction B (Nov 23, 2026): the shared Settings frame; a failed read is the kit's one failure card, same words.
 return <SettingsPageB title={t.breakTypes} titleId="break-types-title" lang={lang === "es" ? "es" : undefined}>
  {types?<ClockerBreakTypes initialTypes={types} action={saveBreakTypeAction}/>
   :<CorpErrorCard title={t.breakTypesLoadFailed} body={t.breakTypesLoadFailedBody}
    // eslint-disable-next-line next-preserved/no-html-link-for-pages -- a retry after a failed server read reloads the whole document so every read runs again, with or without JavaScript
    action={<a href="/app/settings/breaks" className="c-btn c-btn--secondary">{t.tryAgain}</a>}/>}
 </SettingsPageB>;
}
