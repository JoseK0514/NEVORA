"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";

/** A failed Coverage read keeps the page’s band and says what to do next; retry() reads the server again (IS-WA-10: one short alert). */
export default function CoverageError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <WaveARouteError retry={retry} title="Cover this shift" back={{ href: "/app/schedule", label: "Schedule" }} />;
}
