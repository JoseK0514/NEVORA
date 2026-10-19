import { RouteSkeleton } from "@/components/route-skeleton";

/** Wave A: this page's own placeholder. Its band height per width is set in premium-wave-a.css (data-route="wa-copy"). */
export default function Loading() {
  return <RouteSkeleton route="wa-copy" label="the copy result" shape="cards" band={212} />;
}
