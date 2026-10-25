"use client";
import { WaveARouteError } from "@/components/wave-a/route-error";

/** T-21: the Team list's read failed; the Quiet error state with Try again and Back to Home. */
export default function EmployeesError({ retry }: { retry: () => void }) {
  return <WaveARouteError retry={retry} title="Team" back={{ href: "/app", label: "Home" }} />;
}
