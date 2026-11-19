import { RouteSkeleton } from "@/components/route-skeleton";

/** Punch photos: the page's own placeholder (its frame is the "/app/settings/clocker/photos" entry in b-loading.tsx). */
export default function Loading() {
  return <RouteSkeleton label="punch photo settings" shape="cards" />;
}
