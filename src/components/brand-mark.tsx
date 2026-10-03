import Image from "next/image";

export function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <span
      className={large ? "brand-mark brand-mark-logo large" : "brand-mark brand-mark-logo"}
      aria-hidden="true"
    >
      <Image
        src="/images/nevora-icon.png"
        alt=""
        width={512}
        height={512}
        className="brand-logo-image"
        sizes={large ? "58px" : "44px"}
        priority={large}
        draggable={false}
      />
    </span>
  );
}

/** The official wordmark artwork preserves the cyan detail in the A. */
export function BrandWordmark() {
  return (
    <span className="brand-wordmark" role="img" aria-label="NEVORA">
      <Image
        src="/images/nevora-wordmark.png"
        unoptimized
        alt=""
        width={907}
        height={122}
        sizes="(max-width: 760px) 102px, 145px"
        draggable={false}
      />
    </span>
  );
}
