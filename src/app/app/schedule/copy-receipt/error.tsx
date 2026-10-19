"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";

export default function CopyReceiptError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <WaveARouteError retry={retry} title="Copy week" back={{ href: "/app/schedule", label: "Schedule" }} />;
}
