import type { CSSProperties } from "react";

/* NEVORA's own glyphs, drawn where the icon family's cut does not read well at the size we use it (premium pass, Nov 21,
 * 2026). Same contract as a Phosphor icon: a 256 box, currentColor, decorative. */

/** No connection: the Wi-Fi fan with one clean stroke through it. The fan is cut either side of the stroke, so the two
 * never touch, and the arcs behind it step down in strength. Jose, Nov 21, 2026: Phosphor's duotone WifiSlash in a
 * circle "is horrible"; this replaces it wherever "offline" stands in a circle. */
export function OfflineGlyph({ size = 24, style }: { size?: number | string; style?: CSSProperties }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="24" strokeLinecap="round" aria-hidden="true" focusable="false" style={style} data-glyph="offline">
    <mask id="nv-offline-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
      <rect width="256" height="256" fill="#fff" stroke="none" />
      <path d="M60 40 204 220" stroke="#000" strokeWidth="60" />
    </mask>
    <g mask="url(#nv-offline-cut)">
      <path d="M20.5 96.5A152 152 0 0 1 235.5 96.5" opacity="0.38" />
      <path d="M54.5 130.5A104 104 0 0 1 201.5 130.5" opacity="0.62" />
      <path d="M88.4 164.4A56 56 0 0 1 167.6 164.4" />
      <circle cx="128" cy="204" r="16" fill="currentColor" stroke="none" />
    </g>
    <path d="M60 40 204 220" />
  </svg>;
}
