"use client";

import { BRouteError } from "@/components/owner-b/b-route-error";

/** A failed read on a Wave A page: the page's band, one card, Try again (reads the server again) and a way back.
 * One live region carries the message; the buttons sit outside it (IS-49). Phase 2 (package D): drawn by the one
 * Direction B route error screen; the words and both actions are unchanged. */
export function WaveARouteError({ retry, title, back }: { retry: () => void; title: string; back: { href: string; label: string } }) {
  return <BRouteError title={title} sub="This page didn’t load." back={back}
    spoken={`${title} didn’t load. Nothing was changed. Check your connection, then try again.`}
    cardTitle={`${title} didn’t load`} line="Nothing was changed. Check your connection, then try again."
    onRetry={retry} away={{ href: back.href, label: `Back to ${back.label}` }} />;
}
