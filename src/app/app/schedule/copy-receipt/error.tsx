"use client";

import { usePortalLang } from "@/lib/i18n/portal-lang";
import { copy } from "./error-copy";
import { WaveARouteError } from "@/components/wave-a/route-error";

export default function CopyReceiptError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = copy[usePortalLang()];
  return <WaveARouteError retry={retry} title={t.copyWeek} back={{ href: "/app/schedule", label: t.schedule }} />;
}
