"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";

export default function AddShiftError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <WaveARouteError retry={retry} title="Add shift" back={{ href: "/app/schedule", label: "Schedule" }} />;
}
