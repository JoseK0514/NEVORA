import { RouteSkeleton } from "@/components/route-skeleton";

/** Clocker tablets: the page's own placeholder (its frame is the "/app/settings/clocker" entry in b-loading.tsx). */
export default function Loading() {
  return <RouteSkeleton label="Clocker tablets" shape="list" />;
}
