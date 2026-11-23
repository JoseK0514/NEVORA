"use client";
import { WaveARouteError } from "@/components/wave-a/route-error";

/** Phase 2 (package D): the one Direction B route error screen.
 * G54 (Nov 23, 2026): the same words as every other route error (the band names Team once; the card says the page didn't
 * load and the honest cause); Team is a tab, so it has no back link. */
export default function EmployeesError({ retry }: { retry: () => void }) {
  return <WaveARouteError retry={retry} title="Team" />;
}
