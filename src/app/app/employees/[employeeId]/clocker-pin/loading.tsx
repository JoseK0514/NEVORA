import { RouteSkeleton } from "@/components/route-skeleton";

/** One person's Clocker PIN: the page's own placeholder (its frame is the "clocker-pin" entry in b-loading.tsx). */
export default function Loading() {
  return <RouteSkeleton label="the Clocker PIN" shape="cards" />;
}
