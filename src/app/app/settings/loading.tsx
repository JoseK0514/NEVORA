import { SettingsLoading } from "./wave-c-loading";

export default function Loading() {
  return <SettingsLoading back={null} eyebrow title="Settings" summary="Set up your workspace and the way your team works." label="settings" cards={[4, 4]} aside={false} />;
}
