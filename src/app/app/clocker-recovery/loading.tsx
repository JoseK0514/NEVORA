import { RecoveryLoading } from "../settings/wave-c-recovery-loading";

export default function Loading() {
  return <RecoveryLoading title="Clocker recovery" summary="Check a saved Clocker action and help the employee finish recovery." label="Clocker recovery" cards={[2, 2]} />;
}
