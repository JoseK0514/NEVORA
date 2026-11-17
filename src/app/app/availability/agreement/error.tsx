"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";

export default function AgreedTimesError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <WaveARouteError retry={retry} title="Agreed times" back={{ href: "/app/availability", label: "Availability" }} />;
}
