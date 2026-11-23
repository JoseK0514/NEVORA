"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { scheduleWords } from "../schedule-copy";

export default function EditShiftError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = scheduleWords(usePortalLang()).errors;
  return <WaveARouteError retry={retry} title={t.editShift} back={{ href: "/app/schedule", label: t.schedule }} />;
}
