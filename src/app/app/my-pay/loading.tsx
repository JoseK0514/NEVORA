import { RouteSkeleton } from "@/components/route-skeleton";

export default function Loading() {
  return <RouteSkeleton route="mypay" label="your pay" shape="cards" band={128} overlap={false} />;
}
