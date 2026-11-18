import { RouteSkeleton } from "@/components/route-skeleton";

/** A step-by-step page in Add employee's frame (the band, then one card), so it takes that page's placeholder shape. */
export default function Loading() {
  return <RouteSkeleton route="wa-new" label="paid time export" shape="cards" band={244} />;
}
