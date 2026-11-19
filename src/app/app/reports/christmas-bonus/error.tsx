"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";

export default function ChristmasBonusError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <WaveARouteError retry={retry} title="Christmas bonus hours" back={{ href: "/app/reports", label: "Insights" }} />;
}
