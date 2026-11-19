import { RouteSkeleton } from "@/components/route-skeleton";

/** A pushed Insights page: back row, title and one line, then cards. */
export default function Loading() {
  return <RouteSkeleton label="Christmas bonus hours" shape="cards" band={216} overlap={false} />;
}
