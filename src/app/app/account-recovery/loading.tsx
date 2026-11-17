import { RecoveryLoading } from "../settings/wave-c-recovery-loading";

export default function Loading() {
  return <RecoveryLoading title="Help someone sign in" summary="Give someone a one-time link to reset their password." label="help someone sign in" cards={[3]} />;
}
