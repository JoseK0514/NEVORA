import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/workspaces";
import { readPresentationHistory } from "@/lib/workspace-presentation/service";
import { storedBrand } from "@/lib/workspace-presentation/model";
import { BrandEditor } from "@/components/brand-editor";
import { SettingsPageB } from "../settings-b";
import { listLocations } from "@/lib/data/locations";
import { listPositions } from "@/lib/data/positions";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../settings-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].branding }; }

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  await requireRoles(["OWNER"]);
  const lang = await readPageLang(), t = SETTINGS_COPY[lang];
  const [workspace, history, locations, positions] = await Promise.all([getWorkspace(), readPresentationHistory(await requireSessionMutationProof()),
    // Owner premium R7: the preview shows the company's own first location and position; a failed read keeps sample words.
    listLocations({ includeInactive: false }).catch(() => []), listPositions().catch(() => [])]);
  const latest = history[0];
  const current = storedBrand(latest?.settings);
  return (
    // Review F4 (NV-102): on tablets and desktop Save is in the settings card's footer; phones save from the band.
    <SettingsPageB title={t.branding} lang={lang === "es" ? "es" : undefined} phoneRight={<button type="submit" form="brand-form" className="c-setb-save">{t.save}</button>}>
      <BrandEditor key={latest?.revision ?? 0}
        workspaceName={workspace.name}
        revision={latest?.revision ?? 0}
        seed={current.seed}
        logoAssetId={current.logoAssetId}
        history={history.slice(0, 5).map(item => ({ revision: item.revision, changedAt: item.changedAt, changedKeys: item.changedKeys }))}
        timeZone={workspace.timeZone}
        sample={{ place: locations[0]?.shortName || undefined, position: positions[0]?.name || undefined }}
      />
    </SettingsPageB>
  );
}
