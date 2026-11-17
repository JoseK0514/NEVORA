import { RouteSkeleton } from "@/components/route-skeleton";

/** Clocker recovery: the page's own placeholder (its frame is the "/app/clocker-recovery" entry in b-loading.tsx). */
export default function Loading() {
  return <RouteSkeleton label="Clocker recovery" shape="cards" />;
}
