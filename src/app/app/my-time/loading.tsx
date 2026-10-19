import { RouteSkeleton } from "@/components/route-skeleton";

export default function Loading() {
  return <RouteSkeleton route="mytime" label="your time" shape="cards" band={172} overlap={false} />;
}
