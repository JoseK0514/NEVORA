import { SettingsLoading } from "../wave-c-loading";

export default function Loading() {
  return <SettingsLoading eyebrow title="Positions" summary="The job qualifications your team brings to each shift." label="positions" cards={[1, 4]} />;
}
