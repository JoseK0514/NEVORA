import { RouteSkeleton } from "@/components/route-skeleton";

export default function Loading() {
  return <RouteSkeleton route="payroll" label="payroll" shape="cards" band={152} overlap={false} />;
}
