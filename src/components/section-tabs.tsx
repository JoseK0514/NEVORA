"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { SectionTabGroup } from "@/lib/navigation";

/** Tabs between pages that share one place in the navigation (Requests, Pay,
 * Time and pay). Each tab is a real URL, so back, refresh and links keep
 * working. On phones the row scrolls sideways and keeps the current tab in view. */
export function SectionTabs({ group, pathname }: { group: SectionTabGroup; pathname: string }) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = track.current;
    if (!row) return;
    const current = row.querySelector<HTMLElement>('[aria-current="page"]');
    if (current && row.scrollWidth > row.clientWidth) row.scrollLeft = current.offsetLeft - (row.clientWidth - current.offsetWidth) / 2;
    // Fade whichever edge still has tabs beyond it, so the row reads as scrollable.
    const edges = () => {
      row.toggleAttribute("data-more-start", row.scrollLeft > 1);
      row.toggleAttribute("data-more-end", row.scrollLeft + row.clientWidth < row.scrollWidth - 1);
    };
    // AL-47: when the tabs change size (a larger text size, turning the phone), a current tab that is now
    // cut off comes back to the middle. A tab still fully in view stays where the reader left it.
    const resized = () => {
      const tab = current?.getBoundingClientRect(), box = row.getBoundingClientRect();
      if (current && tab && (tab.left < box.left - 1 || tab.right > box.right + 1)) row.scrollLeft = current.offsetLeft - (row.clientWidth - current.offsetWidth) / 2;
      edges();
    };
    edges();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resized);
    observer?.observe(row);
    if (current) observer?.observe(current);
    row.addEventListener("scroll", edges, { passive: true });
    window.addEventListener("resize", edges);
    return () => { observer?.disconnect(); row.removeEventListener("scroll", edges); window.removeEventListener("resize", edges); };
  }, [pathname]);
  return <nav className="section-tabs" aria-label={`${group.label} pages`}>
    <div className="section-tabs-track" ref={track}>
      {group.items.map(item => <Link key={item.href} href={item.href} className="section-tab"
        aria-current={item.href === pathname ? "page" : undefined}>{item.label}</Link>)}
    </div>
  </nav>;
}
