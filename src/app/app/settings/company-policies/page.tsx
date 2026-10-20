import "./company-policies.css";
import {getWorkspace} from "@/lib/data/workspaces";
import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { readCompanyPolicyHistory } from "@/lib/business-improvements/company-policies/service";
import { listLocations } from "@/lib/data/locations";
import { CompanyPolicyEditor } from "@/components/company-policy-editor";
import { GuideCard, SettingsFrame } from "../wave-c-kit";
export const dynamic = "force-dynamic";
export default async function CompanyPoliciesPage() {
  await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  const data=await Promise.all([
    readCompanyPolicyHistory(proof),getWorkspace(),listLocations({includeInactive:true}),
  ]).catch(()=>null);
  const content=data?<CompanyPolicyEditor history={data[0]} timeZone={data[1].timeZone} locations={data[2]}/>:
    <section className="policy-state" role="status"><h2>Policies unavailable</h2><p>Current policies could not be read. Editing is paused; try again to verify your current Owner access and policy history.</p><a className="button secondary" href="/app/settings/company-policies">Retry read</a></section>;
  return (
    <SettingsFrame title="Company policies" summary="Set attendance review rules for your company and locations."
      aside={<GuideCard title="What these rules do">
        {/* Legal wording: kept exactly as approved. */}
        <p>These rules do not determine pay, discipline, or legal entitlements.</p>
        <p>They decide which recorded times are flagged for review, from each rule’s effective date. A location can follow the company default or set its own.</p>
      </GuideCard>}>
      {content}
    </SettingsFrame>
  );
}
