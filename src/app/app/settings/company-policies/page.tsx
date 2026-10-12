import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { readCompanyPolicies } from "@/lib/business-improvements/company-policies/service";
import { listLocations } from "@/lib/data/locations";
import { CompanyPolicyEditor } from "@/components/company-policy-editor";
export default async function CompanyPoliciesPage() {
  await requireRoles(["OWNER"]);
  const history = await readCompanyPolicies(
    await requireSessionMutationProof(),
  );
  return (
    <div>
      <h1>Company policies</h1>
      <p>
        Configure factual attendance comparisons. Unconfigured rules remain Not
        Configured. These thresholds do not determine pay, discipline, or legal
        entitlements.
      </p>
      <CompanyPolicyEditor
        history={history}
        locations={await listLocations()}
      />
    </div>
  );
}
