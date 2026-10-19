import { RouteSkeleton } from "@/components/route-skeleton";

/** Wave A: this page's own placeholder. Its band height per width is set in premium-wave-a.css (data-route="wa-add"). */
export default function Loading() {
  return <RouteSkeleton route="wa-add" label="the new shift" shape="cards" band={288} />;
}
