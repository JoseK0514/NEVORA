import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/workspaces";
import { payrollFeatureEnabled } from "@/lib/payroll/service";
import { readModuleBlockers, readPresentationHistory, updatesActivationHeld } from "@/lib/workspace-presentation/service";
import { readSettings } from "@/lib/workspace-presentation/model";
import { FeaturesEditor } from "@/components/features-editor";
import { SettingsPageB } from "../settings-b";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Features" };

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  const [, history, blockers, updatesHeld] = await Promise.all([getWorkspace(), readPresentationHistory(proof), readModuleBlockers(proof), updatesActivationHeld()]);
  const latest = history[0];
  const settings = readSettings(latest?.settings);
  return (
    <SettingsPageB title="Features and team terms">
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
