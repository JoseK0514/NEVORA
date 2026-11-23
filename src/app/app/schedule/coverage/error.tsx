"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { scheduleWords } from "../schedule-copy";

/** A failed Coverage read keeps the page’s band and says what to do next; retry() reads the server again (IS-WA-10: one short alert). */
export default function CoverageError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = scheduleWords(usePortalLang()).errors;
  return <WaveARouteError retry={retry} title={t.coverShift} back={{ href: "/app/schedule", label: t.schedule }} />;
}
