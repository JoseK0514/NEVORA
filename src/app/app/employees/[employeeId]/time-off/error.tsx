"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { EMPLOYEES_COPY } from "../../employees-copy";

export default function TimeOffBalanceError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = EMPLOYEES_COPY[usePortalLang()];
  return <WaveARouteError retry={retry} title={t.timeOffBalance} back={{ href: "/app/employees", label: t.team }} />;
}
