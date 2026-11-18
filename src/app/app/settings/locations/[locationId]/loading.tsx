import { RouteSkeleton } from "@/components/route-skeleton";

/** Phase 7 (package C): the page's own placeholder in the Direction B frame (its shape is this address's entry in
 * b-loading.tsx). The older Settings placeholder drew no band on a phone and ended its band 46px low on desktop. */
export default function Loading() {
  return <RouteSkeleton label="Location" shape="list" />;
}
