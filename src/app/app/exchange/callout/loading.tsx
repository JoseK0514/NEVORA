import { RouteSkeleton } from "@/components/route-skeleton";

/** Wave A: this page's own placeholder. Its band height per width is set in premium-wave-a.css (data-route="wa-callout"). */
export default function Loading() {
  return <RouteSkeleton route="wa-callout" label="the report form" shape="cards" band={244} />;
}
