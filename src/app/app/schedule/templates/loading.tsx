import { RouteSkeleton } from "@/components/route-skeleton";

// Phase 3.5 Wave B: the band at its final height at 390 (Templates), so it does not jump when the page arrives.
export default function Loading() {
  return <RouteSkeleton label="templates" shape="list" band={244} />;
}
