import { RouteSkeleton } from "@/components/route-skeleton";

/** Wave A: this page's own placeholder. Its band height per width is set in premium-wave-a.css (data-route="wa-swap"). */
export default function Loading() {
  return <RouteSkeleton route="wa-swap" label="the swap" shape="cards" band={288} />;
}
