import { routeTitle } from "@/app/app/route-titles";
import {scopedObservation} from '@/lib/company-access/observation';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import { CopyNotFound, CopyReceiptView, CopyUnconfirmed } from "@/components/copy-receipt";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { readScheduleCopyReceipt, readScheduleCopyCommand } from "@/lib/data/schedule-copy";
import { readPortalLanguage } from "@/lib/activation/language.server";
import { readAuthLang } from "@/lib/auth-lang.server";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const generateMetadata = routeTitle("copied");

/** Copy receipt (Phase 2, queue C8): the result of a schedule copy, drawn by CopyReceiptView. Same reads, access check
 * and retry as before: the receipt proves what was copied; without one, the stored command allows only a safe retry. */
export default async function CopyReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ operation?: string }>;
}) {
  // IS-WA-9: like every other schedule management page, the receipt is for Owners and Managers.
  await requireRoles(MANAGER_ROLES);
  const { operation } = await searchParams;
  if (!operation || !/^[0-9a-f-]{36}$/i.test(operation)) return <CopyNotFound lang={await readAuthLang()} />; // Before the session read: the nv-lang cookie or the browser's.
  const proof = await requireSessionMutationProof();
  const source=await withOperationalCompany(proof,async()=>{
  const receipt = await readScheduleCopyReceipt(proof, operation);
  const command =
    receipt?.command ?? (await readScheduleCopyCommand(proof, operation));
  return {receipt,command};
  });
  if(source.state==='unavailable')return <OperationalUnavailable title="Copy result unavailable" reason={source.reason}/>;
  const {receipt,command}=source.data;
  // G98 (gap closure): the receipt has Spanish copy, so it follows the person's language: their saved choice, else the
  // nv-lang cookie or the browser's, the same read the person and time off pages use. English if that read fails.
  let lang:'en'|'es'='en';try{lang=(await readPortalLanguage(proof)).language;}catch{/* English */}
  // The scoped frame wraps the Corp page, so the phone band rules find the page's own title (one title, not two).
  return <ScopedReadFrame observation={scopedObservation(source)}>
    {receipt ? <CopyReceiptView receipt={receipt} lang={lang} /> : <CopyUnconfirmed command={command} actorId={proof.employee.id} lang={lang} />}
  </ScopedReadFrame>;
}
