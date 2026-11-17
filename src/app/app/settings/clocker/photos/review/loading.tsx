import { RouteSkeleton } from "@/components/route-skeleton";

/** Photo review: the page's own placeholder (its frame is the "/app/settings/clocker/photos/review" entry in b-loading.tsx). */
export default function Loading() {
  return <RouteSkeleton label="punch photos" shape="list" />;
}
