import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/workspaces";
import { payrollFeatureEnabled } from "@/lib/payroll/service";
import { readModuleBlockers, readPresentationHistory } from "@/lib/workspace-presentation/service";
import { readSettings } from "@/lib/workspace-presentation/model";
import { FeaturesEditor } from "@/components/features-editor";
import { GuideCard, SettingsFrame } from "../wave-c-kit";

export const dynamic = "force-dynamic";

export default async function FeaturesPage() {
  await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  const [workspace, history, blockers] = await Promise.all([getWorkspace(), readPresentationHistory(proof), readModuleBlockers(proof)]);
  const latest = history[0];
  const settings = readSettings(latest?.settings);
  return (
    <SettingsFrame title="Features & words" summary="Turn off what your company doesn’t use, and name your team the way you do."
      aside={<GuideCard title="Nothing is deleted">
        <p>A feature that’s off is hidden for everyone and paused on the server. Its records stay, and turning it back on brings them back.</p>
        <p>A feature with requests still waiting stays on until they’re answered.</p>
      </GuideCard>}>
      <FeaturesEditor
        key={latest?.revision ?? 0}
        revision={latest?.revision ?? 0}
        preset={settings.words?.preset ?? "standard"}
        disabled={settings.modules?.disabled ?? []}
        blockers={blockers}
        payrollEnabled={payrollFeatureEnabled()}
      />
    </SettingsFrame>
  );
}
