import "./company-policies.css";
import {getWorkspace} from "@/lib/data/workspaces";
import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { readCompanyPolicyHistory } from "@/lib/business-improvements/company-policies/service";
import { listLocations } from "@/lib/data/locations";
import { CompanyPolicyEditor } from "@/components/company-policy-editor";
import { SettingsFrame } from "../wave-c-kit";

// a11y #20 (final pass): each page names itself; the layout template adds "· NEVORA".
export const metadata = { title: "Company policies" };
export const dynamic = "force-dynamic";
export default async function CompanyPoliciesPage() {
  await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  const data=await Promise.all([
    readCompanyPolicyHistory(proof),getWorkspace(),listLocations({includeInactive:true}),
  ]).catch(()=>null);
  // Quiet (v4, approved Oct 23): the editor draws the page (back, Save, Applies to, the switches and the approved wording).
  if(data)return <CompanyPolicyEditor history={data[0]} timeZone={data[1].timeZone} locations={data[2]}/>;
  return (
    <SettingsFrame title="Company policies">
      <section className="q-emptyblock" role="status"><h2 className="q-emptyblock__title">Policies unavailable</h2><p className="q-empty">Current policies could not be read. Editing is paused; try again to verify your current Owner access and policy history.</p><div className="q-emptyblock__action"><a className="q-btn q-btn--sec" href="/app/settings/company-policies">Retry read</a></div></section>
    </SettingsFrame>
  );
}
