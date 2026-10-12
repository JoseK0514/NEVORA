import Link from "next/link";
import {getWorkspace} from "@/lib/data/workspaces";
import "./company-policies.css";
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
    <div className="company-policies-page">
      <header className="page-header"><div><h1>Company policies</h1>
      <p>
        Set attendance review rules for your company and locations. These rules do not determine pay, discipline, or legal entitlements.
      </p></div><Link className="button secondary" href="/app/settings">Back to settings</Link></header>
      <CompanyPolicyEditor
        history={history}
        timeZone={(await getWorkspace()).timeZone}
        locations={await listLocations()}
      />
    </div>
  );
}
