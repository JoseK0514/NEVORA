import Link from "next/link";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { lower, wordPreset } from "@/lib/workspace-presentation/words";
import { EmptyState, SettingsFrame } from "../../wave-c-kit";

/** WR-05: an unknown or removed location keeps the Settings frame and a way back. */
export default async function LocationNotFound() {
  const words = wordPreset((await currentPresentation()).words).en;
  const place = lower(words.location);
  return (
    <SettingsFrame back={{ href: "/app/settings/locations", label: words.locations }} title={`${words.location} not found`} summary="It may have been removed, or the link is out of date.">
      <section className="nv-card" aria-labelledby="location-missing-title">
        <EmptyState icon={<MapPinIcon size={22} weight="bold" />} titleId="location-missing-title" title={`We couldn’t find this ${place}`}
          action={<Link className="nv-btn" data-kind="primary" href="/app/settings/locations">Go to {words.locations}</Link>}>
          Open it again from your list of {lower(words.locations)}.
        </EmptyState>
      </section>
    </SettingsFrame>
  );
}
