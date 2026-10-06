"use client";

import Image from "next/image";
import { useId } from "react";

export function BrandMark({ large = false, offline = false }: { large?: boolean; offline?: boolean }) {
  return (
    <span
      className={large ? "brand-mark brand-mark-logo large" : "brand-mark brand-mark-logo"}
      aria-hidden="true"
    >
      {offline ? (
        <svg className="brand-logo-image" viewBox="0 0 192 192" width={192} height={192}>
          <image href="/icons/fuel-192.png" width={192} height={192} />
        </svg>
      ) : <Image
        src="/images/nevora-icon.png"
        alt=""
        width={512}
        height={512}
        className="brand-logo-image"
        sizes={large ? "58px" : "44px"}
        priority={large}
        draggable={false}
      />}
    </span>
  );
}

/** Original glyph outlines and cyan A, with white source pixels knocked out.
 * The viewBox trims to visible ink so Workforce shares its optical left axis. */
export function BrandWordmark() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const cutout = `nevora-cutout-${id}`;
  const mask = `nevora-ink-${id}`;
  const cyan = `nevora-cyan-${id}`;
  return (
    <svg className="brand-wordmark" role="img" aria-label="NEVORA"
      viewBox="5 4 895 112" width={895} height={112}>
      <defs>
        <filter id={cutout} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 0 0 0 1" />
          <feComponentTransfer><feFuncA type="linear" slope="1.08" /></feComponentTransfer>
        </filter>
        <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="907" height="122" style={{ maskType: "alpha" }}>
          <image href="/images/nevora-wordmark.png" width="907" height="122" filter={`url(#${cutout})`} />
        </mask>
        <clipPath id={cyan}><rect x="812" y="74" width="43" height="42" /></clipPath>
      </defs>
      <rect x="0" y="0" width="907" height="122" fill="currentColor" mask={`url(#${mask})`} />
      <image className="brand-wordmark-cyan" href="/images/nevora-wordmark.png" width="907" height="122"
        filter={`url(#${cutout})`} clipPath={`url(#${cyan})`} />
    </svg>
  );
}
