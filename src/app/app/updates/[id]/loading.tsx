import { RouteSkeleton } from "@/components/route-skeleton";

// Phase 3.5 Wave B: the band height per phone width and text size is set in premium-wave-b.css (route "wb-update").
export default function Loading() {
  return <RouteSkeleton route="wb-update" label="update" shape="list" band={288} />;
}
