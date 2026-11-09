import { RouteSkeleton } from "@/components/route-skeleton";
import "./profile-premium.css";

/** Phase 3 (P3-ST-03): the band at its final height, so it never pops in. */
export default function Loading() {
  return <RouteSkeleton route="profile" label="profile" shape="cards" band={128} overlap={false} />;
}
