import { RouteSkeleton } from "@/components/route-skeleton";

/** Scheduling restrictions (U02): the page's own placeholder (its frame is the "agreement" entry in b-loading.tsx). */
export default function Loading() {
  return <RouteSkeleton label="your agreed times" shape="cards" />;
}
