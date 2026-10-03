import Image from "next/image";

export function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <span
      className={large ? "brand-mark brand-mark-logo large" : "brand-mark brand-mark-logo"}
      aria-hidden="true"
    >
      <Image
        src="/images/velani-mark.svg"
        alt=""
        width={722}
        height={684}
        className="brand-logo-image"
        sizes={large ? "58px" : "44px"}
        priority={large}
        draggable={false}
      />
    </span>
  );
}
