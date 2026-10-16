import { SkeletonRows } from "./skeleton";

/** Page-shaped placeholder for a route segment while its server data loads.
 * The visible shape matches the page (grid, list or cards); the status line
 * tells assistive tech what is loading. */
export function RouteSkeleton({ label, shape = "list" }: { label: string; shape?: "grid" | "list" | "cards" }) {
  return <section className="route-skeleton" data-shape={shape} role="status" aria-busy="true">
    <span className="sr-only">Loading {label}…</span>
    <div className="route-skeleton-header" aria-hidden="true"><i /><i /></div>
    {shape === "grid" ? <div className="route-skeleton-grid" aria-hidden="true">{Array.from({ length: 21 }, (_, index) => <i key={index} />)}</div>
      : shape === "cards" ? <div className="route-skeleton-cards" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div>
        : null}
    <SkeletonRows rows={shape === "list" ? 6 : 3} variant={shape === "list" ? "card" : "line"} />
  </section>;
}
