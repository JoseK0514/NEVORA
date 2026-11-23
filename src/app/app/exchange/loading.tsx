import { RouteSkeleton } from "@/components/route-skeleton";
import { exchangeCopy } from "./exchange-copy";

export default function Loading() {
  return <RouteSkeleton route="exchange" label={exchangeCopy().loadingShiftRequests /* No session here: English (G98). */} shape="list" band={236} overlap={false} />;
}
