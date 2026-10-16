import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/workspaces";
import { readPresentationHistory } from "@/lib/workspace-presentation/service";
import { storedBrand } from "@/lib/workspace-presentation/model";
import { BrandEditor } from "@/components/brand-editor";
import "./branding.css";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  await requireRoles(["OWNER"]);
  const [workspace, history] = await Promise.all([getWorkspace(), readPresentationHistory(await requireSessionMutationProof())]);
  const latest = history[0];
  const current = storedBrand(latest?.settings);
  return (
    <div className="branding-page">
      <Link className="branding-back" href="/app/settings">
        <ArrowLeftIcon size={18} aria-hidden="true" />
        Back to Settings
      </Link>
      <header className="branding-heading">
        <div>
          <h1>Branding</h1>
          <p>Your company colour and logo across NEVORA. Layout, text sizes and status colours stay the same, so everything stays readable.</p>
        </div>
        <span className="branding-access"><ShieldCheckIcon size={18} aria-hidden="true" />Owner access</span>
      </header>
      <BrandEditor key={latest?.revision ?? 0}
        workspaceName={workspace.name}
        revision={latest?.revision ?? 0}
        seed={current.seed}
        logoAssetId={current.logoAssetId}
        history={history.slice(0, 5).map(item => ({ revision: item.revision, changedAt: item.changedAt, changedKeys: item.changedKeys }))}
        timeZone={workspace.timeZone}
      />
    </div>
  );
}
