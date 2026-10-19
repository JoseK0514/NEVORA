"use client";

import { WaveARouteError } from "@/components/wave-a/route-error";

export default function NewEmployeeError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <WaveARouteError retry={retry} title="Add employee" back={{ href: "/app/employees", label: "Team" }} />;
}
