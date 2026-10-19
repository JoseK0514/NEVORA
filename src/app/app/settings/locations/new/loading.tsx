import { SettingsLoading } from "../../wave-c-loading";

export default function Loading() {
  return <SettingsLoading back={{ href: "/app/settings/locations", label: "Locations" }} title="Add location" summary="Give your team a new place to work." label="the new location form" cards={[2, 1]} />;
}
