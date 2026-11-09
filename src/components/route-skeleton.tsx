import { SkeletonRows } from "./skeleton";
import { QuietSkeleton } from "./quiet/quiet";
import { CorpSkeleton } from "./corp/corp-client";

/** Page-shaped placeholder for a route segment while its server data loads.
 * The visible shape matches the page (grid, list or cards); the status line
 * tells assistive tech what is loading. */
export function RouteSkeleton({ label, shape = "list", band, overlap = true, route, setup = false }: {
  label: string; shape?: "grid" | "list" | "cards"; route?: string;
  /** Home only: the Owner setup card leads the page, so the first placeholder card starts where it does. */
  setup?: boolean;
  /** Phase 7 (ST-05): the teal band's final height at 390, so the band doesn't pop in after loading.
   * Shown only in the Manager and Owner shell (the employee app keeps its own until phase 3). */
  band?: number; overlap?: boolean;
}) {
  return <section className="route-skeleton" data-shape={shape} data-route={route} data-band={band ? (overlap ? "overlap" : "flat") : undefined} data-setup={setup || undefined}
    style={band && !route ? { ["--route-band" as string]: `${band}px` } : undefined} role="status" aria-busy="true">
    <span className="sr-only">Loading {label}…</span>
    {band ? <div className="route-skeleton-band" aria-hidden="true"><i /><i /><i /></div> : null}
    <div className="route-skeleton-header" aria-hidden="true"><i /><i /></div>
    {shape === "grid" ? <div className="route-skeleton-grid" aria-hidden="true">{Array.from({ length: 21 }, (_, index) => <i key={index} />)}</div>
      : shape === "cards" ? <div className="route-skeleton-cards" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div>
        : null}
    <SkeletonRows rows={shape === "list" ? 6 : 3} variant={shape === "list" ? "card" : "line"} />
    {/* Quiet shell (Owner and Manager): one static page shape instead of the band, grid and shimmer above. */}
    <QuietSkeleton />
    {/* Corporate shell (Owner premium P3/P7): the page-shaped placeholder; after 2.5s it says the page is slow, with Try again. */}
    <CorpSkeleton route={route} label={label} />
  </section>;
}
