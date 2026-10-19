import { SettingsLoading } from "../wave-c-loading";

export default function Loading() {
  return <SettingsLoading eyebrow add="Add break type" title="Break types" summary="The breaks your team can start at the Clocker." label="break types" cards={[2, 3]} />;
}
