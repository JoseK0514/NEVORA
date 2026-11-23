"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { availabilityCopy } from "@/components/availability-copy";

export default function AgreedTimesError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = availabilityCopy(usePortalLang()).page;
  return <WaveARouteError retry={retry} title={t.agreedTimes} back={{ href: "/app/availability", label: t.title }} />;
}
