import { SettingsLoading } from "../wave-c-loading";

export default function Loading() {
  return <SettingsLoading title="Company policies" summary="Set attendance review rules for your company and locations." label="company policies" cards={[2, 1, 1, 1]} />;
}
