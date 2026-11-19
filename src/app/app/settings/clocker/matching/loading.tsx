import { RouteSkeleton } from "@/components/route-skeleton";

/** Shift matching: the page's own placeholder (its frame is the "/app/settings/clocker/matching" entry in b-loading.tsx). */
export default function Loading() {
  return <RouteSkeleton label="shift matching" shape="cards" />;
}
