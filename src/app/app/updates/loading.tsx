import { RouteSkeleton } from "@/components/route-skeleton";

export default function Loading() {
  return <RouteSkeleton route="updates" label="updates" shape="list" band={128} overlap={false} />;
}
