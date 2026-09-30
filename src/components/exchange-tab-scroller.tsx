"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ExchangeTabScroller({
  activeTab,
  children,
}: {
  activeTab: string;
  children: ReactNode;
}) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;

    const navRect = nav.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (activeRect.left < navRect.left + 8) {
      nav.scrollLeft -= navRect.left + 8 - activeRect.left;
    } else if (activeRect.right > navRect.right - 8) {
      nav.scrollLeft += activeRect.right - (navRect.right - 8);
    }
  }, [activeTab]);

  return (
    <nav ref={navRef} className="exchange-tabs" aria-label="Shift exchange sections">
      {children}
    </nav>
  );
}
