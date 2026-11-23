import { RouteSkeleton } from "@/components/route-skeleton";
import { exchangeCopy } from "../exchange-copy";

/** Wave A: this page's own placeholder. Its band height per width is set in premium-wave-a.css (data-route="wa-swap"). */
export default function Loading() {
  return <RouteSkeleton route="wa-swap" label={exchangeCopy().loadingSwap /* No session here: English (G98). */} shape="cards" band={288} />;
}
