import { SettingsLoading } from "../wave-c-loading";

export default function Loading() {
  return <SettingsLoading title="Branding" summary="Your color and logo across NEVORA. Layout, text sizes and status colors stay the same." label="branding" cards={[3, 2, 4]} />;
}
