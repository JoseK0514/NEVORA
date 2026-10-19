import { RouteSkeleton } from "@/components/route-skeleton";

export default function Loading() {
  return <RouteSkeleton route="hub" label="requests" shape="list" band={104} overlap={false} />;
}
