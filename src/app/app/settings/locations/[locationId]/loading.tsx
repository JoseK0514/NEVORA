import { SettingsLoading } from "../../wave-c-loading";

export default function Loading() {
  return <SettingsLoading back={{ href: "/app/settings/locations", label: "Locations" }} eyebrow title={<span className="wc-skeleton__title" />} summary="Names and status your team sees, and this location’s Clocker link." label="the location" cards={[2, 1]} />;
}
