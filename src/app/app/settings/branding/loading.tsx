import { SettingsLoading } from "../wave-c-loading";

export default function Loading() {
  return <SettingsLoading title="Branding" summary="Your colour and logo across NEVORA. Layout, text sizes and status colours stay the same." label="branding" cards={[3, 2, 4]} />;
}
