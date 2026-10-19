import { SettingsLoading } from "../wave-c-loading";

export default function Loading() {
  return <SettingsLoading title="Company profile" summary="Your business name and the timezone your team works in." label="company profile" cards={[1, 2]} />;
}
