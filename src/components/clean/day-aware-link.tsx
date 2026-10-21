"use client";
import Link from "next/link";
import { useEffect, useState, type ComponentProps } from "react";

/** Clean Manager (v3): Schedule's Add shift opens the form on the day chosen in the week strip. The roster announces the
 * chosen day (a "cm-schedule-day" event); until it does, the link keeps the page's own href. */
/** The last chosen day outlives a remount: TopBarTools moves this link between the page and the header, and the
 * replacement mounts fresh (review 32/50). */
let lastChosenDay: string | null = null;

export function DayAwareLink({ href, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const [day, setDay] = useState<string | null>(() => lastChosenDay);
  useEffect(() => {
    const chosen = (event: Event) => { lastChosenDay = (event as CustomEvent<string>).detail; setDay(lastChosenDay); };
    window.addEventListener("cm-schedule-day", chosen);
    return () => window.removeEventListener("cm-schedule-day", chosen);
  }, []);
  const target = day ? (() => { const url = new URL(href, "https://nevora.invalid"); url.searchParams.set("date", day); return url.pathname + url.search; })() : href;
  return <Link {...props} href={target} />;
}
