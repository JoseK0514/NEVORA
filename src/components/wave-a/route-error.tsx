"use client";

import { useOnline } from "@/components/app-error-screen";
import { BRouteError } from "@/components/owner-b/b-route-error";

/** The card's line: what was kept, then the cause only when it changes what to do (writing guide, "Errors"). Online, the
 * fault is ours, so it doesn't send people to check their connection; offline, the connection is the next step. */
export function routeErrorLine(online: boolean): string {
  return online ? "Something went wrong on our side. Nothing was changed." : "You’re offline. Nothing was changed.";
}

/** A failed read on a Wave A page: the page's band, one card, Try again (reads the server again).
 * One live region carries the message; the button sits outside it (IS-49). Phase 2 (package D): drawn by the one
 * Direction B route error screen.
 * G54 (Nov 23, 2026): each fact once and one way back. The band keeps the page's title and its back link (the only way
 * back; the card's "Back to …" button went to the same place); the card says the page didn't load (the band already names
 * it) and the cause honestly: a route error is a server fault unless the browser is offline. The button is the next step,
 * so no sentence repeats "Try again". */
export function WaveARouteError({ retry, title, back }: { retry: () => void; title: string; back?: { href: string; label: string } }) {
  const online = useOnline();
  const line = routeErrorLine(online);
  // The alert is read on its own, so it names the page; on screen the band does.
  return <BRouteError title={title} back={back} spoken={`${title} didn’t load. ${line}`}
    cardTitle="This page didn’t load" line={line} onRetry={retry} />;
}
