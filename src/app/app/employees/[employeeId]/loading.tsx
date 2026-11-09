import { RouteSkeleton } from "@/components/route-skeleton";

/** Wave A: this page's own placeholder. Its band height per width is set in premium-wave-a.css (data-route="wa-member"). */
export default function Loading() {
  return <RouteSkeleton route="wa-member" label="this team member" shape="cards" band={216} overlap={false} />;
}
