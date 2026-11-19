import { RouteSkeleton } from "@/components/route-skeleton";

/** Clocker PINs: the page's own placeholder (its frame is the "/app/settings/clocker/pins" entry in b-loading.tsx). */
export default function Loading() {
  return <RouteSkeleton label="Clocker PINs" shape="list" />;
}
