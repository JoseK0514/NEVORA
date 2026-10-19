import { RouteSkeleton } from "@/components/route-skeleton";

// Phase 3.5 Wave B: the band at its final height at 390 (Scheduling rules), so it does not jump when the page arrives.
export default function Loading() {
  return <RouteSkeleton label="scheduling rules" shape="list" band={196} overlap={false} />;
}
