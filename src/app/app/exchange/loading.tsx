import { RouteSkeleton } from "@/components/route-skeleton";

export default function Loading() {
  return <RouteSkeleton route="exchange" label="shift requests" shape="list" band={236} overlap={false} />;
}
