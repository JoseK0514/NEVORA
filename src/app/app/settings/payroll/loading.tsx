import { RouteSkeleton } from "@/components/route-skeleton";

// Phase 3.5 Wave B: the Payroll settings band at its final height at 390, under the Pay section tabs.
export default function Loading() {
  return <RouteSkeleton label="payroll settings" shape="cards" band={128} overlap={false} />;
}
