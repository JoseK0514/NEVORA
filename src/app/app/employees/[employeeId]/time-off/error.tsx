"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";

export default function TimeOffBalanceError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <WaveARouteError retry={retry} title="Time off balance" back={{ href: "/app/employees", label: "Team" }} />;
}
