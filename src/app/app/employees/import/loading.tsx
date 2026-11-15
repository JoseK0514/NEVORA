import { RouteSkeleton } from "@/components/route-skeleton";

/** The import page has Add employee's frame (the band, then one card), so it takes that page's placeholder shape. */
export default function Loading() {
  return <RouteSkeleton route="wa-new" label="the staff list import" shape="cards" band={244} />;
}
