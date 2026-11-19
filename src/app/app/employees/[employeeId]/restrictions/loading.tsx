import { RouteSkeleton } from "@/components/route-skeleton";

/** Scheduling restrictions (U02): the page's own placeholder (its frame is the "restrictions" entry in b-loading.tsx). */
export default function Loading() {
  return <RouteSkeleton label="the agreement" shape="cards" />;
}
