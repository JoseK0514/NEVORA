"use client";

import { BRouteError } from "@/components/owner-b/b-route-error";

/** Locations couldn't be read: say so, offer one retry, and a way back. Nothing was changed.
 * Phase 2 (package D): the one Direction B route error screen; the words and both actions are unchanged. */
export default function LocationsError({ reset, retry }: { error?: Error & { digest?: string }; reset: () => void; retry?: () => void }) {
  return <BRouteError title="Your workplaces" sub="Where your team works, each place’s scheduling setup and its Clocker link."
    spoken="Couldn’t load your workplaces. Try again to see the latest setup and Clocker links."
    cardTitle="Couldn’t load your workplaces." line="Try again to see the latest setup and Clocker links. Nothing was changed."
    onRetry={() => (retry ?? reset)()} away={{ href: "/app/settings", label: "Back to Settings" }} />;
}
