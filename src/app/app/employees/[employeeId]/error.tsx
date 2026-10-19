"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";

export default function MemberError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <WaveARouteError retry={retry} title="Team member" back={{ href: "/app/employees", label: "Team" }} />;
}
