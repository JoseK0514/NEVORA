import "./company-policies.css";
import {getWorkspace} from "@/lib/data/workspaces";
import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { readCompanyPolicyHistory } from "@/lib/business-improvements/company-policies/service";
import { listLocations } from "@/lib/data/locations";
import { CompanyPolicyEditor } from "@/components/company-policy-editor";
import { CorpErrorCard } from "@/components/corp/corp";
import { SettingsPageB } from "../settings-b";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../settings-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].companyPolicies }; }
export const dynamic = "force-dynamic";
export default async function CompanyPoliciesPage() {
  await requireRoles(["OWNER"]);
  const lang = await readPageLang(), t = SETTINGS_COPY[lang];
  const proof = await requireSessionMutationProof();
  const data=await Promise.all([
    readCompanyPolicyHistory(proof),getWorkspace(),listLocations({includeInactive:true}),
  ]).catch(()=>null);
  // Settings in Direction B (Nov 23, 2026): the shared Settings frame; the editor draws the cards (Applies to, the switches
  // and the approved wording). The phone band's Save submits the editor's form and shows once a rule changed.
  return (
    <SettingsPageB title={t.companyPolicies} className="cp" lang={lang === "es" ? "es" : undefined} phoneRight={data ? <button type="submit" form="policy-form" className="c-setb-save">{t.save}</button> : undefined}>
      {data ? <CompanyPolicyEditor history={data[0]} timeZone={data[1].timeZone} locations={data[2]}/>
        /* eslint-disable-next-line next-preserved/no-html-link-for-pages -- a retry after a failed server read reloads the whole document so every read runs again, with or without JavaScript */
        : <CorpErrorCard title={t.policiesUnavailable} body={t.policiesUnavailableBody} action={<a className="c-btn c-btn--secondary" href="/app/settings/company-policies">{t.retryRead}</a>}/>}
    </SettingsPageB>
  );
}
