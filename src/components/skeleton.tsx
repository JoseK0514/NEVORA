/** Placeholder rows shaped like the content that is loading. Purely visual:
 * pair it with a status message so assistive tech hears what is happening. */
export function SkeletonRows({ rows = 3, variant = "card" }: { rows?: number; variant?: "card" | "line" }) {
  return <div className={`nevora-skeleton nevora-skeleton-${variant}`} aria-hidden="true">
    {Array.from({ length: rows }, (_, index) => <span key={index}><i /><i /></span>)}
  </div>;
}
