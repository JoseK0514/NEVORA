import { RouteSkeleton } from "@/components/route-skeleton";

// Phase 3.5 Wave B: the band height per phone width and text size is set in premium-wave-b.css (route "wb-templates").
export default function Loading() {
  return <RouteSkeleton route="wb-templates" label="templates" shape="list" band={244} />;
}
