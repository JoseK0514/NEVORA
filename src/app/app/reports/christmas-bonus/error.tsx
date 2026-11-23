"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { reportsCopy } from "@/components/reports-copy";

export default function ChristmasBonusError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const w = reportsCopy(usePortalLang());
  return <WaveARouteError retry={retry} title={w.christmasBonus} back={{ href: "/app/reports", label: w.insights }} />;
}
