"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";

export default function PayError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <WaveARouteError retry={retry} title="Pay rate" back={{ href: "/app/employees", label: "Team" }} />;
}
