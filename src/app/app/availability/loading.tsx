import { RouteSkeleton } from "@/components/route-skeleton";

/** Phase 3 (P3-ST-03): the band at its final height, so it never pops in. */
export default function Loading() {
  return <RouteSkeleton route="availability" label="availability" shape="cards" band={192} overlap={false} />;
}
