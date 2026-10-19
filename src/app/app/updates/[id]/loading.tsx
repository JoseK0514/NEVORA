import { RouteSkeleton } from "@/components/route-skeleton";

// Phase 3.5 Wave B: the band at its final height at 390 (Update detail, two-line title), so it does not jump when the page arrives.
export default function Loading() {
  return <RouteSkeleton label="update" shape="list" band={288} />;
}
