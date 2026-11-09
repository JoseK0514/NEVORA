import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/workspaces";
import { readPresentationHistory } from "@/lib/workspace-presentation/service";
import { storedBrand } from "@/lib/workspace-presentation/model";
import { BrandEditor } from "@/components/brand-editor";
import { SettingsFrame } from "../wave-c-kit";
import { listLocations } from "@/lib/data/locations";
import { listPositions } from "@/lib/data/positions";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  await requireRoles(["OWNER"]);
  const [workspace, history, locations, positions] = await Promise.all([getWorkspace(), readPresentationHistory(await requireSessionMutationProof()),
    // Owner premium R7: the preview shows the company's own first location and position; a failed read keeps sample words.
    listLocations({ includeInactive: false }).catch(() => []), listPositions().catch(() => [])]);
  const latest = history[0];
  const current = storedBrand(latest?.settings);
  return (
    <SettingsFrame title="Branding" save={{ form: "brand-form" }}>
      <BrandEditor key={latest?.revision ?? 0}
        workspaceName={workspace.name}
        revision={latest?.revision ?? 0}
        seed={current.seed}
        logoAssetId={current.logoAssetId}
        history={history.slice(0, 5).map(item => ({ revision: item.revision, changedAt: item.changedAt, changedKeys: item.changedKeys }))}
        timeZone={workspace.timeZone}
        sample={{ place: locations[0]?.shortName || undefined, position: positions[0]?.name || undefined }}
      />
    </SettingsFrame>
  );
}
