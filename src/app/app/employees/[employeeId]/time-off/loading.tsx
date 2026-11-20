import { RouteSkeleton } from "@/components/route-skeleton";

/** PTO screens: the balance page's placeholder, the same card shape as the pay rate page. */
export default function Loading() {
  return <RouteSkeleton label="the time off balance" shape="cards" />;
}
