import { RouteSkeleton } from "@/components/route-skeleton";

/** Wave A: this page's own placeholder. Its band height per width is set in premium-wave-a.css (data-route="wa-new"). */
export default function Loading() {
  return <RouteSkeleton route="wa-new" label="the new employee form" shape="cards" band={244} />;
}
