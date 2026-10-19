import { RouteSkeleton } from "@/components/route-skeleton";

/** Wave A: this page's own placeholder. Its band height per width is set in premium-wave-a.css (data-route="wa-pin"). */
export default function Loading() {
  return <RouteSkeleton route="wa-pin" label="the Clocker PIN" shape="cards" band={288} />;
}
