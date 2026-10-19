import {getWorkspace} from "@/lib/data/workspaces";
import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { readCompanyPolicies } from "@/lib/business-improvements/company-policies/service";
import { listLocations } from "@/lib/data/locations";
import { CompanyPolicyEditor } from "@/components/company-policy-editor";
import { GuideCard, SettingsFrame } from "../wave-c-kit";
export default async function CompanyPoliciesPage() {
  await requireRoles(["OWNER"]);
  const history = await readCompanyPolicies(
    await requireSessionMutationProof(),
  );
  return (
    <SettingsFrame title="Company policies" summary="Set attendance review rules for your company and locations."
      aside={<GuideCard title="What these rules do">
        {/* Legal wording: kept exactly as approved. */}
        <p>These rules do not determine pay, discipline, or legal entitlements.</p>
        <p>They decide which recorded times are flagged for review, from each rule’s effective date. A location can follow the company default or set its own.</p>
      </GuideCard>}>
      <CompanyPolicyEditor
        history={history}
        timeZone={(await getWorkspace()).timeZone}
        locations={await listLocations()}
      />
    </SettingsFrame>
  );
}
