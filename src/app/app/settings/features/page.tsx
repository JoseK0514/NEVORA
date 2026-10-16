import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/workspaces";
import { payrollFeatureEnabled } from "@/lib/payroll/service";
import { readModuleBlockers, readPresentationHistory } from "@/lib/workspace-presentation/service";
import { readSettings } from "@/lib/workspace-presentation/model";
import { FeaturesEditor } from "@/components/features-editor";
import "../branding/branding.css";
import "./features.css";

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  const [workspace, history, blockers] = await Promise.all([getWorkspace(), readPresentationHistory(proof), readModuleBlockers(proof)]);
  const latest = history[0];
  const settings = readSettings(latest?.settings);
  return (
    <div className="branding-page features-page">
      <Link className="branding-back" href="/app/settings">
        <ArrowLeftIcon size={18} aria-hidden="true" />
        Back to Settings
      </Link>
      <header className="branding-heading">
        <div>
          <h1>Features &amp; words</h1>
          <p>Turn off what {workspace.name} doesn&rsquo;t use, and name your team the way you do. Nothing is deleted when a feature is off.</p>
        </div>
        <span className="branding-access"><ShieldCheckIcon size={18} aria-hidden="true" />Owner access</span>
      </header>
      <FeaturesEditor
        key={latest?.revision ?? 0}
        revision={latest?.revision ?? 0}
        preset={settings.words?.preset ?? "standard"}
        disabled={settings.modules?.disabled ?? []}
        blockers={blockers}
        payrollEnabled={payrollFeatureEnabled()}
      />
    </div>
  );
}
