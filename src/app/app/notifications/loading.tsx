import { RouteSkeleton } from "@/components/route-skeleton";

export default function Loading() {
  return <RouteSkeleton route="notifications" label="notifications" shape="list" band={128} overlap={false} />;
}
