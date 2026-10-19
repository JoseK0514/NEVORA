import { RouteSkeleton } from "@/components/route-skeleton";

// Phase 3.5 Wave B: the band height per phone width and text size is set in premium-wave-b.css (route "wb-payroll-settings").
export default function Loading() {
  return <RouteSkeleton route="wb-payroll-settings" label="payroll settings" shape="cards" band={128} overlap={false} />;
}
