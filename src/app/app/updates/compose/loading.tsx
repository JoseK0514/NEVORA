import { RouteSkeleton } from "@/components/route-skeleton";

// Phase 3.5 Wave B: the band at its final height at 390 (Compose), so it does not jump when the page arrives.
export default function Loading() {
  return <RouteSkeleton label="the update form" shape="list" band={312} />;
}
