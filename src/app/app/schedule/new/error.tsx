"use client";

import { useSearchParams } from "next/navigation";
import { WaveARouteError } from "@/components/wave-a/route-error";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { scheduleWords } from "../schedule-copy";

/** This route draws Add shift and, with ?review=, Find cover's Review replacement: the failure names the page the person
 * opened (Impeccable audit, Nov 22, 2026). The way back for a review is the schedule, since its coverage link isn't known here. */
export default function AddShiftError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const review = useSearchParams()?.has("review") ?? false;
  const t = scheduleWords(usePortalLang()).errors;
  return <WaveARouteError retry={retry} title={review ? t.reviewReplacement : t.addShift} back={{ href: "/app/schedule", label: t.schedule }} />;
}
