import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/workspaces";
import { readPresentationHistory } from "@/lib/workspace-presentation/service";
import { storedBrand } from "@/lib/workspace-presentation/model";
import { BrandEditor } from "@/components/brand-editor";
import { SettingsFrame } from "../wave-c-kit";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  await requireRoles(["OWNER"]);
  const [workspace, history] = await Promise.all([getWorkspace(), readPresentationHistory(await requireSessionMutationProof())]);
  const latest = history[0];
  const current = storedBrand(latest?.settings);
  return (
    <SettingsFrame title="Branding" summary="Your color and logo across NEVORA. Layout, text sizes and status colors stay the same.">
      <BrandEditor key={latest?.revision ?? 0}
        workspaceName={workspace.name}
        revision={latest?.revision ?? 0}
        seed={current.seed}
        logoAssetId={current.logoAssetId}
        history={history.slice(0, 5).map(item => ({ revision: item.revision, changedAt: item.changedAt, changedKeys: item.changedKeys }))}
        timeZone={workspace.timeZone}
      />
    </SettingsFrame>
  );
}
