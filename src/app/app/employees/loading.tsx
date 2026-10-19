import { RouteSkeleton } from "@/components/route-skeleton";

export default function Loading() {
  return <RouteSkeleton route="team" label="team" shape="list" band={220} />;
}
