"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";
import { rosterImportCopy } from "@/components/roster-import/copy";

export default function RosterImportError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const copy = rosterImportCopy.en;
  return <WaveARouteError retry={retry} title={copy.title} back={{ href: "/app/employees", label: copy.team }} />;
}
