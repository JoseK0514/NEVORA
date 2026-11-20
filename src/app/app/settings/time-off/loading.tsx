import { RouteSkeleton } from "@/components/route-skeleton";

/** PTO screens: the policies page's placeholder (its frame is this address's entry in b-loading.tsx). */
export default function Loading() {
  return <RouteSkeleton label="Time off policies" shape="list" />;
}
