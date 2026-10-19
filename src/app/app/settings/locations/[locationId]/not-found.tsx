import Link from "next/link";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { EmptyState, SettingsFrame } from "../../wave-c-kit";

/** WR-05: an unknown or removed location keeps the Settings frame and a way back. */
export default function LocationNotFound() {
  return (
    <SettingsFrame back={{ href: "/app/settings/locations", label: "Locations" }} title="Location not found" summary="It may have been removed, or the link is out of date.">
      <section className="nv-card" aria-labelledby="location-missing-title">
        <EmptyState icon={<MapPinIcon size={22} weight="bold" />} titleId="location-missing-title" title="We couldn’t find this location"
          action={<Link className="nv-btn" data-kind="primary" href="/app/settings/locations">Go to Locations</Link>}>
          Open it again from your list of locations.
        </EmptyState>
      </section>
    </SettingsFrame>
  );
}
