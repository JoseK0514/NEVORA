import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/workspaces";
import { payrollFeatureEnabled } from "@/lib/payroll/service";
import { readModuleBlockers, readPresentationHistory, updatesActivationHeld } from "@/lib/workspace-presentation/service";
import { readSettings } from "@/lib/workspace-presentation/model";
import { FeaturesEditor } from "@/components/features-editor";
import { SettingsPageB } from "../settings-b";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../settings-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].features }; }

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  await requireRoles(["OWNER"]);
  const lang = await readPageLang(), t = SETTINGS_COPY[lang];
  const proof = await requireSessionMutationProof();
  const [, history, blockers, updatesHeld] = await Promise.all([getWorkspace(), readPresentationHistory(proof), readModuleBlockers(proof), updatesActivationHeld()]);
  const latest = history[0];
  const settings = readSettings(latest?.settings);
  return (
    <SettingsPageB title={t.featuresAndTerms} lang={lang === "es" ? "es" : undefined}>
      <FeaturesEditor
        key={latest?.revision ?? 0}
        revision={latest?.revision ?? 0}
        preset={settings.words?.preset ?? "standard"}
        disabled={settings.modules?.disabled ?? []}
        blockers={blockers}
        payrollEnabled={payrollFeatureEnabled()}
        updatesHeld={updatesHeld}
      />
    </SettingsPageB>
  );
}
