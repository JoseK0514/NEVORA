"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";

export default function RestrictionsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <WaveARouteError retry={retry} title="When they can be scheduled" back={{ href: "/app/employees", label: "Team" }} />;
}
