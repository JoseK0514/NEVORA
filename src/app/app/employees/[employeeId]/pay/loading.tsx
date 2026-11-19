import { RouteSkeleton } from "@/components/route-skeleton";

/** SCRUM-214: the pay rate page's placeholder, the same card shape as the agreement page. */
export default function Loading() {
  return <RouteSkeleton label="pay rates" shape="cards" />;
}
