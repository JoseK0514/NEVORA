import type { ReactElement } from "react";

/** NEVORA spot illustrations: one-weight line drawings on a soft wash disc.
 * Strokes use currentColor (the accent, set by CSS) and fills use the accent
 * wash, so a company brand colour carries through without new artwork.
 * Decorative only: the surrounding title and copy carry the meaning. */
export type IllustrationName = "empty-schedule" | "all-caught-up" | "payday" | "open-shift" | "offline" | "setup-checklist";

const line = { fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const wash = "var(--g-accent-wash, #E7F3F2)";

const art: Record<IllustrationName, ReactElement> = {
  "empty-schedule": <>
    <rect x="34" y="30" width="52" height="46" rx="8" {...line} fill="#FFFFFF" />
    <path d="M34 44h52M46 24v12M74 24v12" {...line} />
    <path d="M46 56h8M66 56h8M46 66h8" {...line} opacity=".45" />
    <circle cx="70" cy="66" r="4" fill="currentColor" />
  </>,
  "all-caught-up": <>
    <path d="M38 34h44v40a6 6 0 0 1-6 6H44a6 6 0 0 1-6-6z" {...line} fill="#FFFFFF" />
    <path d="M38 34l8-10h28l8 10" {...line} />
    <path d="M49 56l8 8 15-16" {...line} />
  </>,
  payday: <>
    <rect x="28" y="36" width="64" height="40" rx="8" {...line} fill="#FFFFFF" />
    <circle cx="60" cy="56" r="9" {...line} />
    <path d="M36 46h6M78 66h6" {...line} opacity=".45" />
    <path d="M84 22l2.5 5.5L92 30l-5.5 2.5L84 38l-2.5-5.5L76 30l5.5-2.5z" fill="currentColor" />
  </>,
  "open-shift": <>
    <rect x="30" y="34" width="50" height="40" rx="8" {...line} fill="#FFFFFF" strokeDasharray="6 6" />
    <circle cx="80" cy="34" r="12" {...line} fill="#FFFFFF" />
    <path d="M80 28v12M74 34h12" {...line} />
    <path d="M40 50h20M40 60h12" {...line} opacity=".45" />
  </>,
  offline: <>
    <path d="M34 50a36 36 0 0 1 52 0M42 59a24 24 0 0 1 36 0M50 68a12 12 0 0 1 20 0" {...line} />
    <circle cx="60" cy="78" r="3.5" fill="currentColor" />
    <path d="M38 30l44 52" {...line} />
  </>,
  "setup-checklist": <>
    <rect x="38" y="24" width="44" height="58" rx="8" {...line} fill="#FFFFFF" />
    <path d="M46 40l4 4 7-8M46 56l4 4 7-8" {...line} />
    <path d="M62 40h12M62 56h12M62 70h12" {...line} opacity=".45" />
    <rect x="46" y="66" width="8" height="8" rx="2" {...line} />
  </>,
};

export function Illustration({ name, size = 120, className = "" }: { name: IllustrationName; size?: number; className?: string }) {
  return <svg className={`nevora-illustration ${className}`.trim()} data-illustration={name} width={size} height={size * 0.85} viewBox="0 0 120 102" aria-hidden="true" focusable="false">
    <circle cx="60" cy="53" r="46" fill={wash} />
    {art[name]}
  </svg>;
}
