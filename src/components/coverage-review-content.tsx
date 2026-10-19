"use client";

import { useLinkStatus } from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";

/** The link says it is opening while the review loads (form pattern, pending). */
export function CoverageReviewContent({ repair }: { repair?: boolean }) {
  const { pending } = useLinkStatus();
  return <>
    <span role={pending ? "status" : undefined} aria-live="polite" aria-atomic="true">{pending ? "Opening review…" : repair ? "Review replacement" : "Review shift"}</span>
    <CaretRightIcon size={16} weight="bold" aria-hidden="true" />
  </>;
}
