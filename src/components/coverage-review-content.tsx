"use client";

import { useLinkStatus } from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react";

export function CoverageReviewContent({ repair }: { repair?: boolean }) {
  const { pending } = useLinkStatus();
  return <>
    <span role={pending ? "status" : undefined} aria-live="polite" aria-atomic="true">{pending ? "Opening review…" : repair ? "Review replacement" : "Review shift"}</span>
    <ArrowRightIcon size={18} aria-hidden="true" />
  </>;
}
