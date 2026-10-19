import { RecoveryLoading } from "../settings/wave-c-recovery-loading";

export default function Loading() {
  return <RecoveryLoading title="Account recovery" summary="Help a verified employee get back into their account." label="account recovery" cards={[3]} />;
}
