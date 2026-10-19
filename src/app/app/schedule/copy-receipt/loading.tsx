import { RouteSkeleton } from "@/components/route-skeleton";

/** Wave A: this page's own placeholder, with its band at the height it renders at 390. */
export default function Loading() {
  return <RouteSkeleton label="the copy result" shape="cards" band={212} />;
}
