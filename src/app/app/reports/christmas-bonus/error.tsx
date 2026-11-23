"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { CHRISTMAS_BONUS_COPY } from "@/components/christmas-bonus-copy";

export default function ChristmasBonusError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = CHRISTMAS_BONUS_COPY[usePortalLang()];
  return <WaveARouteError retry={retry} title={t.title} back={{ href: "/app/reports", label: t.insights }} />;
}
