import { SettingsLoading } from "../wave-c-loading";

export default function Loading() {
  return <SettingsLoading eyebrow add="Add device" title="Clocker devices" summary="A shared tablet at each location, with access you control." label="Clocker devices" cards={[1, 2, 3]} />;
}
