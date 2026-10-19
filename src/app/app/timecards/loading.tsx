import { RouteSkeleton } from "@/components/route-skeleton";

export default function Loading() {
  return <RouteSkeleton route="timecards" label="timecards" shape="list" band={172} overlap={false} />;
}
